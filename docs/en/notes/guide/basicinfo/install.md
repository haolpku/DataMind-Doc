---
title: Install & run
icon: material-symbols-light:download-rounded
permalink: /en/guide/basicinfo/install/
createTime: 2026/03/23 00:55:54
---

# Install & run

## 1. Prerequisites

- Python **3.11+**
- An Anthropic-compatible gateway URL + API key (the examples use `http://35.220.164.252:3888`)
- Optional: MySQL or PostgreSQL client libs — only if you point the `db` capability at one of them.

::: tip
DataMind v0.2 does **not** require the `claude` CLI or `claude-agent-sdk`. We talk to the gateway via the official `anthropic` Python SDK — some environments ship a vendor-rebranded `claude` binary that ignores `ANTHROPIC_API_KEY`, so we sidestep that entirely.
:::

## 2. Install

```bash
git clone https://github.com/your-org/DataMind.git
cd DataMind
python -m venv .venv && source .venv/bin/activate

# Install the v0.2 package
pip install -e .

# Optional extras
pip install -e '.[mysql]'        # pymysql + cryptography
pip install -e '.[huggingface]'  # sentence-transformers for local embeddings
pip install -e '.[dev]'          # pytest + pytest-asyncio
```

## 3. Configure

```bash
cp .env.datamind.example .env.datamind
$EDITOR .env.datamind
```

Minimum required:

```bash
DATAMIND__LLM__API_BASE=http://35.220.164.252:3888
DATAMIND__LLM__API_KEY=sk-your-key-here
DATAMIND__LLM__MODEL=claude-sonnet-4-6
```

That's it. The same key drives embeddings too — the embedding provider auto-falls-back to LLM credentials if `DATAMIND__EMBEDDING__*` isn't set.

## 4. Verify connectivity

```bash
python -m datamind.scripts.hello_sdk
```

Expected:

```
[hello_sdk] gateway = http://35.220.164.252:3888/
[hello_sdk] model   = claude-sonnet-4-6
[hello_sdk] prompt  = 'Reply with just the single word: pong'
[hello_sdk] --- stream ---
pong
[hello_sdk] usage: input=16 output=5 cache_read=0 cache_create=0
[hello_sdk] OK: gateway reachable, streaming works, model replied 'pong'.
```

If this fails, the rest will too — fix the API key or base URL first.

## 5. Try every capability standalone

Each capability ships with a live smoke script. They use a throwaway profile (`hello_<cap>_demo`) so they don't touch real data.

```bash
python -m datamind.scripts.hello_kb       # Chroma + hybrid retriever
python -m datamind.scripts.hello_db       # SQLite + NL2SQL + safeguards
python -m datamind.scripts.hello_graph    # NetworkX multi-hop (no LLM needed)
python -m datamind.scripts.hello_skills   # SKILL.md semantic search
python -m datamind.scripts.hello_memory   # short + long term + fact extraction
python -m datamind.scripts.hello_agent    # the full agent — 4 real questions
```

## 6. Run the full agent

```bash
# Interactive REPL
python -m datamind chat

# One-shot question
python -m datamind ask "How do I review a pull request?"

# Build / rebuild the KB vector index for the active profile
python -m datamind ingest

# Show config and registered tools
python -m datamind info
```

## 7. HTTP server + browser UI

```bash
python -m uvicorn datamind.server:app --host 127.0.0.1 --port 8000
```

**Open [http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser for a chat UI with streamed answers, collapsible tool-call cards, and a sidebar inspector (config, tools, graph stats, KB docs, memory viewer, one-click reindex).

Or talk to the API directly:

| Method & path | Purpose |
|---|---|
| `GET /` | Browser UI (served from `static/app.html`) |
| `GET /api/health` | Liveness + config snapshot |
| `GET /api/tools` | Every registered tool's name, description, and JSON schema |
| `POST /api/ask` | Non-streaming convenience |
| `POST /api/chat` | **Real SSE stream** of `text` / `tool_use` / `tool_result` / `done` events |
| `POST /api/kb/reindex` | Rebuild the KB |
| `GET /api/kb/documents` | Docs under the active profile |
| `GET /api/memory/{namespace}` | Peek at a memory namespace |
| `GET /api/graph/stats` | Node / edge counts |

Quick check:

```bash
curl -s http://127.0.0.1:8000/api/health | jq
curl -s -X POST http://127.0.0.1:8000/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"message":"Say 你好."}' | jq
```

Stream:

```bash
curl -N -X POST http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Tell me the Status meeting time."}'
```

## 7a. (Optional) Swap the agent loop to `claude-agent-sdk`

DataMind ships two interchangeable agent-loop implementations. Toggle with one env var:

| Backend | Path | Pick when |
|---|---|---|
| `native` (default) | Pure Python, `anthropic` SDK → your gateway | Simplest deploy, fewest deps |
| `sdk` | `claude-agent-sdk` → `claude` CLI → **CCR** → your gateway | You want Hooks / Subagents / Compaction / Plan mode |

The 23 DataMind tools, SSE event protocol, and frontend are **identical on both** — only the inner loop differs.

### Why CCR

The SDK only speaks Anthropic's `/v1/messages`. If your upstream is OpenAI-format (`/v1/chat/completions`), drop `claude-code-router` (CCR) in the middle — a tiny Node process that translates both directions, ~20ms overhead per request.

### Start CCR

```bash
# Needs node >= 18
export UPSTREAM_BASE=http://your-gateway.example.com/v1
export UPSTREAM_KEY=sk-...
export UPSTREAM_MODEL=claude-sonnet-4-6

bash scripts/start_ccr.sh
# → listens on http://127.0.0.1:13456
```

Keep it running in its own terminal.

### Switch DataMind to the SDK backend

```bash
# In .env.datamind or exported inline:
export DATAMIND__AGENT__BACKEND=sdk
export DATAMIND__AGENT__CCR_BASE_URL=http://127.0.0.1:13456

# Everything else unchanged:
python -m datamind chat
python -m uvicorn datamind.server:app --port 8000
```

Server startup logs show the backend:

```
INFO agent_loop_backend backend=sdk ccr=http://127.0.0.1:13456
```

Switch back to native any time with `DATAMIND__AGENT__BACKEND=native` (or unset — it's the default).

## 8. Run the test suite

```bash
pytest datamind/tests/
# 95 passed in ~0.6s — no network required
```

## Legacy v0.1 still works

If you want to compare, the old `main.py` / `server.py` / `modules/` layout remains untouched. It still reads the original `.env` keys (`LLM_API_BASE`, `LLM_API_KEY`, etc.).

## Compatible gateways & models

Any Anthropic-compatible `/v1/messages` service works. Confirmed against `http://35.220.164.252:3888` with:

| Model | Good for |
|---|---|
| `claude-opus-4-7` | Complex reasoning subagents |
| `claude-sonnet-4-6` | Main agent (default) |
| `claude-haiku-4-5-20251001` | Memory fact extraction, cheap subtasks |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ValidationError: llm.api_key: Field required` | Set `DATAMIND__LLM__API_KEY` in env or `.env.datamind`. |
| `401 Invalid token` | Key / gateway mismatch; verify with `curl $BASE/v1/messages`. |
| `Unknown embedding provider 'openai'` | Run from the repo root so `datamind` is importable. |
| `OperationalError: no such table: employees` | You hit `db_query_nl` before seeding; run `hello_agent.py` or seed manually. |
| `Agent not ready` from HTTP server | Lifespan still warming up; wait a few seconds, retry `/api/health`. |
