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
│  Long-term — MemoryStore (Protocol, scope-typed)   │
│    • SQLite (default) — embedding cosine recall    │  persisted under storage/<profile>/memory.db
│    • Redis / Postgres — future providers           │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  Fact extractor — cheap LLM call at turn boundary  │
│    (user_turn + assistant_turn) -> JSON list       │
│    facts → long-term store                         │
└────────────────────────────────────────────────────┘
```

## Three scopes (v0.3)

Every long-term item carries a `scope` that defines who can see it during recall:

| Scope | Lifetime | Use case |
|---|---|---|
| `global` | Shared across all tenants and sessions | "respond in Chinese", "always cite sources" |
| `profile` | Bound to one tenant/project | per-customer terminology, project conventions |
| `session` | Confined to one conversation thread | "this thread, give the reviewer's perspective" |

A single `recall()` returns the **union of three scope-conditioned top-k** retrievals. Per-scope budgets default to 2 (session) + 4 (profile) + 2 (global), giving a balanced 8-item context that fits typical LLM prompt budgets without bleeding tenant boundaries.

```python
# Default: session+profile+global merged
hits = await agent.memory.recall(
    "what does ARR mean here",
    profile="lawfirm-A",        # auto-injected from settings.data.profile
    session_id="paper-2026",
)

# Tenant isolation — profile-A's preferences cannot leak into profile-B
hits_b = await agent.memory.recall("what does ARR mean", profile="saas-B")
```

The scope-typed design eliminates **cross-tenant preference leakage** that flat-namespace memories exhibit. See the BYOP / multi-tenant experiments for measurements.

## Kinds and statuses

Each item also has:

* `kind` — `preference` | `decision` | `workflow` | `summary` | `skill` | `fact` (default). Enables typed recall (`memory_recall(kinds=["decision"])`).
* `status` — `active` (default) | `archived`. `memory_forget` soft-deletes by default; `memory_forget(hard=True)` truly removes the row.

## Tools exposed to the agent

| Tool | Purpose |
|---|---|
| `memory_save` | Persist one fact with `scope` (default `'profile'`) and `kind`. Profile and session_id auto-injected from RequestContext. |
| `memory_recall` | Three-scope top-k semantic recall, with optional `scope_filter` and `kinds` filters. |
| `memory_forget` | Soft-delete (default) or hard-delete by id. |
| `memory_list_profiles` | List every profile (tenant) that currently has at least one active item. |

## LLM-driven fact extraction

At the end of a turn you can call:

```python
facts = await agent.memory.extract_and_save(
    user_turn="I'm moving to Shenzhen next month and will start jogging in the morning.",
    assistant_turn="Nice — Shenzhen in April is great for outdoor runs.",
    scope="session",                # extracted facts default to session scope
    session_id="abc",
)
# ["User is moving to Shenzhen next month",
#  "User plans to start jogging in the morning"]
```

Uses the `fallback_model` (Haiku by default — cheap) with a tight extraction prompt. Extracted facts default to `scope='session'`; pass `scope='profile'` if they should persist across sessions.

## Semantic vs lexical recall

`SQLiteMemoryStore` falls back to word-overlap scoring when no embedding is available. That keeps the capability working in environments with no LLM key (e.g. unit tests).

## Configuration

```bash
DATAMIND__MEMORY__BACKEND=sqlite            # sqlite | redis | postgres (future)
# DATAMIND__MEMORY__DSN=
DATAMIND__MEMORY__SHORT_TERM_TURNS=20
DATAMIND__MEMORY__LONG_TERM_ENABLED=true
```

Adding a backend (must satisfy the v0.3 scope-typed `MemoryStore` Protocol):

```python
@memory_registry.register("redis")
class RedisMemoryStore:
    async def save(self, content, *, scope, profile=None, session_id=None,
                   kind="fact", metadata=None) -> str: ...
    async def recall(self, query, *, profile=None, session_id=None,
                     top_k=8, kinds=None, include_archived=False): ...
    async def forget(self, item_id, *, hard=False) -> bool: ...
    async def list_profiles(self) -> list[str]: ...
```

## v0.2 → v0.3 migration

Existing deployments don't lose data. On first open, `SQLiteMemoryStore`
auto-detects the legacy `memory` table and migrates every row into
`memory_v2` with `scope='profile', profile=<old_namespace>`. The legacy
table is then dropped to keep the source of truth in one place.

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
