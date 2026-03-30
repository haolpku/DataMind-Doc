---
title: Architecture
icon: material-symbols:auto-transmission-sharp
permalink: /en/guide/basicinfo/architecture/
createTime: 2026/03/30 23:38:31
---

# Architecture

## Project Structure

```
DataMind/
├── config.py              # Config center (Pydantic Settings, reads from .env)
├── .env.example           # Environment variable template
├── server.py              # Web entry: FastAPI backend + frontend
├── main.py                # CLI entry: interactive terminal
├── benchmark/             # Concurrent inference benchmarking
│   ├── run.py             #   Benchmark runner (concurrent queries + metrics)
│   └── evaluate.py        #   Answer evaluation (EM / F1)
├── core/                  # Core layer
│   ├── bootstrap.py       #   Shared initialization logic (AppState)
│   └── session.py         #   Session isolation (SessionManager)
├── modules/               # Feature modules
│   ├── rag/               #   RAG vector retrieval
│   │   ├── indexer.py     #     Document loading + Chroma index
│   │   └── retriever.py   #     Retrieval strategies (Simple / MultiQuery)
│   ├── graphrag/          #   GraphRAG knowledge graph
│   │   └── graph_rag.py   #     Graph construction + query
│   ├── database/          #   Database NL2SQL
│   │   └── database.py    #     SQLite demo + NL2SQL engine
│   ├── skills/            #   Skills system
│   │   ├── tools.py       #     Tool skills: calculator, time, etc.
│   │   └── knowledge.py   #     Knowledge skills: Markdown doc retrieval
│   ├── memory/            #   Conversation memory
│   │   └── memory.py      #     Short-term + long-term memory
│   └── agent/             #   Agent orchestration
│       └── agent.py       #     FunctionAgent integrating all tools
├── data/                  # Data directory
│   ├── profiles/          #   Knowledge bases (isolated by DATA_PROFILE)
│   ├── bench/             #   Benchmark question sets
│   └── skills/            #   Skill documents (shared across profiles)
└── storage/               # Auto-generated: persisted indexes
```

## Initialization Flow

`core/bootstrap.py` defines the `AppState` dataclass and the `initialize()` function:

```
initialize()
  │
  ├── Configure LlamaSettings (LLM + Embedding)
  ├── Build/load RAG index (Chroma)
  ├── Build/load GraphRAG index (NetworkX)
  ├── Init Database (SQLite + NL2SQL engine)
  ├── Build/load Skills index (Chroma)
  └── Create FunctionAgent (wire all tools)
        │
        └── AppState (holds all components)
```

Both `server.py` (Web) and `main.py` (CLI) call `initialize()` once at startup.

## Agent Decision Flow

```
User Question
    │
    ▼
FunctionAgent receives question + tool descriptions
    │
    ▼
LLM decides which tool(s) to call
    │
    ├── knowledge_search  → RAG vector retrieval
    ├── graph_search      → GraphRAG entity/relation traversal
    ├── database_query    → NL2SQL → execute SQL
    ├── skill_search      → Knowledge skill retrieval
    ├── calculator / ...  → Tool skill execution
    └── (none)            → Direct LLM response
    │
    ▼
Combine tool results → Generate final answer
```

## Session Isolation

`core/session.py` provides `SessionManager` for per-user memory isolation:

```python
from core.session import SessionManager

session_mgr = SessionManager()
memory_a = session_mgr.get_memory("user_a")
memory_b = session_mgr.get_memory("user_b")
```

This is critical for concurrent benchmarking and multi-user Web serving.

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | LlamaIndex | Core orchestration |
| LLM | OpenAI-compatible API | No GPU required |
| Vector DB | Chroma | Local, pure Python |
| Graph Store | NetworkX | Local, pure Python |
| RDBMS | SQLite | Zero configuration |
| Agent | FunctionAgent | Automatic tool selection |
| Web Backend | FastAPI | Async, SSE streaming |
| Web Frontend | Pure HTML/CSS/JS | No npm, zero frontend deps |
