# RiskHub

RiskHub 是一个轻量级风险聚合与闭环治理平台。当前版本按照 `docs/PRD.md`、`docs/TECHNICAL_DESIGN.md` 和交互 Demo 实现了可运行的 MVP。

## 已实现能力

- Excel / API 风险接入、导入批次和逐行错误隔离
- Observation 与 Unified Finding 分层存储
- 基于来源、资产和来源风险 ID（或字段指纹）的确定性去重
- 风险台账、检索、分级、责任人分派与 SLA 截止时间
- 待确认、待整改、整改中、待验证、关闭、误报和风险接受状态流转
- 整改证据、独立验证、驳回回流和风险接受审批
- 平台管理员、整改人员、验证人员三类角色及服务端权限控制
- 工作台、报表、资产、接入批次和审计日志
- 浅色 / 深色主题

## 本地启动

要求：Python 3.11+、Node.js 20+。

```bash
python3 -m venv .venv
.venv/bin/pip install -e '.[test]'
npm install --prefix apps/web
```

启动 API：

```bash
.venv/bin/uvicorn riskhub.main:app --app-dir apps/api --reload
```

另开一个终端启动 Web：

```bash
npm --prefix apps/web run dev
```

访问 `http://127.0.0.1:5173`。首次启动会自动创建 SQLite 数据库和演示数据。

## 演示账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 平台管理员 | `admin` | `RiskHub123!` |
| 整改人员 | `remediator` | `RiskHub123!` |
| 验证人员 | `verifier` | `RiskHub123!` |

登录页可直接选择角色进入。顶部角色切换会使用相应演示账号重新登录，便于完整体验职责分离流程。

## 验证

```bash
.venv/bin/pytest
npm --prefix apps/web test
npm --prefix apps/web run build
node tests/docs-smoke.mjs
node tests/demo-smoke.mjs
```

开发环境默认使用 SQLite，并同步处理单批次导入，使项目开箱即用。技术方案中面向生产环境的 PostgreSQL、Redis、对象存储和异步 Worker 是下一阶段部署增强项，不影响当前 MVP 的产品流程验证。
