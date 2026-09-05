from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .models import BatchStatus, FindingStatus, Severity


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(ORMModel):
    id: str
    username: str
    display_name: str
    roles: list[str]


class AssetPublic(ORMModel):
    id: str
    asset_code: str
    name: str
    type: str
    external_id: str | None
    business_system: str | None
    team: str
    importance: str
    exposure: str
    status: str
    owner: UserPublic | None = None


class AssetCreate(BaseModel):
    asset_code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    type: str
    external_id: str | None = None
    business_system: str | None = None
    team: str
    owner_id: str | None = None
    importance: str = "important"
    exposure: str = "internal"
    environment: str = "production"


class SourcePublic(ORMModel):
    id: str
    source_code: str
    name: str
    ingestion_type: str
    adapter_type: str
    enabled: bool
    mapping_config: dict[str, Any]


class SourceCreate(BaseModel):
    source_code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    ingestion_type: Literal["api", "excel"] = "api"
    adapter_type: str = "generic"
    mapping_config: dict[str, Any] = Field(default_factory=dict)


class ObservationInput(BaseModel):
    source_finding_id: str | None = None
    source_rule_id: str | None = None
    title: str = Field(min_length=1, max_length=500)
    description: str = ""
    recommendation: str = ""
    severity: str
    asset_code: str | None = None
    asset_external_id: str | None = None
    asset_name: str | None = None
    asset_type: str = "other"
    team: str = "未分配"
    location: str = ""
    observed_at: datetime | None = None

    @field_validator("severity")
    @classmethod
    def normalize_severity(cls, value: str) -> str:
        normalized = value.strip().lower()
        aliases = {"严重": "critical", "高危": "high", "中危": "medium", "低危": "low", "提示": "info"}
        normalized = aliases.get(normalized, normalized)
        if normalized not in {item.value for item in Severity}:
            raise ValueError("severity must be critical, high, medium, low or info")
        return normalized


class APIImportRequest(BaseModel):
    source_id: str
    records: list[ObservationInput] = Field(min_length=1, max_length=10_000)


class BatchPublic(ORMModel):
    id: str
    batch_no: str
    source_id: str
    filename: str | None
    status: BatchStatus
    total_count: int
    success_count: int
    failed_count: int
    skipped_count: int
    error_summary: str | None
    created_at: datetime
    finished_at: datetime | None


class ObservationPublic(ORMModel):
    id: str
    source_finding_id: str | None
    source_rule_id: str | None
    source_severity: str
    title: str
    normalized_location: str
    observed_at: datetime
    match_method: str
    source: SourcePublic


class FindingSummary(ORMModel):
    id: str
    finding_no: str
    title: str
    severity: Severity
    risk_score: float
    priority: str
    status: FindingStatus
    due_at: datetime | None
    first_seen_at: datetime
    last_seen_at: datetime
    observation_count: int
    source_count: int
    version: int
    asset: AssetPublic
    owner: UserPublic | None
    assignee: UserPublic | None
    verifier: UserPublic | None
    allowed_actions: list[str] = Field(default_factory=list)


class FindingDetail(FindingSummary):
    category: str
    description: str
    recommendation: str
    dedup_key: str
    dedup_rule_version: int
    reopen_count: int


class Page(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int


class AssignmentUpdate(BaseModel):
    owner_id: str
    assignee_id: str
    verifier_id: str
    due_at: datetime
    version: int
    reason: str = Field(min_length=2, max_length=500)


class SeverityUpdate(BaseModel):
    severity: Severity
    reason: str = Field(min_length=2, max_length=500)
    version: int


class TransitionRequest(BaseModel):
    action: str
    reason: str = ""
    version: int


class RemediationCreate(BaseModel):
    description: str = Field(min_length=2)
    evidence: list[str] = Field(min_length=1)
    version: int


class VerificationCreate(BaseModel):
    result: Literal["passed", "rejected"]
    method: Literal["manual", "external_rescan"] = "manual"
    comment: str = Field(min_length=2)
    version: int


class RiskAcceptanceCreate(BaseModel):
    reason: str = Field(min_length=2)
    compensating_control: str = Field(min_length=2)
    expires_at: datetime
    version: int


class RiskAcceptanceDecision(BaseModel):
    approved: bool
    comment: str = Field(min_length=2)
    version: int


class EventPublic(ORMModel):
    id: str
    event_type: str
    from_status: str | None
    to_status: str | None
    payload: dict[str, Any]
    occurred_at: datetime
    actor: UserPublic | None


class AuditPublic(ORMModel):
    id: str
    action: str
    object_type: str
    object_id: str
    before_data: dict[str, Any] | None
    after_data: dict[str, Any] | None
    occurred_at: datetime
    actor: UserPublic | None

