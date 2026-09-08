import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const technicalDesign = await readFile(new URL("../docs/TECHNICAL_DESIGN.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");

const requiredSections = [
  "总体架构",
  "核心数据模型",
  "风险接入处理链路",
  "标准化、资产识别与去重",
  "Finding 状态机",
  "权限设计",
  "API 设计",
  "前端实现方案",
  "安全设计",
  "测试方案",
  "实施计划"
];

for (const section of requiredSections) {
  assert.match(technicalDesign, new RegExp(`^## \\d+\\. ${section}$`, "m"));
}

for (const role of ["平台管理员", "整改人员", "验证人员"]) {
  assert.match(technicalDesign, new RegExp(role));
}

for (const entity of ["Observation", "Finding", "ImportBatch", "RiskAcceptance", "AuditEvent"]) {
  assert.match(technicalDesign, new RegExp(entity, "i"));
}

assert.match(technicalDesign, /designs\/risk-governance-demo/);
assert.match(technicalDesign, /浅色和深色/);
assert.match(technicalDesign, /10,000 条/);

for (const section of ["项目解决什么问题", "主要功能", "安装方法", "使用方法"]) {
  assert.match(readme, new RegExp(`^## \\d+\\. ${section}$`, "m"));
}

for (const implementedCapability of ["自定义录入", "Excel 模板", "确定性去重", "风险接受", "资产中心", "接入中心", "治理配置", "审计日志", "浅色和深色主题"]) {
  assert.match(readme, new RegExp(implementedCapability));
}

for (const command of ["uvicorn riskhub.main:app", "npm --prefix apps/web run dev", ".venv/bin/python -m pytest", ".\\.venv\\Scripts\\python.exe -m pytest"]) {
  assert.ok(readme.includes(command), `README is missing command: ${command}`);
}

for (const platform of ["macOS / Linux", "Windows PowerShell"]) {
  assert.match(readme, new RegExp(platform.replace("/", "\\/")));
}

assert.match(readme, /不要直接使用 `file:\/\//);
assert.match(readme, /尚未作为默认运行依赖接入/);
assert.match(readme, /飞书通讯录/);
assert.match(readme, /配置优先于操作系统中的同名变量/);
assert.match(envExample, /RISKHUB_FEISHU_DEPARTMENT_ID=od_your_sre_department_id/);
assert.doesNotMatch(envExample, /od-a0ff0bcc4a5173877e9bd5db353bd8e0/);

console.log("Technical design and README checks passed.");
