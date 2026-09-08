from __future__ import annotations

import json
import ssl
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import settings


class FeishuAPIError(RuntimeError):
    pass


def _redact(value: str) -> str:
    for secret in (settings.feishu_app_id, settings.feishu_app_secret):
        if secret:
            value = value.replace(secret, "***")
    return value[:500]


def _http_error_message(operation: str, error: HTTPError) -> str:
    body = error.read().decode(errors="replace")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {}
    code = payload.get("code")
    upstream_message = payload.get("msg") or payload.get("message") or body.strip()
    details = [f"HTTP {error.code}"]
    if code is not None:
        details.append(f"飞书错误码 {code}")
    if upstream_message:
        details.append(_redact(str(upstream_message)))
    return f"{operation}失败（{'，'.join(details)}）"


def _request(method: str, path: str, *, operation: str, token: str | None = None, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {"Content-Type": "application/json; charset=utf-8"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(
        f"{settings.feishu_api_base_url.rstrip('/')}{path}",
        data=json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        context = ssl.create_default_context(cafile=settings.feishu_ca_bundle or None)
        with urlopen(request, timeout=15, context=context) as response:
            raw_body = response.read().decode()
    except HTTPError as exc:
        raise FeishuAPIError(_http_error_message(operation, exc)) from exc
    except URLError as exc:
        raise FeishuAPIError(f"{operation}失败（无法连接飞书：{_redact(str(exc.reason))}）") from exc
    except (TimeoutError, ssl.SSLError) as exc:
        raise FeishuAPIError(f"{operation}失败（网络或证书错误：{_redact(str(exc))}）") from exc
    except OSError as exc:
        raise FeishuAPIError(f"{operation}失败（本地网络或 CA 证书配置错误：{_redact(str(exc))}）") from exc
    try:
        result = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise FeishuAPIError(f"{operation}失败（飞书返回了无法解析的响应）") from exc
    if result.get("code", 0) != 0:
        code = result.get("code")
        message = _redact(str(result.get("msg") or "未知错误"))
        raise FeishuAPIError(f"{operation}失败（飞书错误码 {code}：{message}）")
    return result


def tenant_access_token() -> str:
    result = _request("POST", "/auth/v3/tenant_access_token/internal", operation="获取租户令牌", payload={"app_id": settings.feishu_app_id, "app_secret": settings.feishu_app_secret})
    token = result.get("tenant_access_token")
    if not token:
        raise FeishuAPIError("飞书未返回 tenant_access_token")
    return token


def list_department_users() -> list[dict[str, Any]]:
    if not settings.feishu_configured:
        raise FeishuAPIError("飞书通讯录尚未配置")
    token = tenant_access_token()
    users_by_id: dict[str, dict[str, Any]] = {}
    for department_id in settings.configured_feishu_department_ids:
        page_token = ""
        while True:
            query = {
                "department_id": department_id,
                "department_id_type": "open_department_id",
                "user_id_type": "open_id",
                "page_size": 50,
            }
            if page_token:
                query["page_token"] = page_token
            result = _request("GET", f"/contact/v3/users/find_by_department?{urlencode(query)}", operation="读取飞书部门通讯录", token=token)
            data = result.get("data") or {}
            for item in data.get("items") or []:
                external_id = item.get("open_id") or item.get("user_id")
                if external_id and external_id not in users_by_id:
                    users_by_id[external_id] = {**item, "_riskhub_department_id": department_id}
            if not data.get("has_more"):
                break
            page_token = data.get("page_token") or ""
            if not page_token:
                break
    return list(users_by_id.values())


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
        operation="发送风险派发消息",
        token=token,
        payload={"receive_id": open_id, "msg_type": "text", "content": json.dumps({"text": "\n".join(lines)}, ensure_ascii=False)},
    )
