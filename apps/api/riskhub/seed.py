from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Asset, BatchStatus, Finding, FindingStatus, ImportBatch, Source, User, utcnow
from .schemas import ObservationInput
from .security import hash_password
from .services import calculate_due_at, ingest_records


DEMO_PASSWORD = "RiskHub123!"


def seed_database(session: Session) -> None:
    if (session.scalar(select(func.count()).select_from(User)) or 0) > 0:
        return

    admin = User(username="admin", display_name="平台管理员", password_hash=hash_password(DEMO_PASSWORD), roles=["platform_admin"])
    remediator = User(username="remediator", display_name="李明", password_hash=hash_password(DEMO_PASSWORD), roles=["remediator"])
    verifier = User(username="verifier", display_name="张宁", password_hash=hash_password(DEMO_PASSWORD), roles=["verifier"])
    session.add_all([admin, remediator, verifier])
    session.flush()

    assets = [
        Asset(asset_code="OPS-PLATFORM", name="统一运维平台", type="application", team="基础架构组", owner_id=admin.id, importance="core", exposure="internet"),
        Asset(asset_code="ORDER-CENTER", name="订单中心", type="application", team="交易平台组", owner_id=admin.id, importance="core", exposure="internet"),
        Asset(asset_code="MARKETING-BUCKET", name="营销素材库", type="cloud", team="营销技术组", owner_id=admin.id, importance="important", exposure="internet"),
        Asset(asset_code="USER-API", name="用户中心 API", type="api", team="用户平台组", owner_id=admin.id, importance="core", exposure="internet"),
        Asset(asset_code="MEMBER-DB", name="会员数据库", type="database", team="数据平台组", owner_id=admin.id, importance="important", exposure="internal"),
        Asset(asset_code="RECOMMENDATION", name="推荐引擎", type="application", team="算法工程组", owner_id=admin.id, importance="important", exposure="internal"),
    ]
    session.add_all(assets)
    sources = [
        Source(source_code="HOST_BASELINE", name="主机基线巡检", ingestion_type="api", adapter_type="generic"),
        Source(source_code="SCA", name="SCA 依赖扫描", ingestion_type="api", adapter_type="generic"),
        Source(source_code="CLOUD", name="云配置巡检", ingestion_type="api", adapter_type="generic"),
        Source(source_code="API_SCAN", name="API 安全巡检", ingestion_type="api", adapter_type="generic"),
        Source(source_code="DB_SCAN", name="数据库巡检", ingestion_type="excel", adapter_type="generic"),
        Source(source_code="CONTAINER", name="容器基线巡检", ingestion_type="api", adapter_type="generic"),
    ]
    session.add_all(sources)
    session.commit()

    demo_rows = [
        (sources[0], ObservationInput(source_finding_id="HOST-PWD-4021", source_rule_id="WEAK_PASSWORD", title="公网管理后台存在弱口令策略", description="公网管理入口允许弱口令，可能导致未授权访问。", recommendation="关闭公网入口并启用 MFA。", severity="critical", asset_code="OPS-PLATFORM", location="ops.example.internal:443/admin")),
        (sources[1], ObservationInput(source_finding_id="SCA-LOG4J-221", source_rule_id="CVE-2021-44228", title="订单服务 Log4j 组件版本存在高危漏洞", description="生产服务依赖存在已知远程代码执行风险。", recommendation="升级到受支持版本。", severity="critical", asset_code="ORDER-CENTER", location="service/order/pom.xml")),
        (sources[2], ObservationInput(source_finding_id="CLOUD-8840", source_rule_id="PUBLIC_BUCKET", title="对象存储 Bucket 允许匿名读取", description="对象存储访问策略允许匿名主体读取。", recommendation="收紧 Bucket Policy 并检查访问日志。", severity="high", asset_code="MARKETING-BUCKET", location="oss://marketing-assets")),
        (sources[3], ObservationInput(source_finding_id="API-291", source_rule_id="RATE_LIMIT", title="用户查询接口缺少访问频率限制", description="接口缺少频率限制，可能被批量枚举。", recommendation="增加用户和 IP 维度的限流。", severity="high", asset_code="USER-API", location="/api/users/query")),
        (sources[4], ObservationInput(source_finding_id="DB-901", source_rule_id="AUDIT_DISABLED", title="生产环境数据库审计未启用", description="数据库未记录关键管理操作。", recommendation="启用数据库审计并接入日志平台。", severity="high", asset_code="MEMBER-DB", location="member-db:5432")),
        (sources[5], ObservationInput(source_finding_id="CT-119", source_rule_id="READ_ONLY_FS", title="应用容器未配置只读根文件系统", description="容器根文件系统可写。", recommendation="启用 readOnlyRootFilesystem。", severity="medium", asset_code="RECOMMENDATION", location="deployment/recommendation")),
    ]

    for index, (source, record) in enumerate(demo_rows, 1):
        batch = ImportBatch(batch_no=f"IMP-DEMO-{index:03d}", source_id=source.id, idempotency_key=f"demo-{index}", status=BatchStatus.PENDING, filename="demo-seed.json")
        session.add(batch)
        session.flush()
        ingest_records(session, batch, source, [record], admin)

    findings = session.scalars(select(Finding).order_by(Finding.finding_no)).all()
    demo_statuses = [
        FindingStatus.PENDING_REMEDIATION,
        FindingStatus.IN_REMEDIATION,
        FindingStatus.PENDING_VERIFICATION,
        FindingStatus.PENDING_CONFIRMATION,
        FindingStatus.RISK_ACCEPTED,
        FindingStatus.PENDING_REMEDIATION,
    ]
    for index, finding in enumerate(findings):
        finding.owner_id = admin.id
        finding.assignee_id = remediator.id
        finding.verifier_id = verifier.id
        finding.status = demo_statuses[index]
        finding.due_at = calculate_due_at(finding.severity) - (timedelta(days=5) if index == 0 else timedelta())
        if finding.status in {FindingStatus.PENDING_REMEDIATION, FindingStatus.IN_REMEDIATION, FindingStatus.PENDING_VERIFICATION}:
            finding.sla_started_at = utcnow() - timedelta(days=2)
        finding.version += 1
    session.commit()

