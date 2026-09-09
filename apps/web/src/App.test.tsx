import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { App, appThemeTokens, buildRiskNotifications, FeishuDirectoryCard, findingCountUnit, NotificationCenter, RiskTrendChart, riskTrendData, SeverityPie } from "./App";
import { api, deleteFindings, findingQuery } from "./api";
import type { Finding } from "./types";

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}{useLocation().search}</span>;
}

function findingFixture(overrides: Partial<Finding>): Finding {
  return {
    id: "finding-1", finding_no: "RH-2026-0001", title: "开放的管理端口", severity: "high", risk_score: 8,
    priority: "P1", status: "pending_remediation", first_seen_at: "2026-09-01T00:00:00Z", last_seen_at: "2026-09-01T00:00:00Z",
    observation_count: 1, source_count: 1, version: 1, allowed_actions: [],
    asset: { id: "asset-1", asset_code: "OPS-1", name: "运维平台", type: "应用", team: "SRE", importance: "high", exposure: "internal", status: "active" },
    ...overrides
  };
}

describe("RiskHub application", () => {
  it("uses the same dark surface for navigation and detailed data containers", () => {
    const tokens = appThemeTokens("dark");
    expect(tokens.colorBgContainer).toBe("#151f2c");
    expect(tokens.colorBgElevated).toBe(tokens.colorBgContainer);
    expect(tokens.colorBorderSecondary).toBe("#2b394b");
  });

  it("uses a Chinese unit for finding metrics", () => {
    expect(findingCountUnit).toBe("项风险");
  });

  it("builds role-aware notifications and prioritizes overdue risks without duplicates", () => {
    const now = dayjs("2026-09-09T12:00:00Z");
    const notifications = buildRiskNotifications([
      findingFixture({ due_at: "2026-09-08T12:00:00Z" }),
      findingFixture({ id: "finding-2", finding_no: "RH-2026-0002", due_at: "2026-09-11T12:00:00Z" }),
      findingFixture({ id: "finding-3", finding_no: "RH-2026-0003", due_at: "2026-10-01T12:00:00Z" }),
      findingFixture({ id: "finding-4", status: "closed", due_at: "2026-09-01T12:00:00Z" })
    ], "remediator", now);
    expect(notifications.map(item => item.title)).toEqual(["风险已逾期", "风险即将到期", "待处理整改"]);
    expect(notifications.filter(item => item.findingId === "finding-1")).toHaveLength(1);
  });

  it("opens the notification panel and navigates through a notification", async () => {
    const onOpen = vi.fn();
    render(<NotificationCenter notifications={[{ id: "finding-1", findingId: "finding-1", title: "风险已逾期", description: "RH-2026-0001 · 开放的管理端口", level: "error" }]} onOpen={onOpen} onViewAll={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "消息提醒，1 条" }));
    expect(await screen.findByText("1 条待处理")).toBeInTheDocument();
    fireEvent.click(screen.getByText("风险已逾期"));
    expect(onOpen).toHaveBeenCalledWith("finding-1");
  });

  it("renders a readable six-month risk trend", () => {
    render(<RiskTrendChart />);
    expect(screen.getByRole("img", { name: /近六个月共新增 334 项风险/ })).toBeInTheDocument();
    expect(screen.getByText("9月环比 -21%")).toBeInTheDocument();
    expect(screen.getAllByTitle(/新增 \d+ 项风险/)).toHaveLength(riskTrendData.length);
  });

  it("requires a username and password when signed out", () => {
    localStorage.clear();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole("img", { name: "RiskHub 闭环治理标识" })).toBeInTheDocument();
    expect(screen.queryByText("RH")).not.toBeInTheDocument();
    expect(screen.queryByText("MVP")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "登录 RiskHub" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "用户名" })).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /登\s*录/ })).toBeInTheDocument();
    expect(screen.queryByText("RiskHub123!")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /以平台管理员身份进入/ })).not.toBeInTheDocument();
  });

  it("navigates from a pie segment to the matching severity list", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><SeverityPie values={{ critical: 2, high: 3, medium: 1, low: 0, info: 0 }} /><Routes><Route path="*" element={<LocationProbe />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("link", { name: /严重 2 项/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/findings?severity=critical");
  });

  it("accepts an empty response after deleting a finding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api<void>("/api/v1/findings/example", { method: "DELETE" })).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("passes pagination to the findings API and supports bulk deletion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 42, page: 2, page_size: 10 }), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted_count: 2 }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await findingQuery({ severity: "high", page: 2, pageSize: 10 });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/findings?severity=high&page=2&page_size=10");

    await expect(deleteFindings(["finding-1", "finding-2"])).resolves.toEqual({ deleted_count: 2 });
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/findings/bulk-delete");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST", body: JSON.stringify({ ids: ["finding-1", "finding-2"] }) });
    vi.unstubAllGlobals();
  });

  it("shows Feishu directory sync state and lets admins trigger a sync", () => {
    const onSync = vi.fn();
    render(<FeishuDirectoryCard status={{ configured: true, proxy_configured: true, app_id_hint: "cli_…123456", department_name: "SRE", department_count: 2, member_count: 12 }} onSync={onSync} />);
    expect(screen.getByText("SRE 等 2 个部门 · 12 位成员")).toBeInTheDocument();
    expect(screen.getByText("当前应用：cli_…123456")).toBeInTheDocument();
    expect(screen.getByText("网络代理：已配置")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /同步通讯录/ }));
    expect(onSync).toHaveBeenCalledOnce();
  });
});
