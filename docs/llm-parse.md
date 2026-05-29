# LLM 解析协议

`POST /api/parse` 把一段自然语言文本（语音转写或截图 OCR 结果）丢给大模型，返回一个或多个结构化事件草稿。前端拿到草稿后展示在确认弹窗里，用户审核后再写库。

## 请求

```http
POST /api/parse
Content-Type: application/json
```

```jsonc
{
  "text": "明天下午三点和小李开会一小时，提醒我",
  "now": "2026-05-29T18:30:00+08:00",   // 可选，缺省取服务器时间
  "timezone": "Asia/Shanghai",            // 可选，IANA 时区
  "mode": "speech",                       // speech | schedule，默认 speech
  "weeks_to_expand": 16                   // schedule 模式下展开的周数，默认 16，范围 [1,30]
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `text` | string | 必填，1–20000 字符。语音转写文本或 OCR 文本 |
| `now` | datetime | 客户端当前时间，用来解析"明天/下周三"等相对时间 |
| `timezone` | string | IANA 时区名（`Asia/Shanghai`、`America/Los_Angeles`） |
| `mode` | string | `speech` = 单次语音口令；`schedule` = 课程表 / 批量截图 |
| `weeks_to_expand` | int | 仅 `schedule` 用，模型只输出每门课一次，后端按 `recurrence` 展开 |

## 响应

```jsonc
{
  "events": [
    {
      "title": "和小李开会",
      "description": "",
      "start_time": "2026-05-30T15:00:00",
      "end_time":   "2026-05-30T16:00:00",
      "color_id": "blue",
      "duration_inferred": false,
      "duration_reason": "用户明确指定",
      "weekday": null,
      "recurrence": null
    }
  ],
  "raw": "...模型原始输出..."
}
```

`color_id` 取值：`blue / green / orange / purple / pink / red / gray`。前端用 `utils/colors.ts` 映射成 hex。

`recurrence` 仅在 `schedule` 模式下出现，可能值：

| 值 | 含义 |
| :--- | :--- |
| `every`（或缺省） | 每周都上 |
| `odd` | 奇数周 |
| `even` | 双周 / 偶数周 |
| `1-8` | 第 1 到第 8 周 |
| `3,5,7` | 第 3、5、7 周 |
| `once` | 仅一次（一次性会议、活动） |

后端 `_expand_recurrence` 会把单条课程按 `weeks_to_expand` 展开成多条事件返回给前端，前端不需要重新展开。

## 两种模式

### `speech` —— 口语单条

适合"明天下午三点开会"这类一两句话的口令。SYSTEM prompt 内置一张时长推测表（站会 15 分钟、周会 1 小时、健身 1 小时、看电影 2 小时…）。用户没明说时长时模型会按表估时，并把依据写进 `duration_reason`：

- `duration_inferred=false` → 用户明说了时长（"开会一个半小时"、"3 点到 5 点"）
- `duration_inferred=true` → 后端估的，UI 上可弱提示用户复核

### `schedule` —— 课程表 / 日程批量

适合一整张课程表 OCR 文本。prompt 教模型：

- 按"星期一/二/三/…"或"Mon/Tue"分列
- 节次映射：1-2 节 = 08:00-09:50、3-4 节 = 10:00-11:50、5-6 节 = 14:00-15:50、7-8 节 = 16:00-17:50、9-10 节 = 19:00-20:50
- 容忍 OCR 噪声（"2节" 误识为 "Z节"、"教305" 误识为 "教3O5"）
- **每门课只输出一次**，把课程定到本周对应的星期几（已过去的课放到下周），用 `recurrence` 描述跨周规则
- 同名课同色、不同课轮换 7 色（后端会再用 `_assign_distinct_colors` 强制保证）

## 错误码

| HTTP | 含义 | 前端处理 |
| :--- | :--- | :--- |
| 200 | 成功（`events` 可能为空数组） | 空数组提示"没识别到事件，换种说法再试" |
| 422 | 入参校验失败（text 太长 / weeks 越界等） | Toast 显示 detail |
| 502 | LLM 上游报错或返回非法 JSON | "大模型上游错误，请稍后重试" |
| 503 | `LLM_API_KEY` 未配置 | "后端未配置大模型 API Key" |
| 504 | LLM 网络不通 / 超时 | "大模型超时或网络不通" |

前端实现见 `src/utils/llmParse.ts`，超时：`speech` 模式 35 s，`schedule` 模式 90 s。

## 后端实现要点

- `app/api/parse.py` 里两段 prompt 常量：`SYSTEM_PROMPT` 与 `SCHEDULE_PROMPT`
- 用 `urllib.request` 直接打 OpenAI 兼容的 `/chat/completions`，开启 `response_format: {"type": "json_object"}`
- `_normalize_events` 容忍模型输出多包一层 markdown
- `_expand_recurrence` 把课表按周展开
- `_assign_distinct_colors` 给同名事件分配同色、不同名事件轮换调色板

## 下一步：视觉直读

当前 `schedule` 模式依赖前端 Tesseract OCR 提文字，中文表格识别误差大。后续会新增 `POST /api/parse/image` 端点，把图片直接交给视觉大模型（GLM-4V）解析，跳过本地 OCR。配置已在 `Settings` 里预留位置。
