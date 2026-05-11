---
title: 演示指南
icon: carbon:demo
permalink: /zh/guide/basicinfo/demo/
createTime: 2026/03/31 16:00:00
---

# 演示指南

本页介绍所有 live 冒烟脚本和完整 Agent 的效果。所有例子都用 `hello_<cap>_demo` 这个临时 profile，**不会影响你的真实数据**。

## 0. 一条命令：完整 Agent 效果

```bash
DATAMIND__LLM__API_BASE=http://35.220.164.252:3888 \
DATAMIND__LLM__API_KEY=sk-... \
python -m datamind.scripts.hello_agent
```

脚本会种下一个 KB、一个图谱、一个 SQLite 库，然后中文提问四个真实问题：

| 问题 | Agent 自动选用的工具 | 结果 |
|---|---|---|
| Status meeting 什么时候开？ | `memory_recall` → `kb_search` | "每周一 14:00（上海时间）"（来自 `company_handbook.md`） |
| Search platform 负责人是谁？他在哪个城市？ | `kb_search` → `graph_search_entities` → `graph_neighbors` ×2 | "Ann leads Search platform；图谱里没有城市信息"（老实——city 在 SQLite 里，不在图谱里） |
| 工程部 Shanghai 员工工资加起来是多少？ | `db_query_nl` → `db_list_tables` → `db_describe_table` → `db_query_sql` ×2 | ¥26,000，带格式化表格（自动从第一次错误 SQL 中恢复） |
| 帮我记住下周三会议调到周四 | `memory_save` | 已带 metadata 写入长期记忆 |

三大亮点：
- **自主选择工具**——不需要提示，不需要手动路由。
- **优雅的错误恢复**——NL2SQL 生成了不存在的列，Agent 会读表结构并重写 SQL。
- **中文输出 + 英文工具名**——正是我们想要的分工。

## 1. KB（RAG）— `hello_kb`

```bash
python -m datamind.scripts.hello_kb
```

种两份文档（`ai_history.md`、`rag.md`），用真实 embedding 建索引，跑三个查询。部分输出：

```
[hello_kb] indexed: {'pre_chunked': 0, 'raw_chunks': 4, 'total_embedded': 4}

[hello_kb] Q: When did AI research start?
  - score=0.033 source='ai_history.md'  'Artificial intelligence research began in the 1950s…'

[hello_kb] Q: What is reciprocal rank fusion?
  - score=0.033 source='rag.md'  'Hybrid retrieval mixes dense vector search with BM25…'
```

三种策略可切换：`DATAMIND__RETRIEVAL__STRATEGY=simple | multi_query | hybrid`

## 2. Graph — `hello_graph`

```bash
python -m datamind.scripts.hello_graph
```

不需要网络。种下 8 条三元组（Ann / Bob / Acme / Shanghai），演示：

- 实体搜索（大小写不敏感 + 模糊）
- 3-hop 遍历：`Ann → Acme → Shanghai → China`
- 关系过滤：传 `["works_at", "located_in", "in_country"]` 限定只走业务链
- 方向感知 neighbors（Acme 有 2 条入边 works_at、1 条出边 located_in）
- **持久化**：重启进程后同一张图可从 `storage/hello_graph_demo/graph.json` 加载

## 3. Database — `hello_db`

```bash
python -m datamind.scripts.hello_db
```

建一个 SQLite demo（employees + projects），演示所有 DB 工具：

- `db_list_tables` / `db_describe_table`
- `db_query_sql`：分组聚合
- **安全闸**：`DELETE FROM employees` 被拒，抛 `DestructiveSQLError`
- `db_query_nl`：真正走网关 LLM，生成 JOIN + WHERE 的 SQL

例子：

```
[hello_db] db_query_sql (group by department):
  rows=[['Eng', 3, 12666.67], ['Sales', 1, 9000.0], ['HR', 1, 8500.0]]

[hello_db] destructive rejected OK: …

[hello_db] db_query_nl:
  generated SQL: SELECT name, salary FROM employees WHERE city='Shanghai' AND department='Eng'
  rows: [['Ann', 15000], ['Bob', 11000], ['Evan', 15000]]
```

## 4. Skills — `hello_skills`

```bash
python -m datamind.scripts.hello_skills
```

扫描 `.claude/skills/<name>/SKILL.md`，用真实 embedding 建索引，然后语义检索：

```
skill_search 'how should I review a pull request?'
  score=0.513  name=code-review
  score=0.194  name=db-ops-sop

skill_search '慢查询怎么排查'
  score=0.392  name=db-ops-sop
  score=0.330  name=code-review
```

同时测试了 code skills：`calculator("2 * (3 + sqrt(16))") → 14`，`100°C → 212°F`。

## 5. Memory — `hello_memory`

```bash
python -m datamind.scripts.hello_memory
```

三层记忆全跑通：

- 短期滚动窗口（内存 FIFO）
- 长期 SQLite + 余弦召回
- LLM 事实抽取：

```
[hello_memory] extracted 2 fact(s):
  - User is moving to Shenzhen next month
  - User plans to start jogging in the morning
```

原始对话是 "I'm moving to Shenzhen next month and will start jogging in the morning."

## 6. Enterprise demo — `hello_enterprise`（推荐重点看）

这是 v0.2 的旗舰演示，用一个**中等规模真实数据**的 profile 跑 8 个跨后端复杂问题。

### 6.1 一次种好数据

```bash
python -m datamind.scripts.seed_enterprise_demo
```

种下：
- **17 份 KB 文档**（员工手册、安全政策、事故 SOP、3 个产品架构、API ref、季度回顾、OKR、文化…）
- **64 graph 节点 / 91 条边**（组织架构 / 项目依赖 / 产品组件 / 事故响应）
- **6 张 SQL 表 / 101 行**（departments / employees / projects / project_members / incidents / performance_reviews）

### 6.2 跑 8 个真复杂问题

```bash
DATAMIND__DATA__PROFILE=enterprise_demo \
  python -m datamind.scripts.hello_enterprise
```

涵盖的提问类型：

| 问题 | 需要的能力组合 |
|---|---|
| 公司发布窗口是什么时候？检查清单有哪些？ | KB 多文档 |
| 2025 Q4 跟 Search Platform 相关的事故有几起？参与响应的工程师 H2 绩效如何？ | DB（incidents + performance_reviews）|
| AI Copilot 依赖哪些产品？这些产品的负责人在哪个城市？ | Graph 多跳 + DB |
| 去年绩效 > 4.0 的工程师，现在负责哪些 in_progress 项目？ | DB JOIN |
| Frank 的所有信息（团队/汇报/城市/项目/事故/绩效）| KB + DB + Graph |
| 代码审查的最佳实践？ | Skills |
| 把"周三 deep work 时段"加进知识库 | Ingest（KB write）|
| 帮我记住下周一请假体检 | Memory |

实测两套 backend 8/8 都正确：

| Backend | 工具调用总数 | 总耗时 |
|---|---|---|
| `native`（默认）| 34 | 194s |
| `sdk` + CCR | 38 | 283s |

## 7. Ingest demo — 对话式数据导入

`enterprise_demo` profile 下，agent 已经带了 4 个新工具，可以**通过对话往 KB / DB / Graph 写数据**：

```bash
python -m datamind chat
# 或浏览器 http://127.0.0.1:8000
```

试试：

```
"帮我把 /Users/foo/policy.md 加进知识库"
  → agent 调 kb_add_file，立刻可以 kb_search

"把 /Users/foo/customers.csv 导入成数据表 customers"
  → agent 调 db_import_csv，立刻可以 db_query_sql

"陈诚晋升 Tech Lead，向 Ann 汇报，主要负责 Project Kepler"
  → agent 调 graph_add_triples_from_text，LLM 抽 triples 并写入图谱
```

仓库 `demo-uploads/` 下有 6 个示例文件，可以直接拖进浏览器 dropzone 试。详见 [安装指南 §7b](../basicinfo/install/) 和 [Ingest 模块](../modules/ingest/)。

## 交互式 REPL

```bash
python -m datamind chat
```

```
╭──── Chat ─────╮
│ DataMind ready · profile=default · model=claude-sonnet-4-6
│ tools=23 · kb_chunks=0 · graph_triples=0 · skills=2
╰───────────────╯
you › 如何做代码审查？
ai  › [tool skill_search] {"query":"code review process"}
     [result ok] {"count":1, "results":[{"name":"code-review", …}]}
     [tool skill_get] {"name":"code-review"}
     …
```

命令：`/new` 清空上下文，`/exit` 或 `Ctrl-D` 退出。

## HTTP 服务

```bash
python -m uvicorn datamind.server:app --port 8000
```

流式示例：

```bash
curl -N -X POST localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"告诉我 Status meeting 的时间"}'
```

```
data: {"type": "text", "delta": "根据"}
data: {"type": "text", "delta": "公司"}
data: {"type": "tool_use", "name": "kb_search", "input": {"query": "Status meeting"}}
data: {"type": "tool_result", "name": "kb_search", "is_error": false, "preview": "…"}
data: {"type": "text", "delta": "每周一"}
…
data: {"type": "done", "iterations": 3, "stop_reason": "end_turn"}
```

## 跑整个测试集

```bash
pytest datamind/tests/
# 95 passed in ~0.6s
```

单测不需要网络——用内存伪 store 和临时 SQLite。真实网关测试放在 `hello_*.py` 冒烟脚本里。
