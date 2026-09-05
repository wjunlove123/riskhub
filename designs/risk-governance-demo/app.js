const findingsSeed = [
  { id: "RF-2026-0146", title: "公网管理后台存在弱口令策略", severity: "critical", severityLabel: "严重", status: "待整改", asset: "统一运维平台", owner: "陈晓宇", assignee: "李明", source: "主机基线巡检", firstSeen: "2026-08-28", lastSeen: "今天 09:42", due: "已逾期 2 天", overdue: true, observations: 4, score: 9.6 },
  { id: "RF-2026-0142", title: "订单服务 Log4j 组件版本存在高危漏洞", severity: "critical", severityLabel: "严重", status: "整改中", asset: "订单中心", owner: "王蕾", assignee: "周启", source: "SCA 依赖扫描", firstSeen: "2026-09-01", lastSeen: "今天 08:20", due: "剩余 1 天", overdue: false, observations: 3, score: 9.4 },
  { id: "RF-2026-0138", title: "对象存储 Bucket 允许匿名读取", severity: "high", severityLabel: "高危", status: "待验证", asset: "营销素材库", owner: "赵一鸣", assignee: "赵一鸣", source: "云配置巡检", firstSeen: "2026-08-30", lastSeen: "昨天 17:10", due: "剩余 3 天", overdue: false, observations: 2, score: 8.2 },
  { id: "RF-2026-0131", title: "用户查询接口缺少访问频率限制", severity: "high", severityLabel: "高危", status: "待确认", asset: "用户中心 API", owner: "未分配", assignee: "—", source: "API 安全巡检", firstSeen: "2026-09-03", lastSeen: "昨天 15:31", due: "待确认", overdue: false, observations: 1, score: 7.8 },
  { id: "RF-2026-0126", title: "生产环境数据库审计未启用", severity: "high", severityLabel: "高危", status: "风险已接受", asset: "会员数据库", owner: "吴海", assignee: "吴海", source: "数据库巡检", firstSeen: "2026-08-20", lastSeen: "09-03 11:20", due: "接受至 09-30", overdue: false, observations: 5, score: 7.4 },
  { id: "RF-2026-0119", title: "应用容器未配置只读根文件系统", severity: "medium", severityLabel: "中危", status: "待整改", asset: "推荐引擎", owner: "宋佳", assignee: "曹原", source: "容器基线巡检", firstSeen: "2026-08-18", lastSeen: "09-02 09:12", due: "剩余 8 天", overdue: false, observations: 8, score: 6.1 },
  { id: "RF-2026-0107", title: "内部服务 TLS 证书将在 14 天内过期", severity: "medium", severityLabel: "中危", status: "整改中", asset: "支付网关", owner: "徐扬", assignee: "徐扬", source: "证书巡检", firstSeen: "2026-08-26", lastSeen: "09-01 14:02", due: "剩余 5 天", overdue: false, observations: 2, score: 5.7 },
  { id: "RF-2026-0098", title: "Git 仓库分支保护规则未开启", severity: "low", severityLabel: "低危", status: "已关闭", asset: "风控策略服务", owner: "韩冬", assignee: "韩冬", source: "研发效能巡检", firstSeen: "2026-08-11", lastSeen: "08-29 18:40", due: "按时关闭", overdue: false, observations: 1, score: 3.2 }
];

const sources = [
  { icon: "XL", name: "Excel 手工导入", type: "文件接入", state: "正常", latest: "今天 10:04", batches: 28, success: "98.7%", findings: 423 },
  { icon: "AP", name: "API 安全巡检", type: "API 接入", state: "正常", latest: "今天 09:31", batches: 116, success: "100%", findings: 184 },
  { icon: "SC", name: "SCA 依赖扫描", type: "API 接入", state: "正常", latest: "今天 08:20", batches: 92, success: "99.4%", findings: 267 },
  { icon: "CL", name: "云配置巡检", type: "API 接入", state: "正常", latest: "昨天 17:10", batches: 54, success: "100%", findings: 96 },
  { icon: "DB", name: "数据库巡检", type: "Excel 接入", state: "需关注", latest: "09-03 11:20", batches: 19, success: "91.2%", findings: 61 },
  { icon: "CT", name: "容器基线巡检", type: "API 接入", state: "正常", latest: "09-02 09:12", batches: 72, success: "99.8%", findings: 138 }
];

const batches = [
  { id: "IMP-260905-028", source: "Excel 手工导入", file: "九月主机风险汇总.xlsx", time: "今天 10:04", total: 386, success: 372, failed: 8, skipped: 6, state: "部分成功" },
  { id: "IMP-260905-027", source: "API 安全巡检", file: "API 请求", time: "今天 09:31", total: 64, success: 64, failed: 0, skipped: 0, state: "成功" },
  { id: "IMP-260905-026", source: "SCA 依赖扫描", file: "API 请求", time: "今天 08:20", total: 128, success: 128, failed: 0, skipped: 0, state: "成功" },
  { id: "IMP-260904-025", source: "云配置巡检", file: "cloud_posture_0904.xlsx", time: "昨天 17:10", total: 42, success: 42, failed: 0, skipped: 0, state: "成功" },
  { id: "IMP-260903-024", source: "数据库巡检", file: "数据库合规检查.xlsx", time: "09-03 11:20", total: 71, success: 63, failed: 8, skipped: 0, state: "部分成功" }
];

const assets = [
  { name: "统一运维平台", type: "应用", team: "基础架构组", owner: "陈晓宇", importance: "核心", active: 12, overdue: 3 },
  { name: "订单中心", type: "应用", team: "交易平台组", owner: "王蕾", importance: "核心", active: 18, overdue: 1 },
  { name: "营销素材库", type: "云资源", team: "营销技术组", owner: "赵一鸣", importance: "重要", active: 7, overdue: 0 },
  { name: "用户中心 API", type: "API", team: "用户平台组", owner: "未分配", importance: "核心", active: 9, overdue: 2 },
  { name: "会员数据库", type: "数据库", team: "数据平台组", owner: "吴海", importance: "重要", active: 6, overdue: 0 },
  { name: "推荐引擎", type: "应用", team: "算法工程组", owner: "宋佳", importance: "重要", active: 14, overdue: 2 }
];

const state = {
  page: "dashboard",
  collapsed: false,
  theme: localStorage.getItem("riskhub-theme") === "dark" ? "dark" : "light",
  role: "平台管理员",
  roleMenu: false,
  modal: null,
  selectedId: null,
  findingTab: "overview",
  query: "",
  severity: "全部等级",
  status: "全部状态",
  findings: findingsSeed.map(item => ({ ...item }))
};

const navGroups = [
  { title: "总览", items: [
    { id: "dashboard", icon: "▦", label: "工作台" },
    { id: "mywork", icon: "✓", label: "我的待办" }
  ]},
  { title: "风险治理", items: [
    { id: "findings", icon: "◇", label: "风险台账" },
    { id: "assets", icon: "▣", label: "资产中心" },
    { id: "reports", icon: "▥", label: "报表中心" }
  ]},
  { title: "数据接入", items: [
    { id: "sources", icon: "↥", label: "接入中心" },
    { id: "batches", icon: "≡", label: "导入批次" }
  ]},
  { title: "系统", items: [
    { id: "settings", icon: "⌁", label: "治理配置" },
    { id: "audit", icon: "◴", label: "审计日志" }
  ]}
];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function severityChip(finding) {
  return `<span class="chip ${finding.severity}">${finding.severityLabel}</span>`;
}

function statusChip(status) {
  const cls = status === "已关闭" ? "success" : status.includes("接受") ? "medium" : status === "待验证" ? "pending" : "status";
  return `<span class="chip ${cls}">${status}</span>`;
}

function toast(message) {
  const root = document.getElementById("toast-root");
  root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  window.setTimeout(() => { root.innerHTML = ""; }, 2600);
}

function pageMeta() {
  const map = {
    dashboard: ["工作台", "掌握风险态势和今天需要处理的事项"],
    mywork: ["我的待办", `当前以“${state.role}”身份查看待办`],
    findings: ["风险台账", "统一查看、分级和跟踪所有风险"],
    assets: ["资产中心", "以治理对象为中心查看风险责任和分布"],
    reports: ["报表中心", "观察风险趋势、整改效率和 SLA 表现"],
    sources: ["接入中心", "管理巡检来源、映射规则和接入健康度"],
    batches: ["导入批次", "追踪每一次数据接入和处理结果"],
    settings: ["治理配置", "统一配置分级、去重、SLA 和通知规则"],
    audit: ["审计日志", "查看关键治理操作和字段变更"],
    detail: ["风险详情", "查看风险上下文并完成治理闭环"]
  };
  return map[state.page] || map.dashboard;
}

function renderShell() {
  document.documentElement.dataset.theme = state.theme;
  const [title, desc] = pageMeta();
  const navHtml = navGroups.map(group => `
    <div class="nav-section">
      <div class="nav-section-title">${group.title}</div>
      ${group.items.map(item => `<button class="nav-item ${state.page === item.id ? "active" : ""}" data-nav="${item.id}" title="${item.label}"><span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span></button>`).join("")}
    </div>`).join("");

  document.getElementById("app").innerHTML = `
    <div class="app-shell" data-screen-label="RiskHub 主应用">
      <header class="topbar">
        <button class="menu-toggle" data-action="toggle-sidebar" aria-label="切换侧边栏">☰</button>
        <div class="brand"><div class="brand-mark">RH</div><div class="brand-name">RiskHub</div><span class="edition">DEMO</span></div>
        <div class="topbar-spacer"></div>
        <div class="global-search"><span class="search-glyph">⌕</span><input data-global-search placeholder="搜索风险编号、标题或资产"></div>
        <button class="top-action theme-toggle" data-action="toggle-theme" aria-label="切换为${state.theme === "dark" ? "浅色" : "深色"}主题" title="切换主题"><span>${state.theme === "dark" ? "☼" : "◐"}</span><span class="action-label">${state.theme === "dark" ? "浅色" : "深色"}</span></button>
        <button class="top-action" data-action="alerts"><span>●</span><span class="action-label">提醒</span><span class="alert-count">6</span></button>
        <div class="user-menu-wrap">
          <button class="top-action" data-action="role-menu"><span>●</span><span class="action-label">${state.role}</span><span>⌄</span></button>
          ${state.roleMenu ? `<div class="role-menu"><button class="${state.role === "平台管理员" ? "active" : ""}" data-role="平台管理员">平台管理员</button><button class="${state.role === "整改人员" ? "active" : ""}" data-role="整改人员">整改人员</button><button class="${state.role === "验证人员" ? "active" : ""}" data-role="验证人员">验证人员</button></div>` : ""}
        </div>
      </header>
      <div class="body-grid ${state.collapsed ? "collapsed" : ""}">
        <aside class="sidebar">${navHtml}<div class="sidebar-foot"><strong>演示说明</strong><br>点击右上角角色，可切换三种操作视角。</div></aside>
        <main class="content">
          <div class="page-header">
            <div><div class="breadcrumb">首页 / ${title}</div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div>
            <div class="header-actions">${headerActions()}</div>
          </div>
          ${renderPage()}
        </main>
      </div>
    </div>`;
  bindEvents();
}

function headerActions() {
  if (state.page === "findings") return `<button class="btn">导出当前结果</button><button class="btn primary" data-action="new-finding" ${state.role !== "平台管理员" ? "disabled" : ""}>＋ 新建风险</button>`;
  if (state.page === "sources" || state.page === "batches") return `<button class="btn primary" data-action="open-import" ${state.role !== "平台管理员" ? "disabled" : ""}>＋ 导入风险</button>`;
  if (state.page === "detail") return `<button class="btn" data-nav="findings">返回台账</button>`;
  if (state.page === "reports") return `<button class="btn">导出报表</button>`;
  return `<button class="btn" data-action="refresh">刷新数据</button>`;
}

function renderPage() {
  if (state.page === "dashboard") return dashboardPage();
  if (state.page === "mywork") return findingsPage(true);
  if (state.page === "findings") return findingsPage(false);
  if (state.page === "detail") return detailPage();
  if (state.page === "sources") return sourcesPage();
  if (state.page === "batches") return batchesPage();
  if (state.page === "assets") return assetsPage();
  if (state.page === "reports") return reportsPage();
  if (state.page === "settings") return settingsPage();
  if (state.page === "audit") return auditPage();
  return dashboardPage();
}

function dashboardPage() {
  return `
    <div class="notice"><span><strong>今日治理提醒：</strong> 2 项严重风险已逾期，4 项风险等待验证。</span><button class="btn small" data-nav="mywork">查看我的待办</button></div>
    <section class="metric-grid">
      ${metricCard("有效风险", "146", "FINDINGS", "blue", "较上周 +8")}
      ${metricCard("严重 / 高危", "38", "FINDINGS", "red", "优先处理")}
      ${metricCard("即将违反 SLA", "12", "FINDINGS", "orange", "未来 3 天")}
      ${metricCard("本周已关闭", "27", "FINDINGS", "green", "达标率 91.6%")}
      ${metricCard("待确认", "16", "FINDINGS", "yellow", "含 5 项未分配")}
      ${metricCard("整改中", "54", "FINDINGS", "blue", "平均 6.2 天")}
      ${metricCard("待验证", "9", "FINDINGS", "orange", "最久等待 2 天")}
      ${metricCard("风险已接受", "7", "FINDINGS", "green", "2 项本月到期")}
    </section>
    <section class="dashboard-grid">
      <div class="card"><div class="card-head"><div class="card-title">优先处理</div><button class="btn ghost small" data-nav="findings">查看全部 →</button></div><div class="stack-list">
        ${state.findings.slice(0, 5).map(taskRow).join("")}
      </div></div>
      <div class="card"><div class="card-head"><div class="card-title">风险等级分布</div><span class="task-meta">当前有效风险</span></div><div class="card-body"><div class="donut-layout"><div class="donut"></div><div class="legend">
        ${legendRow("#e5484d", "严重", 18)}${legendRow("#e67e22", "高危", 38)}${legendRow("#e6b400", "中危", 51)}${legendRow("#2478d4", "低危", 28)}${legendRow("#9aa8b8", "提示", 11)}
      </div></div></div></div>
    </section>`;
}

function metricCard(title, value, label, color, note) {
  return `<div class="metric-card"><div class="metric-head"><span>${title}</span><span>↻</span></div><div class="metric-body"><div class="metric-value ${color}">${value}</div><div class="metric-label">${label} · ${note}</div></div></div>`;
}
function taskRow(item) {
  return `<div class="task-row" data-finding="${item.id}"><div class="severity-dot ${item.severity}">${item.severityLabel.slice(0,1)}</div><div><div class="task-title">${item.title}</div><div class="task-meta">${item.id} · ${item.asset} · ${item.status}</div></div><div class="due ${item.overdue ? "overdue" : ""}">${item.due}</div></div>`;
}
function legendRow(color, name, count) {
  return `<div class="legend-row"><span class="legend-swatch" style="background:${color}"></span><span>${name}</span><strong>${count}</strong></div>`;
}

function filteredFindings(myWork) {
  return state.findings.filter(item => {
    const roleMatch = !myWork || (state.role === "整改人员" ? ["待整改", "整改中"].includes(item.status) : state.role === "验证人员" ? item.status === "待验证" : item.status !== "已关闭");
    const text = `${item.id} ${item.title} ${item.asset}`.toLowerCase();
    const qMatch = text.includes(state.query.toLowerCase());
    const sevMatch = state.severity === "全部等级" || item.severityLabel === state.severity;
    const statusMatch = state.status === "全部状态" || item.status === state.status;
    return roleMatch && qMatch && sevMatch && statusMatch;
  });
}

function findingsPage(myWork) {
  const rows = filteredFindings(myWork);
  return `
    ${myWork ? `<div class="notice"><span><strong>角色视角：</strong> ${state.role === "整改人员" ? "仅显示需要你整改的风险。" : state.role === "验证人员" ? "仅显示等待你验证的风险。" : "显示平台内尚未关闭的风险。"}</span><button class="btn small" data-action="role-menu">切换角色</button></div>` : ""}
    <div class="toolbar">
      <input class="field search-field" data-filter="query" value="${escapeHtml(state.query)}" placeholder="搜索风险编号、标题或资产">
      <select class="field" data-filter="severity"><option>全部等级</option>${["严重","高危","中危","低危"].map(x => `<option ${state.severity === x ? "selected" : ""}>${x}</option>`).join("")}</select>
      <select class="field" data-filter="status"><option>全部状态</option>${["待确认","待整改","整改中","待验证","已关闭","风险已接受"].map(x => `<option ${state.status === x ? "selected" : ""}>${x}</option>`).join("")}</select>
      <span class="result-count">共 ${rows.length} 项</span>
    </div>
    <div class="table-card"><table class="data-table"><thead><tr><th>风险</th><th>等级</th><th>状态</th><th>资产</th><th>责任人</th><th>来源</th><th>最近发现</th><th>SLA</th></tr></thead><tbody>
      ${rows.length ? rows.map(item => `<tr data-finding="${item.id}"><td class="finding-cell"><div class="finding-id">${item.id}</div><div class="finding-title">${item.title}</div></td><td>${severityChip(item)}</td><td>${statusChip(item.status)}</td><td>${item.asset}</td><td>${item.owner}</td><td>${item.source}</td><td>${item.lastSeen}</td><td class="due ${item.overdue ? "overdue" : ""}">${item.due}</td></tr>`).join("") : `<tr><td colspan="8"><div class="empty"><strong>没有符合条件的风险</strong>请调整筛选条件或切换角色。</div></td></tr>`}
    </tbody></table></div>`;
}

function detailPage() {
  const item = state.findings.find(f => f.id === state.selectedId) || state.findings[0];
  const steps = ["待确认", "待整改", "整改中", "待验证", "已关闭"];
  let current = steps.indexOf(item.status);
  if (current < 0) current = item.status === "风险已接受" ? 2 : 0;
  return `
    <div class="detail-layout">
      <div>
        <section class="detail-hero">
          <div class="detail-id">${item.id}</div><h2 class="detail-title">${item.title}</h2>
          <div class="detail-tags">${severityChip(item)}${statusChip(item.status)}<span class="chip info">风险评分 ${item.score}</span><span class="chip info">${item.observations} 条发现实例</span></div>
          <div class="stepper">${steps.map((step, i) => `<div class="step ${i < current ? "done" : i === current ? "current" : ""}">${step}</div>`).join("")}</div>
        </section>
        <div class="tabs"><button class="tab ${state.findingTab === "overview" ? "active" : ""}" data-tab="overview">风险概览</button><button class="tab ${state.findingTab === "observations" ? "active" : ""}" data-tab="observations">发现记录 (${item.observations})</button><button class="tab ${state.findingTab === "remediation" ? "active" : ""}" data-tab="remediation">整改与验证</button><button class="tab ${state.findingTab === "timeline" ? "active" : ""}" data-tab="timeline">操作时间线</button></div>
        <div class="detail-panel">${detailTabContent(item)}</div>
      </div>
      <aside class="side-stack">
        <section class="side-section"><h3 class="side-title">治理信息</h3>
          ${sideKv("Owner", item.owner)}${sideKv("整改人", item.assignee)}${sideKv("验证人", "张宁")}${sideKv("截止时间", item.due)}${sideKv("首次发现", item.firstSeen)}${sideKv("最近发现", item.lastSeen)}
        </section>
        <section class="side-section"><h3 class="side-title">可执行操作</h3><div class="action-stack">${detailActions(item)}</div></section>
        <section class="side-section"><h3 class="side-title">快速时间线</h3><div class="timeline"><div class="timeline-item"><div class="timeline-main">${item.source} 再次发现</div><div class="timeline-time">${item.lastSeen}</div></div><div class="timeline-item"><div class="timeline-main">平台完成自动聚合</div><div class="timeline-time">匹配稳定来源 ID</div></div><div class="timeline-item"><div class="timeline-main">${item.owner} 被设为 Owner</div><div class="timeline-time">自动分派规则</div></div></div></section>
      </aside>
    </div>`;
}

function sideKv(label, value) { return `<div class="side-kv"><span>${label}</span><strong>${value}</strong></div>`; }

function detailActions(item) {
  if (state.role === "平台管理员") {
    return `<button class="btn primary" data-action="assign">调整分派</button><button class="btn" data-action="change-severity">调整等级</button><button class="btn" data-action="accept-risk">风险接受</button><button class="btn danger" data-action="mark-false">标记误报</button>`;
  }
  if (state.role === "整改人员") {
    if (item.status === "待整改") return `<button class="btn primary" data-action="start-remediation">开始整改</button><button class="btn" data-action="accept-risk">申请风险接受</button>`;
    if (item.status === "整改中") return `<button class="btn primary" data-action="submit-remediation">提交整改结果</button><button class="btn" data-action="accept-risk">申请风险接受</button>`;
    return `<button class="btn" disabled>当前无需整改操作</button>`;
  }
  if (state.role === "验证人员") {
    if (item.status === "待验证") return `<button class="btn primary" data-action="verify-pass">验证通过并关闭</button><button class="btn danger" data-action="verify-reject">验证不通过</button>`;
    return `<button class="btn" disabled>当前无需验证操作</button>`;
  }
  return "";
}

function detailTabContent(item) {
  if (state.findingTab === "overview") return `<h3>风险说明</h3><p>该资产暴露在公网的管理入口仍允许使用弱口令，攻击者可能通过凭据猜测获得管理权限。平台已将来自主机基线、口令策略和外部暴露面巡检的 ${item.observations} 条记录聚合为同一项风险。</p><h3>整改建议</h3><p>启用强密码策略与多因素认证；关闭不必要的公网管理入口；对连续失败登录进行限制并接入安全告警。</p><div class="kv-grid"><div class="kv"><div class="kv-label">关联资产</div><div class="kv-value">${item.asset}</div></div><div class="kv"><div class="kv-label">业务团队</div><div class="kv-value">基础架构组</div></div><div class="kv"><div class="kv-label">标准化位置</div><div class="kv-value">ops.example.internal:443/admin</div></div><div class="kv"><div class="kv-label">去重依据</div><div class="kv-value">资产 + 规则 ID + 服务端口</div></div></div>`;
  if (state.findingTab === "observations") return `<h3>关联的发现实例</h3><div class="table-card" style="border-top:1px solid var(--line);border-radius:8px"><table class="data-table"><thead><tr><th>来源</th><th>来源风险 ID</th><th>发现时间</th><th>匹配方式</th></tr></thead><tbody><tr><td>主机基线巡检</td><td>HOST-PWD-4021</td><td>今天 09:42</td><td><span class="chip success">稳定 ID</span></td></tr><tr><td>外部暴露面巡检</td><td>ASM-8840</td><td>昨天 20:16</td><td><span class="chip info">字段指纹</span></td></tr><tr><td>口令策略巡检</td><td>PWD-291</td><td>09-01 14:22</td><td><span class="chip info">人工合并</span></td></tr></tbody></table></div>`;
  if (state.findingTab === "remediation") return `<h3>整改记录</h3><div class="notice"><span><strong>尚未提交最终证据。</strong> 整改人员提交结果后，由验证人员独立复核。</span></div><div class="timeline"><div class="timeline-item"><div class="timeline-main">李明开始整改</div><div class="timeline-time">今天 11:20 · 计划关闭公网入口并启用 MFA</div></div><div class="timeline-item"><div class="timeline-main">陈晓宇完成分派</div><div class="timeline-time">昨天 10:15</div></div></div>`;
  return `<h3>完整操作记录</h3><div class="timeline"><div class="timeline-item"><div class="timeline-main">系统更新最近发现时间</div><div class="timeline-time">今天 09:42 · IMP-260905-028</div></div><div class="timeline-item"><div class="timeline-main">李明将状态从“待整改”更新为“整改中”</div><div class="timeline-time">今天 09:20</div></div><div class="timeline-item"><div class="timeline-main">平台管理员将风险分派给李明</div><div class="timeline-time">昨天 10:15</div></div><div class="timeline-item"><div class="timeline-main">系统创建统一风险并关联 3 条发现</div><div class="timeline-time">2026-08-28 14:22</div></div></div>`;
}

function sourcesPage() {
  return `<div class="source-grid">${sources.map(src => `<div class="source-card"><div class="source-top"><div class="source-icon">${src.icon}</div><span class="chip ${src.state === "正常" ? "success" : "pending"}">${src.state}</span></div><div class="source-name">${src.name}</div><div class="source-meta">${src.type} · 最近接入 ${src.latest}</div><div class="source-stats"><div class="source-stat"><strong>${src.batches}</strong><span>累计批次</span></div><div class="source-stat"><strong>${src.success}</strong><span>成功率</span></div><div class="source-stat"><strong>${src.findings}</strong><span>发现实例</span></div></div></div>`).join("")}</div>`;
}

function batchesPage() {
  return `<div class="toolbar"><input class="field search-field" placeholder="搜索批次编号或文件名"><select class="field"><option>全部来源</option>${sources.map(x => `<option>${x.name}</option>`).join("")}</select><span class="result-count">最近 30 天</span></div><div class="table-card"><table class="data-table"><thead><tr><th>批次编号</th><th>来源 / 文件</th><th>导入时间</th><th>处理进度</th><th>成功</th><th>失败</th><th>跳过</th><th>状态</th></tr></thead><tbody>${batches.map(batch => `<tr><td class="finding-id">${batch.id}</td><td><strong>${batch.source}</strong><div class="task-meta">${batch.file}</div></td><td>${batch.time}</td><td><div class="progress"><span style="width:${Math.round(batch.success/batch.total*100)}%"></span></div></td><td class="green">${batch.success}</td><td class="${batch.failed ? "red" : ""}">${batch.failed}</td><td>${batch.skipped}</td><td>${statusChip(batch.state)}</td></tr>`).join("")}</tbody></table></div>`;
}

function assetsPage() {
  return `<div class="toolbar"><input class="field search-field" placeholder="搜索资产名称、团队或负责人"><select class="field"><option>全部资产类型</option><option>应用</option><option>API</option><option>云资源</option><option>数据库</option></select><span class="result-count">共 ${assets.length} 项</span></div><div class="table-card"><table class="data-table"><thead><tr><th>资产</th><th>类型</th><th>所属团队</th><th>Owner</th><th>重要性</th><th>有效风险</th><th>逾期</th></tr></thead><tbody>${assets.map(asset => `<tr><td><strong>${asset.name}</strong></td><td><span class="chip info">${asset.type}</span></td><td>${asset.team}</td><td>${asset.owner}</td><td><span class="chip ${asset.importance === "核心" ? "high" : "medium"}">${asset.importance}</span></td><td>${asset.active}</td><td class="${asset.overdue ? "red" : "green"}">${asset.overdue}</td></tr>`).join("")}</tbody></table></div>`;
}

function reportsPage() {
  return `<div class="notice"><span><strong>统计口径：</strong>有效风险不包含已关闭与误报；SLA 从进入待整改状态开始计算。</span><button class="btn small">查看口径说明</button></div><div class="report-grid">
    <div class="card"><div class="card-head"><div class="card-title">近 6 个月风险趋势</div><span class="task-meta">新增 / 关闭</span></div><div class="card-body"><div class="bar-chart">${[[42,28],[56,41],[49,45],[64,53],[71,62],[58,49]].map((v,i) => `<div class="bar-col"><div style="height:180px;display:flex;align-items:flex-end;gap:5px;width:100%;justify-content:center"><div class="bar" style="height:${v[0]*2}px"></div><div class="bar secondary" style="height:${v[1]*2}px"></div></div><span>${["4月","5月","6月","7月","8月","9月"][i]}</span></div>`).join("")}</div></div></div>
    <div class="card"><div class="card-head"><div class="card-title">各团队 SLA 达标率</div><span class="task-meta">本季度</span></div><div class="card-body"><div class="h-bars">${[["交易平台组",96],["基础架构组",88],["用户平台组",82],["数据平台组",93],["营销技术组",91]].map(v => `<div class="h-row"><span>${v[0]}</span><div class="h-track"><div class="h-fill" style="width:${v[1]}%"></div></div><strong>${v[1]}%</strong></div>`).join("")}</div></div></div>
    <div class="card"><div class="card-head"><div class="card-title">治理效率</div><span class="task-meta">近 30 天</span></div><div class="card-body"><div class="metric-grid" style="grid-template-columns:repeat(3,1fr);margin:0"><div><div class="metric-value blue" style="font-size:30px">1.4</div><div class="metric-label">平均确认 / 天</div></div><div><div class="metric-value green" style="font-size:30px">6.2</div><div class="metric-label">平均整改 / 天</div></div><div><div class="metric-value orange" style="font-size:30px">0.8</div><div class="metric-label">平均验证 / 天</div></div></div></div></div>
    <div class="card"><div class="card-head"><div class="card-title">数据质量</div><span class="task-meta">近 30 天</span></div><div class="card-body"><div class="h-bars">${[["接入成功率",98],["资产识别率",94],["自动分派率",89],["自动去重率",76]].map(v => `<div class="h-row"><span>${v[0]}</span><div class="h-track"><div class="h-fill" style="width:${v[1]}%"></div></div><strong>${v[1]}%</strong></div>`).join("")}</div></div></div>
  </div>`;
}

function settingsPage() {
  const cards = [["等级映射","将不同来源的等级归一化为统一五级标准","6 个来源已配置"],["去重规则","配置稳定 ID、字段指纹和资产内作用域","8 条规则生效"],["SLA 策略","按风险等级配置整改时限和提醒节点","1 套默认策略"],["自动分派","根据资产和团队自动设置 Owner 与整改人","覆盖率 89%"],["通知规则","设置临期、逾期、驳回和重新打开通知","平台内 + 飞书"],["风险接受","配置接受期限、审批和到期恢复策略","最长 90 天"]];
  return `<div class="source-grid">${cards.map((x,i) => `<div class="source-card"><div class="source-top"><div class="source-icon">${String(i+1).padStart(2,"0")}</div><button class="btn small">配置</button></div><div class="source-name">${x[0]}</div><div class="source-meta">${x[1]}</div><div style="margin-top:14px"><span class="chip success">${x[2]}</span></div></div>`).join("")}</div>`;
}

function auditPage() {
  const logs = [["平台管理员","调整风险等级","RF-2026-0146","高危 → 严重","今天 10:31"],["张宁","验证不通过","RF-2026-0138","证据不足，退回整改","今天 09:48"],["系统","自动关联发现","RF-2026-0142","SCA-LOG4J-221","今天 08:20"],["平台管理员","人工合并","RF-2026-0119","合并 2 条 Observation","昨天 16:44"],["赵一鸣","提交整改结果","RF-2026-0138","上传 2 个证据附件","昨天 15:18"]];
  return `<div class="toolbar"><input class="field search-field" placeholder="搜索操作者、对象或操作"><select class="field"><option>全部操作</option><option>状态变更</option><option>字段变更</option><option>导入与聚合</option></select></div><div class="table-card"><table class="data-table"><thead><tr><th>操作者</th><th>操作</th><th>对象</th><th>变更内容</th><th>时间</th></tr></thead><tbody>${logs.map(x => `<tr><td><strong>${x[0]}</strong></td><td>${x[1]}</td><td class="finding-id">${x[2]}</td><td>${x[3]}</td><td>${x[4]}</td></tr>`).join("")}</tbody></table></div>`;
}

function showModal(type) {
  state.modal = type;
  const root = document.getElementById("modal-root");
  let title = ""; let body = ""; let confirm = "确认";
  if (type === "import") {
    title = "导入风险数据"; confirm = "开始导入";
    body = `<div class="form-grid"><div class="form-row"><label>数据来源</label><select class="field"><option>Excel 手工导入</option><option>主机基线巡检</option><option>数据库巡检</option></select></div><div class="dropzone" data-action="pick-file"><strong>点击选择 Excel 文件</strong><span>支持 .xlsx，单批次最多 10,000 条记录</span></div><div class="process-box"><strong>导入前将自动执行</strong><div class="process-steps"><div class="process-step done"><span>字段格式校验</span><span>✓</span></div><div class="process-step"><span>资产识别与映射</span><span>2</span></div><div class="process-step"><span>标准化与风险去重</span><span>3</span></div></div></div></div>`;
  } else if (type === "remediation") {
    title = "提交整改结果"; confirm = "提交验证";
    body = `<div class="form-grid"><div class="form-row"><label>整改说明</label><textarea class="field" placeholder="说明采取的整改措施">已关闭公网管理入口，并为运维账号启用多因素认证。</textarea></div><div class="form-row"><label>整改证据</label><div class="dropzone"><strong>上传附件或粘贴证据链接</strong><span>关闭风险前必须至少提供一项有效证据</span></div></div></div>`;
  } else if (type === "assign") {
    title = "调整风险分派"; confirm = "保存分派";
    body = `<div class="form-grid"><div class="form-row"><label>Owner</label><select class="field"><option>陈晓宇</option><option>王蕾</option><option>赵一鸣</option></select></div><div class="form-row"><label>整改人员</label><select class="field"><option>李明</option><option>周启</option><option>徐扬</option></select></div><div class="form-row"><label>验证人员</label><select class="field"><option>张宁</option><option>杨帆</option></select></div><div class="form-row"><label>截止日期</label><input class="field" type="date" value="2026-09-10"></div></div>`;
  } else if (type === "accept") {
    title = state.role === "平台管理员" ? "风险接受审批" : "申请风险接受"; confirm = state.role === "平台管理员" ? "批准接受" : "提交申请";
    body = `<div class="form-grid"><div class="form-row"><label>接受理由</label><textarea class="field" placeholder="说明暂不整改的业务原因"></textarea></div><div class="form-row"><label>补偿措施</label><textarea class="field" placeholder="说明接受期间采取的控制措施"></textarea></div><div class="form-row"><label>到期日期</label><input class="field" type="date" value="2026-09-30"></div></div>`;
  } else if (type === "reject") {
    title = "验证不通过"; confirm = "退回整改";
    body = `<div class="form-grid"><div class="form-row"><label>驳回原因</label><textarea class="field" placeholder="请明确说明验证未通过的原因">公网入口已关闭，但运维账号尚未全部启用多因素认证。</textarea></div></div>`;
  } else {
    title = "调整风险等级"; confirm = "保存调整";
    body = `<div class="form-grid"><div class="form-row"><label>统一等级</label><select class="field"><option>严重</option><option>高危</option><option>中危</option><option>低危</option></select></div><div class="form-row"><label>调整原因</label><textarea class="field" placeholder="说明调整等级的依据"></textarea></div></div>`;
  }
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${title}</h2><button class="modal-close" data-action="close-modal">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="confirm-modal">${confirm}</button></div></div></div>`;
  root.querySelectorAll("[data-action]").forEach(el => el.addEventListener("click", handleAction));
}

function closeModal() { state.modal = null; document.getElementById("modal-root").innerHTML = ""; }

function updateSelectedStatus(status, message) {
  const item = state.findings.find(f => f.id === state.selectedId);
  if (item) item.status = status;
  closeModal(); renderShell(); toast(message);
}

function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "toggle-sidebar") { state.collapsed = !state.collapsed; renderShell(); }
  else if (action === "toggle-theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("riskhub-theme", state.theme);
    renderShell();
    toast(`已切换为${state.theme === "dark" ? "深色" : "浅色"}主题`);
  }
  else if (action === "role-menu") { state.roleMenu = !state.roleMenu; renderShell(); }
  else if (action === "refresh") toast("数据已刷新，当前为模拟数据");
  else if (action === "alerts") toast("6 条提醒：2 项逾期，4 项待验证");
  else if (action === "open-import") showModal("import");
  else if (action === "new-finding") toast("Demo 中建议通过接入中心导入风险");
  else if (action === "close-modal") closeModal();
  else if (action === "pick-file") toast("演示模式：已选择“九月主机风险汇总.xlsx”");
  else if (action === "confirm-modal") {
    const modalType = state.modal;
    if (state.modal === "import") {
      batches.unshift({ id: "IMP-260905-029", source: "Excel 手工导入", file: "九月主机风险汇总.xlsx", time: "刚刚", total: 386, success: 386, failed: 0, skipped: 0, state: "成功" });
      closeModal(); state.page = "batches"; renderShell(); toast("导入任务已创建：IMP-260905-029");
    }
    else if (state.modal === "remediation") updateSelectedStatus("待验证", "整改结果已提交，等待验证人员处理");
    else if (state.modal === "reject") updateSelectedStatus("整改中", "已退回整改人员补充处理");
    else if (state.modal === "accept") updateSelectedStatus(state.role === "平台管理员" ? "风险已接受" : "风险接受申请", state.role === "平台管理员" ? "风险接受已批准" : "风险接受申请已提交");
    else { closeModal(); renderShell(); toast(modalType === "assign" ? "分派信息已更新" : "风险等级已更新"); }
  }
  else if (action === "assign") showModal("assign");
  else if (action === "change-severity") showModal("severity");
  else if (action === "accept-risk") showModal("accept");
  else if (action === "mark-false") updateSelectedStatus("误报", "该风险已标记为误报");
  else if (action === "start-remediation") updateSelectedStatus("整改中", "已开始整改");
  else if (action === "submit-remediation") showModal("remediation");
  else if (action === "verify-pass") updateSelectedStatus("已关闭", "验证通过，风险已关闭");
  else if (action === "verify-reject") showModal("reject");
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(el => el.addEventListener("click", () => { state.page = el.dataset.nav; state.selectedId = null; state.roleMenu = false; renderShell(); }));
  document.querySelectorAll("[data-action]").forEach(el => el.addEventListener("click", handleAction));
  document.querySelectorAll("[data-role]").forEach(el => el.addEventListener("click", () => { state.role = el.dataset.role; state.roleMenu = false; if (state.page === "detail") state.page = "mywork"; renderShell(); toast(`已切换为${state.role}视角`); }));
  document.querySelectorAll("[data-finding]").forEach(el => el.addEventListener("click", () => { state.selectedId = el.dataset.finding; state.page = "detail"; state.findingTab = "overview"; renderShell(); }));
  document.querySelectorAll("[data-tab]").forEach(el => el.addEventListener("click", () => { state.findingTab = el.dataset.tab; renderShell(); }));
  document.querySelectorAll("[data-filter]").forEach(el => el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => { state[el.dataset.filter] = el.value; renderShell(); const focus = document.querySelector(`[data-filter="${el.dataset.filter}"]`); if (focus && el.tagName === "INPUT") { focus.focus(); focus.setSelectionRange(focus.value.length, focus.value.length); } }));
  const globalSearch = document.querySelector("[data-global-search]");
  if (globalSearch) globalSearch.addEventListener("keydown", e => { if (e.key === "Enter") { state.query = globalSearch.value; state.page = "findings"; renderShell(); } });
}

renderShell();
