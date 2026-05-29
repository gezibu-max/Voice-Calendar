# 系统架构

> 本文档定义 Voice Calendar 的整体架构、模块划分、运行时拓扑与关键数据流。所有具体接口 / 数据模型 / 页面设计在子文档中展开。

## 1. 设计目标

| 目标 | 说明 |
| :--- | :--- |
| 极简一致 | 视觉与交互全面对齐 Notion Calendar，零多余装饰，强调内容本身 |
| 语音优先 | 语音为头等输入通道，键鼠为辅；语音指令覆盖添加 / 查询 / 删除 / 提醒 |
| 一键复现 | 评委从 main `clone -> 装依赖 -> 启动` 三步可看到完整效果 |
| 模块解耦 | 前后端分离；语音 / 解析 / 存储 / 通知各自独立模块，便于增删 |
| 渐进增强 | 核心功能（多视图 + CRUD + 语音）必达；高级功能（多时区、搜索、深色模式）按 PR 增量补齐 |

## 2. 高层拓扑

```
┌───────────────────────────────────────────────────────────────┐
│                          浏览器 (Client)                        │
│                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ Next.js UI   │   │ Web Speech   │   │ SpeechSynthesis  │   │
│  │ App Router   │   │ Recognition  │   │ (TTS, 浏览器)     │   │
│  └──────┬───────┘   └──────┬───────┘   └────────▲─────────┘   │
│         │ fetch(JSON)      │ 录音流              │             │
└─────────┼──────────────────┼─────────────────────┼─────────────┘
          │                  │ wss / https         │
          ▼                  ▼                     │
┌─────────────────────┐  ┌────────────────────┐    │
│ FastAPI Backend     │  │ 百度智能云语音识别  │    │
│ (Python 3.11)       │◄─┤  Web SDK / REST    │    │
│                     │  └────────────────────┘    │
│ ┌─────────────────┐ │                            │
│ │ 路由 (Routers)  │ │ 提醒到点 -> 推送 -> TTS    │
│ │ /events /auth   │─┼─────────────┐              │
│ │ /voice /reminder│ │             │              │
│ └────┬────────────┘ │             │              │
│      │              │             ▼              │
│ ┌────▼────────────┐ │     ┌──────────────────┐   │
│ │ Service 层      │ │     │ Browser Notifi-  │───┘
│ │ EventService    │ │     │ cation API       │
│ │ ParserService   │ │     └──────────────────┘
│ │ ReminderService │ │
│ └────┬────────────┘ │
│      │              │
│ ┌────▼────────────┐ │
│ │ ORM (SQLAlchemy)│ │
│ └────┬────────────┘ │
│      │              │
│ ┌────▼────────────┐ │
│ │  SQLite 文件    │ │
│ │ data/voice_     │ │
│ │ calendar.db     │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## 3. 模块划分

### 3.1 前端模块

| 模块 | 主要职责 | 主要交付物 |
| :--- | :--- | :--- |
| Layout | 整体页面骨架（侧边栏 + 顶部 + 主内容） | `Sidebar`、`Topbar`、`AppShell` |
| Calendar 视图 | 日 / 周 / 月 / 年视图渲染 | `DayView`、`WeekView`、`MonthView`、`YearView` |
| Event 组件 | 事件卡片、表单、详情弹窗、快速创建 | `EventCard`、`EventForm`、`EventModal`、`QuickCreate` |
| Voice 输入 | 浏览器录音 + 上传后端识别 | `VoiceInput`、`useSpeechRecognition` |
| Voice 输出 | 播报与提醒 | `VoiceOutput`、`useSpeechSynthesis` |
| 拖拽 | 事件位置拖拽与时间吸附 | `useDragDrop`、`@dnd-kit/core` 接入 |
| 主题 | 浅色 / 深色切换 | `ThemeSwitcher`、Tailwind `darkMode: class` |
| 状态管理 | 视图、当前日期、事件缓存 | `useCalendarStore` (Zustand) |
| API 客户端 | 与 FastAPI 交互 | `lib/api.ts` |

### 3.2 后端模块

| 模块 | 主要职责 | 主要交付物 |
| :--- | :--- | :--- |
| 入口 / 中间件 | FastAPI 实例、CORS、异常映射 | `app/main.py` |
| 配置 | 集中管理环境变量 | `app/core/config.py` |
| 数据库 | engine / SessionLocal / Base | `app/core/database.py` |
| 用户认证 | 注册 / 登录 / JWT / 密码哈希 | `app/api/auth.py`、`app/services/auth.py` |
| 事件 CRUD | 事件增删查改、搜索、按日期范围检索 | `app/api/events.py`、`app/services/events.py` |
| 标签 | 颜色标签管理 | `app/api/tags.py` |
| 语音中转 | 接收前端音频 / 文本，调用百度智能云 | `app/api/voice.py`、`app/services/voice.py` |
| 指令解析 | 自然语言 -> 结构化事件 | `app/services/parser.py` |
| 提醒 | 后台调度，到点推送 | `app/services/reminder.py` |

### 3.3 数据流：通过语音添加事件

1. 用户点击麦克风按钮，前端 `VoiceInput` 调用 `useSpeechRecognition` 开始采集；
2. 浏览器原生 `SpeechRecognition` 实时输出文本（同时录音备份用于云端 fallback）；
3. 文本通过 `POST /voice/parse` 提交后端；
4. 后端 `parser.py` 用规则 + 时间表达式库（如 `dateparser` / 自研 + 百度 NLP 兜底）解析为 `EventCreate` schema；
5. 后端调用 `EventService.create()` 落库，返回事件对象；
6. 前端收到响应：
   - 在日历对应时间块即时渲染事件卡片；
   - `useSpeechSynthesis` 播报"已添加：{title} {date} {time}"；
   - 写回 Zustand store。

### 3.4 数据流：到点提醒

1. 后端 `ReminderService` 在启动时加载未来 24h 内含 `reminder_at` 的事件，注册到内存调度器（轻量方案：`apscheduler` 或自研 `asyncio.create_task`）；
2. 到点时通过 SSE / 长轮询推给前端（MVP 阶段先采用前端轮询 `GET /reminders/due`，后续 PR 再升级 SSE）；
3. 前端收到提醒：
   - 触发浏览器 `Notification API`；
   - `useSpeechSynthesis` 播报；
   - 在日历对应事件上高亮闪烁 3 秒。

## 4. 部署形态

| 环境 | 部署方式 | 说明 |
| :--- | :--- | :--- |
| 本地开发 | `uvicorn` + `next dev` 双进程 | 评委复现路径 |
| 演示环境 | Docker Compose（后续 PR 提供） | 一键起前后端 + SQLite 文件挂载 |
| 生产 | 不在赛事范围 | 仅作占位说明 |

## 5. 非功能性要求

| 维度 | 目标 | 说明 |
| :--- | :--- | :--- |
| 启动时间 | 后端 `< 2s`，前端 `npm run dev < 5s` | 评委体验 |
| 接口 P95 | `< 200ms`（SQLite 单机） | CRUD / 检索 |
| 语音识别延迟 | `< 800ms`（浏览器原生） / `< 1500ms`（云端兜底） | 用户体感 |
| 可访问性 | 颜色对比度 `>= 4.5:1`，键盘可导航 | 满足 WCAG AA 基础 |
| 国际化 | 仅中文 | 赛事范围内只做 zh-CN |
