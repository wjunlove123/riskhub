import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../designs/risk-governance-demo/", import.meta.url);
const [html, css, js] = await Promise.all([
  readFile(new URL("index.html", base), "utf8"),
  readFile(new URL("styles.css", base), "utf8"),
  readFile(new URL("app.js", base), "utf8")
]);

assert.match(html, /RiskHub · 风险治理平台 Demo/);
assert.match(html, /styles\.css/);
assert.match(html, /app\.js/);
assert.match(css, /\.app-shell/);
assert.match(css, /@media \(max-width: 820px\)/);
assert.match(css, /\[data-theme="dark"\]/);
assert.match(js, /riskhub-theme/);
assert.match(js, /toggle-theme/);

for (const role of ["平台管理员", "整改人员", "验证人员"]) {
  assert.match(js, new RegExp(role));
}

for (const page of ["工作台", "风险台账", "资产中心", "报表中心", "接入中心", "导入批次", "治理配置", "审计日志"]) {
  assert.match(js, new RegExp(page));
}

for (const status of ["待确认", "待整改", "整改中", "待验证", "已关闭", "风险已接受"]) {
  assert.match(js, new RegExp(status));
}

for (const action of ["start-remediation", "submit-remediation", "verify-pass", "verify-reject", "open-import"]) {
  assert.match(js, new RegExp(action));
}

console.log("RiskHub demo smoke checks passed.");
