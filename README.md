# RiskHub

RiskHub 是一个轻量级的风险聚合与闭环治理平台。项目当前为可运行的 MVP，产品界面和操作流程以 [`docs/PRD.md`](docs/PRD.md)、[`docs/TECHNICAL_DESIGN.md`](docs/TECHNICAL_DESIGN.md) 及现有交互 Demo 为基线。

## 1. 项目解决什么问题

安全巡检结果通常散落在扫描平台、Excel 和人工台账中。同一个风险可能被重复上报，不同来源的等级和字段口径也不一致，后续责任分派、整改验证和过程追踪容易脱节。

RiskHub 将不同来源发现的原始问题保存为 `Observation`，经过标准化和确定性去重后聚合为统一的 `Finding`，再围绕统一风险完成分级、分派、整改、验证和关闭。它重点解决以下问题：

- 多来源风险数据缺少统一入口和字段口径。
- 重复风险造成统计失真和重复整改。
- 风险责任人、整改人、验证人和截止时间不清晰。
- 整改结果缺少证据，关闭前缺少独立验证。
- 风险状态、配置变更和关键操作无法完整追溯。
- 管理人员难以快速掌握风险等级分布、SLA 和治理进展。

## 2. 主要功能

### 风险接入与聚合

- 支持上传 `.xlsx` 文件批量导入，每批最多 10,000 条、文件最大 10 MB。
- 提供带字段说明、示例数据和风险等级下拉校验的 Excel 模板。
- 支持在界面中自定义录入单条风险。
- 提供带幂等键的 API 导入接口。
- 原始发现与统一风险分层保存，导入记录可通过批次查询。
- 优先使用“来源 + 资产 + 来源风险 ID”去重；缺少稳定 ID 时使用字段指纹去重。
- 已关闭或误报的风险再次被发现时，会重新进入待确认状态。

### 风险治理闭环

- 统一风险台账支持按标题、编号、等级和状态筛选，平台管理员可修订或删除不准确的风险数据。
- 支持风险等级调整、Owner/整改人/验证人分派和整改截止时间设置。
- 支持待确认、待整改、整改中、待验证、已关闭、误报、风险接受申请和风险已接受状态。
- 整改人员可以提交整改说明及证据链接。
- 验证人员可以验证通过并关闭风险，或驳回后返回整改中。
- 分派 Owner、整改人和验证人时支持按姓名或用户名快速搜索，候选项只显示人员姓名。
- 支持风险接受申请、管理员审批、补偿措施和到期时间。
- 使用版本号校验风险操作，避免并发修改覆盖。

### 资产、来源与治理配置

- 资产中心展示资产编码、类型、团队、Owner、重要性和暴露面。
- 平台管理员可以编辑资产名称、类型、业务系统、团队、Owner、重要性、暴露面、环境和状态；资产编码创建后不可修改。
- 接入中心支持保存来源名称、接入方式、适配器类型、启停状态和字段映射定义。
- 接入中心支持同步飞书通讯录中的 SRE 部门成员，并在风险分派后发送飞书应用消息。
- 治理配置支持保存等级映射、去重规则、SLA、自动分派、通知规则和风险接受规则。
- 所有资产、来源和治理规则修改都会记录审计日志。

### 工作台、报表和体验

- 工作台展示有效风险、严重/高危风险、即将违反 SLA 和各状态数量。
- 风险等级饼图支持点击扇区或图例，跳转至对应等级的风险列表。
- 右上角消息提醒会按当前角色汇总逾期、临期及待处理风险，点击可直接进入风险详情。
- 报表中心展示累计风险、有效风险、SLA 达标率、接入成功率和趋势示意。
- 支持浅色和深色主题。
- 提供平台管理员、整改人员、验证人员三种角色，权限由后端强制校验。

## 3. 安装方法

### 环境要求

- Python 3.11 或更高版本
- Node.js 20 或更高版本
- npm 10 或更高版本

### 安装后端依赖（macOS / Linux）

在项目根目录执行：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[test]'
```

### 安装后端依赖（Windows PowerShell）

在项目根目录执行：

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[test]"
```

### 安装前端依赖

以下命令在 macOS、Linux 和 Windows PowerShell 中相同：

```bash
npm install --prefix apps/web
```

开发环境默认使用 SQLite，不需要额外安装数据库。API 第一次启动时会在 `apps/api/` 下创建数据库、数据表和演示数据。

### 可选环境变量

后端配置使用 `RISKHUB_` 前缀。系统始终按项目文件位置读取根目录的 `.env`，因此从项目根目录或 `apps/api` 目录启动均可正确加载：

可先复制 `.env.example` 为 `.env`，再填写实际配置：

```dotenv
RISKHUB_DATABASE_URL=sqlite:///apps/api/riskhub.db
RISKHUB_JWT_SECRET=replace-with-a-long-random-secret
RISKHUB_ACCESS_TOKEN_MINUTES=60
RISKHUB_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
RISKHUB_FEISHU_APP_ID=cli_your_app_id
RISKHUB_FEISHU_APP_SECRET=replace-with-your-app-secret
RISKHUB_FEISHU_DEPARTMENT_ID=od_your_sre_department_id
RISKHUB_FEISHU_DEPARTMENT_IDS=
RISKHUB_FEISHU_DEPARTMENT_NAME=SRE
RISKHUB_FEISHU_RISK_BASE_URL=https://your-accessible-riskhub.example.com
RISKHUB_FEISHU_CA_BUNDLE=
RISKHUB_FEISHU_HTTPS_PROXY=
```

生产部署前必须替换 JWT 密钥。飞书 `App Secret` 只能保存在本地 `.env` 或密钥管理系统中，不要提交到仓库。`RISKHUB_FEISHU_RISK_BASE_URL` 应填写接收人能够访问的 RiskHub 或 Dify 入口；如果系统只在本机运行，请不要填写本地回环地址。

飞书接入使用企业自建应用，需要在飞书开放平台授予应用读取 SRE 部门成员和发送应用消息的权限，并确保该部门位于应用通讯录可见范围内。配置完成后，平台管理员可在“接入中心”同步通讯录。同步成员会作为整改人员和验证人员出现在风险分派选项中；分派给飞书成员后，系统会发送带整改人姓名问候语，并包含风险编号、等级、标题、截止时间和处理入口的消息。

对于状态为“待整改”或“整改中”的风险，后端会按 `RISKHUB_FEISHU_REMINDER_TIMEZONE` 所在自然日定时检查。从到期前 3 天至逾期后 7 天（含边界），每天向飞书整改人发送一次提醒；同一风险、同一整改人、同一天只会成功发送一次，服务重启不会重复发送。默认每小时扫描一次，可在 `.env` 中调整：

```dotenv
RISKHUB_FEISHU_REMINDERS_ENABLED=true
RISKHUB_FEISHU_REMINDER_POLL_SECONDS=3600
RISKHUB_FEISHU_REMINDER_TIMEZONE=Asia/Shanghai
```

本地默认使用单个后端进程运行提醒任务。若未来使用多个后端 Worker 部署，应将提醒任务拆分为独立的单实例 Worker。

同步多个部门时，将多个 `open_department_id` 使用英文逗号写入 `RISKHUB_FEISHU_DEPARTMENT_IDS`：

```dotenv
RISKHUB_FEISHU_DEPARTMENT_IDS=od_first_department,od_second_department,od_third_department
```

配置 `RISKHUB_FEISHU_DEPARTMENT_IDS` 后，它会优先于单部门变量 `RISKHUB_FEISHU_DEPARTMENT_ID`。系统逐部门分页同步，并按成员 `open_id` 合并去重。每个部门都必须加入飞书应用的通讯录权限范围；该接口只返回部门直属成员，如需同步下级部门，需要把每个下级部门 ID 也加入列表。

如果同步返回 `502 Bad Gateway`，请根据页面或 API 日志中显示的具体阶段排查：

- “获取租户令牌失败”：检查 App ID、App Secret 是否完整且没有多余的引号或转义符，并确认应用已经发布。
- “读取 SRE 部门通讯录失败”：检查通讯录权限、应用可见范围和部门 ID；部门 ID 应使用 `open_department_id`。
- “无法连接飞书”或“网络或证书错误”：检查目标电脑能否访问 `https://open.feishu.cn`、系统时间、HTTPS 代理和企业 CA。使用企业自签 CA 时，将 PEM 证书链路径配置到 `RISKHUB_FEISHU_CA_BUNDLE`。

公司电脑需要通过 HTTP(S) 企业代理访问公网时，在 `.env` 中配置：

```dotenv
RISKHUB_FEISHU_HTTPS_PROXY=http://proxy.company.internal:8080
```

如果代理需要 Basic 用户名和密码，请先对用户名、密码中的 `@`、`:`、`/` 等特殊字符进行 URL 编码，再使用 `http://username:password@proxy.company.internal:8080`。该配置只作用于飞书请求，不会让 RiskHub 的其他网络请求经过代理。代理必须支持 HTTPS CONNECT；SOCKS 代理当前不支持。接入中心会显示“网络代理：已配置”，错误日志会自动遮蔽完整代理地址和代理凭据。

修改 `.env` 后必须重启后端服务。错误信息会保留飞书 HTTP 状态和错误码，但会自动隐藏 App ID 与 App Secret。

更换飞书应用后，可在“接入中心 → 飞书通讯录”的“当前应用”字段核对脱敏 App ID。便携版以项目根目录 `.env` 为准，其配置优先于操作系统中的同名变量；修改后需要完整重启后端进程。

当前仓库实现的是本地可运行 MVP；技术方案中规划的 PostgreSQL、Redis、对象存储和异步 Worker 尚未作为默认运行依赖接入。

当前 MVP 中，来源字段映射和治理规则已经支持界面配置、数据库持久化和审计，但导入解析、去重及 SLA 计算仍使用代码中的内置规则；飞书风险分派消息已支持真实投递，站内提醒基于当前台账实时计算，报表趋势仍为演示数据，尚未实现历史趋势聚合。

## 4. 使用方法

### 启动服务（macOS / Linux）

启动 API：

```bash
.venv/bin/python -m uvicorn riskhub.main:app --app-dir apps/api --reload
```

另开一个终端启动 Web：

```bash
npm --prefix apps/web run dev
```

### 启动服务（Windows PowerShell）

启动 API：

```powershell
.\.venv\Scripts\python.exe -m uvicorn riskhub.main:app --app-dir apps/api --reload
```

另开一个 PowerShell 窗口启动 Web：

```powershell
npm --prefix apps/web run dev
```

浏览器访问 [http://127.0.0.1:5173](http://127.0.0.1:5173)。不要直接使用 `file://` 打开 `apps/web/index.html`，否则 Vite 模块、前端路由和 API 代理无法正常工作。

API 健康检查地址为 [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)，交互式 API 文档位于 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)。

### 初始账号

| 角色 | 用户名 | 密码 | 主要操作 |
| --- | --- | --- | --- |
| 平台管理员 | `admin` | `RiskHub123!` | 导入、确认、分级、分派、配置、审批和审计 |
| 整改人员 | `remediator` | `RiskHub123!` | 查看分派给自己的风险并提交整改结果 |
| 验证人员 | `verifier` | `RiskHub123!` | 查看待验证风险并通过或驳回验证 |

默认整改人员和验证人员账号仅用于本地角色演示，不会出现在责任人候选列表中。实际分派请先在接入中心同步飞书通讯录，再选择同步得到的人员。登录页必须输入用户名和密码，前端不内置账号密码或提供免密角色切换。

### 推荐体验流程

1. 使用平台管理员登录，在“导入批次”中点击“导入风险”。
2. 选择 Excel 批量导入并下载模板，或切换到“自定义录入”提交一条风险。
3. 在“接入中心”同步飞书通讯录。
4. 在“风险台账”中打开待确认风险，选择飞书同步人员完成责任人分派并确认风险。
5. 需要体验角色流程时，可使用演示整改和验证账号处理预置待办；实际飞书人员登录需另行接入统一身份认证。
6. 退出后重新使用平台管理员账号登录，在工作台、报表中心和审计日志中查看治理结果。

### 验证项目（macOS / Linux）

```bash
.venv/bin/python -m pytest
npm --prefix apps/web test
npm --prefix apps/web run build
node tests/docs-smoke.mjs
node tests/demo-smoke.mjs
```

### 验证项目（Windows PowerShell）

```powershell
.\.venv\Scripts\python.exe -m pytest
npm --prefix apps/web test
npm --prefix apps/web run build
node tests/docs-smoke.mjs
node tests/demo-smoke.mjs
```

## 开源许可证

RiskHub 采用 [MIT License](LICENSE) 开源。

## 项目结构

```text
apps/api/riskhub/      FastAPI、SQLAlchemy、鉴权及治理服务
apps/api/tests/        后端接口和闭环流程测试
apps/web/src/          React、Ant Design 前端
designs/               交互 Demo
docs/                  PRD 和技术方案
tests/                 文档与 Demo 检查
```
