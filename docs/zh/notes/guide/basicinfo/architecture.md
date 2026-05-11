---
title: 架构设计
icon: material-symbols:auto-transmission-sharp
permalink: /zh/guide/basicinfo/architecture/
createTime: 2026/03/30 23:41:34
---

# 架构

## 一张图

```
┌──────────────────────────────────────────────────────────────────────┐
│                        User (CLI · HTTP · SSE)                       │
└───────────────┬──────────────────────────────────────────────────────┘
                │
          ┌─────▼────────────────────────────────────┐
          │          datamind.agent.AgentLoop        │
          │   system_prompt + tool schemas + 回合循环 │
          └─────┬────────────────────────────────────┘
                │  /v1/messages (流式, tool_use/result)
          ┌─────▼────────────────────────────────────┐
          │  Anthropic 兼容网关 (Claude)               │
          └─────┬────────────────────────────────────┘
                │
  ┌─────────────┼─────────────┬───────────────┬───────────────┬────────────────┐
┌─▼─────┐  ┌────▼────┐  ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐
│  KB   │  │   DB    │  │   Graph   │   │  Skills   │   │  Memory   │   │  代码技能    │
│Chroma │  │SQLAlch. │  │ NetworkX  │   │ SKILL.md  │   │  SQLite   │   │  (calc, …)   │
│ +BM25 │  │SQLite / │  │ (JSON)    │   │ + Chroma  │   │ + 向量    │   │              │
│ +RRF  │  │ MySQL / │  │           │   │           │   │           │   │              │
└───────┘  └─────────┘  └───────────┘   └───────────┘   └───────────┘   └──────────────┘
    │           │              │               │               │
    └──────── EmbeddingProvider (OpenAI 兼容 / HuggingFace) ────┘
```

每个框都是一个 **Protocol（接口）**。每个具体类在一个 **Registry（注册表）** 里按字符串名字注册。Agent 只认接口，从不 import 具体类。

## 核心层 — `datamind.core`

### Protocols（`protocols.py`）

六个最小接口，定义一个能力**是什么**，而不是怎么做：

| Protocol | 职责 |
|---|---|
| `EmbeddingProvider` | `embed_texts([...])`, `embed_query(q)` |
| `VectorStore` | `add / query / count / delete / reset / get_all_texts` |
| `Retriever` | `aretrieve(query, top_k, filters)` |
| `GraphStore` | `upsert_triples / search_entities / traverse / neighbors` |
| `DatabaseDialect` | `build_engine / list_tables / describe / execute_readonly / is_destructive` |
| `MemoryStore` | `save / recall / forget / list_namespaces` |

### Registries（`registry.py`）

每个可扩展维度一个注册表：

```python
@embedding_registry.register("voyage")
class VoyageEmbedding: ...

# 用的时候：
emb = embedding_registry.create("voyage", api_key=..., model=...)
```

未知名字抛 `ConfigError`，顺带列出所有已注册选项——输入错别字立即暴露。

### Tool 框架（`tools.py`）

`ToolSpec(name, description, input_schema, handler)` 就是 agent 需要的全部。`ToolRegistry.as_anthropic_tools()` 输出的就是 `/v1/messages` 的 `tools=[...]` JSON。

`metadata={"group": "kb"}` 只被系统提示的组装逻辑用来给模型描述工具清单。

### Context（`context.py`）

`RequestContext(session_id, profile, user_id, trace_id, extra)` —— 每个请求一个。替代 v0.1 的全局 `AppState`。日志层通过 `contextvars` 自动把 `trace_id` 打到每条 JSON 记录里。

### Errors（`errors.py`）

四层：`DataMindError` → `ConfigError` / `CapabilityError(capability, cause)` / `ExternalServiceError(service, status_code, cause)`。

### Logging（`logging.py`）

stderr 输出一行一条 JSON。绑定了 `RequestContext` 之后每条记录自动带 `trace_id / session_id / profile`。零重型依赖（只用了 stdlib `logging`）。

## 能力层 — `datamind.capabilities`

每个子包都遵循相同模式：

```
capabilities/<cap>/
├── __init__.py           # 重新导出 service + tool 工厂
├── service.py            # build_<cap>_service(settings) -> <cap>Service
├── tools.py              # build_<cap>_tools(service) -> list[ToolSpec]
└── providers/
    ├── __init__.py       # import 每个 provider 模块
    └── <backend>.py      # @<cap>_registry.register("name") class …
```

- **service** 是有状态的胶水——持有 Chroma client / SQLAlchemy engine / NetworkX graph，对外暴露清晰的 async 方法。
- **tools** 把方法包成带 JSON schema 的 `ToolSpec`。
- **providers** 是后端实现，新增 Postgres 就是在 `db/providers/postgres.py` 下加一个新文件 + 一个装饰器；其他文件不动。

## Agent 层 — `datamind.agent`

| 文件 | 作用 |
|---|---|
| `loop.py` | tool-use 回合循环（`run_turn` + `stream_turn`） |
| `options.py` | `build_agent(settings)` —— 把全部能力装配成一个 `DataMindAgent` |
| `prompts.py` | 按分组生成系统提示 |

### 单回合循环

```
    ┌─ user_message ─┐
    │                │
    ▼                │
┌────────────────────▼─────────────────────────────────┐
│ messages.create(system, tools, messages)              │
└────────────────┬──────────────────────────────────────┘
                 │
        ┌────────▼────────────┐
        │ stop_reason?        │
        └────────┬────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
    tool_use           end_turn
       │                   │
       ▼                   └──► 返回最终文本
┌──────────────────┐
│ for each tool:   │
│   on_tool_start  │
│   spec.handler() │
│   on_tool_end    │
│   append result  │
└───────┬──────────┘
        │
        └──► 继续循环（max_tool_turns 上限）
```

Hooks（`on_tool_start`、`on_tool_end`）是下一期审计日志 / 权限检查的接入点。

## 配置层 — `datamind.config`

嵌套 `pydantic-settings`，每一块都是一个 `BaseModel`：

```
Settings
├── llm          # api_base / api_key / model / fallback_model / timeout_s
├── embedding    # provider / api_base / api_key / model / batch_size
├── retrieval    # strategy / top_k / chunk_size / chunk_overlap / rerank
├── graph        # backend / dsn / embed_entities
├── db           # dialect / dsn / read_only / row_limit / query_timeout_s
├── memory       # backend / dsn / short_term_turns / long_term_enabled
├── data         # profile / base_dir  (自动派生 data_dir / storage_dir)
└── logging      # level
```

环境变量用双下划线嵌套：`DATAMIND__DB__DSN=mysql+pymysql://...`。切换 profile：

```bash
DATAMIND__DATA__PROFILE=customer_a python -m datamind chat
```

`data/profiles/customer_a/` 和 `storage/customer_a/` **一起切换**。

## v0.1 → v0.2 替换对照表

| v0.1 | v0.2 | 备注 |
|---|---|---|
| `core/bootstrap.py` 全局 `AppState` | `agent.options.build_agent()` | 无状态，可组合 |
| `modules/rag/retriever.py` | `capabilities/kb/providers/{simple,multi_query,hybrid}_retriever.py` | 三种策略，注册表化 |
| `modules/rag/indexer.py` | `capabilities/kb/indexer.py` | 功能相同，错误处理改进 |
| `modules/database/database.py` | `capabilities/db/{service,providers}.py` | SQLite + MySQL；安全闸 |
| `modules/graphrag/graph_rag.py` | `capabilities/graph/providers/networkx_store.py` | 持久化用 JSON（不是 pickle） |
| `modules/memory/memory.py` | `capabilities/memory/{short_term,service,providers/sqlite_store}.py` | 三层 + 事实抽取 |
| `modules/skills/*` | `capabilities/skills/{loader,service,code_skills}.py` + `.claude/skills/*/SKILL.md` | SDK 风格 manifest |
| `server.py` / `main.py` | `datamind/server.py` + `datamind/cli.py` | 真 SSE，无全局变量，typer CLI |

**旧文件都还在，照样能跑。** 可以随时对照。

## 技术栈一览

| 组件 | 技术 | 备注 |
|---|---|---|
| Agent 运行时 | `anthropic` SDK + 自写循环 | 不依赖 claude CLI |
| LLM | Anthropic 兼容 `/v1/messages` | 流式 + tool_use |
| Embedding | OpenAI 兼容 `/v1/embeddings` 或 HF 本地 | `openai_compatible` provider |
| 向量库 | Chroma | `@vector_store_registry.register("chroma")` |
| Graph | NetworkX + JSON 持久化 | Neo4j 将作为 provider 插入 |
| RDBMS | SQLAlchemy 2.0 | SQLite + MySQL 内置 |
| Memory | SQLite + 向量 cosine 召回 | Redis / Postgres 可作为 provider |
| Server | FastAPI + 真 SSE | `python -m uvicorn datamind.server:app` |
| CLI | `typer` + `rich` | `python -m datamind ...` |
