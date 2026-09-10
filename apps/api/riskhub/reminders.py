from __future__ import annotations

import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .feishu import FeishuAPIError, send_remediation_reminder
from .models import DirectoryMember, Finding, FindingStatus, NotificationDelivery, User


logger = logging.getLogger(__name__)
REMEDIATION_STATUSES = (FindingStatus.PENDING_REMEDIATION, FindingStatus.IN_REMEDIATION)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _timezone(timezone_name: str):
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        logger.warning("Unknown reminder timezone %s; falling back to UTC", timezone_name)
        return timezone.utc


def reminder_day_offset(due_at: datetime, now: datetime, timezone_name: str) -> int:
    local_timezone = _timezone(timezone_name)
    due_date = _as_utc(due_at).astimezone(local_timezone).date()
    current_date = _as_utc(now).astimezone(local_timezone).date()
    return (due_date - current_date).days


def reminder_text(day_offset: int) -> str:
    if day_offset > 0:
        return f"距离整改到期还有 {day_offset} 天"
    if day_offset == 0:
        return "整改今天到期"
    return f"整改已逾期 {abs(day_offset)} 天"


def dispatch_remediation_reminders(session: Session, now: datetime | None = None) -> dict[str, int]:
    current_time = _as_utc(now or datetime.now(timezone.utc))
    if not settings.feishu_configured:
        return {"sent": 0, "failed": 0, "skipped": 0}

    rows = session.execute(
        select(Finding, User, DirectoryMember)
        .join(User, User.id == Finding.assignee_id)
        .join(DirectoryMember, DirectoryMember.user_id == Finding.assignee_id)
        .where(
            Finding.status.in_(REMEDIATION_STATUSES),
            Finding.due_at.is_not(None),
            DirectoryMember.provider == "feishu",
            DirectoryMember.active.is_(True),
        )
    ).all()
    result = {"sent": 0, "failed": 0, "skipped": 0}
    for finding, assignee, member in rows:
        day_offset = reminder_day_offset(finding.due_at, current_time, settings.feishu_reminder_timezone)
        if not -7 <= day_offset <= 3:
            result["skipped"] += 1
            continue
        delivery_date = _as_utc(current_time).astimezone(_timezone(settings.feishu_reminder_timezone)).date()
        delivery = session.scalar(select(NotificationDelivery).where(
            NotificationDelivery.finding_id == finding.id,
            NotificationDelivery.recipient_id == assignee.id,
            NotificationDelivery.kind == "feishu_remediation_due",
            NotificationDelivery.delivery_date == delivery_date,
        ))
        if delivery and delivery.status == "sent":
            result["skipped"] += 1
            continue
        if not delivery:
            delivery = NotificationDelivery(
                finding_id=finding.id,
                recipient_id=assignee.id,
                kind="feishu_remediation_due",
                delivery_date=delivery_date,
            )
            session.add(delivery)
        delivery.attempt_count = (delivery.attempt_count or 0) + 1
        try:
            send_remediation_reminder(
                member.external_user_id,
                recipient_name=assignee.display_name,
                finding_id=finding.id,
                finding_no=finding.finding_no,
                title=finding.title,
                severity=finding.severity.value,
                due_at=_as_utc(finding.due_at).isoformat(),
                reminder_text=reminder_text(day_offset),
            )
            delivery.status = "sent"
            delivery.sent_at = current_time
            delivery.last_error = None
            result["sent"] += 1
        except FeishuAPIError as exc:
            delivery.status = "failed"
            delivery.last_error = str(exc)[:500]
            result["failed"] += 1
            logger.warning("Feishu remediation reminder failed for finding %s: %s", finding.id, exc)
    session.commit()
    return result


def run_remediation_reminder_job() -> dict[str, int]:
    with SessionLocal() as session:
        return dispatch_remediation_reminders(session)
