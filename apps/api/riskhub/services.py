from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import (
    Asset,
    AuditEvent,
    BatchStatus,
    Finding,
    FindingEvent,
    FindingStatus,
    ImportBatch,
    Observation,
    RawRecord,
    Remediation,
    RiskAcceptance,
    Role,
    Severity,
    Source,
    User,
    Verification,
    utcnow,
)
from .schemas import ObservationInput


SEVERITY_SCORE = {Severity.CRITICAL: 9.5, Severity.HIGH: 8.0, Severity.MEDIUM: 5.5, Severity.LOW: 3.0, Severity.INFO: 1.0}
SEVERITY_PRIORITY = {Severity.CRITICAL: "P1", Severity.HIGH: "P1", Severity.MEDIUM: "P2", Severity.LOW: "P3", Severity.INFO: "P4"}
SLA_DAYS = {Severity.CRITICAL: 3, Severity.HIGH: 7, Severity.MEDIUM: 30, Severity.LOW: 60, Severity.INFO: 90}

STATUS_LABELS = {
    FindingStatus.PENDING_CONFIRMATION: "待确认",
    FindingStatus.PENDING_REMEDIATION: "待整改",
    FindingStatus.IN_REMEDIATION: "整改中",
    FindingStatus.PENDING_VERIFICATION: "待验证",
    FindingStatus.CLOSED: "已关闭",
    FindingStatus.FALSE_POSITIVE: "误报",
    FindingStatus.ACCEPTANCE_REQUESTED: "风险接受申请",
    FindingStatus.RISK_ACCEPTED: "风险已接受",
}


def audit(
    session: Session,
    actor: User | None,
    action: str,
    object_type: str,
    object_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> None:
    session.add(AuditEvent(actor_id=actor.id if actor else None, action=action, object_type=object_type, object_id=object_id, before_data=before, after_data=after, request_id=request_id))


def finding_event(
    session: Session,
    finding: Finding,
    event_type: str,
    actor: User | None,
    from_status: FindingStatus | None = None,
    to_status: FindingStatus | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    session.add(FindingEvent(
        finding_id=finding.id,
        event_type=event_type,
        from_status=from_status.value if from_status else None,
        to_status=to_status.value if to_status else None,
        actor_id=actor.id if actor else None,
        payload=payload or {},
    ))


def severity_from(value: str) -> Severity:
    return Severity(value.lower())


def normalize_text(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


def build_dedup_key(source: Source, asset: Asset, record: ObservationInput) -> tuple[str, str]:
    if record.source_finding_id:
        parts = [source.source_code, asset.asset_code, normalize_text(record.source_finding_id)]
        method = "stable_id"
    else:
        parts = [source.source_code, asset.asset_code, normalize_text(record.source_rule_id), normalize_text(record.location), normalize_text(record.title)]
        method = "field_hash"
    return hashlib.sha256("|".join(parts).encode()).hexdigest(), method


def get_or_create_asset(session: Session, record: ObservationInput, default_owner: User | None) -> Asset:
    asset = None
    if record.asset_code:
        asset = session.scalar(select(Asset).where(Asset.asset_code == record.asset_code))
    if not asset and record.asset_external_id:
        asset = session.scalar(select(Asset).where(Asset.external_id == record.asset_external_id))
    if asset:
        return asset
    code_seed = record.asset_code or record.asset_external_id or record.asset_name
    if not code_seed:
        raise ValueError("asset identifier is required")
    suffix = hashlib.sha256(code_seed.encode()).hexdigest()[:10]
    asset = Asset(
        asset_code=record.asset_code or f"AUTO-{suffix.upper()}",
        name=record.asset_name or record.asset_code or record.asset_external_id or "待确认资产",
        type=record.asset_type,
        external_id=record.asset_external_id,
        team=record.team,
        owner_id=default_owner.id if default_owner else None,
        importance="important",
        exposure="internet" if "公网" in record.location else "internal",
    )
    session.add(asset)
    session.flush()
    return asset


def next_finding_no(session: Session) -> str:
    count = session.scalar(select(func.count()).select_from(Finding)) or 0
    return f"RF-{datetime.now().year}-{count + 1:05d}"


def ingest_records(
    session: Session,
    batch: ImportBatch,
    source: Source,
    records: list[ObservationInput],
    actor: User | None,
) -> ImportBatch:
    batch.status = BatchStatus.PROCESSING
    batch.started_at = utcnow()
    batch.total_count = len(records)
    errors: list[str] = []
    seen_sources: dict[str, set[str]] = {}

    for row_no, record in enumerate(records, 2):
        raw_payload = record.model_dump(mode="json")
        raw = RawRecord(
            batch_id=batch.id,
            row_no=row_no,
            raw_payload=raw_payload,
            payload_hash=hashlib.sha256(json.dumps(raw_payload, sort_keys=True).encode()).hexdigest(),
        )
        session.add(raw)
        session.flush()
        try:
            asset = get_or_create_asset(session, record, actor)
            dedup_key, match_method = build_dedup_key(source, asset, record)
            finding = session.scalar(select(Finding).where(Finding.dedup_key == dedup_key))
            severity = severity_from(record.severity)
            observed_at = record.observed_at or utcnow()
            if not finding:
                finding = Finding(
                    finding_no=next_finding_no(session),
                    asset_id=asset.id,
                    dedup_key=dedup_key,
                    title=record.title,
                    description=record.description,
                    recommendation=record.recommendation,
                    severity=severity,
                    risk_score=SEVERITY_SCORE[severity],
                    priority=SEVERITY_PRIORITY[severity],
                    status=FindingStatus.PENDING_CONFIRMATION,
                    owner_id=asset.owner_id,
                    first_seen_at=observed_at,
                    last_seen_at=observed_at,
                )
                session.add(finding)
                session.flush()
                finding_event(session, finding, "FINDING_CREATED", actor, to_status=finding.status, payload={"batch_no": batch.batch_no})
            elif finding.status in {FindingStatus.CLOSED, FindingStatus.FALSE_POSITIVE}:
                previous = finding.status
                finding.status = FindingStatus.PENDING_CONFIRMATION
                finding.reopen_count += 1
                finding.closed_at = None
                finding.verified_at = None
                finding_event(session, finding, "REOPENED_BY_OBSERVATION", actor, previous, finding.status, {"batch_no": batch.batch_no})
            finding.last_seen_at = max(finding.last_seen_at, observed_at)
            observation = Observation(
                finding_id=finding.id,
                asset_id=asset.id,
                source_id=source.id,
                batch_id=batch.id,
                raw_record_id=raw.id,
                row_no=row_no,
                source_finding_id=record.source_finding_id,
                source_rule_id=record.source_rule_id,
                source_severity=record.severity,
                title=record.title,
                normalized_location=normalize_text(record.location),
                observed_at=observed_at,
                dedup_key=dedup_key,
                match_method=match_method,
            )
            session.add(observation)
            finding.observation_count += 1
            seen_sources.setdefault(finding.id, set()).add(source.id)
            raw.process_status = "success"
            batch.success_count += 1
        except Exception as exc:  # record-level isolation by design
            raw.process_status = "failed"
            raw.error_code = "INVALID_RECORD"
            raw.error_message = str(exc)[:1000]
            batch.failed_count += 1
            errors.append(f"row {row_no}: {exc}")

    for finding_id, current_sources in seen_sources.items():
        finding = session.get(Finding, finding_id)
        if finding:
            all_sources = set(session.scalars(select(Observation.source_id).where(Observation.finding_id == finding_id)).all())
            finding.source_count = len(all_sources | current_sources)

    batch.status = BatchStatus.SUCCESS if not errors else BatchStatus.PARTIAL_SUCCESS if batch.success_count else BatchStatus.FAILED
    batch.error_summary = "\n".join(errors[:20]) or None
    batch.finished_at = utcnow()
    audit(session, actor, "IMPORT_BATCH_PROCESSED", "import_batch", batch.id, after={"batch_no": batch.batch_no, "status": batch.status.value, "success": batch.success_count, "failed": batch.failed_count})
    session.commit()
    session.refresh(batch)
    return batch


def allowed_actions(user: User, finding: Finding) -> list[str]:
    roles = set(user.roles)
    if Role.PLATFORM_ADMIN.value in roles:
        actions = ["assign", "change_severity"]
        if finding.status == FindingStatus.PENDING_CONFIRMATION:
            actions += ["confirm", "mark_false_positive"]
        if finding.status == FindingStatus.PENDING_REMEDIATION:
            actions += ["start_remediation", "request_acceptance"]
        if finding.status == FindingStatus.IN_REMEDIATION:
            actions += ["submit_remediation", "request_acceptance"]
        if finding.status == FindingStatus.PENDING_VERIFICATION:
            actions += ["verify_pass", "verify_reject"]
        if finding.status == FindingStatus.ACCEPTANCE_REQUESTED:
            actions += ["approve_acceptance", "reject_acceptance"]
        return actions
    if Role.REMEDIATOR.value in roles and finding.assignee_id == user.id:
        if finding.status == FindingStatus.PENDING_REMEDIATION:
            return ["start_remediation", "request_acceptance"]
        if finding.status == FindingStatus.IN_REMEDIATION:
            return ["submit_remediation", "request_acceptance"]
    if Role.VERIFIER.value in roles and finding.verifier_id == user.id and finding.status == FindingStatus.PENDING_VERIFICATION:
        return ["verify_pass", "verify_reject"]
    return []


TRANSITIONS = {
    "CONFIRM": (FindingStatus.PENDING_CONFIRMATION, FindingStatus.PENDING_REMEDIATION, Role.PLATFORM_ADMIN),
    "MARK_FALSE_POSITIVE": (FindingStatus.PENDING_CONFIRMATION, FindingStatus.FALSE_POSITIVE, Role.PLATFORM_ADMIN),
    "START_REMEDIATION": (FindingStatus.PENDING_REMEDIATION, FindingStatus.IN_REMEDIATION, Role.REMEDIATOR),
}


def transition_finding(session: Session, finding: Finding, user: User, action: str, reason: str, version: int) -> Finding:
    if finding.version != version:
        raise HTTPException(status_code=409, detail={"code": "VERSION_CONFLICT", "message": "风险已被其他用户更新，请刷新后重试"})
    rule = TRANSITIONS.get(action.upper())
    if not rule:
        raise HTTPException(status_code=400, detail={"code": "INVALID_ACTION", "message": "不支持的状态操作"})
    source_status, target_status, role = rule
    if finding.status != source_status:
        raise HTTPException(status_code=409, detail={"code": "INVALID_STATUS", "message": f"当前状态不能执行该操作：{STATUS_LABELS[finding.status]}"})
    is_admin = Role.PLATFORM_ADMIN.value in user.roles
    if role.value not in user.roles and not is_admin:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "没有权限执行该操作"})
    if role == Role.REMEDIATOR and not is_admin and finding.assignee_id != user.id:
        raise HTTPException(status_code=403, detail={"code": "NOT_ASSIGNEE", "message": "仅当前整改人可以执行该操作"})
    if action.upper() == "CONFIRM":
        if not all([finding.owner_id, finding.assignee_id, finding.verifier_id, finding.due_at]):
            raise HTTPException(status_code=422, detail={"code": "ASSIGNMENT_REQUIRED", "message": "确认风险前必须完成分派并设置截止时间"})
        finding.sla_started_at = utcnow()
    if action.upper() == "MARK_FALSE_POSITIVE" and not reason.strip():
        raise HTTPException(status_code=422, detail={"code": "REASON_REQUIRED", "message": "标记误报必须填写原因"})
    before = finding.status
    finding.status = target_status
    finding.version += 1
    finding_event(session, finding, action.upper(), user, before, target_status, {"reason": reason})
    audit(session, user, action.upper(), "finding", finding.id, {"status": before.value}, {"status": target_status.value, "reason": reason})
    session.commit()
    session.refresh(finding)
    return finding


def calculate_due_at(severity: Severity) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=SLA_DAYS[severity])
