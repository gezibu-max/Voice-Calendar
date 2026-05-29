# 后端设计

> 本文档定义 Voice Calendar 后端的工程结构、模块职责、关键流程、错误约定。数据库表结构见 [data-model.md](./data-model.md)，REST 接口契约见 [api.md](./api.md)，语音协议见 [voice-protocol.md](./voice-protocol.md)。

## 1. 技术选型

| 维度 | 选型 | 理由 |
| :--- | :--- | :--- |
| 框架 | FastAPI 0.115 | 异步、Schema 驱动、自动 OpenAPI |
| 语言 | Python 3.11+ | 性能 / 类型 / asyncio 都达标 |
| ORM | SQLAlchemy 2.x | 成熟、迁移生态完整 |
| 数据库 | SQLite | 零配置、单文件，赛事评委一键复现 |
| 校验 | pydantic 2 | 与 FastAPI 紧密集成 |
| 配置 | pydantic-settings 2 | 集中读 .env |
| 认证 | JWT + bcrypt | passlib[bcrypt] + python-jose |
| 调度 | APScheduler（后续 PR 引入） | 提醒到点触发；MVP 阶段先用前端轮询兜底 |
| 语音 | 百度智能云语音识别（短语音 REST + Web SDK） | 中文识别准确度高，免费额度充足 |
| HTTP 客户端 | httpx | 异步 / 同步双模 |
| 测试 | pytest + httpx.AsyncClient | 接口级用例 |

## 2. 工程结构（目标态）

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 实例 + 中间件 + 路由挂载
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # pydantic-settings 配置类
│   │   ├── database.py         # engine / SessionLocal / Base
│   │   ├── security.py         # bcrypt / JWT 工具
│   │   └── exceptions.py       # 自定义异常 + 全局 handler
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # 依赖（current_user / db_session）
│   │   ├── health.py
│   │   ├── auth.py             # 注册 / 登录 / 我
│   │   ├── events.py           # 事件 CRUD + 搜索
│   │   ├── tags.py             # 标签
│   │   ├── voice.py            # 语音上传 / 解析
│   │   └── reminders.py        # 提醒查询 / 已读
│   ├── models/
│   │   ├── __init__.py         # 集中导入，便于 Base.metadata.create_all
│   │   ├── user.py
│   │   ├── event.py
│   │   ├── tag.py
│   │   └── reminder.py
│   ├── schemas/                # pydantic schemas，与 ORM 模型分开
│   │   ├── auth.py
│   │   ├── event.py
│   │   ├── tag.py
│   │   ├── voice.py
│   │   └── reminder.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── events.py
│   │   ├── tags.py
│   │   ├── voice.py            # 调百度 SDK
│   │   ├── parser.py           # 自然语言 -> 结构化
│   │   └── reminder.py         # 调度器
│   └── seeds/
│       └── demo.py             # 演示数据脚本
├── data/                       # SQLite 文件目录（运行时创建，已 .gitignore）
├── tests/
│   ├── conftest.py
│   ├── test_health.py
│   ├── test_events.py
│   └── test_parser.py
├── .env.example
├── requirements.txt
└── README.md
```

## 3. 分层职责

```
HTTP Request
    │
    ▼
┌─────────────┐
│   Router    │  app/api/*.py：参数校验、依赖注入、调用 Service、构造响应
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  app/services/*.py：业务规则、事务边界、跨表协调
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ORM / Model │  app/models/*.py：SQLAlchemy 表映射，无业务逻辑
└──────┬──────┘
       │
       ▼
   SQLite File
```

约定：
- **Router 不直接写 ORM**，必须经过 Service。
- **Service 不直接抛 HTTPException**，统一抛领域异常（`AppException` 子类），由全局 handler 转 HTTP。
- **Schema** 与 **Model** 分离，互不引用。

## 4. 配置（`app/core/config.py`）

```python
class Settings(BaseSettings):
    app_name: str = "voice-calendar-backend"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    cors_origins: list[str] = ["http://localhost:3000"]

    database_url: str = "sqlite:///./data/voice_calendar.db"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7      # 7 天

    baidu_api_key: str | None = None
    baidu_secret_key: str | None = None
    baidu_app_id: str | None = None
```

所有第三方密钥仅从环境变量 / `.env` 读取，**绝不入仓库**。

## 5. 认证

### 5.1 注册
- `POST /auth/register`：邮箱 + 密码（前端 ≥ 8 位）。
- 服务端用 `bcrypt` 哈希存储；不存明文。
- 返回 `{ token, user }`，自动登录。

### 5.2 登录
- `POST /auth/login`：邮箱 + 密码。
- 校验通过签发 JWT，payload `{ sub: user.id, exp }`，过期时间 7 天。
- 失败统一返回 `401`，避免泄露用户存在性。

### 5.3 当前用户
- `GET /auth/me`：从 `Authorization: Bearer <token>` 解析，返回 `User` schema。
- 依赖 `Depends(get_current_user)` 在所有受保护路由复用。

## 6. 事件 CRUD

### 6.1 字段范围
见 [data-model.md#event](./data-model.md)。简要：

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | uuid | 主键 |
| user_id | uuid | 拥有者 |
| title | str | 必填，<= 200 字符 |
| description | str? | 可选 |
| start_time | datetime | UTC 存储，前端按时区渲染 |
| end_time | datetime | UTC，必须 ≥ start_time |
| all_day | bool | 全天事件 |
| tag_id | uuid? | 标签外键 |
| reminder_minutes | int? | 提前 N 分钟提醒 |
| timezone | str | IANA 时区名，如 `Asia/Shanghai` |
| created_at / updated_at | datetime | 审计 |

### 6.2 关键接口
| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/events?from=&to=&q=&tag=` | 按范围 + 关键字 + 标签查询 |
| `GET` | `/events/{id}` | 详情 |
| `POST` | `/events` | 创建（同时为 `reminder_minutes != null` 注册提醒） |
| `PATCH` | `/events/{id}` | 局部更新（拖拽改时间也走这里） |
| `DELETE` | `/events/{id}` | 软删（保留 30 天） |
| `GET` | `/events/aggregate?year=2026` | 年视图聚合 |

### 6.3 业务规则
- 创建 / 更新时统一把时间转 UTC 存储。
- 跨天事件保留原始 `start_time` / `end_time`，不切片，渲染由前端处理。
- 软删事件不出现在 `GET /events`，仅管理后台可见（赛事不实现管理后台，此约定为后续扩展）。

## 7. 标签

- 系统预置 7 个标签，新用户注册时复制一份到 `tag` 表。
- 用户可改名，但不能改颜色 ID（保证语义稳定）。
- 删除标签前必须把关联事件的 `tag_id` 置空。

## 8. 语音模块

### 8.1 流程

```
浏览器 SpeechRecognition (主路径)
       │
       ▼ 文本
       POST /voice/parse  ── parser.py 解析 ──► 结构化 Intent
                                                    │
                                                    ▼
                                       创建/查询/删除事件 OR unknown

浏览器麦克风 (备路径，原生不支持时)
       │
       ▼ 音频文件 (wav/pcm/16kHz)
       POST /voice/transcribe  ── 百度短语音 REST ──► 文本
                                                          │
                                                          ▼
                                                   POST /voice/parse 同上
```

### 8.2 解析器（`services/parser.py`）

实现策略：

1. **规则匹配优先**：
   - 关键词触发：`提醒我 / 添加 / 安排 / 查看 / 删除 / 取消`
   - 时间提取：`明天下午 3 点`、`5 月 30 日 14:00`、`下周一上午`
   - 时长提取：`半小时 / 1 小时 / 30 分钟`
2. **时间表达式库兜底**：使用 `dateparser` 中文模式补全模糊时间。
3. **未识别**：返回 `{ kind: 'unknown', raw }`，由前端提示用户重试。

详细文法见 [voice-protocol.md](./voice-protocol.md)。

### 8.3 百度智能云接入

仅在前端 `SpeechRecognition` 不可用 / 失败时调用：

- `services/voice.py` 持有一个 `BaiduTokenManager`，按 30 天 TTL 缓存 access_token。
- 调用 `https://vop.baidu.com/server_api`，参数 `format=pcm` / `rate=16000` / `dev_pid=1537`（中文普通话）。
- 错误码映射：
  | 百度 err_no | HTTP | 说明 |
  | :--- | :--- | :--- |
  | 0 | 200 | 成功 |
  | 3300 / 3301 | 400 | 输入参数错误 / 音频质量差 |
  | 3302 | 401 | 鉴权失败（key/secret 错） |
  | 3304 | 429 | 配额超限 |
  | 其他 | 502 | 上游异常 |

### 8.4 凭据管理

- `BAIDU_API_KEY` / `BAIDU_SECRET_KEY` / `BAIDU_APP_ID` 仅从 `.env` 读取。
- 在 `.env.example` 中以占位提示存在；不在仓库提交真实值。
- 未配置时 `services/voice.py` 直接 raise `VoiceServiceUnavailable`，路由返回 `503`，前端走"提示用户用键盘输入"。

## 9. 提醒

### 9.1 数据建模
见 [data-model.md#reminder](./data-model.md)。简要：每条事件可派生 0..N 条 `reminder` 记录，含 `due_at`、`notified_at`、`dismissed_at`。

### 9.2 调度

- MVP 实现：前端每 60 秒 `GET /reminders/due`，后端返回所有 `due_at <= now AND notified_at IS NULL` 的提醒。
- 后端在响应后立即把 `notified_at` 设为当前时间，防重复推送。
- 后续 PR 升级为 SSE / WebSocket 推送 + APScheduler 定时巡检。

## 10. 错误约定

### 10.1 异常类型

```python
class AppException(Exception):
    code: str = "internal_error"
    status_code: int = 500
    message: str = "服务异常，请稍后重试"

class NotFoundException(AppException):
    code = "not_found"; status_code = 404

class UnauthorizedException(AppException):
    code = "unauthorized"; status_code = 401

class ValidationException(AppException):
    code = "validation_failed"; status_code = 422

class VoiceServiceUnavailable(AppException):
    code = "voice_unavailable"; status_code = 503
```

### 10.2 响应体

```json
{
  "code": "not_found",
  "message": "事件不存在",
  "request_id": "..."
}
```

`request_id` 由中间件生成（uuid4），写入响应头 `X-Request-Id`，便于前端 toast / 服务端日志关联。

## 11. 日志

- 使用 `structlog` 输出 JSON 日志（后续 PR 引入）。
- 关键事件记录 `request_id / user_id / route / latency_ms / status`。
- 不记录请求体中的密码 / token / 音频原文（仅记录长度）。

## 12. 测试

| 层级 | 范围 |
| :--- | :--- |
| 接口测试 | `tests/test_*.py` 用 `httpx.AsyncClient` 跑 happy path + 关键错误分支 |
| 业务测试 | `tests/test_parser.py` 覆盖语音解析的 20+ 中文样例 |
| 安全测试 | 鉴权失败、越权访问、SQL 注入（参数化已规避） |

测试库：仅在 `requirements-dev.txt`（后续 PR 引入），与生产依赖隔离。

## 13. 部署 / 运行

- 开发：`uvicorn app.main:app --reload`
- 演示：Docker Compose（后续 PR）
- 数据：`sqlite:///./data/voice_calendar.db`，文件随宿主机挂载持久化
