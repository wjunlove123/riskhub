from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from riskhub import reminders
from riskhub.database import Base
from riskhub.models import Asset, DirectoryMember, Finding, FindingStatus, Severity, User


def test_remediation_reminders_send_daily_from_three_days_before_through_seven_days_overdue(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    due_at = datetime(2026, 9, 13, 12, tzinfo=timezone.utc)
    sent = []
    monkeypatch.setattr(reminders.settings, "feishu_app_id", "test-app")
    monkeypatch.setattr(reminders.settings, "feishu_app_secret", "test-secret")
    monkeypatch.setattr(reminders.settings, "feishu_department_ids", "od-test")
    monkeypatch.setattr(reminders.settings, "feishu_reminder_timezone", "Asia/Shanghai")
    monkeypatch.setattr(reminders, "send_remediation_reminder", lambda open_id, **payload: sent.append((open_id, payload)))

    with Session(engine, expire_on_commit=False) as session:
        assignee = User(id="user-1", username="zhangsan", display_name="张三", password_hash="hash", roles=["remediator"])
        asset = Asset(id="asset-1", asset_code="OPS-1", name="运维平台", type="application", team="SRE", importance="high", exposure="internal", status="active")
        finding = Finding(
            id="finding-1", finding_no="RH-2026-0001", asset=asset, dedup_key="dedup-1", title="开放的管理端口",
            severity=Severity.HIGH, status=FindingStatus.IN_REMEDIATION, assignee_id=assignee.id, due_at=due_at,
        )
        session.add_all([assignee, asset, finding, DirectoryMember(id="member-1", external_user_id="ou-remediator", user_id=assignee.id, department_id="od-test", active=True)])
        session.commit()

        assert reminders.dispatch_remediation_reminders(session, datetime(2026, 9, 10, 12, tzinfo=timezone.utc))["sent"] == 1
        assert reminders.dispatch_remediation_reminders(session, datetime(2026, 9, 10, 14, tzinfo=timezone.utc))["sent"] == 0
        assert reminders.dispatch_remediation_reminders(session, datetime(2026, 9, 11, 12, tzinfo=timezone.utc))["sent"] == 1
        assert reminders.dispatch_remediation_reminders(session, datetime(2026, 9, 20, 12, tzinfo=timezone.utc))["sent"] == 1
        assert reminders.dispatch_remediation_reminders(session, datetime(2026, 9, 21, 12, tzinfo=timezone.utc))["sent"] == 0

    assert len(sent) == 3
    assert sent[0][0] == "ou-remediator"
    assert sent[0][1]["recipient_name"] == "张三"
    assert sent[0][1]["reminder_text"] == "距离整改到期还有 3 天"
    assert sent[-1][1]["reminder_text"] == "整改已逾期 7 天"
