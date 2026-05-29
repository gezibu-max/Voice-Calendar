# 后端 (FastAPI)

Voice Calendar 的后端服务，基于 FastAPI + SQLAlchemy + SQLite。本 PR (`feat/backend-bootstrap`) 仅引入最小可运行骨架与健康检查接口，业务模型与 CRUD 将在后续 PR 中陆续接入。

## 环境要求

- Python 3.11+
- pip / venv

## 启动步骤

```bash
cd backend

# 1. 创建虚拟环境
python -m venv .venv

# 2. 激活虚拟环境
source .venv/Scripts/activate    # Windows Git Bash / MINGW
# source .venv/bin/activate      # macOS / Linux

# 3. 安装依赖
pip install -r requirements.txt

# 4. 准备环境变量（可选，使用默认值也能跑）
cp .env.example .env

# 5. 启动开发服务器
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

启动后访问：

- 健康检查：<http://127.0.0.1:8000/healthz>
- 根接口：  <http://127.0.0.1:8000/>
- 自动文档：<http://127.0.0.1:8000/docs>

## 目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 应用入口与路由挂载
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py    # 基于 pydantic-settings 的配置加载
│   │   └── database.py  # SQLAlchemy engine / SessionLocal / Base
│   └── api/
│       ├── __init__.py
│       └── health.py    # /healthz 健康检查路由
├── data/                # SQLite 数据库文件存放目录（运行时创建，已 .gitignore）
├── .env.example
├── requirements.txt
└── README.md
```

## 依赖说明

| 依赖 | 版本 | 用途 |
| :--- | :--- | :--- |
| fastapi | 0.115.0 | 异步 Web 框架 |
| uvicorn[standard] | 0.30.6 | ASGI 服务器 |
| pydantic | 2.9.2 | 数据校验 |
| pydantic-settings | 2.5.2 | 环境变量配置加载 |
| sqlalchemy | 2.0.35 | ORM，搭配 SQLite 使用 |

后续 PR 会按需补充：`alembic`（迁移）、`passlib`（认证）、`python-jose`（JWT）等，引入时会在对应 PR 描述中说明。
