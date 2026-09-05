import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert, App as AntApp, Button, Card, ConfigProvider, Descriptions, Form, Input, Layout, Menu, Modal,
  Progress, Segmented, Select, Space, Spin, Statistic, Table, Tabs, Tag, Timeline, Typography, Upload,
  message, theme as antdTheme
} from "antd";
import {
  AlertOutlined, ApiOutlined, AppstoreOutlined, AuditOutlined, BarChartOutlined, BulbOutlined,
  CheckSquareOutlined, CloudUploadOutlined, DashboardOutlined, DatabaseOutlined, FileTextOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SafetyCertificateOutlined, SettingOutlined,
  SunOutlined, UserOutlined
} from "@ant-design/icons";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { api, clearToken, demoAccounts, findingQuery, getToken, login, switchRole, transitionFinding } from "./api";
import type { Asset, AuditEvent, Batch, Finding, FindingEvent, FindingStatus, Observation, Role, Severity, Source, User } from "./types";

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const roleLabels: Record<Role, string> = { platform_admin: "平台管理员", remediator: "整改人员", verifier: "验证人员" };
const severityLabels: Record<Severity, string> = { critical: "严重", high: "高危", medium: "中危", low: "低危", info: "提示" };
const statusLabels: Record<FindingStatus, string> = {
  pending_confirmation: "待确认", pending_remediation: "待整改", in_remediation: "整改中",
  pending_verification: "待验证", closed: "已关闭", false_positive: "误报",
  acceptance_requested: "风险接受申请", risk_accepted: "风险已接受"
};
const severityColors: Record<Severity, string> = { critical: "red", high: "orange", medium: "gold", low: "blue", info: "default" };

function BrandMark({ large = false }: { large?: boolean }) {
  return <span className={`riskhub-mark${large ? " riskhub-mark--large" : ""}`} role="img" aria-label="RiskHub 闭环治理标识">
    <span className="riskhub-mark__loop" aria-hidden="true" />
    <span className="riskhub-mark__check" aria-hidden="true" />
  </span>;
}

function useCurrentUser(enabled: boolean) {
  return useQuery({ queryKey: ["me"], queryFn: () => api<User>("/api/v1/me"), enabled, retry: false });
}

export function App() {
  const [colorMode, setColorMode] = useState<"light" | "dark">(() => localStorage.getItem("riskhub-theme") === "dark" ? "dark" : "light");
  useEffect(() => { document.documentElement.dataset.theme = colorMode; localStorage.setItem("riskhub-theme", colorMode); }, [colorMode]);
  return <ConfigProvider theme={{ algorithm: colorMode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: "#2478d4", borderRadius: 8, fontFamily: '-apple-system,"PingFang SC","Noto Sans SC",sans-serif' } }}>
    <AntApp><RiskHub colorMode={colorMode} setColorMode={setColorMode} /></AntApp>
  </ConfigProvider>;
}

function RiskHub({ colorMode, setColorMode }: { colorMode: "light" | "dark"; setColorMode: (value: "light" | "dark") => void }) {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const current = useCurrentUser(authenticated);
  if (!authenticated || current.isError) return <LoginScreen onSuccess={() => setAuthenticated(true)} colorMode={colorMode} setColorMode={setColorMode} />;
  if (current.isLoading || !current.data) return <div className="center-screen"><Spin size="large" /></div>;
  return <AppShell user={current.data} onUserChange={() => current.refetch()} onLogout={() => setAuthenticated(false)} colorMode={colorMode} setColorMode={setColorMode} />;
}

function LoginScreen({ onSuccess, colorMode, setColorMode }: { onSuccess: () => void; colorMode: "light" | "dark"; setColorMode: (value: "light" | "dark") => void }) {
  const [loading, setLoading] = useState<Role | null>(null);
  const enter = async (role: Role) => {
    setLoading(role);
    try { const account = demoAccounts[role]; await login(account.username, account.password); onSuccess(); }
    catch (error) { message.error(error instanceof Error ? error.message : "登录失败"); }
    finally { setLoading(null); }
  };
  return <div className="login-page">
    <button className="theme-float" onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}>{colorMode === "dark" ? <SunOutlined /> : <MoonOutlined />}</button>
    <div className="login-card">
      <div className="login-brand"><BrandMark large /><strong>RiskHub</strong><span className="brand-descriptor">RISK GOVERNANCE</span></div>
      <Title level={2}>风险聚合与闭环治理</Title>
      <Paragraph type="secondary">选择角色进入演示环境。所有账号使用本地种子数据，不连接外部系统。</Paragraph>
      <div className="role-options">
        {(Object.keys(roleLabels) as Role[]).map(role => <Button key={role} size="large" block type={role === "platform_admin" ? "primary" : "default"} loading={loading === role} onClick={() => enter(role)}>
          <UserOutlined /> 以{roleLabels[role]}身份进入
        </Button>)}
      </div>
      <Text type="secondary" className="login-hint">Demo 密码：RiskHub123!</Text>
    </div>
  </div>;
}

const menuItems = [
  { type: "group" as const, label: "总览", children: [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "工作台" },
    { key: "/my-work", icon: <CheckSquareOutlined />, label: "我的待办" }
  ]},
  { type: "group" as const, label: "风险治理", children: [
    { key: "/findings", icon: <SafetyCertificateOutlined />, label: "风险台账" },
    { key: "/assets", icon: <AppstoreOutlined />, label: "资产中心" },
    { key: "/reports", icon: <BarChartOutlined />, label: "报表中心" }
  ]},
  { type: "group" as const, label: "数据接入", children: [
    { key: "/sources", icon: <ApiOutlined />, label: "接入中心" },
    { key: "/import-batches", icon: <DatabaseOutlined />, label: "导入批次" }
  ]},
  { type: "group" as const, label: "系统", children: [
    { key: "/settings/governance", icon: <SettingOutlined />, label: "治理配置" },
    { key: "/audit-events", icon: <AuditOutlined />, label: "审计日志" }
  ]}
];

function AppShell({ user, onUserChange, onLogout, colorMode, setColorMode }: { user: User; onUserChange: () => void; onLogout: () => void; colorMode: "light" | "dark"; setColorMode: (value: "light" | "dark") => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const role = user.roles[0];
  const changeRole = async (nextRole: Role) => {
    await switchRole(nextRole);
    navigate("/my-work");
    await queryClient.invalidateQueries();
    onUserChange();
    message.success(`已切换为${roleLabels[nextRole]}视角`);
  };
  const logout = () => { clearToken(); queryClient.clear(); onLogout(); };
  const selectedKey = location.pathname.startsWith("/findings/") ? "/findings" : location.pathname;
  return <Layout className="app-layout">
    <Header className="top-header">
      <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
      <div className="brand"><BrandMark /><strong>RiskHub</strong><Tag color="blue">MVP</Tag></div>
      <div className="header-spacer" />
      <Input.Search className="global-search" placeholder="搜索风险编号、标题或资产" onSearch={value => navigate(`/findings?q=${encodeURIComponent(value)}`)} />
      <Button icon={colorMode === "dark" ? <SunOutlined /> : <MoonOutlined />} onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}>{colorMode === "dark" ? "浅色" : "深色"}</Button>
      <Button icon={<AlertOutlined />}>提醒 <Tag color="red">6</Tag></Button>
      <Select value={role} className="role-select" options={(Object.keys(roleLabels) as Role[]).map(key => ({ value: key, label: roleLabels[key] }))} onChange={changeRole} />
      <Button type="text" onClick={logout}>退出</Button>
    </Header>
    <Layout>
      <Sider width={252} collapsedWidth={72} collapsed={collapsed} theme={colorMode} className="app-sider">
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={({ key }) => navigate(key)} />
        {!collapsed && <div className="demo-note"><strong>当前身份</strong><br />{roleLabels[role]} · {user.display_name}</div>}
      </Sider>
      <Content className="main-content"><Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-work" element={<FindingsPage myWork />} />
        <Route path="/findings" element={<FindingsPage />} />
        <Route path="/findings/:id" element={<FindingDetailPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/sources" element={<SourcesPage admin={role === "platform_admin"} />} />
        <Route path="/import-batches" element={<BatchesPage admin={role === "platform_admin"} />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings/governance" element={<SettingsPage admin={role === "platform_admin"} />} />
        <Route path="/audit-events" element={<AuditPage admin={role === "platform_admin"} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></Content>
    </Layout>
  </Layout>;
}

function PageHeader({ title, description, extra }: { title: string; description: string; extra?: ReactNode }) {
  return <div className="page-header"><div><Text type="secondary" className="breadcrumb">首页 / {title}</Text><Title level={2}>{title}</Title><Text type="secondary">{description}</Text></div>{extra && <Space>{extra}</Space>}</div>;
}

function SeverityTag({ value }: { value: Severity }) { return <Tag color={severityColors[value]}>{severityLabels[value]}</Tag>; }
function StatusTag({ value }: { value: FindingStatus }) { return <Tag color={value === "closed" ? "green" : value === "pending_verification" ? "gold" : value === "risk_accepted" ? "cyan" : "blue"}>{statusLabels[value]}</Tag>; }
function dateText(value?: string) { return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "—"; }

function Dashboard() {
  const summary = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => api<any>("/api/v1/dashboard/summary") });
  const priorities = useQuery({ queryKey: ["dashboard-priorities"], queryFn: () => api<Finding[]>("/api/v1/dashboard/priorities") });
  const navigate = useNavigate();
  if (summary.isLoading) return <Spin />;
  const data = summary.data || { active: 0, critical_high: 0, sla_approaching: 0, closed: 0, by_status: {}, by_severity: {} };
  const metrics = [
    ["有效风险", data.active, "blue"], ["严重 / 高危", data.critical_high, "red"], ["即将违反 SLA", data.sla_approaching, "orange"], ["已关闭", data.closed, "green"],
    ["待确认", data.by_status.pending_confirmation || 0, "gold"], ["整改中", data.by_status.in_remediation || 0, "blue"], ["待验证", data.by_status.pending_verification || 0, "orange"], ["风险已接受", data.by_status.risk_accepted || 0, "green"]
  ];
  return <><PageHeader title="工作台" description="掌握风险态势和今天需要处理的事项" /><Alert showIcon type="info" message="今日治理提醒" description="优先关注严重、高危及即将违反 SLA 的风险。" action={<Button onClick={() => navigate("/my-work")}>查看我的待办</Button>} />
    <div className="metric-grid">{metrics.map(([title, value, color]) => <Card key={String(title)} title={title as string} extra="↻"><Statistic value={value as number} valueStyle={{ color: `var(--metric-${color})` }} suffix={<span className="stat-suffix">FINDINGS</span>} /></Card>)}</div>
    <div className="dashboard-grid"><Card title="优先处理" extra={<Button type="link" onClick={() => navigate("/findings")}>查看全部 →</Button>}><Table rowKey="id" pagination={false} showHeader={false} loading={priorities.isLoading} dataSource={priorities.data || []} onRow={record => ({ onClick: () => navigate(`/findings/${record.id}`) })} columns={[
      { render: (_, row) => <SeverityTag value={row.severity} /> }, { render: (_, row) => <div><strong>{row.title}</strong><div className="muted-line">{row.finding_no} · {row.asset.name} · {statusLabels[row.status]}</div></div> }, { align: "right", render: (_, row) => <Text type={row.due_at && dayjs(row.due_at).isBefore(dayjs()) ? "danger" : "secondary"}>{dateText(row.due_at)}</Text> }
    ]} /></Card><Card title="风险等级分布"><div className="severity-bars">{(Object.keys(severityLabels) as Severity[]).map(key => <div key={key}><div className="bar-label"><span>{severityLabels[key]}</span><strong>{data.by_severity[key] || 0}</strong></div><Progress percent={data.active ? Math.round((data.by_severity[key] || 0) / data.active * 100) : 0} showInfo={false} strokeColor={`var(--severity-${key})`} /></div>)}</div></Card></div>
  </>;
}

function FindingsPage({ myWork = false }: { myWork?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = new URLSearchParams(location.search);
  const [q, setQ] = useState(initial.get("q") || "");
  const [severity, setSeverity] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const findings = useQuery({ queryKey: ["findings", q, severity, status, myWork], queryFn: () => findingQuery({ q, severity, status }) });
  return <><PageHeader title={myWork ? "我的待办" : "风险台账"} description={myWork ? "仅展示当前角色有权处理的风险" : "统一查看、分级和跟踪所有风险"} />
    <Card className="filter-card"><Space wrap><Input.Search allowClear placeholder="搜索编号或标题" value={q} onChange={e => setQ(e.target.value)} /><Select allowClear placeholder="全部等级" value={severity} onChange={setSeverity} options={(Object.keys(severityLabels) as Severity[]).map(value => ({ value, label: severityLabels[value] }))} /><Select allowClear placeholder="全部状态" value={status} onChange={setStatus} options={(Object.keys(statusLabels) as FindingStatus[]).map(value => ({ value, label: statusLabels[value] }))} /><Text type="secondary">共 {findings.data?.total || 0} 项</Text></Space></Card>
    <Card className="table-card"><Table rowKey="id" loading={findings.isLoading} dataSource={findings.data?.items || []} pagination={{ pageSize: 20, total: findings.data?.total }} onRow={record => ({ onClick: () => navigate(`/findings/${record.id}`) })} columns={[
      { title: "风险", dataIndex: "title", render: (_, row) => <div><Text className="finding-no">{row.finding_no}</Text><br /><strong>{row.title}</strong></div> },
      { title: "等级", dataIndex: "severity", render: value => <SeverityTag value={value} /> },
      { title: "状态", dataIndex: "status", render: value => <StatusTag value={value} /> },
      { title: "资产", render: (_, row) => row.asset.name }, { title: "Owner", render: (_, row) => row.owner?.display_name || "未分配" },
      { title: "最近发现", dataIndex: "last_seen_at", render: dateText }, { title: "SLA", dataIndex: "due_at", render: value => <Text type={value && dayjs(value).isBefore(dayjs()) ? "danger" : "secondary"}>{dateText(value)}</Text> }
    ]} /></Card></>;
}

function FindingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState<string | null>(null);
  const [form] = Form.useForm();
  const finding = useQuery({ queryKey: ["finding", id], queryFn: () => api<Finding>(`/api/v1/findings/${id}`), enabled: Boolean(id) });
  const observations = useQuery({ queryKey: ["observations", id], queryFn: () => api<Observation[]>(`/api/v1/findings/${id}/observations`), enabled: tab === "observations" });
  const events = useQuery({ queryKey: ["events", id], queryFn: () => api<FindingEvent[]>(`/api/v1/findings/${id}/events`), enabled: tab === "timeline" });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/api/v1/users"), enabled: finding.data?.allowed_actions.includes("assign") });
  const mutate = useMutation({ mutationFn: async ({ action, values }: { action: string; values?: any }) => {
    const item = finding.data!;
    if (["CONFIRM", "MARK_FALSE_POSITIVE", "START_REMEDIATION"].includes(action)) return transitionFinding(item, action, values?.reason || "按流程操作");
    if (action === "SUBMIT_REMEDIATION") return api<Finding>(`/api/v1/findings/${item.id}/remediations`, { method: "POST", body: JSON.stringify({ ...values, evidence: [values.evidence], version: item.version }) });
    if (action === "VERIFY") return api<Finding>(`/api/v1/findings/${item.id}/verifications`, { method: "POST", body: JSON.stringify({ ...values, method: "manual", version: item.version }) });
    if (action === "REQUEST_ACCEPTANCE") return api<Finding>(`/api/v1/findings/${item.id}/risk-acceptances`, { method: "POST", body: JSON.stringify({ ...values, expires_at: new Date(values.expires_at).toISOString(), version: item.version }) });
    if (action === "ASSIGN") return api<Finding>(`/api/v1/findings/${item.id}/assignment`, { method: "PATCH", body: JSON.stringify({ ...values, due_at: new Date(values.due_at).toISOString(), version: item.version }) });
    if (action === "CHANGE_SEVERITY") return api<Finding>(`/api/v1/findings/${item.id}/severity`, { method: "PATCH", body: JSON.stringify({ ...values, version: item.version }) });
    if (action === "DECIDE_ACCEPTANCE") return api<Finding>(`/api/v1/findings/${item.id}/risk-acceptances/decision`, { method: "POST", body: JSON.stringify({ ...values, version: item.version }) });
    throw new Error("暂不支持该操作");
  }, onSuccess: async () => { message.success("操作成功"); setModal(null); form.resetFields(); await queryClient.invalidateQueries({ queryKey: ["finding", id] }); await queryClient.invalidateQueries({ queryKey: ["findings"] }); }, onError: error => message.error(error instanceof Error ? error.message : "操作失败") });
  if (finding.isLoading || !finding.data) return <Spin />;
  const item = finding.data;
  const actionButton = (key: string, label: string, primary = false) => <Button key={key} type={primary ? "primary" : "default"} block onClick={() => {
    if (key === "confirm" || key === "start_remediation") mutate.mutate({ action: key === "confirm" ? "CONFIRM" : "START_REMEDIATION" });
    else setModal(key);
  }}>{label}</Button>;
  const buttons: Record<string, ReactNode> = {
    assign: actionButton("assign", "分派责任人"), change_severity: actionButton("change_severity", "调整风险等级"),
    confirm: actionButton("confirm", "确认并进入待整改", true), mark_false_positive: actionButton("mark_false_positive", "标记误报"),
    start_remediation: actionButton("start_remediation", "开始整改", true), submit_remediation: actionButton("submit_remediation", "提交整改结果", true),
    verify_pass: actionButton("verify_pass", "验证通过并关闭", true), verify_reject: actionButton("verify_reject", "验证不通过"), request_acceptance: actionButton("request_acceptance", "申请风险接受"),
    approve_acceptance: actionButton("approve_acceptance", "批准风险接受", true), reject_acceptance: actionButton("reject_acceptance", "驳回风险接受")
  };
  const tabItems = [
    { key: "overview", label: "风险概览", children: <><Title level={4}>风险说明</Title><Paragraph>{item.description || "暂无说明"}</Paragraph><Title level={4}>整改建议</Title><Paragraph>{item.recommendation || "暂无建议"}</Paragraph><Descriptions bordered column={2} items={[{ key: "asset", label: "关联资产", children: item.asset.name }, { key: "team", label: "业务团队", children: item.asset.team }, { key: "priority", label: "治理优先级", children: item.priority }, { key: "count", label: "发现实例", children: item.observation_count }]} /></> },
    { key: "observations", label: `发现记录 (${item.observation_count})`, children: <Table rowKey="id" pagination={false} loading={observations.isLoading} dataSource={observations.data || []} columns={[{ title: "来源", render: (_, row) => row.source.name }, { title: "来源风险 ID", dataIndex: "source_finding_id" }, { title: "发现位置", dataIndex: "normalized_location" }, { title: "发现时间", dataIndex: "observed_at", render: dateText }, { title: "匹配方式", dataIndex: "match_method" }]} /> },
    { key: "remediation", label: "整改与验证", children: <Alert showIcon type="info" message="整改与验证记录由操作事件持续保留" description="整改人员提交证据后，系统自动流转至待验证；验证驳回后返回整改中。" /> },
    { key: "timeline", label: "操作时间线", children: <Timeline items={(events.data || []).map(event => ({ children: <div><strong>{event.event_type}</strong><div className="muted-line">{event.actor?.display_name || "系统"} · {dateText(event.occurred_at)}</div></div> }))} /> }
  ];
  return <><PageHeader title="风险详情" description="查看风险上下文并完成治理闭环" extra={<Button onClick={() => navigate("/findings")}>返回台账</Button>} />
    <div className="detail-grid"><div><Card className="detail-hero"><Text className="finding-no">{item.finding_no}</Text><Title level={3}>{item.title}</Title><Space wrap><SeverityTag value={item.severity} /><StatusTag value={item.status} /><Tag>风险评分 {item.risk_score}</Tag><Tag>{item.observation_count} 条发现实例</Tag></Space><StepsBar status={item.status} /></Card><Card className="detail-tabs"><Tabs activeKey={tab} onChange={setTab} items={tabItems} /></Card></div>
      <div className="side-column"><Card title="治理信息"><Descriptions column={1} size="small" items={[{ key: "owner", label: "Owner", children: item.owner?.display_name || "未分配" }, { key: "assignee", label: "整改人", children: item.assignee?.display_name || "未分配" }, { key: "verifier", label: "验证人", children: item.verifier?.display_name || "未分配" }, { key: "due", label: "截止时间", children: dateText(item.due_at) }, { key: "seen", label: "最近发现", children: dateText(item.last_seen_at) }]} /></Card><Card title="可执行操作"><Space direction="vertical" className="full-width">{item.allowed_actions.map(key => buttons[key]).filter(Boolean)}{!item.allowed_actions.length && <Button block disabled>当前无需操作</Button>}</Space></Card></div></div>
    <ActionModal modal={modal} users={users.data || []} form={form} loading={mutate.isPending} onCancel={() => setModal(null)} onSubmit={values => {
      if (modal === "mark_false_positive") mutate.mutate({ action: "MARK_FALSE_POSITIVE", values });
      else if (modal === "submit_remediation") mutate.mutate({ action: "SUBMIT_REMEDIATION", values });
      else if (modal === "verify_pass") mutate.mutate({ action: "VERIFY", values: { ...values, result: "passed" } });
      else if (modal === "verify_reject") mutate.mutate({ action: "VERIFY", values: { ...values, result: "rejected" } });
      else if (modal === "request_acceptance") mutate.mutate({ action: "REQUEST_ACCEPTANCE", values });
      else if (modal === "assign") mutate.mutate({ action: "ASSIGN", values });
      else if (modal === "change_severity") mutate.mutate({ action: "CHANGE_SEVERITY", values });
      else if (modal === "approve_acceptance") mutate.mutate({ action: "DECIDE_ACCEPTANCE", values: { ...values, approved: true } });
      else if (modal === "reject_acceptance") mutate.mutate({ action: "DECIDE_ACCEPTANCE", values: { ...values, approved: false } });
    }} />
  </>;
}

function StepsBar({ status }: { status: FindingStatus }) {
  const steps: FindingStatus[] = ["pending_confirmation", "pending_remediation", "in_remediation", "pending_verification", "closed"];
  const current = Math.max(0, steps.indexOf(status));
  return <div className="steps-bar">{steps.map((step, index) => <div key={step} className={index < current ? "done" : index === current ? "current" : ""}><span />{statusLabels[step]}</div>)}</div>;
}

function ActionModal({ modal, users, form, loading, onCancel, onSubmit }: { modal: string | null; users: User[]; form: any; loading: boolean; onCancel: () => void; onSubmit: (values: any) => void }) {
  const options = (role: Role) => users.filter(user => user.roles.includes(role)).map(user => ({ value: user.id, label: user.display_name }));
  const config: Record<string, { title: string; fields: ReactNode }> = {
    assign: { title: "分派责任人", fields: <><Form.Item name="owner_id" label="Owner" rules={[{ required: true }]}><Select options={options("platform_admin")} /></Form.Item><Form.Item name="assignee_id" label="整改人" rules={[{ required: true }]}><Select options={options("remediator")} /></Form.Item><Form.Item name="verifier_id" label="验证人" rules={[{ required: true }]}><Select options={options("verifier")} /></Form.Item><Form.Item name="due_at" label="整改截止时间" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item><Form.Item name="reason" label="分派说明" rules={[{ required: true, min: 2 }]}><Input.TextArea /></Form.Item></> },
    change_severity: { title: "调整风险等级", fields: <><Form.Item name="severity" label="新等级" rules={[{ required: true }]}><Select options={(Object.keys(severityLabels) as Severity[]).map(value => ({ value, label: severityLabels[value] }))} /></Form.Item><Form.Item name="reason" label="调整原因" rules={[{ required: true, min: 2 }]}><Input.TextArea /></Form.Item></> },
    mark_false_positive: { title: "标记误报", fields: <Form.Item name="reason" label="误报原因" rules={[{ required: true }]}><Input.TextArea /></Form.Item> },
    submit_remediation: { title: "提交整改结果", fields: <><Form.Item name="description" label="整改说明" rules={[{ required: true }]}><Input.TextArea /></Form.Item><Form.Item name="evidence" label="证据链接" rules={[{ required: true, type: "url" }]}><Input placeholder="https://..." /></Form.Item></> },
    verify_pass: { title: "验证通过并关闭", fields: <Form.Item name="comment" label="验证意见" rules={[{ required: true }]}><Input.TextArea /></Form.Item> },
    verify_reject: { title: "验证不通过", fields: <Form.Item name="comment" label="驳回原因" rules={[{ required: true }]}><Input.TextArea /></Form.Item> },
    request_acceptance: { title: "申请风险接受", fields: <><Form.Item name="reason" label="接受理由" rules={[{ required: true }]}><Input.TextArea /></Form.Item><Form.Item name="compensating_control" label="补偿措施" rules={[{ required: true }]}><Input.TextArea /></Form.Item><Form.Item name="expires_at" label="到期日期" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item></> },
    approve_acceptance: { title: "批准风险接受", fields: <Form.Item name="comment" label="审批意见" rules={[{ required: true, min: 2 }]}><Input.TextArea /></Form.Item> },
    reject_acceptance: { title: "驳回风险接受", fields: <Form.Item name="comment" label="驳回原因" rules={[{ required: true, min: 2 }]}><Input.TextArea /></Form.Item> }
  };
  const current = modal ? config[modal] : null;
  return <Modal open={Boolean(current)} title={current?.title} onCancel={onCancel} onOk={() => form.validateFields().then(onSubmit)} confirmLoading={loading} destroyOnHidden><Form form={form} layout="vertical">{current?.fields}</Form></Modal>;
}

function AssetsPage() {
  const assets = useQuery({ queryKey: ["assets"], queryFn: () => api<Asset[]>("/api/v1/assets") });
  return <><PageHeader title="资产中心" description="以治理对象为中心查看风险责任和分布" /><Card><Table rowKey="id" loading={assets.isLoading} dataSource={assets.data || []} columns={[{ title: "资产", render: (_, row) => <div><strong>{row.name}</strong><div className="muted-line">{row.asset_code}</div></div> }, { title: "类型", dataIndex: "type" }, { title: "团队", dataIndex: "team" }, { title: "Owner", render: (_, row) => row.owner?.display_name || "未分配" }, { title: "重要性", dataIndex: "importance", render: value => <Tag color={value === "core" ? "orange" : "blue"}>{value === "core" ? "核心" : "重要"}</Tag> }, { title: "暴露面", dataIndex: "exposure" }]}/></Card></>;
}

function SourcesPage({ admin }: { admin: boolean }) {
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api<Source[]>("/api/v1/sources") });
  return <><PageHeader title="接入中心" description="管理巡检来源、映射规则和接入健康度" /><div className="source-grid">{(sources.data || []).map(source => <Card key={source.id}><div className="source-heading"><span className="source-icon">{source.source_code.slice(0,2)}</span><Tag color={source.enabled ? "green" : "default"}>{source.enabled ? "正常" : "停用"}</Tag></div><Title level={4}>{source.name}</Title><Text type="secondary">{source.ingestion_type.toUpperCase()} 接入 · {source.adapter_type}</Text><div className="source-footer"><span>映射配置</span><Button disabled={!admin} size="small">配置</Button></div></Card>)}</div></>;
}

function BatchesPage({ admin }: { admin: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string>();
  const batches = useQuery({ queryKey: ["batches"], queryFn: () => api<Batch[]>("/api/v1/import-batches"), enabled: admin });
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api<Source[]>("/api/v1/sources") });
  const upload = async (file: File) => {
    if (!sourceId) { message.error("请先选择数据来源"); return false; }
    const form = new FormData(); form.append("file", file);
    try { await api(`/api/v1/import-batches/files?source_id=${sourceId}`, { method: "POST", body: form }); message.success("导入完成"); setOpen(false); queryClient.invalidateQueries({ queryKey: ["batches"] }); }
    catch (error) { message.error(error instanceof Error ? error.message : "导入失败"); }
    return false;
  };
  if (!admin) return <><PageHeader title="导入批次" description="仅平台管理员可以查看接入批次" /><Alert type="warning" showIcon message="无权访问" /></>;
  return <><PageHeader title="导入批次" description="追踪每一次数据接入和处理结果" extra={<Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setOpen(true)}>导入风险</Button>} /><Card><Table rowKey="id" loading={batches.isLoading} dataSource={batches.data || []} columns={[{ title: "批次编号", dataIndex: "batch_no", render: value => <Text className="finding-no">{value}</Text> }, { title: "文件", dataIndex: "filename" }, { title: "时间", dataIndex: "created_at", render: dateText }, { title: "总数", dataIndex: "total_count" }, { title: "成功", dataIndex: "success_count" }, { title: "失败", dataIndex: "failed_count" }, { title: "跳过", dataIndex: "skipped_count" }, { title: "状态", dataIndex: "status", render: value => <Tag color={value === "success" ? "green" : value === "failed" ? "red" : "gold"}>{value}</Tag> }]} /></Card><Modal open={open} title="导入 Excel 风险数据" onCancel={() => setOpen(false)} footer={null}><Space direction="vertical" className="full-width"><Select className="full-width" placeholder="选择来源" value={sourceId} onChange={setSourceId} options={(sources.data || []).map(source => ({ value: source.id, label: source.name }))} /><Upload.Dragger accept=".xlsx" maxCount={1} beforeUpload={upload}><CloudUploadOutlined className="upload-icon" /><p>点击或拖拽 Excel 文件到此处</p><Text type="secondary">必须包含 title 与 severity 列，最多 10,000 条</Text></Upload.Dragger></Space></Modal></>;
}

function ReportsPage() {
  const report = useQuery({ queryKey: ["report-overview"], queryFn: () => api<any>("/api/v1/reports/overview") });
  const data = report.data || {};
  return <><PageHeader title="报表中心" description="观察风险趋势、整改效率和 SLA 表现" /><Alert type="info" showIcon message="统计口径" description="有效风险不包含已关闭与误报；SLA 从进入待整改状态开始计算。" /><div className="metric-grid report-metrics"><Card><Statistic title="累计风险" value={data.total_findings || 0} /></Card><Card><Statistic title="有效风险" value={data.active_findings || 0} /></Card><Card><Statistic title="SLA 达标率" value={data.sla_compliance || 0} suffix="%" /></Card><Card><Statistic title="接入成功率" value={data.import_success_rate || 0} suffix="%" /></Card></div><div className="dashboard-grid"><Card title="近 6 个月风险趋势"><div className="fake-chart">{[38,55,44,66,73,58].map((value,index) => <div key={index}><span style={{height:`${value*2}px`}} /><Text type="secondary">{index+4}月</Text></div>)}</div></Card><Card title="治理质量"><div className="severity-bars"><div><div className="bar-label"><span>SLA 达标率</span><strong>{data.sla_compliance || 0}%</strong></div><Progress percent={data.sla_compliance || 0} /></div><div><div className="bar-label"><span>接入成功率</span><strong>{data.import_success_rate || 0}%</strong></div><Progress percent={data.import_success_rate || 0} strokeColor="var(--metric-green)" /></div></div></Card></div></>;
}

function SettingsPage({ admin }: { admin: boolean }) {
  const cards = [["等级映射", "将来源等级归一化为统一五级标准"], ["去重规则", "配置稳定 ID、字段指纹和作用域"], ["SLA 策略", "按等级配置整改时限和提醒"], ["自动分派", "根据资产自动设置治理责任人"], ["通知规则", "配置临期、逾期与驳回通知"], ["风险接受", "配置审批、期限和到期恢复"]];
  return <><PageHeader title="治理配置" description="统一配置分级、去重、SLA 和通知规则" />{!admin && <Alert type="warning" showIcon message="配置仅对平台管理员开放" />}<div className="source-grid">{cards.map(([title, desc], index) => <Card key={title}><span className="source-icon">{String(index + 1).padStart(2,"0")}</span><Title level={4}>{title}</Title><Paragraph type="secondary">{desc}</Paragraph><Button disabled={!admin}>配置</Button></Card>)}</div></>;
}

function AuditPage({ admin }: { admin: boolean }) {
  const logs = useQuery({ queryKey: ["audit"], queryFn: () => api<AuditEvent[]>("/api/v1/audit-events"), enabled: admin });
  if (!admin) return <><PageHeader title="审计日志" description="查看关键治理操作和字段变更" /><Alert type="warning" showIcon message="仅平台管理员可以查看全局审计日志" /></>;
  return <><PageHeader title="审计日志" description="查看关键治理操作和字段变更" /><Card><Table rowKey="id" loading={logs.isLoading} dataSource={logs.data || []} columns={[{ title: "操作者", render: (_, row) => row.actor?.display_name || "系统" }, { title: "操作", dataIndex: "action" }, { title: "对象类型", dataIndex: "object_type" }, { title: "对象 ID", dataIndex: "object_id", ellipsis: true }, { title: "时间", dataIndex: "occurred_at", render: dateText }]} /></Card></>;
}
