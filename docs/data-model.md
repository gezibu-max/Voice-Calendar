# 数据模型

> SQLite + SQLAlchemy 2.x。本表设计仅覆盖 Voice Calendar 必要业务，命名贴近 Notion Calendar 概念。所有时间字段统一以 UTC 存储，时区由 `event.timezone` 字段记录用户原意。

## 1. ER 概览

```
┌────────┐       ┌──────────┐       ┌──────────┐
│  user  │──┬──< │  event   │ >─┬──>│   tag    │
└────────┘  │    └──────────┘   │   └──────────┘
            │           │1     │
            │           ▼      │
            │    ┌──────────┐  │
            │    │ reminder │  │
            │    └──────────┘  │
            │                  │
            └──< user_tag      │
                 (未来扩展)    │
                               │
                          ┌────┴─────┐
                          │ user 拥有 │
                          │  自己的   │
                          │ 7 个标签 │
                          └──────────┘
```

- 一个 `user` 拥有多个 `event`、多个 `tag`、多个 `reminder`。
- 每个 `event` 0..1 个 `tag`、0..N 个 `reminder`。
- `tag` 是用户私有的：注册时复制系统预置 7 色（不共享，避免改名互相干扰）。

## 2. 表结构

### 2.1 user

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | TEXT (uuid4) | PK | 主键 |
| email | TEXT | UNIQUE NOT NULL | 登录账号 |
| password_hash | TEXT | NOT NULL | bcrypt 哈希 |
| display_name | TEXT | NOT NULL | 展示名 |
| timezone | TEXT | NOT NULL DEFAULT `Asia/Shanghai` | IANA 时区 |
| theme | TEXT | NOT NULL DEFAULT `system` | `light / dark / system` |
| created_at | DATETIME | NOT NULL DEFAULT now() | UTC |
| updated_at | DATETIME | NOT NULL DEFAULT now() | UTC，触发器或服务层维护 |

索引：`UNIQUE(email)`。

### 2.2 tag

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | TEXT (uuid4) | PK | |
| user_id | TEXT | FK -> user.id ON DELETE CASCADE | 拥有者 |
| color_id | TEXT | NOT NULL | `blue / green / orange / purple / pink / red / gray` |
| name | TEXT | NOT NULL | 用户可改名，默认与 color 同名（"蓝色"） |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | 侧边栏排序 |
| created_at | DATETIME | NOT NULL | UTC |

索引：`(user_id, color_id)` 唯一；`(user_id, sort_order)`。

### 2.3 event

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | TEXT (uuid4) | PK | |
| user_id | TEXT | FK -> user.id ON DELETE CASCADE | |
| title | TEXT | NOT NULL CHECK length <= 200 | |
| description | TEXT | NULL | 备注，无长度上限 |
| start_time | DATETIME | NOT NULL | UTC |
| end_time | DATETIME | NOT NULL CHECK end_time >= start_time | UTC |
| all_day | BOOLEAN | NOT NULL DEFAULT 0 | 全天事件 |
| timezone | TEXT | NOT NULL | 创建时用户所在时区，前端渲染依据 |
| location | TEXT | NULL | 地点（语音可解析） |
| tag_id | TEXT | FK -> tag.id ON DELETE SET NULL | |
| reminder_minutes | INTEGER | NULL | 0/5/15/30/60/1440 等；NULL = 不提醒 |
| source | TEXT | NOT NULL DEFAULT `manual` | `manual / voice / quick / drag` 用于埋点 |
| deleted_at | DATETIME | NULL | 软删时间，UTC |
| created_at | DATETIME | NOT NULL | UTC |
| updated_at | DATETIME | NOT NULL | UTC |

索引：
- `(user_id, start_time)`：按用户 + 时间检索是最热路径。
- `(user_id, deleted_at)`：未删事件过滤。
- `(user_id, tag_id)`：按标签筛选。

完整性：
- `CHECK(end_time >= start_time)`
- 全天事件由前端写入 `start_time = 当日 00:00 / end_time = 当日 23:59:59`，并 `all_day = true`。

### 2.4 reminder

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | TEXT (uuid4) | PK | |
| user_id | TEXT | FK -> user.id ON DELETE CASCADE | |
| event_id | TEXT | FK -> event.id ON DELETE CASCADE | |
| due_at | DATETIME | NOT NULL | UTC，= event.start_time - reminder_minutes |
| notified_at | DATETIME | NULL | 后端推给前端时打戳 |
| dismissed_at | DATETIME | NULL | 用户点掉 / 自动消失 |
| created_at | DATETIME | NOT NULL | |

索引：
- `(user_id, due_at, notified_at)`：扫描"到点未推送"的高频查询。
- `(event_id)`：事件改时 / 删时连带处理。

业务约定：
- 创建 / 更新 event 时，**先删 `event.id` 关联的所有 reminder**，再根据新的 `reminder_minutes` 重新生成。
- 软删 event 时，连带 `dismissed_at = now()` 标记其 reminder（不物理删，便于审计）。

## 3. SQLAlchemy 模型骨架

```python
# app/models/event.py（示意；具体在 PR feat/event-model 提交）
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Event(Base):
    __tablename__ = "event"
    __table_args__ = (
        CheckConstraint("end_time >= start_time", name="ck_event_time_order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("user.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)
    timezone: Mapped[str] = mapped_column(String(64))
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    tag_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tag.id", ondelete="SET NULL"), nullable=True)
    reminder_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(16), default="manual")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tag = relationship("Tag", lazy="joined")
```

## 4. 迁移策略

| 阶段 | 方式 |
| :--- | :--- |
| MVP | `Base.metadata.create_all(engine)` 启动时建表（单文件 SQLite，无历史数据）|
| 后续 | 引入 `alembic`，把 `create_all` 替换成迁移版本，便于演示后追加字段不丢数据 |

迁移产物 `backend/alembic/versions/*.py` 在引入 alembic 的 PR 中提交。

## 5. 演示数据（`app/seeds/demo.py`）

后续 PR 提供，注入：
- 1 个测试用户 `demo@voice-calendar.dev` / `demo1234`
- 7 个预置标签
- 12 条覆盖未来一周不同时段的事件（含全天事件、含跨天事件、含语音 `source='voice'` 样本）

## 6. 数据保留与清理

- 软删事件 30 天后由后台脚本物理清理（赛事范围不实现，留作扩展占位）。
- `reminder` 表条目在事件删除时随 CASCADE 物理删，无需保留。
- `user` 删除会级联删除 `event / tag / reminder`，赛事不提供"自助注销"入口。
