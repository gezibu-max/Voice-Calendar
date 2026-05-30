"""自然语言查询 → 调度大模型基于事件列表给出口语化答复。

用户问 "明天我有什么事"、"下周三 14 点忙吗"、"周末有空吗"，前端把当前事件
列表（精简版）+ 自然语言问题一起 POST 过来，后端调 LLM 输出 {answer, highlight_ids, intent}。
前端把 answer 交给 SpeechSynthesis 念出来 + 弹窗显示。
"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/query", tags=["query"])


class QueryEventDigest(BaseModel):
    """传给 LLM 的事件精简形态 — 不带 description / color，省 token。"""

    id: str
    title: str
    start_time: datetime
    end_time: datetime
    all_day: bool = False


class QueryRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    events: List[QueryEventDigest] = Field(default_factory=list, max_length=500)
    now: Optional[datetime] = None
    timezone: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    highlight_ids: List[str] = Field(default_factory=list)
    intent: str = "list"
    raw: Optional[str] = None


SYSTEM_PROMPT = """你是日历语音助手。用户会问关于自己日程的问题，你能看到他们的事件列表（JSON 数组）。\
请按 JSON 输出，**只输出 JSON、不要 Markdown 包裹**，结构如下：

{
  "answer": "用一句中文口语化的话回答，控制在 60 字以内，能直接念给用户听",
  "highlight_ids": ["与回答相关的事件 id 列表"],
  "intent": "list | count | conflict | free | next | when | other"
}

规则：
1. answer 必须是**完整的一句中文**，可被 TTS 直接朗读。包含具体时间和事件名（例："明天上午十点你有团队会议"），不要 "1." "•" 这类列表符号。
2. 时间表述用中文口语：用"上午十点""下午三点半""明天""后天""下周三"，不要 "10:00"、"15:30"。
3. 没有匹配事件就直接说"那段时间你没有安排"或"明天还没有日程"，answer 必须有内容、不要空字符串。
4. highlight_ids 只放 answer 里真正提到或与问题强相关的事件 id，按时间顺序。
5. intent 字段：
   - list  — 列出某段时间的事件（"明天有什么"）
   - count — 数事件数量（"今天还有几个会"）
   - conflict — 检查时段冲突（"周三 3 点忙吗"）
   - free — 找空闲时段（"周末有空吗"）
   - next — 最近的下一个（"下一个会议是几点"）
   - when — 找特定事件的时间（"和小李的会几点"）
   - other — 其他
6. 如果用户问"有事吗 / 忙吗 / 有空吗"且时段无事件 → intent=free 或 conflict，answer 给出"没有安排，是空闲的"或"没排课"。
7. 用户问的"周末"指本周六周日；"下周"指下周一到下周日；"今天/明天/后天"按 NOW 推导。
"""


def _call_llm(text: str, events_json: str, now_iso: str, tz: str) -> str:
    settings = get_settings()
    if not settings.llm_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM_API_KEY not configured",
        )

    user_prompt = (
        f"NOW = {now_iso}\nTIMEZONE = {tz}\n\n"
        f"事件列表（JSON）：\n{events_json}\n\n"
        f"用户问题：{text}\n\n"
        "请输出 JSON。"
    )

    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.llm_api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=settings.llm_timeout) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        logger.warning("Query LLM HTTP %s: %s", exc.code, detail)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM upstream error {exc.code}",
        ) from exc
    except urllib.error.URLError as exc:
        logger.warning("Query LLM network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="LLM unreachable",
        ) from exc

    try:
        data = json.loads(body)
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.warning("Unexpected query LLM response shape: %s", body[:300])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM returned malformed response",
        ) from exc


def _parse_response(raw: str) -> QueryResponse:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        s, e = text.find("{"), text.rfind("}")
        if s == -1 or e == -1 or e <= s:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM did not return JSON",
            )
        obj = json.loads(text[s : e + 1])

    if not isinstance(obj, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="bad shape")

    answer = str(obj.get("answer") or "").strip() or "我没听明白，你能换种说法再问一次吗"
    raw_ids = obj.get("highlight_ids") or []
    if not isinstance(raw_ids, list):
        raw_ids = []
    highlight_ids = [str(x) for x in raw_ids if x is not None]
    intent = str(obj.get("intent") or "list")
    return QueryResponse(answer=answer, highlight_ids=highlight_ids, intent=intent, raw=raw)


@router.post("", response_model=QueryResponse, summary="自然语言查询日程")
def query(req: QueryRequest) -> QueryResponse:
    now_iso = (req.now or datetime.now()).isoformat(timespec="seconds")
    tz = req.timezone or "Asia/Shanghai"
    events_json = json.dumps(
        [e.model_dump(mode="json") for e in req.events],
        ensure_ascii=False,
    )
    raw = _call_llm(req.text, events_json, now_iso, tz)
    return _parse_response(raw)
