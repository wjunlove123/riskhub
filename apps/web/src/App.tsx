import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert, App as AntApp, Button, Card, ConfigProvider, Descriptions, Form, Input, InputNumber, Layout, Menu, Modal,
  Progress, Select, Space, Spin, Statistic, Switch, Table, Tabs, Tag, Timeline, Typography, Upload,
  message, theme as antdTheme
} from "antd";
import {
  AlertOutlined, ApiOutlined, AppstoreOutlined, AuditOutlined, BarChartOutlined,
  CheckSquareOutlined, CloudUploadOutlined, DashboardOutlined, DatabaseOutlined, DeleteOutlined, DownloadOutlined, EditOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SafetyCertificateOutlined, SettingOutlined,
  SunOutlined, UserOutlined
} from "@ant-design/icons";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { api, clearToken, deleteFindings, downloadFile, findingQuery, getToken, login, transitionFinding } from "./api";
import type { Asset, AuditEvent, Batch, FeishuDirectoryStatus, FeishuSyncResult, Finding, FindingEvent, FindingStatus, GovernanceSetting, Observation, Role, Severity, Source, User } from "./types";

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
export const findingCountUnit = "项风险";
export const appThemeTokens = (mode: "light" | "dark") => mode === "dark" ? {
  colorBgBase: "#0e151f", colorBgLayout: "#0e151f", colorBgContainer: "#151f2c", colorBgElevated: "#151f2c",
  colorBorder: "#2b394b", colorBorderSecondary: "#2b394b", colorText: "#e7edf5", colorTextSecondary: "#9aaabd"
} : {
  colorBgBase: "#ffffff", colorBgLayout: "#f2f5f9", colorBgContainer: "#ffffff", colorBgElevated: "#ffffff",
  colorBorder: "#dbe3ee", colorBorderSecondary: "#dbe3ee", colorText: "#27364b", colorTextSecondary: "#6f7f95"
};

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
  return <ConfigProvider theme={{ algorithm: colorMode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { ...appThemeTokens(colorMode), colorPrimary: colorMode === "dark" ? "#56a3f3" : "#2478d4", borderRadius: 8, fontFamily: '-apple-system,"PingFang SC","Noto Sans SC",sans-serif' } }}>
    <AntApp><RiskHub colorMode={colorMode} setColorMode={setColorMode} /></AntApp>
  </ConfigProvider>;
}

function RiskHub({ colorMode, setColorMode }: { colorMode: "light" | "dark"; setColorMode: (value: "light" | "dark") => void }) {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const current = useCurrentUser(authenticated);
  if (!authenticated || current.isError) return <LoginScreen onSuccess={() => setAuthenticated(true)} colorMode={colorMode} setColorMode={setColorMode} />;
  if (current.isLoading || !current.data) return <div className="center-screen"><Spin size="large" /></div>;
  return <AppShell user={current.data} onLogout={() => setAuthenticated(false)} colorMode={colorMode} setColorMode={setColorMode} />;
}

function LoginScreen({ onSuccess, colorMode, setColorMode }: { onSuccess: () => void; colorMode: "light" | "dark"; setColorMode: (value: "light" | "dark") => void }) {
  const [loading, setLoading] = useState(false);
  const enter = async ({ username, password }: { username: string; password: string }) => {
    setLoading(true);
    try { await login(username.trim(), password); onSuccess(); }
    catch (error) { message.error(error instanceof Error ? error.message : "登录失败"); }
    finally { setLoading(false); }
  };
  return <div className="login-page">
    <button className="theme-float" onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}>{colorMode === "dark" ? <SunOutlined /> : <MoonOutlined />}</button>
    <div className="login-card">
      <div className="login-brand"><BrandMark large /><strong>RiskHub</strong><span className="brand-descriptor">RISK GOVERNANCE</span></div>
      <Title level={2}>登录 RiskHub</Title>
      <Paragraph type="secondary">请输入账号和密码进入风险治理平台。</Paragraph>
      <Form layout="vertical" onFinish={enter} requiredMark={false} className="login-form">
        <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}><Input size="large" prefix={<UserOutlined />} autoComplete="username" placeholder="请输入用户名" /></Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}><Input.Password size="large" autoComplete="current-password" placeholder="请输入密码" /></Form.Item>
        <Button size="large" block type="primary" htmlType="submit" loading={loading}>登录</Button>
      </Form>
      <Text type="secondary" className="login-hint">演示账号信息请查看项目 README</Text>
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

function AppShell({ user, onLogout, colorMode, setColorMode }: { user: User; onLogout: () => void; colorMode: "light" | "dark"; setColorMode: (value: "light" | "dark") => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const role = user.roles[0];
  const logout = () => { clearToken(); queryClient.clear(); onLogout(); };
  const selectedKey = location.pathname.startsWith("/findings/") ? "/findings" : location.pathname;
  return <Layout className="app-layout">
    <Header className="top-header">
      <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
      <div className="brand"><BrandMark /><strong>RiskHub</strong></div>
      <div className="header-spacer" />
      <Input.Search className="global-search" placeholder="搜索风险编号、标题或资产" onSearch={value => navigate(`/findings?q=${encodeURIComponent(value)}`)} />
      <Button icon={colorMode === "dark" ? <SunOutlined /> : <MoonOutlined />} onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}>{colorMode === "dark" ? "浅色" : "深色"}</Button>
      <Button icon={<AlertOutlined />}>提醒 <Tag color="red">6</Tag></Button>
      <Tag className="role-badge" icon={<UserOutlined />} color="blue">{roleLabels[role]}</Tag>
      <Button type="text" onClick={logout}>退出</Button>
    </Header>
    <Layout>
      <Sider width={252} collapsedWidth={72} collapsed={collapsed} theme={colorMode} className="app-sider">
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={({ key }) => navigate(key)} />
        {!collapsed && <div className="demo-note"><strong>当前身份</strong><br />{roleLabels[role]} · {user.display_name}</div>}
      </Sider>
      <Content className="main-content"><Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-work" element={<FindingsPage myWork admin={role === "platform_admin"} />} />
        <Route path="/findings" element={<FindingsPage admin={role === "platform_admin"} />} />
        <Route path="/findings/:id" element={<FindingDetailPage />} />
        <Route path="/assets" element={<AssetsPage admin={role === "platform_admin"} />} />
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

export function SeverityPie({ values }: { values: Record<Severity, number> }) {
  const navigate = useNavigate();
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  const total = order.reduce((sum, key) => sum + (values[key] || 0), 0);
  let offset = 0;
  const segments = order.map(key => {
    const value = values[key] || 0;
    const percent = total ? value / total * 100 : 0;
    const segment = { key, value, percent, offset };
    offset += percent;
    return segment;
  });
  return <div className="severity-pie-layout">
    <div className="severity-pie-wrap">
      <svg className="severity-pie" viewBox="0 0 180 180" role="img" aria-label="有效风险严重等级分布饼图">
        <circle className="severity-pie__track" cx="90" cy="90" r="58" pathLength="100" />
        {segments.filter(segment => segment.value > 0).map(segment => <a
          key={segment.key}
          href={`/findings?severity=${segment.key}`}
          aria-label={`${severityLabels[segment.key]} ${segment.value} 项，点击查看列表`}
          onClick={event => { event.preventDefault(); navigate(`/findings?severity=${segment.key}`); }}
        ><circle className="severity-pie__segment" cx="90" cy="90" r="58" pathLength="100" stroke={`var(--severity-${segment.key})`} strokeDasharray={`${segment.percent} ${100 - segment.percent}`} strokeDashoffset={-segment.offset}><title>{severityLabels[segment.key]}：{segment.value} 项（{Math.round(segment.percent)}%）</title></circle></a>)}
      </svg>
      <div className="severity-pie__total"><strong>{total}</strong><span>有效风险</span></div>
    </div>
    <div className="severity-legend">{segments.map(segment => <button key={segment.key} type="button" onClick={() => navigate(`/findings?severity=${segment.key}`)}><i style={{ background: `var(--severity-${segment.key})` }} /><span>{severityLabels[segment.key]}</span><strong>{segment.value}</strong></button>)}</div>
  </div>;
}

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
    <div className="metric-grid">{metrics.map(([title, value, color]) => <Card key={String(title)} title={title as string} extra="↻"><Statistic value={value as number} valueStyle={{ color: `var(--metric-${color})` }} suffix={<span className="stat-suffix">{findingCountUnit}</span>} /></Card>)}</div>
    <div className="dashboard-grid"><Card title="优先处理" extra={<Button type="link" onClick={() => navigate("/findings")}>查看全部 →</Button>}><Table rowKey="id" pagination={false} showHeader={false} loading={priorities.isLoading} dataSource={priorities.data || []} onRow={record => ({ onClick: () => navigate(`/findings/${record.id}`) })} columns={[
      { render: (_, row) => <SeverityTag value={row.severity} /> }, { render: (_, row) => <div><strong>{row.title}</strong><div className="muted-line">{row.finding_no} · {row.asset.name} · {statusLabels[row.status]}</div></div> }, { align: "right", render: (_, row) => <Text type={row.due_at && dayjs(row.due_at).isBefore(dayjs()) ? "danger" : "secondary"}>{dateText(row.due_at)}</Text> }
    ]} /></Card><Card title="风险等级饼图" extra={<Text type="secondary">点击扇区筛选</Text>}><SeverityPie values={data.by_severity} /></Card></div>
  </>;
}

function FindingsPage({ myWork = false, admin = false }: { myWork?: boolean; admin?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const initial = new URLSearchParams(location.search);
  const [q, setQ] = useState(initial.get("q") || "");
  const [severity, setSeverity] = useState<string | undefined>(initial.get("severity") || undefined);
  const [status, setStatus] = useState<string | undefined>(initial.get("status") || undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Finding | null>(null);
  const [form] = Form.useForm();
  const findings = useQuery({ queryKey: ["findings", q, severity, status, myWork, page, pageSize], queryFn: () => findingQuery({ q, severity, status, page, pageSize }) });
  const assets = useQuery({ queryKey: ["assets"], queryFn: () => api<Asset[]>("/api/v1/assets"), enabled: admin });
  const save = useMutation({ mutationFn: (values: any) => api<Finding>(`/api/v1/findings/${editing!.id}`, { method: "PATCH", body: JSON.stringify({ ...values, version: editing!.version }) }), onSuccess: async () => { message.success("风险信息已更新"); setEditing(null); form.resetFields(); await queryClient.invalidateQueries({ queryKey: ["findings"] }); }, onError: error => message.error(error instanceof Error ? error.message : "风险保存失败") });
  const bulkRemove = useMutation({ mutationFn: deleteFindings, onSuccess: async result => { const remaining = Math.max(0, (findings.data?.total || 0) - result.deleted_count); setPage(current => Math.min(current, Math.max(1, Math.ceil(remaining / pageSize)))); setSelectedIds([]); message.success(`已删除 ${result.deleted_count} 项风险`); await queryClient.invalidateQueries({ queryKey: ["findings"] }); }, onError: error => message.error(error instanceof Error ? error.message : "批量删除失败") });
  const remove = (finding: Finding) => Modal.confirm({ title: "删除风险", content: `确定删除“${finding.title}”吗？相关发现记录和治理过程也会一并删除，且无法恢复。`, okText: "确认删除", okType: "danger", cancelText: "取消", onOk: async () => { try { await api<void>(`/api/v1/findings/${finding.id}`, { method: "DELETE" }); message.success("风险已删除"); await queryClient.invalidateQueries({ queryKey: ["findings"] }); } catch (error) { message.error(error instanceof Error ? error.message : "风险删除失败"); } } });
  const confirmBulkRemove = () => Modal.confirm({ title: `批量删除 ${selectedIds.length} 项风险`, content: "所选风险的发现记录和治理过程也会一并删除，且无法恢复。", okText: "确认批量删除", okType: "danger", cancelText: "取消", onOk: () => bulkRemove.mutateAsync(selectedIds) });
  const edit = async (finding: Finding) => { const detail = await api<Finding>(`/api/v1/findings/${finding.id}`); setEditing(detail); form.setFieldsValue({ title: detail.title, category: detail.category || "general", description: detail.description, recommendation: detail.recommendation, severity: detail.severity, asset_id: detail.asset.id, reason: "修正导入数据" }); };
  return <><PageHeader title={myWork ? "我的待办" : "风险台账"} description={myWork ? "仅展示当前角色有权处理的风险" : "统一查看、分级和跟踪所有风险"} />
    <Card className="filter-card"><Space wrap><Input.Search allowClear placeholder="搜索编号或标题" value={q} onChange={e => { setQ(e.target.value); setPage(1); setSelectedIds([]); }} /><Select allowClear placeholder="全部等级" value={severity} onChange={value => { setSeverity(value); setPage(1); setSelectedIds([]); }} options={(Object.keys(severityLabels) as Severity[]).map(value => ({ value, label: severityLabels[value] }))} /><Select allowClear placeholder="全部状态" value={status} onChange={value => { setStatus(value); setPage(1); setSelectedIds([]); }} options={(Object.keys(statusLabels) as FindingStatus[]).map(value => ({ value, label: statusLabels[value] }))} /><Text type="secondary">共 {findings.data?.total || 0} 项</Text>{admin && <Button danger icon={<DeleteOutlined />} disabled={!selectedIds.length} loading={bulkRemove.isPending} onClick={confirmBulkRemove}>批量删除{selectedIds.length ? ` (${selectedIds.length})` : ""}</Button>}</Space></Card>
    <Card className="table-card"><Table rowKey="id" loading={findings.isLoading} dataSource={findings.data?.items || []} rowSelection={admin ? { selectedRowKeys: selectedIds, preserveSelectedRowKeys: true, onChange: keys => setSelectedIds(keys.map(String)), onCell: () => ({ onClick: event => event.stopPropagation() }) } : undefined} pagination={{ current: page, pageSize, total: findings.data?.total || 0, showSizeChanger: true, showTotal: total => `共 ${total} 项`, onChange: (nextPage, nextPageSize) => { setPage(nextPageSize === pageSize ? nextPage : 1); setPageSize(nextPageSize); } }} onRow={record => ({ onClick: () => navigate(`/findings/${record.id}`) })} columns={[
      { title: "风险", dataIndex: "title", render: (_, row) => <div><Text className="finding-no">{row.finding_no}</Text><br /><strong>{row.title}</strong></div> },
      { title: "等级", dataIndex: "severity", render: value => <SeverityTag value={value} /> },
      { title: "状态", dataIndex: "status", render: value => <StatusTag value={value} /> },
      { title: "资产", render: (_, row) => row.asset.name }, { title: "Owner", render: (_, row) => row.owner?.display_name || "未分配" },
      { title: "最近发现", dataIndex: "last_seen_at", render: dateText }, { title: "SLA", dataIndex: "due_at", render: value => <Text type={value && dayjs(value).isBefore(dayjs()) ? "danger" : "secondary"}>{dateText(value)}</Text> },
      { title: "操作", width: 150, render: (_, row) => <Space onClick={event => event.stopPropagation()}><Button type="link" size="small" icon={<EditOutlined />} disabled={!admin} onClick={() => edit(row)}>编辑</Button><Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={!admin} onClick={() => remove(row)}>删除</Button></Space> }
    ]} /></Card><Modal open={Boolean(editing)} title={`编辑风险 · ${editing?.finding_no || ""}`} onCancel={() => { setEditing(null); form.resetFields(); }} onOk={() => form.validateFields().then(values => save.mutate(values))} confirmLoading={save.isPending} okText="保存修改" width={680} destroyOnHidden><Alert className="settings-modal-tip" type="warning" showIcon message="修改统一风险信息不会改写原始导入记录；所有调整都会写入审计日志。" /><Form form={form} layout="vertical"><Form.Item name="title" label="风险标题" rules={[{ required: true }]}><Input /></Form.Item><div className="settings-field-grid"><Form.Item name="severity" label="严重等级" rules={[{ required: true }]}><Select options={(Object.keys(severityLabels) as Severity[]).map(value => ({ value, label: severityLabels[value] }))} /></Form.Item><Form.Item name="category" label="风险分类" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="asset_id" label="关联资产" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={(assets.data || []).map(asset => ({ value: asset.id, label: `${asset.asset_code} · ${asset.name}` }))} /></Form.Item><Form.Item name="reason" label="修改原因" rules={[{ required: true, min: 2 }]}><Input /></Form.Item></div><Form.Item name="description" label="风险说明"><Input.TextArea rows={3} /></Form.Item><Form.Item name="recommendation" label="整改建议"><Input.TextArea rows={3} /></Form.Item></Form></Modal></>;
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

function AssetsPage({ admin }: { admin: boolean }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Asset | null>(null);
  const [form] = Form.useForm();
  const assets = useQuery({ queryKey: ["assets"], queryFn: () => api<Asset[]>("/api/v1/assets") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/api/v1/users"), enabled: admin });
  const save = useMutation({ mutationFn: (values: any) => api<Asset>(`/api/v1/assets/${selected!.id}`, { method: "PATCH", body: JSON.stringify(values) }), onSuccess: async () => { message.success("资产信息已更新"); setSelected(null); form.resetFields(); await queryClient.invalidateQueries({ queryKey: ["assets"] }); }, onError: error => message.error(error instanceof Error ? error.message : "资产保存失败") });
  const edit = (asset: Asset) => { setSelected(asset); form.setFieldsValue({ ...asset, owner_id: asset.owner?.id, environment: asset.environment || "production" }); };
  return <><PageHeader title="资产中心" description="以治理对象为中心查看风险责任和分布" /><Card><Table rowKey="id" loading={assets.isLoading} dataSource={assets.data || []} columns={[{ title: "资产", render: (_, row) => <div><strong>{row.name}</strong><div className="muted-line">{row.asset_code}</div></div> }, { title: "类型", dataIndex: "type" }, { title: "团队", dataIndex: "team" }, { title: "Owner", render: (_, row) => row.owner?.display_name || "未分配" }, { title: "重要性", dataIndex: "importance", render: value => <Tag color={value === "core" ? "orange" : value === "important" ? "blue" : "default"}>{value === "core" ? "核心" : value === "important" ? "重要" : "普通"}</Tag> }, { title: "暴露面", dataIndex: "exposure", render: value => value === "internet" ? "互联网" : "内网" }, { title: "操作", width: 90, render: (_, row) => <Button type="link" icon={<EditOutlined />} disabled={!admin} onClick={() => edit(row)}>编辑</Button> }]}/></Card><Modal open={Boolean(selected)} title={`编辑资产 · ${selected?.asset_code || ""}`} onCancel={() => { setSelected(null); form.resetFields(); }} onOk={() => form.validateFields().then(values => save.mutate(values))} confirmLoading={save.isPending} okText="保存资产" width={660} destroyOnHidden><Alert className="settings-modal-tip" type="info" showIcon message="资产编码用于风险匹配，创建后不可修改。" /><Form form={form} layout="vertical"><div className="settings-field-grid"><Form.Item name="name" label="资产名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="type" label="资产类型" rules={[{ required: true }]}><Select options={["application","api","database","cloud","host","other"].map(value => ({ value, label: value }))} /></Form.Item><Form.Item name="business_system" label="所属业务系统"><Input /></Form.Item><Form.Item name="team" label="所属团队" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="owner_id" label="资产 Owner"><Select allowClear options={(users.data || []).map(user => ({ value: user.id, label: user.display_name }))} /></Form.Item><Form.Item name="external_id" label="外部资产 ID"><Input /></Form.Item><Form.Item name="importance" label="重要性" rules={[{ required: true }]}><Select options={[{value:"core",label:"核心"},{value:"important",label:"重要"},{value:"normal",label:"普通"}]} /></Form.Item><Form.Item name="exposure" label="暴露面" rules={[{ required: true }]}><Select options={[{value:"internet",label:"互联网"},{value:"internal",label:"内网"}]} /></Form.Item><Form.Item name="environment" label="环境" rules={[{ required: true }]}><Select options={["production","staging","test","development"].map(value => ({value,label:value}))} /></Form.Item><Form.Item name="status" label="资产状态" rules={[{ required: true }]}><Select options={[{value:"active",label:"启用"},{value:"inactive",label:"停用"}]} /></Form.Item></div></Form></Modal></>;
}

export function FeishuDirectoryCard({ status, loading, syncing, onSync }: { status?: FeishuDirectoryStatus; loading?: boolean; syncing?: boolean; onSync: () => void }) {
  const scope = (status?.department_count || 0) > 1 ? `${status?.department_name || "目标"} 等 ${status?.department_count} 个部门` : `${status?.department_name || "SRE"} 部门`;
  return <Card loading={loading}><div className="source-heading"><span className="source-icon">飞书</span><Tag color={status?.configured ? "green" : "orange"}>{status?.configured ? "已配置" : "待配置"}</Tag></div><Title level={4}>飞书通讯录</Title><Space orientation="vertical" size={2}><Text type="secondary">{scope} · {status?.member_count || 0} 位成员</Text>{status?.app_id_hint && <Text type="secondary">当前应用：{status.app_id_hint}</Text>}<Text type="secondary">网络代理：{status?.proxy_configured ? "已配置" : "未配置"}</Text></Space><div className="source-footer"><span>{status?.last_synced_at ? `上次同步 ${dayjs(status.last_synced_at).format("MM-DD HH:mm")}` : "尚未同步"}</span><Button size="small" type="primary" icon={<UserOutlined />} disabled={!status?.configured} loading={syncing} onClick={onSync}>同步通讯录</Button></div></Card>;
}

function SourcesPage({ admin }: { admin: boolean }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Source | null>(null);
  const [form] = Form.useForm();
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api<Source[]>("/api/v1/sources") });
  const feishu = useQuery({ queryKey: ["feishu-directory"], queryFn: () => api<FeishuDirectoryStatus>("/api/v1/integrations/feishu"), enabled: admin });
  const syncFeishu = useMutation({ mutationFn: () => api<FeishuSyncResult>("/api/v1/integrations/feishu/sync", { method: "POST" }), onSuccess: async result => { message.success(`已同步 ${result.total_count} 位成员`); await queryClient.invalidateQueries({ queryKey: ["feishu-directory"] }); await queryClient.invalidateQueries({ queryKey: ["users"] }); }, onError: error => message.error(error instanceof Error ? error.message : "飞书通讯录同步失败") });
  const save = useMutation({ mutationFn: (values: any) => api<Source>(`/api/v1/sources/${selected!.id}`, { method: "PATCH", body: JSON.stringify(values) }), onSuccess: async () => { message.success("接入配置已更新"); setSelected(null); form.resetFields(); await queryClient.invalidateQueries({ queryKey: ["sources"] }); }, onError: error => message.error(error instanceof Error ? error.message : "接入配置保存失败") });
  const edit = (source: Source) => { setSelected(source); form.setFieldsValue({ ...source, mapping_config: { title: "title", severity: "severity", asset: "asset_code", location: "location", ...source.mapping_config } }); };
  return <><PageHeader title="接入中心" description="管理巡检来源、通讯录和接入健康度" /><div className="source-grid">{admin && <FeishuDirectoryCard status={feishu.data} loading={feishu.isLoading} syncing={syncFeishu.isPending} onSync={() => syncFeishu.mutate()} />}{(sources.data || []).map(source => <Card key={source.id}><div className="source-heading"><span className="source-icon">{source.source_code.slice(0,2)}</span><Tag color={source.enabled ? "green" : "default"}>{source.enabled ? "正常" : "停用"}</Tag></div><Title level={4}>{source.name}</Title><Text type="secondary">{source.ingestion_type.toUpperCase()} 接入 · {source.adapter_type}</Text><div className="source-footer"><span>{Object.keys(source.mapping_config || {}).length || 4} 项字段映射</span><Button disabled={!admin} size="small" icon={<SettingOutlined />} onClick={() => edit(source)}>配置</Button></div></Card>)}</div><Modal open={Boolean(selected)} title={`配置接入 · ${selected?.source_code || ""}`} onCancel={() => { setSelected(null); form.resetFields(); }} onOk={() => form.validateFields().then(values => save.mutate(values))} confirmLoading={save.isPending} okText="保存配置" width={640} destroyOnHidden><Form form={form} layout="vertical"><div className="settings-field-grid"><Form.Item name="name" label="来源名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="ingestion_type" label="接入方式" rules={[{ required: true }]}><Select options={[{value:"api",label:"API"},{value:"excel",label:"Excel"}]} /></Form.Item><Form.Item name="adapter_type" label="适配器类型" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="enabled" label="启用接入" valuePropName="checked"><Switch /></Form.Item></div><Title level={5}>来源字段映射</Title><Paragraph type="secondary">填写来源数据中的字段名，系统将其转换为统一风险字段。</Paragraph><div className="settings-field-grid"><Form.Item name={["mapping_config","title"]} label="风险标题字段" rules={[{ required: true }]}><Input placeholder="title" /></Form.Item><Form.Item name={["mapping_config","severity"]} label="风险等级字段" rules={[{ required: true }]}><Input placeholder="severity" /></Form.Item><Form.Item name={["mapping_config","asset"]} label="资产编码字段" rules={[{ required: true }]}><Input placeholder="asset_code" /></Form.Item><Form.Item name={["mapping_config","location"]} label="发现位置字段" rules={[{ required: true }]}><Input placeholder="location" /></Form.Item></div></Form></Modal></>;
}

function BatchesPage({ admin }: { admin: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string>();
  const [manualForm] = Form.useForm();
  const batches = useQuery({ queryKey: ["batches"], queryFn: () => api<Batch[]>("/api/v1/import-batches"), enabled: admin });
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api<Source[]>("/api/v1/sources") });
  const upload = async (file: File) => {
    if (!sourceId) { message.error("请先选择数据来源"); return false; }
    const form = new FormData(); form.append("file", file);
    try { await api(`/api/v1/import-batches/files?source_id=${sourceId}`, { method: "POST", body: form }); message.success("导入完成"); setOpen(false); queryClient.invalidateQueries({ queryKey: ["batches"] }); }
    catch (error) { message.error(error instanceof Error ? error.message : "导入失败"); }
    return false;
  };
  const downloadTemplate = async () => {
    try {
      const blob = await downloadFile("/api/v1/import-batches/template");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "riskhub-finding-import-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      message.success("模板已下载");
    } catch (error) { message.error(error instanceof Error ? error.message : "模板下载失败"); }
  };
  const manualImport = useMutation({ mutationFn: (values: any) => {
    if (!sourceId) throw new Error("请先选择数据来源");
    const record = { ...values, observed_at: values.observed_at ? new Date(values.observed_at).toISOString() : undefined };
    return api<Batch>("/api/v1/import-batches/api", { method: "POST", headers: { "Idempotency-Key": `manual-${Date.now()}-${crypto.randomUUID()}` }, body: JSON.stringify({ source_id: sourceId, records: [record] }) });
  }, onSuccess: async () => { message.success("风险已录入并完成导入"); manualForm.resetFields(); setOpen(false); await queryClient.invalidateQueries({ queryKey: ["batches"] }); await queryClient.invalidateQueries({ queryKey: ["findings"] }); }, onError: error => message.error(error instanceof Error ? error.message : "风险录入失败") });
  if (!admin) return <><PageHeader title="导入批次" description="仅平台管理员可以查看接入批次" /><Alert type="warning" showIcon message="无权访问" /></>;
  const importTabs = [
    { key: "excel", label: "Excel 批量导入", children: <Space direction="vertical" size={14} className="full-width"><div className="template-callout"><div><strong>首次导入？请先使用标准模板</strong><Text type="secondary">模板包含字段说明、示例数据和风险等级下拉校验，可减少导入错误。</Text></div><Button icon={<DownloadOutlined />} onClick={downloadTemplate}>下载 Excel 模板</Button></div><Upload.Dragger accept=".xlsx" maxCount={1} beforeUpload={upload}><CloudUploadOutlined className="upload-icon" /><p>点击或拖拽 Excel 文件到此处</p><Text type="secondary">必须包含 title 与 severity 列，最多 10,000 条</Text></Upload.Dragger></Space> },
    { key: "manual", label: "自定义录入", children: <Form form={manualForm} layout="vertical" onFinish={values => manualImport.mutate(values)}><div className="settings-field-grid"><Form.Item name="title" label="风险标题" rules={[{ required: true, message: "请输入风险标题" }]}><Input placeholder="简明描述风险问题" /></Form.Item><Form.Item name="severity" label="风险等级" rules={[{ required: true, message: "请选择风险等级" }]}><Select options={(Object.keys(severityLabels) as Severity[]).map(value => ({ value, label: severityLabels[value] }))} /></Form.Item><Form.Item name="source_finding_id" label="来源风险 ID"><Input placeholder="推荐填写，用于稳定去重" /></Form.Item><Form.Item name="source_rule_id" label="来源规则 ID"><Input /></Form.Item><Form.Item name="asset_code" label="资产编码" rules={[{ required: true, message: "请输入资产编码" }]}><Input placeholder="例如 OPS-PLATFORM" /></Form.Item><Form.Item name="location" label="发现位置"><Input placeholder="URL、文件路径或资源地址" /></Form.Item></div><Form.Item name="description" label="风险描述"><Input.TextArea rows={3} /></Form.Item><Form.Item name="recommendation" label="整改建议"><Input.TextArea rows={2} /></Form.Item><Form.Item name="observed_at" label="发现时间"><Input type="datetime-local" /></Form.Item><div className="modal-actions"><Button onClick={() => manualForm.resetFields()}>清空</Button><Button type="primary" htmlType="submit" loading={manualImport.isPending}>提交并导入</Button></div></Form> }
  ];
  return <><PageHeader title="导入批次" description="追踪每一次数据接入和处理结果" extra={<Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setOpen(true)}>导入风险</Button>} /><Card><Table rowKey="id" loading={batches.isLoading} dataSource={batches.data || []} columns={[{ title: "批次编号", dataIndex: "batch_no", render: value => <Text className="finding-no">{value}</Text> }, { title: "文件", dataIndex: "filename" }, { title: "时间", dataIndex: "created_at", render: dateText }, { title: "总数", dataIndex: "total_count" }, { title: "成功", dataIndex: "success_count" }, { title: "失败", dataIndex: "failed_count" }, { title: "跳过", dataIndex: "skipped_count" }, { title: "状态", dataIndex: "status", render: value => <Tag color={value === "success" ? "green" : value === "failed" ? "red" : "gold"}>{value}</Tag> }]} /></Card><Modal open={open} title="风险数据导入" onCancel={() => { setOpen(false); manualForm.resetFields(); }} footer={null} width={720} destroyOnHidden><Form.Item label="数据来源" required><Select className="full-width" placeholder="选择来源后再导入" value={sourceId} onChange={setSourceId} options={(sources.data || []).map(source => ({ value: source.id, label: source.name }))} /></Form.Item><Tabs items={importTabs} /></Modal></>;
}

function ReportsPage() {
  const report = useQuery({ queryKey: ["report-overview"], queryFn: () => api<any>("/api/v1/reports/overview") });
  const data = report.data || {};
  return <><PageHeader title="报表中心" description="观察风险趋势、整改效率和 SLA 表现" /><Alert type="info" showIcon message="统计口径" description="有效风险不包含已关闭与误报；SLA 从进入待整改状态开始计算。" /><div className="metric-grid report-metrics"><Card><Statistic title="累计风险" value={data.total_findings || 0} /></Card><Card><Statistic title="有效风险" value={data.active_findings || 0} /></Card><Card><Statistic title="SLA 达标率" value={data.sla_compliance || 0} suffix="%" /></Card><Card><Statistic title="接入成功率" value={data.import_success_rate || 0} suffix="%" /></Card></div><div className="dashboard-grid"><Card title="近 6 个月风险趋势" extra={<Text type="secondary">新增风险（项）</Text>}><RiskTrendChart /></Card><Card title="治理质量"><div className="severity-bars"><div><div className="bar-label"><span>SLA 达标率</span><strong>{data.sla_compliance || 0}%</strong></div><Progress percent={data.sla_compliance || 0} /></div><div><div className="bar-label"><span>接入成功率</span><strong>{data.import_success_rate || 0}%</strong></div><Progress percent={data.import_success_rate || 0} strokeColor="var(--metric-green)" /></div></div></Card></div></>;
}

export const riskTrendData = [
  { month: "4月", value: 38 }, { month: "5月", value: 55 }, { month: "6月", value: 44 },
  { month: "7月", value: 66 }, { month: "8月", value: 73 }, { month: "9月", value: 58 }
];

export function RiskTrendChart() {
  const ceiling = 80;
  const total = riskTrendData.reduce((sum, item) => sum + item.value, 0);
  const peak = Math.max(...riskTrendData.map(item => item.value));
  const latest = riskTrendData.at(-1)!;
  const previous = riskTrendData.at(-2)!;
  const change = Math.round(((latest.value - previous.value) / previous.value) * 100);
  return <div className="risk-trend" role="img" aria-label={`近六个月共新增 ${total} 项风险，峰值为 ${peak} 项，${latest.month}新增 ${latest.value} 项`}>
    <div className="risk-trend__summary"><div><strong>{total}</strong><span>近 6 个月累计新增</span></div><Tag color={change < 0 ? "green" : "orange"}>{latest.month}环比 {change > 0 ? "+" : ""}{change}%</Tag></div>
    <div className="risk-trend__chart">
      <div className="risk-trend__axis" aria-hidden="true">{[80, 60, 40, 20, 0].map(value => <span key={value}>{value}</span>)}</div>
      <div className="risk-trend__plot">{[80, 60, 40, 20, 0].map(value => <i className="risk-trend__gridline" key={value} />)}<div className="risk-trend__bars">{riskTrendData.map(item => <div className="risk-trend__column" key={item.month} title={`${item.month}：新增 ${item.value} 项风险`}><div className={`risk-trend__bar${item.value === peak ? " is-peak" : ""}`} style={{ height: `${item.value / ceiling * 100}%` }}><b>{item.value}</b></div><span>{item.month}</span></div>)}</div></div>
    </div>
  </div>;
}

function SettingsPage({ admin }: { admin: boolean }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<GovernanceSetting | null>(null);
  const [form] = Form.useForm();
  const settings = useQuery({ queryKey: ["governance-settings"], queryFn: () => api<GovernanceSetting[]>("/api/v1/governance-settings"), enabled: admin });
  const save = useMutation({ mutationFn: (config: Record<string, string | number | boolean>) => api<GovernanceSetting>(`/api/v1/governance-settings/${selected!.key}`, { method: "PATCH", body: JSON.stringify({ config, version: selected!.version }) }), onSuccess: async () => { message.success("治理规则已更新"); setSelected(null); form.resetFields(); await queryClient.invalidateQueries({ queryKey: ["governance-settings"] }); }, onError: error => message.error(error instanceof Error ? error.message : "保存失败") });
  const cards = [
    ["severity_mapping", "等级映射", "将来源等级归一化为统一五级标准"], ["deduplication", "去重规则", "配置稳定 ID、字段指纹和作用域"],
    ["sla", "SLA 策略", "按等级配置整改时限和提醒"], ["auto_assignment", "自动分派", "根据资产自动设置治理责任人"],
    ["notifications", "通知规则", "配置临期、逾期与驳回通知"], ["risk_acceptance", "风险接受", "配置审批、期限和到期恢复"]
  ];
  const openSetting = (key: string) => {
    const setting = settings.data?.find(item => item.key === key);
    if (!setting) return;
    setSelected(setting);
    form.setFieldsValue(setting.config);
  };
  const fields: Record<string, ReactNode> = {
    severity_mapping: <div className="settings-field-grid">{(["critical", "high", "medium", "low", "info"] as Severity[]).map(key => <Form.Item key={key} name={key} label={`${severityLabels[key]}显示名称`} rules={[{ required: true }]}><Input /></Form.Item>)}</div>,
    deduplication: <><Form.Item name="stable_id_enabled" label="稳定 ID 去重" valuePropName="checked"><Switch /></Form.Item><Form.Item name="field_hash_enabled" label="字段指纹去重" valuePropName="checked"><Switch /></Form.Item><Form.Item name="scope" label="去重作用域" rules={[{ required: true }]}><Select options={[{ value: "source_asset", label: "来源 + 资产" }, { value: "global_asset", label: "全局 + 资产" }, { value: "source", label: "仅来源内" }]} /></Form.Item></>,
    sla: <div className="settings-field-grid">{(["critical", "high", "medium", "low", "info"] as Severity[]).map(key => <Form.Item key={key} name={`${key}_days`} label={`${severityLabels[key]}整改时限（天）`} rules={[{ required: true }]}><InputNumber min={1} max={365} className="full-width" /></Form.Item>)}<Form.Item name="remind_before_days" label="提前提醒（天）" rules={[{ required: true }]}><InputNumber min={1} max={30} className="full-width" /></Form.Item></div>,
    auto_assignment: <><Form.Item name="enabled" label="启用自动分派" valuePropName="checked"><Switch /></Form.Item><Form.Item name="strategy" label="分派依据" rules={[{ required: true }]}><Select options={[{ value: "asset_owner", label: "资产 Owner" }, { value: "asset_team", label: "资产所属团队" }, { value: "source_mapping", label: "来源映射规则" }]} /></Form.Item><Form.Item name="fallback_to_admin" label="无法匹配时分派给管理员" valuePropName="checked"><Switch /></Form.Item></>,
    notifications: <><div className="settings-switch-list">{[["assignment", "风险分派"], ["approaching_sla", "SLA 临期"], ["overdue", "SLA 逾期"], ["verification_rejected", "验证驳回"]].map(([key, label]) => <Form.Item key={key} name={key} label={label} valuePropName="checked"><Switch /></Form.Item>)}</div><Form.Item name="channel" label="通知渠道" rules={[{ required: true }]}><Select options={[{ value: "in_app", label: "站内通知" }, { value: "feishu", label: "飞书机器人" }, { value: "email", label: "邮件" }]} /></Form.Item></>,
    risk_acceptance: <><Form.Item name="max_days" label="最长接受期限（天）" rules={[{ required: true }]}><InputNumber min={1} max={365} className="full-width" /></Form.Item><Form.Item name="require_compensating_control" label="必须填写补偿措施" valuePropName="checked"><Switch /></Form.Item><Form.Item name="restore_on_expiry" label="到期自动恢复治理" valuePropName="checked"><Switch /></Form.Item><Form.Item name="approver_role" label="审批角色"><Select options={[{ value: "platform_admin", label: "平台管理员" }]} /></Form.Item></>
  };
  return <><PageHeader title="治理配置" description="统一配置分级、去重、SLA 和通知规则" />{!admin && <Alert type="warning" showIcon message="配置仅对平台管理员开放" />}{admin && <div className="source-grid">{cards.map(([key, title, desc], index) => { const setting = settings.data?.find(item => item.key === key); return <Card key={key} loading={settings.isLoading}><div className="setting-card-heading"><span className="source-icon">{String(index + 1).padStart(2,"0")}</span>{setting && <Tag color="green">已启用</Tag>}</div><Title level={4}>{title}</Title><Paragraph type="secondary">{desc}</Paragraph><div className="setting-card-footer"><Text type="secondary">{setting ? `版本 v${setting.version} · ${dayjs(setting.updated_at).format("MM-DD HH:mm")}` : "正在读取配置"}</Text><Button icon={<EditOutlined />} disabled={!setting} onClick={() => openSetting(key)}>配置</Button></div></Card>; })}</div>}<Modal open={Boolean(selected)} title={`配置 · ${selected?.title || ""}`} onCancel={() => { setSelected(null); form.resetFields(); }} onOk={() => form.validateFields().then(values => save.mutate(values))} confirmLoading={save.isPending} okText="保存规则" destroyOnHidden><Alert className="settings-modal-tip" type="info" showIcon message="保存后立即对新进入治理流程的风险生效，并记录审计日志。" /><Form form={form} layout="vertical">{selected ? fields[selected.key] : null}</Form></Modal></>;
}

function AuditPage({ admin }: { admin: boolean }) {
  const logs = useQuery({ queryKey: ["audit"], queryFn: () => api<AuditEvent[]>("/api/v1/audit-events"), enabled: admin });
  if (!admin) return <><PageHeader title="审计日志" description="查看关键治理操作和字段变更" /><Alert type="warning" showIcon message="仅平台管理员可以查看全局审计日志" /></>;
  return <><PageHeader title="审计日志" description="查看关键治理操作和字段变更" /><Card><Table rowKey="id" loading={logs.isLoading} dataSource={logs.data || []} columns={[{ title: "操作者", render: (_, row) => row.actor?.display_name || "系统" }, { title: "操作", dataIndex: "action" }, { title: "对象类型", dataIndex: "object_type" }, { title: "对象 ID", dataIndex: "object_id", ellipsis: true }, { title: "时间", dataIndex: "occurred_at", render: dateText }]} /></Card></>;
}
