# 语音日历工具

一个支持语音输入、课程表截图识别、自然语言解析的现代日历应用。前后端分离：React + Vite 前端，FastAPI 后端，OpenAI 兼容大模型作为自然语言解析引擎。

## 核心能力

- **多视图日历**：日 / 周 / 周末 / 月 / 年视图，事件拖拽与快速创建
- **语音输入**：浏览器 Web Speech API 实时识别中文，识别完成后交给大模型抽取事件
- **截图导入**：上传课程表 / 日程截图 → 浏览器内 Tesseract OCR 提文字 → 大模型批量抽取并自动按周展开
- **大模型解析**：默认对接 DeepSeek（OpenAI 兼容协议），把"明天下午三点开会一小时"或一整张课程表统一解析为带颜色、起止时间、循环规则的事件草稿
- **草稿确认**：所有解析结果先进入 `EventPreviewModal`，确认后再写库，避免把识别错误直接落库
- **主题切换**：浅色 / 深色 / 跟随系统
- **数据持久化**：SQLite 主存 + 前端 LocalStorage 兜底

## 技术栈

### 前端
- React 18 + TypeScript + Vite 5
- Tailwind CSS 3（Notion Calendar 风格）
- Zustand 状态管理
- Web Speech API（语音识别 / 合成）
- tesseract.js 5（浏览器内中英文 OCR）

### 后端
- FastAPI + Pydantic v2
- SQLAlchemy 2.x + SQLite
- pydantic-settings 读 `.env`
- OpenAI 兼容 LLM 客户端（默认 DeepSeek `deepseek-chat`）

## 项目结构

```
语音日历工具/
├── backend/
│   ├── app/
│   │   ├── api/              # 路由：events / parse / health
│   │   │   ├── events.py
│   │   │   ├── health.py
│   │   │   └── parse.py      # 语音/截图文本 → LLM → 结构化事件
│   │   ├── core/             # 配置、数据库
│   │   ├── crud.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── data/                 # SQLite 文件（gitignore）
│   ├── .env.example
│   └── requirements.txt
├── src/
│   ├── components/
│   │   ├── Calendar/         # Day / Week / Month / Year 视图
│   │   ├── Event/            # 事件卡片、表单、确认弹窗
│   │   ├── Header/           # 导航、视图切换、搜索
│   │   ├── VoiceModal.tsx    # 语音 + 截图双 Tab 输入
│   │   └── ThemeSwitcher.tsx
│   ├── hooks/                # useEvents / useSpeechRecognition / useSpeechSynthesis
│   ├── store/                # Zustand store
│   ├── utils/
│   │   ├── llmParse.ts       # 调后端 /api/parse
│   │   ├── ocr.ts            # tesseract.js 封装
│   │   ├── layoutEvents.ts   # 周/日视图重叠事件布局算法
│   │   └── colors.ts
│   └── types/
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── backend.md
│   ├── frontend.md
│   ├── data-model.md
│   ├── ui-design.md
│   ├── voice-protocol.md
│   └── llm-parse.md          # LLM 解析协议（语音 / 课程表两种 prompt）
└── package.json
```

## 快速开始

### 1. 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows
# source .venv/bin/activate      # macOS / Linux

pip install -r requirements.txt

cp .env.example .env             # 然后填入 LLM_API_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8011
```

启动后访问 `http://127.0.0.1:8011/docs` 查看接口文档。

`.env` 关键字段（详见 `backend/.env.example`）：

```ini
APP_PORT=8011
CORS_ORIGINS=["http://localhost:5173"]
DATABASE_URL=sqlite:///./data/voice_calendar.db

LLM_PROVIDER=deepseek
LLM_API_KEY=sk-xxx                                # 必填
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_TIMEOUT=30
```

> 任何 OpenAI 兼容服务都能直接换：改 `LLM_BASE_URL` + `LLM_MODEL` 即可。

### 2. 前端

```bash
npm install
npm run dev
```

默认访问 `http://localhost:5173`。前端通过 `http://127.0.0.1:8011/api` 调后端。

## 工作流

1. 点麦克风按钮 → `VoiceModal` 打开，选择"语音"或"截图"标签
2. **语音**：浏览器实时转写 → 回车提交 → 后端 LLM 抽取一个或多个事件 → 进入确认弹窗
3. **截图**：拖入课程表 / 日程截图 → 浏览器跑 Tesseract OCR → 用户可手动修正错字 → 提交后 LLM 按 `schedule` 模式批量抽取并按周展开 → 确认弹窗
4. 用户在 `EventPreviewModal` 增删/修改时间 → 一键全部入库

> 注：浏览器内 OCR 对中文表格识别精度有限，下一阶段会接入视觉大模型（GLM-4V）直接读图，跳过本地 OCR。

## API

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| GET | `/healthz` | 健康检查 |
| GET | `/api/events` | 列表 / 范围筛选 |
| POST | `/api/events` | 新建 |
| GET | `/api/events/{id}` | 单条详情 |
| PUT | `/api/events/{id}` | 更新 |
| DELETE | `/api/events/{id}` | 删除 |
| GET | `/api/events/search?q=` | 标题/描述搜索 |
| POST | `/api/parse` | 自然语言 → 结构化事件草稿（speech / schedule 两种模式） |

`/api/parse` 协议详见 [`docs/llm-parse.md`](docs/llm-parse.md)。

## 路线图

- [x] 基础日历 + 事件 CRUD
- [x] 语音识别 + LLM 文字解析
- [x] 截图本地 OCR + LLM 批量解析（课程表）
- [ ] 视觉大模型直读截图（GLM-4V），替换本地 OCR
- [ ] 重复事件原生支持（RRULE）
- [ ] 移动端适配

## 许可证

MIT
