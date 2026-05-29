# 语音日历工具

一个支持语音交互的现代日历应用，采用前后端分离架构。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 3 样式框架
- Zustand 状态管理
- Web Speech API 语音识别与合成

### 后端
- FastAPI（Python Web 框架）
- SQLAlchemy ORM
- SQLite 数据库
- Passlib 密码哈希

## 项目结构

```
语音日历工具/
├── backend/              # 后端代码
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── core/         # 核心组件（配置、数据库）
│   │   ├── crud.py       # 数据库操作
│   │   ├── models.py     # 数据模型
│   │   └── schemas.py    # Pydantic 模式
│   ├── requirements.txt  # Python 依赖
│   └── README.md
├── frontend/             # 前端框架（可选的 Next.js 版本）
├── src/                  # React 前端代码
│   ├── components/       # UI 组件
│   ├── hooks/            # 自定义 Hooks
│   ├── store/            # 状态管理
│   ├── utils/            # 工具函数
│   └── types/            # TypeScript 类型
└── docs/                 # 文档
```

## 快速开始

### 后端启动

1. 进入后端目录：
```bash
cd backend
```

2. 创建虚拟环境（推荐）：
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 启动服务：
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端 API 将在 http://127.0.0.1:8000 启动，API 文档可访问 http://127.0.0.1:8000/docs

### 前端启动

1. 在项目根目录安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

前端将在 http://localhost:5173 启动

## 功能特性

- ✅ **事件管理**：创建、编辑、删除日历事件
- ✅ **多视图**：日视图、周视图、月视图、年视图
- ✅ **事件搜索**：按标题或描述搜索事件
- ✅ **语音交互**：语音添加、查询、删除事件
- ✅ **主题切换**：支持深色/浅色模式
- ✅ **事件标签**：7 种颜色标签分类
- ✅ **数据持久化**：SQLite 数据库 + LocalStorage 双重保障

## API 接口

### 事件管理
- `GET /api/events` - 获取事件列表
- `POST /api/events` - 创建事件
- `GET /api/events/{id}` - 获取单个事件
- `PUT /api/events/{id}` - 更新事件
- `DELETE /api/events/{id}` - 删除事件
- `GET /api/events/search?q=xxx` - 搜索事件

## 开发说明

### 后端-前端集成

默认情况下，前端使用 LocalStorage 作为数据存储。要启用后端 API，请在 `src/utils/api.ts` 中修改：

```typescript
let useLocalStorage = false; // 设置为 false 启用后端
```

或者通过 API 动态切换：
```typescript
api.setBackendEnabled(true);
```

## 许可证

MIT
