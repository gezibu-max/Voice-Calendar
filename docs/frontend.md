# 前端设计

> 本文档定义 Voice Calendar 前端的工程结构、组件树、状态管理、路由、Hooks、API 客户端约定。视觉与交互规范见 [ui-design.md](./ui-design.md)。

## 1. 技术选型

| 维度 | 选型 | 理由 |
| :--- | :--- | :--- |
| 框架 | Next.js 14 App Router | React 主流方案，App Router 现代化 |
| 语言 | TypeScript（strict） | 类型安全，与后端 schema 对齐 |
| 样式 | Tailwind CSS 3.x | 原子化，与设计 token 直接绑定 |
| 状态 | Zustand | 轻量、无 Provider 噪音 |
| 数据请求 | 原生 `fetch` + 极薄封装 | 不引入 SWR/RQ，避免学习成本，赛事够用 |
| 日期 | date-fns | tree-shake 友好 |
| 拖拽 | @dnd-kit/core + @dnd-kit/modifiers | 可访问性好，支持键盘拖拽 |
| 图标 | lucide-react | 与 Notion 类似的简笔风格 |
| 表单 | react-hook-form | 弹窗表单数据管理 |
| 单测 | vitest + @testing-library/react | 关键 Hook 与解析逻辑 |

## 2. 工程结构（目标态）

```
frontend/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # 根布局：<html> / <body>，挂 ThemeProvider
│   ├── globals.css            # Tailwind 入口 + 主题 token
│   ├── page.tsx               # 首页 = 日历主界面（重定向到默认视图）
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── error.tsx              # 全局错误边界
├── components/
│   ├── AppShell.tsx           # 整体骨架（Sidebar + Topbar + 主区）
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── ThemeSwitcher.tsx
│   ├── CommandPalette.tsx     # ⌘K
│   ├── Calendar/
│   │   ├── Calendar.tsx       # 视图分发
│   │   ├── DayView.tsx
│   │   ├── WeekView.tsx
│   │   ├── MonthView.tsx
│   │   └── YearView.tsx
│   ├── Event/
│   │   ├── EventCard.tsx
│   │   ├── EventForm.tsx
│   │   ├── EventModal.tsx
│   │   └── QuickCreate.tsx
│   ├── Voice/
│   │   ├── VoiceInput.tsx
│   │   └── VoiceOutput.tsx
│   └── Reminder/
│       └── ReminderToast.tsx
├── hooks/
│   ├── useSpeechRecognition.ts
│   ├── useSpeechSynthesis.ts
│   ├── useEvents.ts           # 拉取 / 缓存 / 失效
│   ├── useCalendarView.ts
│   ├── useDragDrop.ts
│   └── useReminders.ts
├── lib/
│   ├── api.ts                 # fetch 封装
│   ├── auth.ts                # token 存取
│   └── time.ts                # 时区 / 格式化
├── store/
│   ├── calendar.ts            # 当前视图、当前日期、选中事件
│   ├── events.ts              # 事件缓存（按日期范围分片）
│   ├── voice.ts               # 录音状态、最近一次识别文本
│   └── theme.ts
├── types/
│   ├── event.ts               # 与后端 schema 对齐
│   ├── tag.ts
│   └── user.ts
├── utils/
│   ├── parser.ts              # 客户端轻量预解析（兜底用）
│   ├── colors.ts              # 7 色标签
│   └── dateUtils.ts
└── styles/
    └── (留给特殊场景)
```

## 3. 路由

App Router 极简策略：所有日历相关入口统一在 `/`，通过 query 控制视图与日期，便于分享 URL。

| 路由 | 说明 | 示例 |
| :--- | :--- | :--- |
| `/` | 日历主界面 | `/?view=week&date=2026-05-29` |
| `/login` | 登录页 | — |
| `/register` | 注册页 | — |
| `/error` | 全局错误页 | — |

未登录访问 `/` 时由 `middleware.ts` 重定向到 `/login`。

## 4. 组件树

```
<AppShell>
  ├── <Sidebar>
  │     ├── <BrandHeader>
  │     ├── <NavList>
  │     ├── <MiniMonth>           // 月份缩略图，点击切换日期
  │     ├── <TagFilter>
  │     └── <BottomActions>       // 🎙 + ➕
  ├── <Topbar>
  │     ├── <DateNavigator>       // 上月 / 今天 / 下月
  │     ├── <SearchBar>           // ⌘K 入口
  │     ├── <ViewSwitcher>        // 日 / 周 / 月 / 年
  │     ├── <ThemeSwitcher>
  │     └── <UserMenu>
  └── <Calendar>
        └── 根据 view 渲染 <DayView / WeekView / MonthView / YearView>
              └── <EventCard*>     // 单元格内堆叠
              └── <QuickCreate>    // 点击空白触发
        └── <EventModal>           // 选中事件时显示
        └── <VoiceInput>           // 全局浮动
        └── <CommandPalette>       // ⌘K 唤起
        └── <ReminderToast>        // 到点提醒浮层
```

## 5. 状态管理（Zustand）

### 5.1 calendar store

```ts
type CalendarState = {
  view: 'day' | 'week' | 'month' | 'year';
  currentDate: Date;          // 视图锚点日期
  selectedEventId: string | null;
  setView: (view: CalendarState['view']) => void;
  setDate: (date: Date) => void;
  selectEvent: (id: string | null) => void;
};
```

### 5.2 events store

按"日期范围 -> 事件数组"分片缓存，避免反复请求：

```ts
type EventsState = {
  byRange: Record<string, Event[]>;     // key = `${start}_${end}`
  upsert: (event: Event) => void;
  remove: (id: string) => void;
  invalidateRange: (start: Date, end: Date) => void;
};
```

`useEvents(start, end)` Hook 统一封装：先读 store，未命中再请求 `GET /events?from=...&to=...`，写回 store。

### 5.3 voice store

```ts
type VoiceState = {
  isRecording: boolean;
  partialText: string;
  finalText: string | null;
  error: string | null;
  start: () => void;
  stop: () => void;
};
```

### 5.4 theme store

```ts
type ThemeState = {
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: ThemeState['theme']) => void;
};
```

挂载时根据 `localStorage('theme')` 还原，并监听 `prefers-color-scheme` 同步切换。

## 6. Hooks 约定

| Hook | 输入 | 输出 |
| :--- | :--- | :--- |
| `useEvents(start, end)` | 时间范围 | `{ events, isLoading, error, refetch }` |
| `useCalendarView()` | — | 上述 calendar store 的子集 + helpers |
| `useSpeechRecognition()` | 配置（语言 / 连续模式） | `{ start, stop, partialText, finalText, isRecording, error }` |
| `useSpeechSynthesis()` | — | `{ speak(text, options), cancel(), isSpeaking }` |
| `useDragDrop()` | — | DnD-kit 适配的 sensor + handlers |
| `useReminders(now)` | 当前时间 | `{ dueReminders, dismiss(id) }` |

所有 Hook 必须可在 SSR 环境中安全引用（首屏返回空状态，浏览器端再激活）。

## 7. 数据请求约定

`lib/api.ts` 暴露以下方法，全部返回 `Promise<T>`，错误统一抛 `ApiError`：

```ts
class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const api = {
  events: {
    list: (params: { from: string; to: string; q?: string }) => Promise<Event[]>,
    get: (id: string) => Promise<Event>,
    create: (input: EventCreate) => Promise<Event>,
    update: (id: string, input: EventUpdate) => Promise<Event>,
    remove: (id: string) => Promise<void>,
  },
  tags: { list: () => Promise<Tag[]> },
  voice: { parse: (text: string) => Promise<ParsedIntent> },
  reminders: { due: () => Promise<Reminder[]> },
  auth: {
    login: (form) => Promise<{ token: string; user: User }>,
    register: (form) => Promise<{ token: string; user: User }>,
    me: () => Promise<User>,
  },
};
```

请求层负责：
- 自动注入 `Authorization: Bearer <token>`（来自 `lib/auth.ts`）
- 失败时映射为 `ApiError`，4xx 不重试，5xx 一次重试
- 时间字段统一以 ISO8601 字符串传输，前端在 store 边界处转 `Date`

## 8. 语音模块

### 8.1 录音 → 识别

```
VoiceInput (组件)
  └── useSpeechRecognition (浏览器 SpeechRecognition)
        ├── 实时 partialText → 顶部小条幕
        ├── finalText → POST /voice/parse
        └── 失败 → 直接交给 useEventForm 兜底（让用户手动）
```

### 8.2 解析结果使用

后端返回 `ParsedIntent`：

```ts
type ParsedIntent =
  | { kind: 'create'; event: EventCreate }
  | { kind: 'query'; range: { from: string; to: string } }
  | { kind: 'delete'; matcher: { title?: string; date?: string } }
  | { kind: 'unknown'; raw: string };
```

前端按 `kind` 分发：
- `create`：直接调用 `api.events.create()`，写回 store + TTS 播报；
- `query`：跳到对应日期 + 高亮事件 + TTS 朗读列表；
- `delete`：弹确认对话框，确认后调 `api.events.remove()`；
- `unknown`：toast 提示"没听懂，请再说一遍"，并把原始文本回填到搜索框。

### 8.3 播报

`useSpeechSynthesis` 直接调浏览器 `SpeechSynthesisUtterance`。配置：
- 语言 `zh-CN`
- 速率 1.0
- 音调 1.0
- 优先 voice：`Microsoft Yaoyao` / `Google 普通话` 等本地中文女声，找不到时用浏览器默认。

## 9. 主题切换

- `<ThemeProvider>` 在根布局挂载，注入 `<html>` 的 `class="dark"`。
- 切换时使用 `useTransition` 让 200ms 内的样式改动批量生效，避免闪烁。
- 颜色 token 全部走 Tailwind 的 dark variant，组件代码不出现 `theme === 'dark'` 三元判断。

## 10. 拖拽

- 引入 `@dnd-kit/core` 的 `DndContext` 包裹 Calendar。
- 视图内每个事件卡片是 `useDraggable`，每个时间网格是 `useDroppable`。
- 释放时计算 `delta` -> 转成新的 `startTime / endTime`，乐观更新 + 后端 `PATCH`，失败回滚。

## 11. 错误处理

| 来源 | 处理 |
| :--- | :--- |
| API 401 | 清空 token，重定向 `/login` |
| API 4xx (非 401) | toast 显示后端 `message`，保持页面状态 |
| API 5xx | toast "服务异常，请稍后重试"，自动重试 1 次 |
| 浏览器无麦克风 | VoiceInput 切换为禁用态 + 引导提示文案 |
| SpeechRecognition 不支持 | 自动改用"上传音频到后端"的备选流程 |

## 12. 性能与构建

- 月视图首屏：仅请求当前月数据；切换月份时预取下一月（`requestIdleCallback`）。
- 周 / 日视图：固定请求当周 / 当天的事件；滚动跨周时增量请求。
- 年视图：仅请求当年聚合（`GET /events/aggregate?year=2026`）。
- `next build` 期望产物：所有页面尽量静态化或 SSR 极简，关键 JS 控制在 < 200kB。

## 13. 测试

| 层级 | 工具 | 范围 |
| :--- | :--- | :--- |
| 单元 | vitest | `utils/parser.ts`、`utils/dateUtils.ts`、关键 store |
| 组件 | @testing-library/react | EventCard、EventForm、ViewSwitcher |
| 集成 | playwright（后续 PR） | 主流程：登录 → 创建事件 → 拖拽 → 删除 |
