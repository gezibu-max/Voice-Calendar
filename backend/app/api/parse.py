"""语音/自然语言文字 → 结构化日历事件解析。

接收一段自然语言（通常是语音识别后的文本），调用大模型抽取出一个或多个日历事件。
失败时由前端回退到本地正则 parser。
"""
from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.core.config import get_settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/parse", tags=["parse"])


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    now: Optional[datetime] = Field(
        default=None,
        description="客户端当前时间，用于解析'明天/下周三'等相对时间。缺省用服务器时间。",
    )
    timezone: Optional[str] = Field(default=None, description="客户端 IANA 时区名，例如 Asia/Shanghai。")
    mode: str = Field(default="speech", description="speech=单条语音；schedule=课程表/批量 OCR")
    weeks_to_expand: int = Field(default=16, ge=1, le=30, description="schedule 模式下重复事件展开周数")


class ParsedEvent(BaseModel):
    title: str
    description: str = ""
    start_time: datetime
    end_time: datetime
    color_id: str = "blue"
    duration_inferred: bool = False
    duration_reason: str = ""
    weekday: Optional[int] = Field(default=None, ge=0, le=6)
    recurrence: Optional[str] = None
    priority: Optional[str] = Field(default="P2", pattern=r"^(P0|P1|P2|P3)$")


class ParseResponse(BaseModel):
    events: List[ParsedEvent]
    raw: Optional[str] = None


SCHEDULE_PROMPT = """你是课程表/日程表解析助手。用户会粘贴一段从课程表截图 OCR 出来的文字（中文，常含错字、空格混乱、表格残缺）。\
你需要从中找出**所有**课程/会议条目，并按 JSON 输出。

输入特点：
- 通常按"星期一/二/三/四/五/六/日"或英文 Mon/Tue 分列。
- 节次形式："1-2 节"、"3,4 节"、"早 8:00-9:50"、"08:00 ~ 09:50"等。
- 一行可能包含：课程名 / 老师 / 教室 / 周次（如"1-16周"、"双周"、"奇数周"）。
- OCR 噪声："2节" 可能识别成"Z节"、"教305"可能识别成"教3O5"，请尽量纠错。

输出规则：
1. 严格输出 JSON：{"events": [...]}。无法解析时返回 {"events": []}。
2. **每门课只输出一次**，不要重复展开成多周（后端会自动展开）。每条字段：
   - title: 课程名（不含老师姓名前缀）
   - description: "<老师>·<教室>" 这种简洁拼接，OCR 不全可省略对应段
   - start_time / end_time: ISO 8601 本地时间。把课程定到**本周**对应的星期几；如果该课已过去，改放到下周对应日。具体时刻按节次映射来定。
   - color_id: ["blue","green","orange","purple","pink","red","gray"] 选一个
   - duration_inferred / duration_reason: 节次时间清晰时 false，只能猜时 true
   - weekday: 0-6（周一=0…周日=6），就是该课在一周里的星期几
   - recurrence: 字符串，描述这门课在"哪些周"上
     * "every"  = 每周都上（默认）
     * "odd"    = 奇数周
     * "even"   = 双周/偶数周
     * "1-8"    = 第 1 到第 8 周
     * "3,5,7"  = 第 3、5、7 周
     * "once"   = 只这一次（一次性会议/活动）
   - priority: 优先级（P0=紧急重要，P1=重要，P2=常规，P3=可选）。课程表默认 P2，标注"考试"、"测验"、"作业截止"的设为 P0-P1。

3. 颜色策略：不同的**课程名**用不同的 color_id（轮换 7 种颜色）。同名课程必须用同一色。

4. 优先级策略：
   - 普通课程：P2（常规）
   - 考试、测验、重要节点：P0 或 P1
   - 可选参加的活动：P3
   - 有明确截止日期的作业：P1

5. 节次时间常用映射（无明确时间时按下面估，写进 duration_reason 说明）：
   - 1-2 节: 08:00–09:50
   - 3-4 节: 10:00–11:50
   - 5-6 节: 14:00–15:50
   - 7-8 节: 16:00–17:50
   - 9-10 节: 19:00–20:50
   - 单节按 50 分钟估
"""


SYSTEM_PROMPT = """你是日历事件抽取助手。用户会给你一段中文（可能含口语、错别字、连读），\
你要从中找出**所有**独立的日历事件，并按 JSON 输出。

规则：
1. 严格输出 JSON，不要任何解释、Markdown、前后空白。
2. 顶层是对象：{"events": [ ... ]}。如果没识别到任何事件，返回 {"events": []}。
3. 每个事件字段：
   - title: 简短标题（不超过 30 字，去掉"提醒我/帮我安排"这类指令词）
   - description: 备注（可空字符串）
   - start_time: ISO 8601 本地时间，例如 "2026-05-30T15:00:00"
   - end_time: ISO 8601 本地时间，必须晚于 start_time
   - color_id: 从 ["blue","green","orange","purple","pink","red","gray"] 中按事件性质挑一个
   - duration_inferred: 布尔值。用户**没有**明说时长（"开会一小时"、"两点到四点"算明说）时设 true
   - duration_reason: 简短中文（≤20字）说明你为什么定这个时长。例如"按例行周会估 1 小时"、"用户明确说 2 小时"、"晚餐通常 1.5 小时"
4. 时间推理：
   - "明天/后天/下周三/下月初" 等相对时间以参考时间 NOW 为准。
   - 缺失具体时刻时，根据语境选典型值（早会 9:00，午饭 12:00，下午会 14:00 / 15:00，晚饭 19:00，睡前提醒 22:00）。
   - 一段话里多个事件要全部抽出。时间互不重叠保留各自时间；如同时段冲突，按文中顺序串行（前者结束后接后者开始）。
5. 时长推测表（用户没明说时长时按下表估，并把依据写进 duration_reason）：
   - 站会 / 晨会：15 分钟
   - 例行会议 / 周会 / 沟通 / 1 对 1 / 复盘 / 评审：1 小时
   - 培训 / 课程 / 公开课 / 讲座 / 直播 / workshop：1.5 小时
   - 大会 / 全员会 / 季度会 / 战略会：2 小时
   - 面试：45 分钟（技术面 1 小时）
   - 早餐：30 分钟
   - 午餐 / 商务午餐：1 小时
   - 晚餐 / 聚餐 / 家宴：1.5 小时
   - 喝咖啡 / 喝茶 / 闲聊：45 分钟
   - 健身 / 跑步 / 瑜伽 / 训练：1 小时
   - 球类 / 比赛 / 远足 / 户外：2 小时
   - 看电影：2 小时（IMAX/史诗片可 2.5 小时）
   - 看演出 / 演唱会 / 话剧：2.5 小时
   - 通勤 / 路上 / 接送：30 分钟
   - 飞行 / 高铁：按城市间常识估（不确定时给 2 小时并在 reason 里说明）
   - 看医生 / 体检：1 小时
   - 美容 / 理发 / 按摩：1 小时
   - 提醒 / 闹钟 / 截止 deadline：5 分钟（仅占位）
   - 工作专注 / 写代码 / 写文档 / 学习：默认 2 小时
   - 加班：2 小时（除非明说）
   - 旅行 / 出差 / 度假 / 跨多日的事件：按用户描述的天数算，end_time 设到末日的 18:00
   - 不在表中且无法判断：1 小时，duration_reason 写 "默认 1 小时"
6. 当用户**明确说了**时长（"开会一个半小时"、"3 点到 5 点"、"持续 30 分钟"），duration_inferred 必须是 false，duration_reason 写 "用户明确指定"。
7. 颜色建议：会议 blue，运动 green，吃饭 orange，娱乐/演出 purple，重要/deadline red，提醒/家庭 pink，通勤/其它 gray。
"""


VISION_PROMPT = """你是日历事件抽取助手，你看到的是**一张图片**（不是 OCR 文字）。\
请直接识图，把图里的所有日程信息抽出来，并按 JSON 输出。

第一步：先在脑子里判断图片类型（**不要写出来**），可能是：
- TIMETABLE 课程表/排班表（多列表格、按星期几或日期分列、含节次/时段）
- SINGLE_EVENT 单个事件截图（票据、活动海报、会议邀请、行程单、机票/高铁票、电影票、酒店预订）
- MULTI_EVENT 多事件列表（待办列表、行程清单、聊天记录里的多条安排、备忘录）
- CALENDAR_SCREENSHOT 已有日历应用截图（Google/Apple/飞书日历）
- WHITEBOARD 手写白板/便签/手账
- OTHER 其它

第二步：按图片类型用对应规则抽取，统一输出 {"events": [...]}。无法识别返回 {"events": []}。

────────────────────────────
输出字段（每个 event）：
- title: 简洁标题（≤30字，去掉多余前缀；课程表里就是课程名，去掉老师/教室）
- description: 补充信息，"<地点>·<人/讲师/航班号>" 这种简洁拼接，没有就空字符串
- start_time / end_time: ISO 8601 本地时间，必须 end > start
- color_id: ["blue","green","orange","purple","pink","red","gray"] 选一个
- duration_inferred: 图里有明确时间→false；只能从语境猜→true
- duration_reason: ≤20字中文说明依据（"图里写明 14:00–16:00" / "海报只有日期，按演唱会估 2.5h"）
- weekday: 0–6（周一=0…周日=6）。仅 TIMETABLE 类型必填，其它类型可填可不填
- recurrence: 仅 TIMETABLE 必填。其它类型一律填 "once"。
  * "every"=每周；"odd"=单周；"even"=双周；"1-8"=第1到8周；"3,5,7"=指定周；"once"=只这一次

────────────────────────────
TIMETABLE 规则：
- **每门课只输出一条**，后端会按 recurrence + WEEKS_TO_EXPAND 自动展开成多周。
- **关键**：星期几写在 `weekday` 字段（0=周一…6=周日），后端依赖它定位日期。`start_time` 的日期部分填到本周对应的星期几即可，**不要把所有课都写成今天**——课表里有 5 个工作日就要有 5 个不同的 weekday/日期。
- 同一课程名必须用同一 color_id；不同课程名轮换 7 种颜色。
- 节次→时间的常用映射（无明确钟点时按下表估，并写进 duration_reason）：
   1-2节 08:00–09:50 / 3-4节 10:00–11:50 / 5-6节 14:00–15:50 / 7-8节 16:00–17:50 / 9-10节 19:00–20:50。单节按 50 分钟。
- 周次提示：图里写"1-16周"→"1-16"；"双周"→"even"；"奇数周"→"odd"；没写→"every"。
- 描述写 "<老师>·<教室>"，缺就省。

SINGLE_EVENT / MULTI_EVENT / WHITEBOARD 规则：
- 每条独立事件输出一条。
- 时间优先用图上明文（"3月12日 19:30"、"DEPARTURE 08:25"），否则按下表估时长：
   会议/沟通/复盘 1h；培训/课程/讲座 1.5h；大会 2h；面试 45min；
   早餐 30min；午餐 1h；晚餐/聚餐 1.5h；咖啡/茶 45min；
   健身/跑步/瑜伽 1h；球类/户外/远足 2h；
   电影 2h（IMAX 2.5h）；演出/演唱会/话剧 2.5h；
   通勤/接送 30min；飞行/高铁按城市间常识估，不确定给 2h；
   看医生/体检 1h；美容/理发/按摩 1h；
   提醒/闹钟/截止 deadline 5min（占位）；
   工作专注/写代码/写文档 默认 2h；
   旅行/出差/度假/跨多日 按描述天数算，end_time 设到末日 18:00；
   不在表中无法判断 1h，duration_reason 写"默认 1 小时"。
- 机票/高铁票：title="<出发地>→<目的地>"，description 写航班号/车次+座位，时间用票面起飞/出发到落地/到达；不写到达就用航程估。
- 电影票：title=电影名，description="<影院>·<厅>·<座>"。
- 海报：title=活动名，时间按海报；只有日期没钟点时用海报常识（演出 19:30，活动 14:00）。
- 已有日历应用截图（CALENDAR_SCREENSHOT）：把每个可见事件块抽成独立 event；时间从时间轴/事件块顶部位置读。

颜色策略：
- 会议/工作/课 blue；运动 green；餐饮 orange；娱乐/演出/电影 purple；
- 重要/deadline/考试 red；提醒/家庭/医疗 pink；通勤/旅行/其它 gray。
- 课程表里同名课同色，不同名轮换。

第三步：output **only** JSON，no markdown, no explanation.
"""


def _call_llm(text: str, now_iso: str, tz: str, mode: str, weeks: int) -> str:
    """调用 OpenAI 兼容的 chat completions 接口，返回 raw JSON 字符串。"""
    settings = get_settings()
    if not settings.llm_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM_API_KEY not configured",
        )

    system_prompt = SCHEDULE_PROMPT if mode == "schedule" else SYSTEM_PROMPT
    extra_user = f"\nWEEKS_TO_EXPAND = {weeks}\n" if mode == "schedule" else ""

    user_prompt = (
        f"NOW = {now_iso}\nTIMEZONE = {tz}{extra_user}\n\n"
        f"原文：\n{text}\n\n"
        "请输出 JSON。"
    )

    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
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
        logger.warning("LLM HTTP %s: %s", exc.code, detail)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM upstream error {exc.code}",
        ) from exc
    except urllib.error.URLError as exc:
        logger.warning("LLM network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="LLM unreachable",
        ) from exc

    try:
        data = json.loads(body)
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.warning("Unexpected LLM response shape: %s", body[:300])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM returned malformed response",
        ) from exc


def _normalize_events(raw: str) -> List[ParsedEvent]:
    """容忍模型偶尔多包一层 markdown 或加前后说明文字。"""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM did not return JSON",
            )
        obj = json.loads(text[start : end + 1])

    items = obj.get("events", []) if isinstance(obj, dict) else []
    if not isinstance(items, list):
        return []

    events: List[ParsedEvent] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            events.append(ParsedEvent(**item))
        except Exception as exc:  # noqa: BLE001 — 单条失败不影响其它
            logger.info("Skip invalid parsed event: %s (%s)", item, exc)
            continue
    return events


def _rebase_to_weekday(events: List[ParsedEvent], now: datetime) -> List[ParsedEvent]:
    """对带 weekday 字段的事件，把日期重置到本周对应的星期几（保留时刻）。

    模型偶尔会把所有课的 start_time 都写成今天，导致整张课表塌成一天。
    只要 weekday 是对的，这里就能把日期挪到正确的星期几。
    注意：无论 recurrence 是什么，只要 weekday 存在就应该处理。
    """
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    monday = today_midnight - timedelta(days=today_midnight.weekday())
    out: List[ParsedEvent] = []
    for ev in events:
        if ev.weekday is None:
            out.append(ev)
            continue
        
        target = monday + timedelta(days=ev.weekday)
        new_start = ev.start_time.replace(year=target.year, month=target.month, day=target.day)
        new_end = ev.end_time.replace(year=target.year, month=target.month, day=target.day)
        if new_end <= new_start:
            new_end = new_end + timedelta(days=1)
        out.append(ev.model_copy(update={"start_time": new_start, "end_time": new_end}))
    return out


def _expand_recurrence(events: List[ParsedEvent], weeks: int) -> List[ParsedEvent]:
    """schedule 模式下把模型输出的"每门课一次"展开成 N 周。

    若事件没有 weekday/recurrence，按"every"处理（每周展开）。
    """
    if weeks <= 1:
        return events

    expanded: List[ParsedEvent] = []
    for ev in events:
        rule = (ev.recurrence or "every").strip().lower()
        if rule == "once":
            expanded.append(ev)
            continue

        target_weeks = _resolve_week_set(rule, weeks)
        if not target_weeks:
            target_weeks = list(range(1, weeks + 1))

        for w in target_weeks:
            offset = timedelta(weeks=w - 1)
            new_start = ev.start_time + offset
            new_end = ev.end_time + offset
            expanded.append(ev.model_copy(update={
                "start_time": new_start,
                "end_time": new_end,
            }))
    return expanded


def _assign_distinct_colors(events: List[ParsedEvent]) -> List[ParsedEvent]:
    """给同名事件分配同色、不同名事件用不同色（轮换 7 色）。"""
    palette = ["blue", "green", "orange", "purple", "pink", "red", "gray"]
    title_to_color: dict = {}
    next_idx = 0
    out: List[ParsedEvent] = []
    for ev in events:
        key = ev.title.strip()
        if key not in title_to_color:
            title_to_color[key] = palette[next_idx % len(palette)]
            next_idx += 1
        out.append(ev.model_copy(update={"color_id": title_to_color[key]}))
    return out


def _resolve_week_set(rule: str, weeks: int) -> List[int]:
    """把 'every' / 'odd' / 'even' / '1-8' / '3,5,7' 解析成 1-indexed 的周列表。"""
    rule = rule.replace(" ", "")
    if rule in ("every", ""):
        return list(range(1, weeks + 1))
    if rule == "odd":
        return [w for w in range(1, weeks + 1) if w % 2 == 1]
    if rule == "even":
        return [w for w in range(1, weeks + 1) if w % 2 == 0]

    # "1-8" 形式
    m = re.match(r"^(\d+)-(\d+)$", rule)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a > b:
            a, b = b, a
        return [w for w in range(a, b + 1) if 1 <= w <= weeks]

    # "3,5,7" 形式
    if re.match(r"^[0-9,]+$", rule):
        return sorted({int(x) for x in rule.split(",") if x and 1 <= int(x) <= weeks})

    return list(range(1, weeks + 1))


@router.post("", response_model=ParseResponse, summary="解析自然语言为日历事件列表")
def parse(req: ParseRequest) -> ParseResponse:
    now_dt = req.now or datetime.now()
    now_iso = now_dt.isoformat(timespec="seconds")
    tz = req.timezone or "Asia/Shanghai"
    raw = _call_llm(req.text, now_iso, tz, req.mode, req.weeks_to_expand)
    events = _normalize_events(raw)
    if req.mode == "schedule":
        events = _assign_distinct_colors(events)
        events = _rebase_to_weekday(events, now_dt)
        events = _expand_recurrence(events, req.weeks_to_expand)
    return ParseResponse(events=events, raw=raw)


_ALLOWED_IMAGE_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


def _call_vision_llm(image_bytes: bytes, mime: str, now_iso: str, tz: str, weeks: int) -> str:
    """把图片直接喂给视觉大模型（GLM-4V 等 OpenAI 兼容协议），返回 raw JSON 字符串。"""
    settings = get_settings()
    if not settings.vision_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VISION_API_KEY not configured",
        )

    data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    weekday_idx = (datetime.fromisoformat(now_iso).weekday()) if now_iso else 0
    weekday_zh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][weekday_idx]
    user_text = (
        f"NOW = {now_iso}（{weekday_zh}）\n"
        f"TIMEZONE = {tz}\n"
        f"WEEKS_TO_EXPAND = {weeks}\n\n"
        "请按 system 提示读图并输出 JSON。先在心里判断图片类型再抽取，"
        "对非课程表的图片，recurrence 一律填 \"once\"。"
    )

    payload = {
        "model": settings.vision_model,
        "messages": [
            {"role": "system", "content": VISION_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "temperature": 0.05,
    }

    url = settings.vision_base_url.rstrip("/") + "/chat/completions"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.vision_api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=settings.vision_timeout) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        logger.warning("Vision LLM HTTP %s: %s", exc.code, detail)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Vision LLM upstream error {exc.code}",
        ) from exc
    except urllib.error.URLError as exc:
        logger.warning("Vision LLM network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Vision LLM unreachable",
        ) from exc

    try:
        data = json.loads(body)
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.warning("Unexpected vision LLM response shape: %s", body[:300])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Vision LLM returned malformed response",
        ) from exc


@router.post("/image", response_model=ParseResponse, summary="把课程表/日程截图直接交给视觉大模型解析")
async def parse_image(
    file: UploadFile = File(..., description="课程表 / 日程截图"),
    now: Optional[datetime] = Form(default=None),
    timezone: Optional[str] = Form(default=None),
    weeks_to_expand: int = Form(default=16, ge=1, le=30),
) -> ParseResponse:
    mime = (file.content_type or "").lower()
    if mime not in _ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type: {mime or 'unknown'}",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty image")
    if len(image_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"image exceeds {_MAX_IMAGE_BYTES // (1024 * 1024)} MB",
        )

    now_dt = now or datetime.now()
    now_iso = now_dt.isoformat(timespec="seconds")
    tz = timezone or "Asia/Shanghai"
    raw = _call_vision_llm(image_bytes, mime, now_iso, tz, weeks_to_expand)
    events = _normalize_events(raw)
    # 对视觉输入：未明确给出 recurrence 的事件按一次性处理，避免单事件被展开成 16 周
    events = [
        ev if (ev.recurrence and ev.recurrence.strip()) else ev.model_copy(update={"recurrence": "once"})
        for ev in events
    ]
    events = _assign_distinct_colors(events)
    events = _rebase_to_weekday(events, now_dt)
    events = _expand_recurrence(events, weeks_to_expand)
    return ParseResponse(events=events, raw=raw)
