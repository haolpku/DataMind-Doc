---
title: Benchmark
icon: carbon:meter-alt
permalink: /en/guide/benchmark/quickstart/
createTime: 2026/03/30 23:39:59
---

# Benchmark

The `benchmark/` package runs concurrent inference against DataMind and collects latency / throughput / accuracy metrics. It was written for the **v0.1 legacy stack** and still works as-is; v0.2 will grow an equivalent runner against the new `datamind.agent.AgentLoop` in a follow-up phase.

::: tip
Smoke-testing functionality end-to-end for v0.2 is covered by the `hello_<cap>.py` scripts and `pytest datamind/tests/`. Use `benchmark/` for measuring throughput and answer accuracy at scale.
:::

## Features

- Configurable concurrency (asyncio semaphore)
- Per-request session isolation (no memory cross-contamination)
- Real-time progress bar
- Latency stats (Avg / P50 / P90 / P95 / Max)
- Throughput (QPS)
- Optional `reference_answer` passthrough for answer evaluation

## Question set format

JSONL, one JSON object per line:

```jsonl
{"question": "What is RAG?"}
{"question": "When was X born?", "reference_answer": "1982", "question_id": "q_001"}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `question` | string | yes | Prompt sent to the agent |
| `reference_answer` | string | no | Ground truth for evaluation |
| `question_id` | string | no | Tracking id |

## Usage

```bash
# Basic (5 concurrent)
python -m benchmark.run --questions data/bench/2wiki.jsonl

# Custom concurrency
python -m benchmark.run --questions data/bench/2wiki.jsonl --concurrency 50

# Custom output file
python -m benchmark.run --questions data/bench/2wiki.jsonl --output results.json

# Switch profile (uses the v0.1 config — LLM_MODEL, RETRIEVER_MODE, …)
DATA_PROFILE=2wiki python -m benchmark.run --questions data/bench/2wiki.jsonl
```

### Switch config via env (legacy variables)

```bash
RETRIEVER_MODE=multi_query python -m benchmark.run --questions data/bench/2wiki.jsonl
LLM_MODEL=gpt-4o python -m benchmark.run --questions data/bench/2wiki.jsonl
SIMILARITY_TOP_K=5 python -m benchmark.run --questions data/bench/2wiki.jsonl
```

## Output

### Terminal

```
[INFO] Loaded 1000 questions (360 with reference answers), concurrency: 50

  Running 1000 queries (concurrency=50) ...
  [████████████████████████████████████████] 1000/1000 (100.0%)

==================================================
  Benchmark Results
==================================================
  Total queries:  1000
  Concurrency:    50
  Errors:         0
  Wall time:      168.090s
--------------------------------------------------
  Avg latency:    8.095s
  P50 latency:    7.036s
  P95 latency:    15.612s
  Throughput:     5.95 QPS
==================================================
```

### JSON record

```json
{
  "index": 0,
  "question": "Where does X's wife work at?",
  "answer": "According to the information...",
  "error": null,
  "latency_s": 5.632,
  "reference_answer": "Sunday Times",
  "question_id": "9d054e98..."
}
```

## Public RAG datasets

Recommended source: [A-RAG Benchmark](https://huggingface.co/datasets/Ayanami0730/rag_test)

| Dataset | Chunks | Questions | Notes |
|---|---|---|---|
| `2wikimultihop` | 658 | 1,000 | Multi-hop reasoning |
| `hotpotqa` | 1,311 | 1,000 | Multi-hop reasoning |
| `musique` | 1,354 | 1,000 | 2–4 hop reasoning |
| `medical` | 225 | 2,062 | Medical domain |
| `novel` | 1,117 | 2,010 | Long-form literature |

See [Data Format](../advanced/data-format.md) to convert those into DataMind's `chunks/*.jsonl`.

## Reference results

2WikiMultiHop dataset, 658 chunks, `gpt-4o` (v0.1 stack):

| Concurrency | Questions | Errors | Wall | Avg | P50 | P95 | Throughput |
|---|---|---|---|---|---|---|---|
| 3 | 20 | 0 | 56.1s | 6.32s | 4.75s | 32.99s | 0.36 QPS |
| 30 | 20 | 0 | 16.1s | 7.33s | 7.28s | 16.12s | 1.24 QPS |
| 50 | 1000 | 0 | 168.1s | 8.10s | 7.04s | 15.61s | 5.95 QPS |

Accuracy (reference answer contained in response): 36.0%. 2WikiMultiHop is multi-hop — raise accuracy by `RETRIEVER_MODE=multi_query` or higher `SIMILARITY_TOP_K`.

## Roadmap

A v0.2-native benchmark that calls `AgentLoop.run_turn` / `/api/chat` directly (with real tool_use accounting) is planned. It will share the same JSONL question schema and output format so result files remain interchangeable.
