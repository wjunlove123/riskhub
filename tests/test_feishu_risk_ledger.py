from pathlib import Path
from zipfile import ZipFile


WORKBOOK = Path("outputs/feishu-risk-ledger/飞书统一风险台账模板.xlsx")


def test_feishu_risk_ledger_template_structure():
    assert WORKBOOK.exists()
    assert WORKBOOK.read_bytes()[:2] == b"PK"

    with ZipFile(WORKBOOK) as archive:
        workbook_xml = archive.read("xl/workbook.xml").decode("utf-8")
        shared_strings = archive.read("xl/sharedStrings.xml").decode("utf-8")

    for sheet in ["风险台账", "治理看板", "视图配置", "字段说明", "选项字典"]:
        assert sheet in workbook_xml

    for view in ["我的待办", "P0/P1风险", "逾期风险", "本周新增", "本周关闭", "重复风险"]:
        assert view in shared_strings

    for field in ["风险ID", "风险等级", "责任人", "截止时间", "是否闭环", "是否逾期"]:
        assert field in shared_strings
