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


def test_multiple_department_ids_are_deduplicated_and_members_are_merged(monkeypatch):
    monkeypatch.setattr(feishu.settings, "feishu_app_id", "test-app")
    monkeypatch.setattr(feishu.settings, "feishu_app_secret", "test-secret")
    monkeypatch.setattr(feishu.settings, "feishu_department_id", "od-legacy")
    monkeypatch.setattr(feishu.settings, "feishu_department_ids", "od-a, od-b,od-a")
    monkeypatch.setattr(feishu, "tenant_access_token", lambda: "token")
    requested_paths = []

    def request(_method, path, **_kwargs):
        requested_paths.append(path)
        if "department_id=od-a" in path:
            return {"data": {"items": [{"open_id": "ou-1", "name": "A"}, {"open_id": "ou-shared", "name": "Shared"}], "has_more": False}}
        return {"data": {"items": [{"open_id": "ou-shared", "name": "Shared"}, {"open_id": "ou-2", "name": "B"}], "has_more": False}}

    monkeypatch.setattr(feishu, "_request", request)
    users = feishu.list_department_users()

    assert feishu.settings.configured_feishu_department_ids == ["od-a", "od-b"]
    assert {item["open_id"] for item in users} == {"ou-1", "ou-shared", "ou-2"}
    assert len(requested_paths) == 2


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
