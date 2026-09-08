import io
import json
from urllib.error import HTTPError, URLError

import pytest

from riskhub import feishu
from riskhub.config import PROJECT_ROOT, Settings


def test_settings_load_dotenv_from_project_root_independent_of_working_directory():
    assert Settings.model_config["env_file"] == PROJECT_ROOT / ".env"
    assert Settings.model_config["env_file"].is_absolute()


def test_project_dotenv_overrides_stale_system_environment(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("RISKHUB_FEISHU_APP_ID=cli_new_application\n", encoding="utf-8")
    monkeypatch.setenv("RISKHUB_FEISHU_APP_ID", "cli_old_application")

    loaded = Settings(_env_file=env_file)

    assert loaded.feishu_app_id == "cli_new_application"


def test_feishu_app_id_hint_is_safe_for_diagnostics(monkeypatch):
    monkeypatch.setattr(feishu.settings, "feishu_app_id", "cli_1234567890abcdef")
    assert feishu.settings.feishu_app_id_hint == "cli_…abcdef"


def test_feishu_http_error_keeps_actionable_upstream_details_and_redacts_secrets(monkeypatch):
    monkeypatch.setattr(feishu.settings, "feishu_app_id", "cli-sensitive")
    monkeypatch.setattr(feishu.settings, "feishu_app_secret", "secret-sensitive")
    body = json.dumps({"code": 10003, "msg": "invalid cli-sensitive or secret-sensitive"}).encode()

    def fail(*_args, **_kwargs):
        raise HTTPError("https://open.feishu.cn", 400, "Bad Request", {}, io.BytesIO(body))

    monkeypatch.setattr(feishu, "urlopen", fail)
    with pytest.raises(feishu.FeishuAPIError) as caught:
        feishu._request("POST", "/auth", operation="获取租户令牌", payload={})

    message = str(caught.value)
    assert "获取租户令牌失败" in message
    assert "HTTP 400" in message
    assert "飞书错误码 10003" in message
    assert "cli-sensitive" not in message
    assert "secret-sensitive" not in message


def test_feishu_network_error_identifies_the_failed_operation(monkeypatch):
    monkeypatch.setattr(feishu, "urlopen", lambda *_args, **_kwargs: (_ for _ in ()).throw(URLError("certificate verify failed")))

    with pytest.raises(feishu.FeishuAPIError, match="读取 SRE 部门通讯录失败.*certificate verify failed"):
        feishu._request("GET", "/contact/v3/users", operation="读取 SRE 部门通讯录", token="token")
