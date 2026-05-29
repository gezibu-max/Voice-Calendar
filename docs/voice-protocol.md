# 语音协议

> 定义 Voice Calendar 中文语音指令的文法、解析流程、示例与回复模板。后端 `app/services/parser.py` 按本规范实现。

## 1. 设计原则

| 原则 | 说明 |
| :--- | :--- |
| 自然语言优先 | 用户怎么说就怎么解析，不强求"提醒+我+今天+几点+做什么"的固定模板 |
| 规则 + 兜底 | 90% 常见说法走规则匹配，模糊时间走 `dateparser`，仍失败则走 `unknown` |
| 安全保守 | 删除 / 更新这类破坏性指令，置信度 < 0.6 必须前端二次确认 |
| 中文为先 | 仅支持简体中文；英文 / 数字混合可识别但不重点优化 |
| 时区感知 | 所有时间表达式按"用户时区"解析；后端再转 UTC 入库 |

## 2. 指令类型

| Intent | 说明 | 触发关键词举例 |
| :--- | :--- | :--- |
| `create` | 添加 / 安排 / 提醒 | 添加、安排、加一个、提醒我、记一下、创建 |
| `query` | 查询某段时间事件 | 查看、看看、有什么、几点、今天 / 明天 / 周几 + 安排 |
| `delete` | 删除 / 取消 | 删除、取消、把…去掉、不参加、不要…了 |
| `update` *(后续 PR 实现)* | 改时间 / 改标题 / 改地点 | 改到、推迟、提前、换到 |
| `unknown` | 未识别 | 任何不命中以上规则的输入 |

## 3. 文法（EBNF 简化版）

```
command         = create | query | delete

create          = create_kw [ "我" ] [ time_phrase ] action_phrase [ duration_phrase ] [ location_phrase ] [ tag_phrase ] [ reminder_phrase ]
create_kw       = "提醒" | "添加" | "安排" | "加一个" | "记一下" | "创建" | "新建"

query           = query_kw [ time_phrase ] [ "的" ] [ "事" | "事情" | "安排" | "日程" | "会议" ]
query_kw        = "查看" | "看看" | "看一下" | "查一下" | "有什么"

delete          = delete_kw [ time_phrase ] [ tag_phrase ] subject_phrase
delete_kw       = "删除" | "取消" | "把"   ; （"把"开头时主体在后）

time_phrase     = absolute_date [ "的" ] [ time_of_day ]
                | relative_date [ "的" ] [ time_of_day ]
                | weekday [ "的" ] [ time_of_day ]
                | "现在" | "马上" | "稍后"

absolute_date   = ("今年" | "明年" | year) "年" month "月" day "日"
                | month "月" day "日"
relative_date   = "今天" | "明天" | "后天" | "大后天" | "昨天" | "前天"
weekday         = "本周" | "下周" | "下下周" weekday_name | weekday_name
weekday_name    = "周一" | "周二" | ... | "周天" | "周日" | "星期一" | ...
time_of_day     = period hour [ "点" | ":" ] [ minute ]
                | "中午" | "凌晨" | "傍晚"
period          = "上午" | "中午" | "下午" | "晚上" | "凌晨" | (空)
hour            = 阿拉伯数字 | 中文数字 (0-23, 默认 12 小时制 + period 还原)
minute          = "整" | "半" | "一刻" | "三刻" | 阿拉伯/中文数字

duration_phrase = ( "一" | 阿拉伯/中文数字 ) ( "小时" | "个小时" | "钟头" | "分钟" )
                | "半小时"
                | "整天" | "全天"

location_phrase = "在" location_word
location_word   = 自由文本（直到下一个关键词）

tag_phrase      = "用" color_name "标签" | "把它放到" color_name
color_name      = "蓝色" | "绿色" | "橙色" | "紫色" | "粉色" | "红色" | "灰色"

reminder_phrase = "提前" duration_phrase "提醒"
                | duration_phrase "前提醒我"

subject_phrase  = 自由文本（事件标题，去掉前缀关键词后剩余部分）
```

## 4. 解析流程

```
输入文本
   │
   ▼
1. 标准化：全角→半角、标点统一、去除"嗯/啊/那个"等填充词
   │
   ▼
2. 关键词识别：定位 create/query/delete 触发词
   │
   ├── 命中 → 选定 intent
   ├── 未命中 → 默认 create（若包含时间表达式）或 unknown
   │
   ▼
3. 时间表达式抽取：
   - 优先正则匹配 absolute / relative / weekday / time_of_day
   - 失败则交给 dateparser（lang='zh', settings={ TIMEZONE, RETURN_AS_TIMEZONE_AWARE }）
   - 仍失败 → confidence -= 0.3
   │
   ▼
4. 时长抽取：duration_phrase；缺省时按 intent 决定：
   - create + 上下班/会议类标题 → 60min
   - create + "提醒"类 → 0min（point in time）
   - query → 整段时间窗
   │
   ▼
5. 主体抽取：去掉 intent_kw / time_phrase / duration_phrase / location_phrase / tag_phrase / reminder_phrase 之后的剩余文本
   │
   ▼
6. 置信度计算：
   - 所有必需字段命中 → 0.9
   - 时间靠 dateparser 兜底 → -0.1
   - 主体为空 / 过短 → -0.2
   - intent 仅靠默认推断 → -0.2
   - 最终 < 0 → 0；> 1 → 1
   │
   ▼
7. 输出 ParsedIntent（结构见 api.md / voice/parse）
```

## 5. 示例

### 5.1 create

| 输入 | 输出（`now = 2026-05-29T14:00 +08:00`） |
| :--- | :--- |
| `提醒我明天下午三点和小王开会一小时` | `{ kind: 'create', event: { title: '和小王开会', start: 2026-05-30T15:00 +08, end: 16:00, source: 'voice' }, confidence: 0.92 }` |
| `添加 5 月 30 日 9 点产品评审会，会议室 A，提前 15 分钟提醒我` | `{ kind: 'create', event: { title: '产品评审会', location: '会议室 A', start: 2026-05-30T09:00 +08, end: 10:00, reminder_minutes: 15 }, confidence: 0.95 }` |
| `下周一上午十点项目周会` | `{ kind: 'create', event: { title: '项目周会', start: 下周一 10:00, end: 11:00 }, confidence: 0.88 }` |
| `今天晚上 8 点半看电影两小时` | `{ kind: 'create', event: { title: '看电影', start: 今晚 20:30, end: 22:30 }, confidence: 0.9 }` |
| `加一个明天的全天行程，参加同事婚礼，用红色标签` | `{ kind: 'create', event: { title: '同事婚礼', all_day: true, start: 明天 00:00, end: 23:59:59, tag.color: red }, confidence: 0.88 }` |

### 5.2 query

| 输入 | 输出 |
| :--- | :--- |
| `今天有什么安排` | `{ kind: 'query', range: 今天 0–24h, confidence: 0.96 }` |
| `看看下周的会议` | `{ kind: 'query', range: 下周一 0:00 – 下周日 24:00, confidence: 0.9 }`（"会议"作为软筛选条件） |
| `5 月 30 日的事` | `{ kind: 'query', range: 5/30 全天, confidence: 0.94 }` |

### 5.3 delete

| 输入 | 输出 |
| :--- | :--- |
| `取消今天下午的产品评审会` | `{ kind: 'delete', matcher: { title: '产品评审会', date: today } , confidence: 0.85 }` |
| `把明天的所有日程都删掉` | `{ kind: 'delete', matcher: { date: tomorrow }, confidence: 0.8 }`（前端会要求二次确认） |
| `删了那个红色标签的事` | `{ kind: 'delete', matcher: { tag: 'red' }, confidence: 0.65 }`（前端二次确认） |

### 5.4 unknown

| 输入 | 输出 |
| :--- | :--- |
| `今天天气真好` | `{ kind: 'unknown', raw: '今天天气真好' }` |
| `播放一首周杰伦` | `{ kind: 'unknown', raw: '播放一首周杰伦' }` |

## 6. 二次确认规则

前端在以下情形下不直接执行，而是弹出确认气泡：

- `kind === 'delete'` 且 `confidence < 0.85`
- `kind === 'delete'` 且 `matcher` 命中事件数 > 1
- `kind === 'create'` 且 `confidence < 0.5`
- 任意 `kind` 但 `event.start_time` 在过去（疑似听错"明天"听成"昨天"）

## 7. 回复模板（TTS）

为保持品牌一致，所有回复在 `frontend/utils/voiceReply.ts` 集中定义。

| 场景 | 模板 |
| :--- | :--- |
| 创建成功 | `已添加：${title}，${date} ${time}${duration ? '，时长' + duration : ''}` |
| 查询有事件 | `${date} 共有 ${count} 项安排：${list}` |
| 查询无事件 | `${date} 没有安排` |
| 删除成功（单条）| `已删除：${title}` |
| 删除多条确认 | `共匹配 ${count} 项，是否全部删除？` |
| 未识别 | `没听清，请再说一次` |
| 上游异常 | `语音服务暂时不可用，请尝试手动输入` |

## 8. 测试样例集

后续 PR `feat/voice-parser` 会在 `backend/tests/test_parser.py` 提交不少于 30 条样例（覆盖以上 5.1–5.4 全部场景），保证：

- 90% 样例 `confidence >= 0.8`
- 时间字段误差 = 0
- `unknown` 不被误判为 `create`

## 9. 演进路线

| 阶段 | 能力 |
| :--- | :--- |
| MVP | 规则 + dateparser，覆盖创建 / 查询 / 删除 |
| 后续 PR | 引入 `update` intent，支持改时间 / 改标题 |
| 长期 | 接入更强 NLU（如百度 ERNIE 或本地小模型）；保留规则作为冷启动兜底 |
