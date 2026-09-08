import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { App, appThemeTokens, FeishuDirectoryCard, findingCountUnit, RiskTrendChart, riskTrendData, SeverityPie } from "./App";
import { api, deleteFindings, findingQuery } from "./api";

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}{useLocation().search}</span>;
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
    render(<FeishuDirectoryCard status={{ configured: true, app_id_hint: "cli_…123456", department_name: "SRE", member_count: 12 }} onSync={onSync} />);
    expect(screen.getByText("SRE 部门 · 12 位成员")).toBeInTheDocument();
    expect(screen.getByText("当前应用：cli_…123456")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /同步通讯录/ }));
    expect(onSync).toHaveBeenCalledOnce();
  });
});
