import type { Finding, FindingPage, Role, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "riskhub-access-token";

export class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    const message = typeof detail === "string" ? detail : detail?.message || "请求失败";
    if (response.status === 401) clearToken();
    throw new APIError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function downloadFile(path: string): Promise<Blob> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new APIError(response.status, "模板下载失败");
  return response.blob();
}

export async function login(username: string, password: string) {
  const result = await api<{ access_token: string }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  localStorage.setItem(TOKEN_KEY, result.access_token);
  return result;
}

export const demoAccounts: Record<Role, { username: string; password: string }> = {
  platform_admin: { username: "admin", password: "RiskHub123!" },
  remediator: { username: "remediator", password: "RiskHub123!" },
  verifier: { username: "verifier", password: "RiskHub123!" }
};

export async function switchRole(role: Role): Promise<User> {
  const account = demoAccounts[role];
  await login(account.username, account.password);
  return api<User>("/api/v1/me");
}

export async function transitionFinding(finding: Finding, action: string, reason = "按流程操作") {
  return api<Finding>(`/api/v1/findings/${finding.id}/transitions`, { method: "POST", body: JSON.stringify({ action, reason, version: finding.version }) });
}

export function findingQuery(params: { q?: string; severity?: string; status?: string } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.severity) query.set("severity", params.severity);
  if (params.status) query.set("status", params.status);
  return api<FindingPage>(`/api/v1/findings?${query}`);
}
