import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/feishu-risk-ledger";
const outputPath = `${outputDir}/飞书统一风险台账模板.xlsx`;

const wb = Workbook.create();
const ledger = wb.worksheets.add("风险台账");
const dashboard = wb.worksheets.add("治理看板");
const views = wb.worksheets.add("视图配置");
const fields = wb.worksheets.add("字段说明");
const options = wb.worksheets.add("选项字典");

const headers = [
  "风险ID", "风险标题", "风险描述", "风险来源", "风险类型", "所属系统/项目", "发现日期",
  "风险等级", "影响范围", "发生可能性", "责任人", "协同人", "责任部门", "状态", "处置方案",
  "截止时间", "关闭日期", "验收人", "验收结论", "是否闭环", "是否逾期", "关闭周期(天)",
  "是否重复风险", "关联原风险ID", "重复原因", "证据/附件", "最后更新时间", "备注"
];

const sampleRows = [
  ["RISK-2026-001", "生产数据库存在公网入口", "数据库安全组允许非办公网段访问。", "安全扫描", "安全", "订单中心", new Date("2026-09-01"), "P0", "核心交易数据", "高", "张三", "王五", "基础架构", "整改中", "收敛安全组并启用堡垒机访问。", new Date("2026-09-07"), null, "赵六", "待验收", null, null, null, "否", "", "", "https://example.com/evidence/001", new Date("2026-09-05"), "示例数据，可删除"],
  ["RISK-2026-002", "关键接口缺少限流", "峰值流量可能导致下游雪崩。", "架构评审", "稳定性", "会员平台", new Date("2026-09-03"), "P1", "登录与会员查询", "中", "李四", "", "应用研发", "待处理", "增加分层限流、熔断与压测验证。", new Date("2026-09-12"), null, "赵六", "待验收", null, null, null, "否", "", "", "https://example.com/evidence/002", new Date("2026-09-04"), "示例数据，可删除"],
  ["RISK-2026-003", "备份恢复演练未覆盖跨区", "当前演练只验证同区恢复。", "专项检查", "容灾", "数据平台", new Date("2026-08-20"), "P1", "分析任务恢复", "中", "王五", "", "数据平台", "待处理", "补充跨区恢复演练并留存报告。", new Date("2026-09-02"), null, "赵六", "待验收", null, null, null, "否", "", "", "https://example.com/evidence/003", new Date("2026-09-03"), "示例数据，可删除"],
  ["RISK-2026-004", "依赖组件版本过旧", "组件存在已知高危漏洞。", "漏洞扫描", "安全", "内容服务", new Date("2026-08-18"), "P1", "内容发布链路", "高", "张三", "", "应用研发", "已关闭", "升级组件并完成回归。", new Date("2026-08-28"), new Date("2026-08-27"), "赵六", "通过", null, null, null, "否", "", "", "https://example.com/evidence/004", new Date("2026-08-27"), "示例数据，可删除"],
  ["RISK-2026-005", "相同组件漏洞重复出现", "另一服务使用同一旧版本组件。", "漏洞扫描", "安全", "推荐服务", new Date("2026-09-04"), "P1", "推荐链路", "高", "陈晨", "张三", "应用研发", "整改中", "统一升级并补充依赖治理规则。", new Date("2026-09-10"), null, "赵六", "待验收", null, null, null, "是", "RISK-2026-004", "同类组件未纳入统一升级范围", "https://example.com/evidence/005", new Date("2026-09-05"), "示例数据，可删除"],
  ["RISK-2026-006", "监控告警接收人已离职", "夜间告警可能无人响应。", "运营巡检", "运维", "支付网关", new Date("2026-09-02"), "P2", "告警响应", "中", "李四", "", "SRE", "已验收", "更新值班组并执行告警测试。", new Date("2026-09-04"), new Date("2026-09-04"), "赵六", "通过", null, null, null, "否", "", "", "https://example.com/evidence/006", new Date("2026-09-04"), "示例数据，可删除"]
];

ledger.getRange("A1:AB1").values = [headers];
ledger.getRange(`A2:AB${sampleRows.length + 1}`).values = sampleRows;
for (let r = 2; r <= 501; r++) {
  ledger.getRange(`T${r}`).formulas = [[`=IF(A${r}="","",IF(OR(N${r}="已关闭",N${r}="已验收"),"是","否"))`]];
  ledger.getRange(`U${r}`).formulas = [[`=IF(A${r}="","",IF(AND(P${r}<>"",P${r}<TODAY(),T${r}<>"是"),"是","否"))`]];
  ledger.getRange(`V${r}`).formulas = [[`=IF(G${r}="","",IF(Q${r}<>"",Q${r}-G${r},TODAY()-G${r}))`]];
}
ledger.getRange("G2:G501").setNumberFormat("yyyy-mm-dd");
ledger.getRange("P2:Q501").setNumberFormat("yyyy-mm-dd");
ledger.getRange("AA2:AA501").setNumberFormat("yyyy-mm-dd");
ledger.getRange("V2:V501").setNumberFormat("0");
ledger.getRange("H2:H501").dataValidation = { rule: { type: "list", values: ["P0", "P1", "P2", "P3"] } };
ledger.getRange("J2:J501").dataValidation = { rule: { type: "list", values: ["高", "中", "低"] } };
ledger.getRange("N2:N501").dataValidation = { rule: { type: "list", values: ["待处理", "整改中", "待验收", "已验收", "已关闭", "风险接受"] } };
ledger.getRange("S2:S501").dataValidation = { rule: { type: "list", values: ["待验收", "通过", "不通过", "不适用"] } };
ledger.getRange("W2:W501").dataValidation = { rule: { type: "list", values: ["是", "否"] } };
ledger.getRange("A1:AB501").format.font = { name: "Arial", size: 10, color: "#1F2937" };
ledger.getRange("A1:AB1").format.fill = "#17365D";
ledger.getRange("A1:AB1").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
ledger.getRange("A1:AB1").format.rowHeight = 30;
ledger.getRange("A1:AB501").format.verticalAlignment = "center";
ledger.getRange("B2:C501").format.wrapText = true;
ledger.getRange("O2:O501").format.wrapText = true;
ledger.getRange("Y2:Y501").format.wrapText = true;
ledger.freezePanes.freezeRows(1);
ledger.freezePanes.freezeColumns(2);
ledger.showGridLines = false;
ledger.tables.add("A1:AB501", true, "RiskLedgerTable").style = "TableStyleMedium2";
ledger.getRange("A:A").format.columnWidth = 17;
ledger.getRange("B:B").format.columnWidth = 24;
ledger.getRange("C:C").format.columnWidth = 34;
ledger.getRange("D:F").format.columnWidth = 15;
ledger.getRange("G:G").format.columnWidth = 13;
ledger.getRange("H:J").format.columnWidth = 13;
ledger.getRange("K:M").format.columnWidth = 14;
ledger.getRange("N:N").format.columnWidth = 13;
ledger.getRange("O:O").format.columnWidth = 34;
ledger.getRange("P:V").format.columnWidth = 14;
ledger.getRange("W:Y").format.columnWidth = 18;
ledger.getRange("Z:Z").format.columnWidth = 28;
ledger.getRange("AA:AB").format.columnWidth = 16;
ledger.getRange("H2:H501").conditionalFormats.add("containsText", { text: "P0", format: { fill: "#FECACA", font: { color: "#991B1B", bold: true } } });
ledger.getRange("H2:H501").conditionalFormats.add("containsText", { text: "P1", format: { fill: "#FED7AA", font: { color: "#9A3412", bold: true } } });
ledger.getRange("U2:U501").conditionalFormats.add("containsText", { text: "是", format: { fill: "#FEE2E2", font: { color: "#B91C1C", bold: true } } });
ledger.getRange("T2:T501").conditionalFormats.add("containsText", { text: "是", format: { fill: "#DCFCE7", font: { color: "#166534", bold: true } } });

dashboard.getRange("A1:H1").merge();
dashboard.getRange("A1").values = [["风险治理看板"]];
dashboard.getRange("A2:H2").merge();
dashboard.getRange("A2").values = [["聚焦高风险暴露、责任落实、逾期治理、关闭效率和重复问题。示例数据仅用于展示，导入后请替换。"]];
dashboard.getRange("A4:H4").values = [["指标", "当前值", "管理含义", "", "指标", "当前值", "管理含义", ""]];
dashboard.getRange("A5:C9").values = [
  ["未闭环风险", null, "当前需要推进的风险总量"],
  ["P0/P1未闭环", null, "优先投入管理资源"],
  ["逾期未闭环", null, "暴露执行和升级机制问题"],
  ["本周新增", null, "观察风险暴露速度"],
  ["本周关闭", null, "观察治理产出"]
];
dashboard.getRange("E5:G8").values = [
  ["重复风险", null, "暴露系统性治理缺口"],
  ["按期关闭率", null, "衡量承诺兑现情况"],
  ["平均关闭周期", null, "衡量从发现到闭环的效率"],
  ["责任人覆盖率", null, "避免无人负责的风险"]
];
dashboard.getRange("B5").formulas = [["=COUNTIF('风险台账'!$T$2:$T$501,\"否\")"]];
dashboard.getRange("B6").formulas = [["=COUNTIFS('风险台账'!$T$2:$T$501,\"否\",'风险台账'!$H$2:$H$501,\"P0\")+COUNTIFS('风险台账'!$T$2:$T$501,\"否\",'风险台账'!$H$2:$H$501,\"P1\")"]];
dashboard.getRange("B7").formulas = [["=COUNTIF('风险台账'!$U$2:$U$501,\"是\")"]];
dashboard.getRange("B8").formulas = [["=COUNTIFS('风险台账'!$G$2:$G$501,\">=\"&TODAY()-WEEKDAY(TODAY(),2)+1,'风险台账'!$G$2:$G$501,\"<=\"&TODAY())"]];
dashboard.getRange("B9").formulas = [["=COUNTIFS('风险台账'!$Q$2:$Q$501,\">=\"&TODAY()-WEEKDAY(TODAY(),2)+1,'风险台账'!$Q$2:$Q$501,\"<=\"&TODAY())"]];
dashboard.getRange("F5").formulas = [["=COUNTIF('风险台账'!$W$2:$W$501,\"是\")"]];
dashboard.getRange("F6").formulas = [["=IF(COUNT('风险台账'!$Q$2:$Q$501)=0,\"\",SUMPRODUCT(--('风险台账'!$Q$2:$Q$501<>\"\"),--('风险台账'!$Q$2:$Q$501<='风险台账'!$P$2:$P$501))/COUNT('风险台账'!$Q$2:$Q$501))"]];
dashboard.getRange("F7").formulas = [["=IF(COUNT('风险台账'!$Q$2:$Q$501)=0,\"\",AVERAGEIF('风险台账'!$Q$2:$Q$501,\"<>\",'风险台账'!$V$2:$V$501))"]];
dashboard.getRange("F8").formulas = [["=IF(COUNTA('风险台账'!$A$2:$A$501)=0,\"\",COUNTIF('风险台账'!$K$2:$K$501,\"<>\")/COUNTA('风险台账'!$A$2:$A$501))"]];
dashboard.getRange("F6").setNumberFormat("0%");
dashboard.getRange("F7").setNumberFormat("0.0");
dashboard.getRange("F8").setNumberFormat("0%");
dashboard.getRange("A1:H12").format.font = { name: "Arial", size: 11, color: "#1F2937" };
dashboard.getRange("A1").format.font = { name: "Arial", size: 20, bold: true, color: "#17365D" };
dashboard.getRange("A2").format.font = { name: "Arial", size: 10, italic: true, color: "#64748B" };
dashboard.getRange("A4:H4").format.fill = "#17365D";
dashboard.getRange("A4:H4").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
dashboard.getRange("A5:C9").format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
dashboard.getRange("E5:G8").format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
dashboard.getRange("B5:B9").format.fill = "#EFF6FF";
dashboard.getRange("F5:F8").format.fill = "#EFF6FF";
dashboard.getRange("B5:B9").format.font = { name: "Arial", size: 16, bold: true, color: "#1D4ED8" };
dashboard.getRange("F5:F8").format.font = { name: "Arial", size: 16, bold: true, color: "#1D4ED8" };
dashboard.getRange("A:A").format.columnWidth = 20;
dashboard.getRange("B:B").format.columnWidth = 14;
dashboard.getRange("C:C").format.columnWidth = 30;
dashboard.getRange("D:D").format.columnWidth = 4;
dashboard.getRange("E:E").format.columnWidth = 20;
dashboard.getRange("F:F").format.columnWidth = 14;
dashboard.getRange("G:G").format.columnWidth = 30;
dashboard.showGridLines = false;

const viewHeaders = ["视图名称", "视图类型", "筛选条件（全部满足）", "分组", "排序", "建议展示字段", "治理价值"];
const viewRows = [
  ["我的待办", "表格", "负责人 = 当前用户；是否闭环 = 否", "按状态", "风险等级升序（P0→P3），截止时间升序", "风险ID、风险标题、风险等级、状态、截止时间、是否逾期、处置方案", "让每位责任人只看到自己需要推动的事项，减少遗漏。"],
  ["P0/P1风险", "表格", "风险等级 = P0 或 P1；是否闭环 = 否", "按风险等级", "截止时间升序", "风险ID、风险标题、所属系统/项目、风险等级、责任人、状态、截止时间、是否逾期", "集中呈现管理层应优先关注和升级的风险。"],
  ["逾期风险", "表格", "是否逾期 = 是", "按责任部门，再按责任人", "截止时间升序", "风险ID、风险标题、风险等级、责任人、责任部门、状态、截止时间、处置方案", "暴露承诺未兑现项，支持催办、升级和资源协调。"],
  ["本周新增", "表格", "发现日期 = 本周", "按风险来源", "发现日期降序", "风险ID、风险标题、风险来源、风险类型、风险等级、责任人、发现日期、状态", "观察风险暴露趋势和发现渠道是否有效。"],
  ["本周关闭", "表格", "关闭日期 = 本周；是否闭环 = 是", "按责任部门", "关闭日期降序", "风险ID、风险标题、风险等级、责任人、关闭日期、关闭周期(天)、验收人、验收结论", "呈现治理产出，并识别高效团队和可复用做法。"],
  ["重复风险", "表格", "是否重复风险 = 是", "按关联原风险ID", "发现日期降序", "风险ID、风险标题、所属系统/项目、风险等级、责任人、关联原风险ID、重复原因、状态", "从单点整改转向同类问题批量治理，减少反复发生。"]
];
views.getRange("A1:G1").values = [viewHeaders];
views.getRange("A2:G7").values = viewRows;
views.getRange("A9:G9").merge();
views.getRange("A9").values = [["飞书配置提示：导入“风险台账”后，新建对应视图；日期条件使用飞书的动态条件“本周”，负责人条件使用“当前用户”。"]];
views.getRange("A1:G9").format.font = { name: "Arial", size: 10, color: "#1F2937" };
views.getRange("A1:G1").format.fill = "#17365D";
views.getRange("A1:G1").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
views.getRange("A2:G7").format.wrapText = true;
views.getRange("A9").format.fill = "#FFF7ED";
views.getRange("A9").format.font = { name: "Arial", size: 10, bold: true, color: "#9A3412" };
views.getRange("A:A").format.columnWidth = 16;
views.getRange("B:B").format.columnWidth = 12;
views.getRange("C:C").format.columnWidth = 34;
views.getRange("D:E").format.columnWidth = 24;
views.getRange("F:F").format.columnWidth = 48;
views.getRange("G:G").format.columnWidth = 38;
views.getRange("A2:G7").format.rowHeight = 70;
views.freezePanes.freezeRows(1);
views.showGridLines = false;

const fieldRows = [
  ["字段名", "飞书字段类型", "必填", "填写/计算规则", "用途"],
  ["风险ID", "自动编号/文本", "是", "建议 RISK-YYYY-流水号，唯一", "主键与跨表关联"],
  ["风险标题", "单行文本", "是", "一句话描述风险", "列表扫描"],
  ["风险描述", "多行文本", "是", "说明现状、触发条件和后果", "理解风险"],
  ["风险来源", "单选", "是", "见选项字典", "评估发现机制"],
  ["风险类型", "单选", "是", "见选项字典", "分类治理"],
  ["所属系统/项目", "单行文本/关联记录", "是", "统一名称", "定位影响对象"],
  ["发现日期", "日期", "是", "首次确认风险的日期", "本周新增视图"],
  ["风险等级", "单选", "是", "P0/P1/P2/P3", "治理优先级"],
  ["影响范围", "多行文本", "否", "业务、用户、数据或系统范围", "评估影响"],
  ["发生可能性", "单选", "否", "高/中/低", "辅助判断"],
  ["责任人", "人员", "是", "唯一主责人", "我的待办"],
  ["协同人", "人员（多选）", "否", "参与整改人员", "协作"],
  ["责任部门", "单选/组织", "是", "主责部门", "部门治理"],
  ["状态", "单选", "是", "待处理/整改中/待验收/已验收/已关闭/风险接受", "流程状态"],
  ["处置方案", "多行文本", "是", "写明动作、完成标准", "执行与验收依据"],
  ["截止时间", "日期", "是", "承诺完成日期", "逾期判断"],
  ["关闭日期", "日期", "条件必填", "已验收/已关闭时填写", "本周关闭和周期"],
  ["验收人", "人员", "条件必填", "与整改责任人适当分离", "独立验收"],
  ["验收结论", "单选", "条件必填", "待验收/通过/不通过/不适用", "闭环质量"],
  ["是否闭环", "公式", "自动", "IF(OR(状态=已关闭, 状态=已验收), 是, 否)", "统一关闭口径"],
  ["是否逾期", "公式", "自动", "IF(AND(截止时间<TODAY(), 是否闭环<>是), 是, 否)", "逾期视图"],
  ["关闭周期(天)", "公式", "自动", "IF(关闭日期不为空, 关闭日期-发现日期, TODAY()-发现日期)", "效率度量"],
  ["是否重复风险", "单选", "是", "是/否", "重复风险视图"],
  ["关联原风险ID", "关联记录", "条件必填", "重复风险为“是”时填写", "追溯同类问题"],
  ["重复原因", "多行文本", "条件必填", "说明复发或未覆盖原因", "推动系统性治理"],
  ["证据/附件", "附件/超链接", "否", "扫描报告、截图、验收记录", "审计证据"],
  ["最后更新时间", "最后编辑时间", "自动", "飞书自动记录", "识别长期未更新项"],
  ["备注", "多行文本", "否", "补充说明", "上下文"]
];
fields.getRange(`A1:E${fieldRows.length}`).values = fieldRows;
fields.getRange("A1:E1").format.fill = "#17365D";
fields.getRange("A1:E1").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
fields.getRange(`A2:E${fieldRows.length}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
fields.getRange(`A2:E${fieldRows.length}`).format.wrapText = true;
fields.getRange("A:A").format.columnWidth = 21;
fields.getRange("B:B").format.columnWidth = 20;
fields.getRange("C:C").format.columnWidth = 12;
fields.getRange("D:D").format.columnWidth = 48;
fields.getRange("E:E").format.columnWidth = 28;
fields.freezePanes.freezeRows(1);
fields.showGridLines = false;

const optionRows = [
  ["字段", "建议选项", "口径说明"],
  ["风险等级", "P0", "已造成或极可能造成重大业务中断、严重数据/安全事件，需立即升级"],
  ["风险等级", "P1", "高概率或高影响，需要优先治理和管理层关注"],
  ["风险等级", "P2", "中等风险，纳入计划治理"],
  ["风险等级", "P3", "低风险，持续观察或常规优化"],
  ["状态", "待处理", "已登记，尚未开始"],
  ["状态", "整改中", "责任人正在处理"],
  ["状态", "待验收", "整改完成，等待验证"],
  ["状态", "已验收", "验收通过，可视为闭环"],
  ["状态", "已关闭", "完成归档"],
  ["状态", "风险接受", "经授权接受风险；建议另设审批记录，不自动视为闭环"],
  ["风险来源", "安全扫描 / 巡检 / 架构评审 / 事故复盘 / 审计 / 人工上报 / 其他", "按组织实际增删"],
  ["风险类型", "安全 / 稳定性 / 容灾 / 运维 / 合规 / 数据 / 成本 / 其他", "按治理域分类"],
  ["验收结论", "待验收 / 通过 / 不通过 / 不适用", "通过后才允许进入已验收或已关闭"],
  ["是否重复风险", "是 / 否", "重复风险必须关联原风险并说明原因"]
];
options.getRange(`A1:C${optionRows.length}`).values = optionRows;
options.getRange("A1:C1").format.fill = "#17365D";
options.getRange("A1:C1").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
options.getRange(`A2:C${optionRows.length}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
options.getRange(`A2:C${optionRows.length}`).format.wrapText = true;
options.getRange("A:A").format.columnWidth = 18;
options.getRange("B:B").format.columnWidth = 46;
options.getRange("C:C").format.columnWidth = 62;
options.freezePanes.freezeRows(1);
options.showGridLines = false;

await fs.mkdir(outputDir, { recursive: true });
const file = await SpreadsheetFile.exportXlsx(wb);
await file.save(outputPath);

const keyCheck = await wb.inspect({ kind: "table", range: "治理看板!A1:H9", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 8 });
console.log(keyCheck.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(errors.ndjson);
for (const name of ["风险台账", "治理看板", "视图配置", "字段说明", "选项字典"]) {
  const preview = await wb.render({ sheetName: name, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/preview-${name}.png`, new Uint8Array(await preview.arrayBuffer()));
}
console.log(outputPath);
