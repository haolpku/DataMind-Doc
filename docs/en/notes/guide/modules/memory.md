---
title: Memory
icon: carbon:ai-status-in-progress
permalink: /en/guide/modules/memory/
createTime: 2026/03/30 23:39:35
---

# Memory

Three layers, one service:

```
┌────────────────────────────────────────────────────┐
│  Short-term — ShortTermMemory (per-session deque)  │  in-RAM, dropped on restart
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  Long-term — MemoryStore (Protocol)                │
│    • SQLite (default) — embedding cosine recall    │  persisted under storage/<profile>/memory.db
│    • Redis / Postgres — future providers           │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  Fact extractor — cheap LLM call at turn boundary  │
│    (user_turn + assistant_turn) -> JSON list       │
│    facts → long-term store                         │
└────────────────────────────────────────────────────┘
```

## Namespaces

Every long-term item lives in a namespace. The conventions we use:

| Prefix | Scope |
|---|---|
| `session:<id>` | One conversation |
| `user:<id>` | Cross-session, per user |
| `global` | System-wide knowledge |

Set the default namespace for the active session when assembling:

```python
agent = await build_agent(settings, default_memory_namespace="session:abc")
```

## Tools exposed to the agent

| Tool | Purpose |
|---|---|
| `memory_save` | Persist one fact. Auto-namespace = default unless caller overrides. |
| `memory_recall` | Top-K semantic recall over a namespace. |
| `memory_forget` | Delete by id (get the id from `memory_recall` first). |
| `memory_list_namespaces` | List every populated namespace. |

## LLM-driven fact extraction

At the end of a turn you can call:

```python
facts = await agent.memory.extract_and_save(
    "session:abc",
    user_turn="I'm moving to Shenzhen next month and will start jogging in the morning.",
    assistant_turn="Nice — Shenzhen in April is great for outdoor runs.",
)
# ["User is moving to Shenzhen next month",
#  "User plans to start jogging in the morning"]
```

Uses the `fallback_model` (Haiku by default — cheap) with a tight extraction prompt. Extraction runs once per turn; recall is O(namespace size) cosine.

## Semantic vs lexical recall

`SQLiteMemoryStore` falls back to word-overlap scoring when no embedding is available. That keeps the capability working in environments with no LLM key (e.g. unit tests).

## Configuration

```bash
DATAMIND__MEMORY__BACKEND=sqlite            # sqlite | redis | postgres (future)
# DATAMIND__MEMORY__DSN=
DATAMIND__MEMORY__SHORT_TERM_TURNS=20
DATAMIND__MEMORY__LONG_TERM_ENABLED=true
```

Adding a backend:

```python
@memory_registry.register("redis")
class RedisMemoryStore:
    async def save(...): ...
    async def recall(...): ...
    async def forget(...): ...
    async def list_namespaces(...): ...
```

## Verify it

```bash
python -m datamind.scripts.hello_memory
```

```
[hello_memory] memory_recall: "What do we know about Ann's coffee preference?"
  score=0.587  Ann takes oat milk in her coffee.
  score=0.518  The user's name is Ann.

[hello_memory] extracted 2 fact(s):
  - User is moving to Shenzhen next month
  - User plans to start jogging in the morning
```
