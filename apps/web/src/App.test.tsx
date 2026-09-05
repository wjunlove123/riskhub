import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";

describe("RiskHub application", () => {
  it("shows the three supported demo roles when signed out", () => {
    localStorage.clear();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole("img", { name: "RiskHub 闭环治理标识" })).toBeInTheDocument();
    expect(screen.queryByText("RH")).not.toBeInTheDocument();
    expect(screen.getByText("风险聚合与闭环治理")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /以平台管理员身份进入/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /以整改人员身份进入/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /以验证人员身份进入/ })).toBeInTheDocument();
  });
});
