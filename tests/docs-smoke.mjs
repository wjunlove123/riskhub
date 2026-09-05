import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const technicalDesign = await readFile(new URL("../docs/TECHNICAL_DESIGN.md", import.meta.url), "utf8");

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

console.log("Technical design document checks passed.");
