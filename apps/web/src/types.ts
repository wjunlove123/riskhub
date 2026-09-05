export type Role = "platform_admin" | "remediator" | "verifier";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "pending_confirmation" | "pending_remediation" | "in_remediation" | "pending_verification" | "closed" | "false_positive" | "acceptance_requested" | "risk_accepted";

export interface User {
  id: string;
  username: string;
  display_name: string;
  roles: Role[];
}

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  type: string;
  external_id?: string;
  business_system?: string;
  team: string;
  importance: string;
  exposure: string;
  status: string;
  environment?: string;
  owner?: User;
}

export interface Finding {
  id: string;
  finding_no: string;
  title: string;
  category?: string;
  description?: string;
  recommendation?: string;
  severity: Severity;
  risk_score: number;
  priority: string;
  status: FindingStatus;
  due_at?: string;
  first_seen_at: string;
  last_seen_at: string;
  observation_count: number;
  source_count: number;
  version: number;
  asset: Asset;
  owner?: User;
  assignee?: User;
  verifier?: User;
  allowed_actions: string[];
}

export interface FindingPage { items: Finding[]; total: number; page: number; page_size: number; }
export interface Source { id: string; source_code: string; name: string; ingestion_type: string; adapter_type: string; enabled: boolean; mapping_config: Record<string, string>; }
export interface GovernanceSetting { key: string; title: string; config: Record<string, string | number | boolean>; version: number; updated_at: string; }
export interface Batch { id: string; batch_no: string; source_id: string; filename?: string; status: string; total_count: number; success_count: number; failed_count: number; skipped_count: number; created_at: string; }
export interface Observation { id: string; source_finding_id?: string; source_rule_id?: string; source_severity: string; title: string; normalized_location: string; observed_at: string; match_method: string; source: Source; }
export interface FindingEvent { id: string; event_type: string; from_status?: string; to_status?: string; payload: Record<string, unknown>; occurred_at: string; actor?: User; }
export interface AuditEvent { id: string; action: string; object_type: string; object_id: string; before_data?: Record<string, unknown>; after_data?: Record<string, unknown>; occurred_at: string; actor?: User; }
