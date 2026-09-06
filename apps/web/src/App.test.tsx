import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { App, findingCountUnit, SeverityPie } from "./App";
import { api } from "./api";

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}{useLocation().search}</span>;
}

describe("RiskHub application", () => {
  it("uses a Chinese unit for finding metrics", () => {
    expect(findingCountUnit).toBe("项风险");
  });

  it("shows the three supported demo roles when signed out", () => {
    localStorage.clear();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole("img", { name: "RiskHub 闭环治理标识" })).toBeInTheDocument();
    expect(screen.queryByText("RH")).not.toBeInTheDocument();
    expect(screen.queryByText("MVP")).not.toBeInTheDocument();
    expect(screen.getByText("风险聚合与闭环治理")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /以平台管理员身份进入/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /以整改人员身份进入/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /以验证人员身份进入/ })).toBeInTheDocument();
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
});
