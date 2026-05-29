# 设计文档索引

Voice Calendar 的产品 / 架构 / 接口 / 数据模型 / 语音协议设计文档。整体功能与视觉风格以 [Notion Calendar](https://www.notion.so/product/calendar) 为对标，并在此之上叠加"语音交互"作为差异化主线。

## 目录

| 文档 | 内容概要 |
| :--- | :--- |
| [architecture.md](./architecture.md) | 系统分层、模块划分、运行时拓扑、关键数据流 |
| [ui-design.md](./ui-design.md) | UI 设计规范：页面骨架、设计 token、组件库、交互细节、响应式 |
| [frontend.md](./frontend.md) | 前端工程：组件树、状态管理、路由、Hooks、API 调用约定 |
| [backend.md](./backend.md) | 后端工程：FastAPI 模块、认证、提醒调度、语音中转、错误约定 |
| [data-model.md](./data-model.md) | 数据库 schema、字段定义、ER 关系、迁移策略 |
| [api.md](./api.md) | REST API 契约：路径、方法、请求 / 响应 schema、错误码 |
| [voice-protocol.md](./voice-protocol.md) | 语音指令文法、解析流程、示例语句、回复模板 |

## 与 Notion Calendar 的功能对照

| Notion Calendar 能力 | Voice Calendar 是否实现 | 备注 |
| :--- | :--- | :--- |
| 日 / 周 / 月 / 年视图切换 | ✅ | 见 [frontend.md#视图切换](./frontend.md) |
| 点击时间段快速创建事件 | ✅ | 见 [ui-design.md#快速创建](./ui-design.md) |
| 拖拽调整事件时间 | ✅ | 使用 `@dnd-kit/core`，见 [frontend.md#拖拽](./frontend.md) |
| 事件颜色标签分类 | ✅ | 7 色，见 [data-model.md#tag](./data-model.md) |
| 多时区切换 | ✅ | 用户偏好字段，见 [data-model.md#user](./data-model.md) |
| 深色 / 浅色主题 | ✅ | `darkMode: class`，见 [ui-design.md#主题](./ui-design.md) |
| 事件搜索 | ✅ | `GET /events?q=...`，见 [api.md](./api.md) |
| 桌面端 + 移动端响应式 | ✅ | 见 [ui-design.md#响应式](./ui-design.md) |
| 与 Google Calendar 双向同步 | ❌ 不实现 | 不在赛事范围内 |
| 视频会议链接（Zoom / Google Meet）| ❌ 不实现 | 同上 |
| **语音添加 / 查询 / 删除事件** | ✅ **核心差异化** | 见 [voice-protocol.md](./voice-protocol.md) |
| **语音播报提醒** | ✅ **核心差异化** | 浏览器 SpeechSynthesis API |

## 阅读顺序建议

1. 先读 [architecture.md](./architecture.md) 建立全局认知
2. 想看页面长什么样 → [ui-design.md](./ui-design.md)
3. 想动前端代码 → [frontend.md](./frontend.md)
4. 想动后端代码 → [backend.md](./backend.md) + [data-model.md](./data-model.md) + [api.md](./api.md)
5. 想接语音 → [voice-protocol.md](./voice-protocol.md)
