# 前端 (Next.js + TypeScript + Tailwind)

Voice Calendar 的前端工程，采用 Next.js 14 (App Router) + TypeScript + Tailwind CSS。本 PR (`feat/frontend-bootstrap`) 仅引入最小可运行骨架与 Notion Calendar 风格的首页布局（左侧导航 + 顶部工具栏 + 主内容区），日历视图、语音输入、事件 CRUD 等业务能力由后续 PR 增量补齐。

## 环境要求

- Node.js 18.18+ （推荐 20.x / 24.x）
- npm 9+ （或 pnpm / yarn）

## 启动步骤

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

启动后访问：<http://localhost:3000>

## 可用脚本

| 脚本 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run typecheck` | 仅做 TypeScript 类型检查 |
| `npm run lint` | Next.js 默认 lint 规则 |

## 目录结构

```
frontend/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # 根布局
│   ├── page.tsx          # 首页（日历主界面骨架）
│   └── globals.css       # 全局样式 + Tailwind 入口
├── components/
│   ├── Sidebar.tsx       # 左侧导航骨架
│   └── Topbar.tsx        # 顶部工具栏骨架（视图切换 / 日期导航占位）
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── next-env.d.ts
└── README.md
```

## 设计 Token

参考 Notion Calendar 极简风格，主要 token 配置在 `tailwind.config.js`：

| Token | 值 | 用途 |
| :--- | :--- | :--- |
| `colors.brand` | `#2563eb` | 主色调 |
| `colors.surface.light` | `#ffffff` | 浅色背景 |
| `colors.surface.dark` | `#111827` | 深色背景（待 ThemeSwitcher PR 启用） |
| `colors.ink` | `#111827` / `#6b7280` | 主文字 / 次要文字 |
| `borderRadius.card` | `6px` | 事件卡片、按钮 |
| `borderRadius.modal` | `12px` | 弹窗 |
| `boxShadow.card` | `0 1px 3px rgba(0,0,0,0.1)` | 柔和阴影 |
| `darkMode` | `class` | `<html class="dark">` 切换 |

## 依赖说明

| 依赖 | 版本 | 用途 |
| :--- | :--- | :--- |
| next | 14.2.15 | React 框架（App Router） |
| react / react-dom | 18.3.1 | UI 库 |
| typescript | 5.6.2 | 类型系统 |
| tailwindcss | 3.4.13 | 原子化 CSS |
| postcss / autoprefixer | 8.4.47 / 10.4.20 | Tailwind 编译依赖 |
| @types/* | 最新 LTS | 类型声明 |

后续 PR 会按需引入：`zustand`（状态管理）、`date-fns`（日期工具）、`@dnd-kit/core`（拖拽）等，引入时会在对应 PR 描述中说明。
