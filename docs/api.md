# REST API 契约

> 后端基础路径 `/`（当前 MVP 不带 `/api` 前缀），所有响应均为 JSON。鉴权统一使用 `Authorization: Bearer <token>`。时间字段统一使用 ISO8601 字符串（带时区，例 `2026-05-29T14:00:00+08:00`），后端入库时转 UTC。

## 0. 通用约定

### 0.1 响应包

成功：直接返回 schema 对应的 JSON 对象 / 数组。

失败：

```json
{
  "code": "validation_failed",
  "message": "title 长度不能超过 200",
  "request_id": "9c6a1b2e-..."
}
```

`X-Request-Id` 头始终回写，用于前后端日志对照。

### 0.2 HTTP 状态码

| 码段 | 用法 |
| :--- | :--- |
| 200 / 201 / 204 | 成功（GET / POST / DELETE） |
| 400 | 业务逻辑校验失败（如时间错位） |
| 401 | 未登录 / token 失效 |
| 403 | 越权（事件不属于当前用户） |
| 404 | 资源不存在 |
| 409 | 冲突（如重复注册） |
| 422 | Schema 校验失败（pydantic 自动给出） |
| 429 | 限流（语音接口） |
| 500 | 未捕获错误 |
| 502 / 503 | 上游（百度智能云）异常 / 服务未配置 |

### 0.3 分页

事件检索默认按 `start_time` 升序，**不分页**（赛事范围内单用户事件量小）；如需分页后续 PR 加 `?cursor=&limit=`。

### 0.4 鉴权

除 `/healthz`、`/auth/register`、`/auth/login` 外，所有路由均要求 `Authorization`。缺失或失效返回 `401`。

---

## 1. 元信息

### `GET /`
- 公开。返回服务名、版本、文档、健康检查链接。

```json
{
  "service": "voice-calendar-backend",
  "version": "0.1.0",
  "docs": "/docs",
  "health": "/healthz"
}
```

### `GET /healthz`
- 公开。

```json
{
  "status": "ok",
  "service": "voice-calendar-backend",
  "env": "development",
  "timestamp": "2026-05-29T05:19:54.052031+00:00"
}
```

---

## 2. 认证

### `POST /auth/register`
请求：
```json
{ "email": "demo@voice-calendar.dev", "password": "demo1234", "display_name": "Demo" }
```
响应 `201`：
```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "demo@voice-calendar.dev",
    "display_name": "Demo",
    "timezone": "Asia/Shanghai",
    "theme": "system"
  }
}
```
错误：`409 already_registered`。

### `POST /auth/login`
请求：
```json
{ "email": "demo@voice-calendar.dev", "password": "demo1234" }
```
响应 `200`：同上。  
错误：`401 invalid_credentials`。

### `GET /auth/me`
- 鉴权。返回当前用户对象（同上 `user` 部分）。

### `PATCH /auth/me`
- 鉴权。允许更新 `display_name / timezone / theme`。

---

## 3. 标签

### `GET /tags`
- 鉴权。返回当前用户的所有标签（含预置 7 色）。

```json
[
  { "id": "uuid", "color_id": "blue", "name": "工作", "sort_order": 0 },
  { "id": "uuid", "color_id": "green", "name": "个人", "sort_order": 1 }
]
```

### `PATCH /tags/{id}`
- 鉴权。仅允许改 `name / sort_order`。

请求：
```json
{ "name": "学习", "sort_order": 2 }
```

---

## 4. 事件

### `GET /events`
- 鉴权。

| Query | 类型 | 说明 |
| :--- | :--- | :--- |
| `from` | ISO8601 | 必填，时间窗下界（含） |
| `to` | ISO8601 | 必填，时间窗上界（不含） |
| `q` | string | 可选，对 `title / description / location` 模糊匹配 |
| `tag` | string (color_id) | 可选 |

响应 `200`（数组示意）：
```json
[
  {
    "id": "uuid",
    "title": "产品评审会",
    "description": null,
    "start_time": "2026-05-29T14:00:00+08:00",
    "end_time": "2026-05-29T15:00:00+08:00",
    "all_day": false,
    "timezone": "Asia/Shanghai",
    "location": "会议室 A",
    "tag": { "id": "uuid", "color_id": "blue", "name": "工作" },
    "reminder_minutes": 15,
    "source": "manual",
    "created_at": "2026-05-29T05:00:00+00:00",
    "updated_at": "2026-05-29T05:00:00+00:00"
  }
]
```

### `GET /events/{id}`
- 鉴权。同上单对象；不存在或越权返回 `404`。

### `POST /events`
- 鉴权。

请求：
```json
{
  "title": "产品评审会",
  "description": null,
  "start_time": "2026-05-29T14:00:00+08:00",
  "end_time": "2026-05-29T15:00:00+08:00",
  "all_day": false,
  "timezone": "Asia/Shanghai",
  "location": "会议室 A",
  "tag_id": "uuid",
  "reminder_minutes": 15,
  "source": "manual"
}
```
响应 `201`：完整 Event 对象。  
错误：
- `422` schema 校验。
- `400 invalid_time_range`：`end_time < start_time`。

### `PATCH /events/{id}`
- 鉴权。
- 局部更新。拖拽改时间也走此接口，仅传 `start_time / end_time`。
- 如修改 `reminder_minutes`，后端会清空旧 reminder 并按新规则重建。

### `DELETE /events/{id}`
- 鉴权。
- 软删，置 `deleted_at = now()`。
- 响应 `204`。

### `GET /events/aggregate`
- 鉴权。
| Query | 类型 | 说明 |
| :--- | :--- | :--- |
| `year` | int | 必填 |
| `tag` | color_id | 可选 |

响应：返回 365/366 个日期的事件计数，用于年视图。
```json
[
  { "date": "2026-01-01", "count": 0 },
  { "date": "2026-01-02", "count": 3 }
]
```

---

## 5. 语音

### `POST /voice/transcribe`
- 鉴权。仅在前端 `SpeechRecognition` 不可用时调用。

请求：`multipart/form-data` 字段 `audio`（pcm/wav，建议 16kHz 单声道，≤ 60s）。

响应 `200`：
```json
{ "text": "明天下午三点和小王开会一小时", "duration_ms": 1820 }
```
错误：
- `400 invalid_audio`：音频格式 / 时长不达标。
- `503 voice_unavailable`：百度凭据未配置或上游错误。
- `429 rate_limited`：超过单用户每分钟 10 次限制。

### `POST /voice/parse`
- 鉴权。把识别后的文本解析为结构化指令。

请求：
```json
{ "text": "明天下午三点和小王开会一小时", "now": "2026-05-29T14:00:00+08:00" }
```
（`now` 可选；不传则用服务端 UTC，并按当前用户时区还原。）

响应 `200`（按 `kind` 取一）：

```json
// 创建
{
  "kind": "create",
  "event": {
    "title": "和小王开会",
    "start_time": "2026-05-30T15:00:00+08:00",
    "end_time": "2026-05-30T16:00:00+08:00",
    "all_day": false,
    "timezone": "Asia/Shanghai",
    "location": null,
    "tag_id": null,
    "reminder_minutes": null,
    "source": "voice"
  },
  "confidence": 0.91
}
```

```json
// 查询
{
  "kind": "query",
  "range": { "from": "2026-05-30T00:00:00+08:00", "to": "2026-05-31T00:00:00+08:00" },
  "confidence": 0.95
}
```

```json
// 删除
{
  "kind": "delete",
  "matcher": { "title": "评审会", "date": "2026-05-29" },
  "confidence": 0.78
}
```

```json
// 未识别
{ "kind": "unknown", "raw": "今天天气真好" }
```

`confidence` 取值 `[0, 1]`。前端在 `< 0.5` 时建议二次确认（弹气泡让用户编辑后再提交）。

详细解析规则见 [voice-protocol.md](./voice-protocol.md)。

---

## 6. 提醒

### `GET /reminders/due`
- 鉴权。返回当前时间已到期且未推送的提醒，并将其 `notified_at` 置为当前时间。

响应：
```json
[
  {
    "id": "uuid",
    "event_id": "uuid",
    "due_at": "2026-05-29T13:45:00+00:00",
    "event": {
      "id": "uuid",
      "title": "产品评审会",
      "start_time": "2026-05-29T14:00:00+08:00"
    }
  }
]
```

### `POST /reminders/{id}/dismiss`
- 鉴权。把 `dismissed_at = now()`，响应 `204`。

---

## 7. 限流

| 接口 | 限制 |
| :--- | :--- |
| `POST /voice/transcribe` | 10 次 / 分钟 / 用户 |
| `POST /voice/parse` | 60 次 / 分钟 / 用户 |
| `POST /auth/login` | 10 次 / 分钟 / IP |
| 其他写接口 | 120 次 / 分钟 / 用户 |

实现：后续 PR 引入 `slowapi` 中间件；MVP 阶段先在 voice 服务里做内存计数兜底。

---

## 8. OpenAPI

FastAPI 自动生成：
- `/docs` Swagger UI
- `/redoc` ReDoc
- `/openapi.json` 机读

前端 `lib/api.ts` 类型由这份契约 + 手写保持一致；如未来希望自动生成，可在 PR 中接入 `openapi-typescript`。
