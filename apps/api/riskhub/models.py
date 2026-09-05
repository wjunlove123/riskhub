from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    REMEDIATOR = "remediator"
    VERIFIER = "verifier"


class Severity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingStatus(str, enum.Enum):
    PENDING_CONFIRMATION = "pending_confirmation"
    PENDING_REMEDIATION = "pending_remediation"
    IN_REMEDIATION = "in_remediation"
    PENDING_VERIFICATION = "pending_verification"
    CLOSED = "closed"
    FALSE_POSITIVE = "false_positive"
    ACCEPTANCE_REQUESTED = "acceptance_requested"
    RISK_ACCEPTED = "risk_accepted"


class BatchStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    roles: Mapped[list[str]] = mapped_column(JSON, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class Asset(TimestampMixin, Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    asset_code: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    type: Mapped[str] = mapped_column(String(40), index=True)
    external_id: Mapped[str | None] = mapped_column(String(200), index=True)
    business_system: Mapped[str | None] = mapped_column(String(120))
    team: Mapped[str] = mapped_column(String(120), index=True)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    importance: Mapped[str] = mapped_column(String(20), default="important", index=True)
    exposure: Mapped[str] = mapped_column(String(20), default="internal")
    environment: Mapped[str] = mapped_column(String(20), default="production")
    status: Mapped[str] = mapped_column(String(20), default="active")

    owner: Mapped[User | None] = relationship(foreign_keys=[owner_id])


class Source(TimestampMixin, Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_code: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    ingestion_type: Mapped[str] = mapped_column(String(30), default="api")
    adapter_type: Mapped[str] = mapped_column(String(50), default="generic")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    mapping_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class GovernanceSetting(TimestampMixin, Base):
    __tablename__ = "governance_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(120))
    config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)


class ImportBatch(TimestampMixin, Base):
    __tablename__ = "import_batches"
    __table_args__ = (UniqueConstraint("source_id", "idempotency_key", name="uq_batch_source_idempotency"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    batch_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(200))
    filename: Mapped[str | None] = mapped_column(String(255))
    file_sha256: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[BatchStatus] = mapped_column(Enum(BatchStatus), default=BatchStatus.PENDING, index=True)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    error_summary: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    source: Mapped[Source] = relationship()


class RawRecord(TimestampMixin, Base):
    __tablename__ = "raw_records"
    __table_args__ = (UniqueConstraint("batch_id", "row_no", name="uq_raw_batch_row"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    batch_id: Mapped[str] = mapped_column(ForeignKey("import_batches.id"), index=True)
    row_no: Mapped[int] = mapped_column(Integer)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    payload_hash: Mapped[str] = mapped_column(String(64))
    process_status: Mapped[str] = mapped_column(String(30), default="pending")
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)


class Finding(TimestampMixin, Base):
    __tablename__ = "findings"
    __table_args__ = (
        Index("ix_findings_status_severity", "status", "severity"),
        Index("ix_findings_asset_due", "asset_id", "due_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    finding_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    dedup_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    dedup_rule_version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(500), index=True)
    category: Mapped[str] = mapped_column(String(120), default="general")
    description: Mapped[str] = mapped_column(Text, default="")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[Severity] = mapped_column(Enum(Severity), index=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0)
    priority: Mapped[str] = mapped_column(String(10), default="P3", index=True)
    severity_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[FindingStatus] = mapped_column(Enum(FindingStatus), default=FindingStatus.PENDING_CONFIRMATION, index=True)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    verifier_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    sla_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    observation_count: Mapped[int] = mapped_column(Integer, default=0)
    source_count: Mapped[int] = mapped_column(Integer, default=0)
    reopen_count: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)

    asset: Mapped[Asset] = relationship()
    owner: Mapped[User | None] = relationship(foreign_keys=[owner_id])
    assignee: Mapped[User | None] = relationship(foreign_keys=[assignee_id])
    verifier: Mapped[User | None] = relationship(foreign_keys=[verifier_id])


class Observation(TimestampMixin, Base):
    __tablename__ = "observations"
    __table_args__ = (UniqueConstraint("batch_id", "row_no", name="uq_observation_batch_row"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), index=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("import_batches.id"), index=True)
    raw_record_id: Mapped[str] = mapped_column(ForeignKey("raw_records.id"))
    row_no: Mapped[int] = mapped_column(Integer)
    source_finding_id: Mapped[str | None] = mapped_column(String(200), index=True)
    source_rule_id: Mapped[str | None] = mapped_column(String(200))
    source_severity: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(500))
    normalized_location: Mapped[str] = mapped_column(String(500), default="")
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    dedup_key: Mapped[str] = mapped_column(String(64), index=True)
    dedup_rule_version: Mapped[int] = mapped_column(Integer, default=1)
    match_method: Mapped[str] = mapped_column(String(40))

    source: Mapped[Source] = relationship()


class FindingEvent(Base):
    __tablename__ = "finding_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    from_status: Mapped[str | None] = mapped_column(String(40))
    to_status: Mapped[str | None] = mapped_column(String(40))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    request_id: Mapped[str | None] = mapped_column(String(80))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    actor: Mapped[User | None] = relationship()


class Remediation(Base):
    __tablename__ = "remediations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), index=True)
    submitted_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    description: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list[str]] = mapped_column(JSON, default=list)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), index=True)
    remediation_id: Mapped[str] = mapped_column(ForeignKey("remediations.id"))
    verified_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    result: Mapped[str] = mapped_column(String(20))
    method: Mapped[str] = mapped_column(String(50), default="manual")
    comment: Mapped[str] = mapped_column(Text)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RiskAcceptance(Base):
    __tablename__ = "risk_acceptances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="requested")
    reason: Mapped[str] = mapped_column(Text)
    compensating_control: Mapped[str] = mapped_column(Text)
    requested_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    approved_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    decision_comment: Mapped[str | None] = mapped_column(Text)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    object_type: Mapped[str] = mapped_column(String(80), index=True)
    object_id: Mapped[str] = mapped_column(String(80), index=True)
    before_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    after_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    request_id: Mapped[str | None] = mapped_column(String(80), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    actor: Mapped[User | None] = relationship()
