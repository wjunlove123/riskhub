from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import settings


class FeishuAPIError(RuntimeError):
    pass


def _request(method: str, path: str, *, token: str | None = None, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {"Content-Type": "application/json; charset=utf-8"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(
        f"https://open.feishu.cn/open-apis{path}",
        data=json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise FeishuAPIError("飞书接口请求失败") from exc
    if result.get("code", 0) != 0:
        raise FeishuAPIError(result.get("msg") or "飞书接口返回错误")
    return result


def tenant_access_token() -> str:
    result = _request("POST", "/auth/v3/tenant_access_token/internal", payload={"app_id": settings.feishu_app_id, "app_secret": settings.feishu_app_secret})
    token = result.get("tenant_access_token")
    if not token:
        raise FeishuAPIError("飞书未返回 tenant_access_token")
    return token


def list_department_users() -> list[dict[str, Any]]:
    if not settings.feishu_configured:
        raise FeishuAPIError("飞书通讯录尚未配置")
    token = tenant_access_token()
    users: list[dict[str, Any]] = []
    page_token = ""
    while True:
        query = {
            "department_id": settings.feishu_department_id,
            "department_id_type": "open_department_id",
            "user_id_type": "open_id",
            "page_size": 50,
        }
        if page_token:
            query["page_token"] = page_token
        result = _request("GET", f"/contact/v3/users/find_by_department?{urlencode(query)}", token=token)
        data = result.get("data") or {}
        users.extend(data.get("items") or [])
        if not data.get("has_more"):
            break
        page_token = data.get("page_token") or ""
        if not page_token:
            break
    return users


def send_assignment_message(open_id: str, *, finding_id: str, finding_no: str, title: str, severity: str, due_at: str) -> None:
    if not settings.feishu_configured:
        return
    token = tenant_access_token()
    lines = [f"RiskHub 风险派发：{finding_no}", f"等级：{severity}", f"标题：{title}", f"截止时间：{due_at}"]
    if settings.feishu_risk_base_url:
        lines.append(f"查看详情：{settings.feishu_risk_base_url.rstrip('/')}/findings/{finding_id}")
    _request(
        "POST",
        "/im/v1/messages?receive_id_type=open_id",
        token=token,
        payload={"receive_id": open_id, "msg_type": "text", "content": json.dumps({"text": "\n".join(lines)}, ensure_ascii=False)},
    )
