---
title: Demo & tour
icon: carbon:demo
permalink: /en/guide/basicinfo/demo/
createTime: 2026/03/31 16:00:00
---

# Demo & tour

This page walks through the live smoke scripts and the full agent. Every example uses the `hello_<cap>_demo` profile so it can't clobber real data.

## 0. The one-liner: full agent smoke

```bash
DATAMIND__LLM__API_BASE=http://35.220.164.252:3888 \
DATAMIND__LLM__API_KEY=sk-... \
python -m datamind.scripts.hello_agent
```

It seeds a profile with a KB, graph, and SQLite, then asks four real questions in Chinese:

| Q | Tools the agent picked (autonomously) | Result |
|---|---|---|
| Status meeting 什么时候开？ | `memory_recall` → `kb_search` | "周一 14:00 Shanghai time" from `company_handbook.md` |
| Search platform 负责人是谁？他在哪个城市？ | `kb_search` → `graph_search_entities` → `graph_neighbors` ×2 | "Ann leads Search platform; city is unknown from the graph" (honest — city is in SQLite, not the graph) |
| 工程部 Shanghai 员工工资加起来是多少？ | `db_query_nl` → `db_list_tables` → `db_describe_table` → `db_query_sql` ×2 | ¥26,000 with a formatted table (recovers after a wrong first SQL) |
| 帮我记住下周三会议调到周四 | `memory_save` | Persisted with metadata |

Highlights:
- **Autonomous tool selection** — no hints, no manual routing.
- **Graceful error recovery** — if NL2SQL generates the wrong column, the agent reads the schema and retries.
- **Chinese output, English tool names** — the split we designed.

## 1. KB (RAG) — `hello_kb`

```bash
python -m datamind.scripts.hello_kb
```

Seeds a two-file corpus (`ai_history.md`, `rag.md`), indexes it with real embeddings, then runs three queries. Example output:

```
[hello_kb] indexed: {'pre_chunked': 0, 'raw_chunks': 4, 'total_embedded': 4}

[hello_kb] Q: When did AI research start?
  - score=0.033 source='ai_history.md'  'Artificial intelligence research began in the 1950s…'

[hello_kb] Q: What is reciprocal rank fusion?
  - score=0.033 source='rag.md'  'Hybrid retrieval mixes dense vector search with BM25…'
```

Strategies are configurable via `DATAMIND__RETRIEVAL__STRATEGY`:

| Strategy | When to use |
|---|---|
| `simple` | Cheapest; good baseline |
| `multi_query` | Ambiguous queries — LLM rewrites into N siblings |
| `hybrid` | Default; BM25 + vector fused with RRF (best on most corpora) |

## 2. Graph — `hello_graph`

```bash
python -m datamind.scripts.hello_graph
```

No network. Seeds 8 triples about Ann / Bob / Acme / Shanghai, then demonstrates:

- Entity search (case-insensitive + fuzzy)
- 3-hop traversal: `Ann → Acme → Shanghai → China`
- Relation filter: pass `["works_at", "located_in", "in_country"]` to restrict edges followed
- Direction-aware neighbors
- **Persistence**: the same graph reloads from `storage/hello_graph_demo/graph.json` on next run

## 3. Database — `hello_db`

```bash
python -m datamind.scripts.hello_db
```

Creates a SQLite demo (employees + projects), exercises every DB tool:

- `db_list_tables` / `db_describe_table`
- `db_query_sql`: group-by + aggregates
- **Safeguard**: `DELETE FROM employees` is rejected with `DestructiveSQLError`
- `db_query_nl`: real NL2SQL via the gateway — generates JOINs and filters

Example:

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

Discovers every `.claude/skills/<name>/SKILL.md` manifest, indexes them against live embeddings, then searches semantically:

```
skill_search 'how should I review a pull request?'
  score=0.513  name=code-review
  score=0.194  name=db-ops-sop

skill_search '慢查询怎么排查'
  score=0.392  name=db-ops-sop
  score=0.330  name=code-review
```

Also exercises the code skills: `calculator("2 * (3 + sqrt(16))") → 14`, `100°C → 212°F`.

## 5. Memory — `hello_memory`

```bash
python -m datamind.scripts.hello_memory
```

Shows all three layers:

- Short-term rolling window (in-memory FIFO)
- Long-term SQLite + cosine recall
- LLM fact extraction:

```
[hello_memory] extracted 2 fact(s):
  - User is moving to Shenzhen next month
  - User plans to start jogging in the morning
```

from the raw turn "I'm moving to Shenzhen next month and will start jogging in the morning."

## 6. Enterprise demo — `hello_enterprise` (recommended)

The flagship v0.2 demo: a **medium-sized realistic profile** + 8 cross-backend complex questions.

### 6.1 Seed once

```bash
python -m datamind.scripts.seed_enterprise_demo
```

Sets up:
- **17 KB documents** (employee handbook, security policy, incident SOP, 3 product architectures, API ref, quarterly retros, OKRs, culture…)
- **64 graph nodes / 91 edges** (org chart / project deps / product components / incident → service)
- **6 SQL tables / 101 rows** (departments / employees / projects / project_members / incidents / performance_reviews)

### 6.2 Run 8 cross-backend questions

```bash
DATAMIND__DATA__PROFILE=enterprise_demo \
  python -m datamind.scripts.hello_enterprise
```

Coverage:

| Question | Capabilities exercised |
|---|---|
| What's the deploy window? what's the pre-deploy checklist? | KB multi-doc |
| 2025 Q4 incidents on Search Platform? responder H2 perf scores? | DB (incidents + performance_reviews) |
| AI Copilot's product dependencies? owners' cities? | Graph multi-hop + DB |
| Engineers with 2025 H2 perf > 4.0 — what in_progress projects do they own? | DB JOINs |
| Tell me everything about Frank | KB + DB + Graph |
| Code review best practices? | Skills |
| Add "Wednesday deep-work block" to the KB | Ingest (KB write) |
| Remember I'm on PTO next Monday for a checkup | Memory |

8/8 correct on both backends in a verified run:

| Backend | Total tool calls | Total time |
|---|---|---|
| `native` (default) | 34 | 194s |
| `sdk` + CCR | 38 | 283s |

## 7. Ingest demo — talk to write

In `enterprise_demo`, the agent has 4 extra tools that **write** to KB / DB / Graph mid-conversation:

```bash
python -m datamind chat
# or open http://127.0.0.1:8000 in a browser
```

Try:

```
"add /Users/foo/policy.md to the knowledge base"
  → agent calls kb_add_file, immediately retrievable via kb_search

"import /Users/foo/customers.csv as table customers"
  → agent calls db_import_csv, immediately queryable via db_query_sql

"陈诚 was promoted to Tech Lead, reports to Ann, owns Project Kepler"
  → agent calls graph_add_triples_from_text, LLM extracts triples, graph upserts
```

Six sample files live in `demo-uploads/` — drag any into the browser dropzone to see the full pipeline. See [Install §7b](../basicinfo/install/) and [Ingest module](../modules/ingest/).

## Full agent in an interactive REPL

```bash
python -m datamind chat
```

```
╭──── Chat ─────╮
│ DataMind ready · profile=default · model=claude-sonnet-4-6
│ tools=23 · kb_chunks=0 · graph_triples=0 · skills=2
╰───────────────╯
you › How should I run a code review?
ai  › [tool skill_search] {"query":"code review process"}
     [result ok] {"count":1, "results":[{"name":"code-review", …}]}
     [tool skill_get] {"name":"code-review"}
     …
```

Commands: `/new` resets history, `/exit` or `Ctrl-D` leaves.

## HTTP server

```bash
python -m uvicorn datamind.server:app --port 8000
```

Streaming example:

```bash
curl -N -X POST localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Tell me the Status meeting time."}'
```

```
data: {"type": "text", "delta": "根据"}
data: {"type": "text", "delta": "公司"}
data: {"type": "tool_use", "name": "kb_search", "input": {"query": "Status meeting time"}, "id": "toolu_…"}
data: {"type": "tool_result", "name": "kb_search", "is_error": false, "preview": "…"}
data: {"type": "text", "delta": "周一"}
…
data: {"type": "done", "iterations": 3, "stop_reason": "end_turn"}
```

## Verify the whole test suite

```bash
pytest datamind/tests/
# 95 passed in ~0.6s
```

No network is required for unit tests — they use in-memory fakes and temp SQLite. Live tests are reserved for the `hello_*.py` smokes.
