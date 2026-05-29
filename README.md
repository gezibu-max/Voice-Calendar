# Voice Calendar · 语音日历工具

以语音交互为核心、参考 [Notion Calendar](https://www.notion.so/product/calendar) 设计风格的简约日程管理工具。用户通过语音指令完成事件的增删查改，配合多视图日历（日 / 周 / 月 / 年）、拖拽调整、快速创建、事件标签、深色模式等能力，提供"说一句话就能记日程"的体验。

## 技术栈

| 模块 | 选型 | 说明 |
| :--- | :--- | :--- |
| 前端 | Next.js 14 (App Router) + TypeScript | React 框架，App Router 用于现代化路由 |
| 样式 | Tailwind CSS | 原子化 CSS，匹配 Notion 的极简风格 |
| 状态 | Zustand | 轻量状态管理 |
| 后端 | FastAPI (Python 3.11+) | 异步 Web 框架 |
| ORM | SQLAlchemy 2.x | 与 FastAPI 配套的成熟方案 |
| 数据库 | SQLite | 零配置，赛事评委一键复现 |
| 语音识别 | 百度智能云语音识别（Web SDK） | 中文识别准确度高，免费额度足够演示 |
| 语音合成 | 浏览器 SpeechSynthesis API | 零依赖，作为提醒与回放通道 |

## 目录结构

```
Voice-Calendar/
├── frontend/        # Next.js 前端工程（PR #3 引入）
├── backend/         # FastAPI 后端工程（PR #2 引入）
├── docs/            # 架构、接口、数据模型等设计文档
├── .gitignore
└── README.md
```

## 快速开始

> 当前仅初始化脚手架，前后端代码将在后续 PR 中分别引入。完整运行说明会随对应 PR 同步更新。

### 后端（占位，待 `feat/backend-bootstrap` 合入后启用）

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 前端（占位，待 `feat/frontend-bootstrap` 合入后启用）

```bash
cd frontend
npm install
npm run dev
```

## 协作规范

- **分支策略**：所有功能在 `feat/<topic>` 分支开发，禁止直推 `main`。
- **PR 粒度**：单 PR 单功能，鼓励小颗粒；大功能拆成多个独立 PR 分步提交。
- **PR 描述四段式**：标题、功能描述、实现思路、测试方式必须齐全。
- **持续交付**：全周期持续提交 commit / PR，避免临尾突击。
- **依赖声明**：第三方库须在对应模块（`backend/requirements.txt` / `frontend/package.json`）声明，并在该 PR 描述中说明用途与版本。
- **可复现性**：`main` 分支任意时刻 clone 即可按 README 步骤运行。

## 第三方依赖与原创说明

- 本项目所有业务代码均原创编写。
- 引入的第三方库仅限于通用基础设施（Web 框架、ORM、UI 工具、语音 SDK），具体清单见 `backend/requirements.txt` 与 `frontend/package.json`，并在引入它们的 PR 描述中说明用途。
- 不复用作者过往项目的私有代码片段；如未来某 PR 需要复用，将在该 PR 描述中显式标注来源。

## 许可证

代码部分遵循仓库后续添加的开源许可证。当前阶段仅作赛事提交用途。
