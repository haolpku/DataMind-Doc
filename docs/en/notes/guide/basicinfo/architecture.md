---
title: Architecture
icon: material-symbols:auto-transmission-sharp
permalink: /en/guide/basicinfo/architecture/
createTime: 2026/03/30 23:38:31
---

# Architecture

## One picture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        User (CLI · HTTP · SSE)                       │
└───────────────┬──────────────────────────────────────────────────────┘
                │
          ┌─────▼────────────────────────────────────┐
          │          datamind.agent.AgentLoop        │
          │   system_prompt + tool schemas + turn    │
          └─────┬────────────────────────────────────┘
                │  /v1/messages (streaming, tool_use/result)
          ┌─────▼────────────────────────────────────┐
          │  Anthropic-compatible gateway (Claude)    │
          └─────┬────────────────────────────────────┘
                │
  ┌─────────────┼─────────────┬───────────────┬───────────────┬────────────────┐
┌─▼─────┐  ┌────▼────┐  ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐
│  KB   │  │   DB    │  │   Graph   │   │  Skills   │   │  Memory   │   │ Code tools  │
│Chroma │  │SQLAlch. │  │ NetworkX  │   │ SKILL.md  │   │  SQLite   │   │  (calc, …)  │
│ +BM25 │  │SQLite / │  │ (JSON)    │   │ + Chroma  │   │ + embed   │   │             │
│ +RRF  │  │ MySQL /…│  │           │   │           │   │           │   │             │
└───────┘  └─────────┘  └───────────┘   └───────────┘   └───────────┘   └─────────────┘
    │           │              │               │               │
    └──────── EmbeddingProvider (OpenAI-compat / HuggingFace) ──┘
```

Every box is a **Protocol** (interface). Every concrete class is in a **Registry** under a short name. The agent knows only the interfaces — it never imports a concrete class.

## Core layer — `datamind.core`

### Protocols (`protocols.py`)

Six small interfaces that define what a capability **is**, not how it does the work.

| Protocol | Responsibility |
|---|---|
| `EmbeddingProvider` | `embed_texts([...])`, `embed_query(q)` |
| `VectorStore` | `add / query / count / delete / reset / get_all_texts` |
| `Retriever` | `aretrieve(query, top_k, filters)` |
| `GraphStore` | `upsert_triples / search_entities / traverse / neighbors` |
| `DatabaseDialect` | `build_engine / list_tables / describe / execute_readonly / is_destructive` |
| `MemoryStore` | `save / recall / forget / list_namespaces` |

### Registries (`registry.py`)

One registry per axis of extension:

```python
@embedding_registry.register("voyage")
class VoyageEmbedding: ...

# anywhere:
emb = embedding_registry.create("voyage", api_key=..., model=...)
```

Unknown names raise `ConfigError` with the full list of registered options — typos are caught immediately.

### Tool framework (`tools.py`)

`ToolSpec(name, description, input_schema, handler)` is everything the agent loop needs. `ToolRegistry.as_anthropic_tools()` produces the exact JSON `/v1/messages` expects as `tools=[...]`.

Groups (`metadata={"group": "kb"}`) are used only by the system-prompt builder to describe the tool inventory to the model.

### Context (`context.py`)

`RequestContext(session_id, profile, user_id, trace_id, extra)` — one per request. Replaces v0.1's global `AppState`. The logging layer picks it up via `contextvars` and stamps every JSON log record with `trace_id`.

### Errors (`errors.py`)

Four-tier hierarchy:
`DataMindError` → `ConfigError` / `CapabilityError(capability, cause)` / `ExternalServiceError(service, status_code, cause)`.

### Logging (`logging.py`)

Structured JSON on stderr. Every record carries `trace_id / session_id / profile` automatically when a `RequestContext` is bound. No heavyweight deps (stdlib `logging`).

## Capabilities layer — `datamind.capabilities`

Each subpackage follows the same pattern:

```
capabilities/<cap>/
├── __init__.py           # re-exports service + tool builder
├── service.py            # build_<cap>_service(settings) -> <cap>Service
├── tools.py              # build_<cap>_tools(service) -> list[ToolSpec]
└── providers/
    ├── __init__.py       # imports every provider module
    └── <backend>.py      # @<cap>_registry.register("name") class …
```

- The **service** is the stateful glue — holds a Chroma client, SQLAlchemy engine, NetworkX graph — exposing clean async methods.
- The **tools** module turns those methods into `ToolSpec`s with proper JSON schemas.
- The **providers** module is where backends live. Adding Postgres is a new file under `db/providers/postgres.py` plus one decorator; no other file changes.

## Agent layer — `datamind.agent`

| File | Role |
|---|---|
| `loop.py` | The tool-use loop (`run_turn` + `stream_turn`) |
| `options.py` | `build_agent(settings)` — assembles every capability into one `DataMindAgent` |
| `prompts.py` | Grouped-tool system prompt builder |

### The loop in one page

```
    ┌─ user_message ─┐
    │                │
    ▼                │
┌────────────────────▼───────────────────────────────────┐
│ messages.create(system, tools, messages)                │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────▼────────────┐
        │ stop_reason?        │
        └────────┬────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
    tool_use           end_turn
       │                   │
       ▼                   └──► return final text
┌──────────────────┐
│ for each tool:   │
│   on_tool_start  │
│   spec.handler() │
│   on_tool_end    │
│   append result  │
└───────┬──────────┘
        │
        └──► loop (max_tool_turns)
```

Hooks (`on_tool_start`, `on_tool_end`) are where audit logging and permission checks plug in.

## Config layer — `datamind.config`

Nested `pydantic-settings`; every section is a distinct `BaseModel`:

```
Settings
├── llm          # api_base / api_key / model / fallback_model / timeout_s
├── embedding    # provider / api_base / api_key / model / batch_size
├── retrieval    # strategy / top_k / chunk_size / chunk_overlap / rerank
├── graph        # backend / dsn / embed_entities
├── db           # dialect / dsn / read_only / row_limit / query_timeout_s
├── memory       # backend / dsn / short_term_turns / long_term_enabled
├── data         # profile / base_dir  (auto-derived data_dir / storage_dir)
└── logging      # level
```

Env variables use double-underscore delimiting: `DATAMIND__DB__DSN=mysql+pymysql://...`. Switching profile:

```bash
DATAMIND__DATA__PROFILE=customer_a python -m datamind chat
```

switches both `data/profiles/customer_a/` and `storage/customer_a/` in lockstep.

## What replaced what (v0.1 → v0.2)

| v0.1 | v0.2 | Note |
|---|---|---|
| `core/bootstrap.py` global `AppState` | `agent.options.build_agent()` | Stateless, composable |
| `modules/rag/retriever.py` | `capabilities/kb/providers/{simple,multi_query,hybrid}_retriever.py` | Three strategies, registered, pluggable |
| `modules/rag/indexer.py` | `capabilities/kb/indexer.py` | Same role, better errors |
| `modules/database/database.py` | `capabilities/db/{service,providers}.py` | SQLite + MySQL; safeguards |
| `modules/graphrag/graph_rag.py` | `capabilities/graph/providers/networkx_store.py` | Persists as JSON (not pickle) |
| `modules/memory/memory.py` | `capabilities/memory/{short_term,service,providers/sqlite_store}.py` | Three-layer + fact extraction |
| `modules/skills/*` | `capabilities/skills/{loader,service,code_skills}.py` + `.claude/skills/*/SKILL.md` | SDK-style manifests |
| `server.py` / `main.py` | `datamind/server.py` + `datamind/cli.py` | Real SSE, no globals, `typer` CLI |

**The old files still exist and still run.** They live side-by-side with the new stack so you can A/B anything.

## Tech stack summary

| Component | Technology | Notes |
|---|---|---|
| Agent runtime | `anthropic` SDK + self-written loop | No claude CLI dep |
| LLM | Anthropic-compatible `/v1/messages` | Streaming, tool_use |
| Embeddings | OpenAI-compatible `/v1/embeddings` or HF local | `openai_compatible` provider |
| Vector store | Chroma | `@vector_store_registry.register("chroma")` |
| Graph | NetworkX with JSON persistence | Neo4j provider is a future plug-in |
| RDBMS | SQLAlchemy 2.0 | SQLite + MySQL built in |
| Memory | SQLite + embedding cosine recall | Redis/Postgres future plug-ins |
| Server | FastAPI + real SSE | `python -m uvicorn datamind.server:app` |
| CLI | `typer` + `rich` | `python -m datamind ...` |
