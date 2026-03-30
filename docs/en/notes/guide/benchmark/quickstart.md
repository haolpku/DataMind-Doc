---
title: Benchmark Runner
icon: carbon:meter-alt
permalink: /en/guide/benchmark/quickstart/
createTime: 2026/03/30 23:39:59
---

# Benchmark Runner

The `benchmark/` package provides concurrent inference benchmarking for DataMind, calling the Python API directly (no HTTP).

## Features

- Configurable concurrency
- Per-request session isolation (no memory cross-contamination)
- Real-time progress bar
- Latency statistics (Avg / P50 / P90 / P95 / Max)
- Throughput (QPS)
- Optional `reference_answer` passthrough for evaluation

## Question Set Format

JSONL, one JSON per line:

```jsonl
{"question": "What is RAG?"}
{"question": "When was X born?", "reference_answer": "1982", "question_id": "q_001"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Question text |
| `reference_answer` | string | No | Ground truth (for evaluation) |
| `question_id` | string | No | Question ID (for tracking) |

## Usage

```bash
# Basic (5 concurrent)
python -m benchmark.run --questions data/bench/2wiki.jsonl

# Custom concurrency
python -m benchmark.run --questions data/bench/2wiki.jsonl --concurrency 50

# Custom output
python -m benchmark.run --questions data/bench/2wiki.jsonl --output results.json
```

### Switch Config via Environment

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

### JSON Result File

Each record:

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

`reference_answer` and `question_id` appear only when present in the question set.

## Using Public RAG Datasets

Recommended: [A-RAG Benchmark](https://huggingface.co/datasets/Ayanami0730/rag_test)

| Dataset | Chunks | Questions | Notes |
|---------|--------|-----------|-------|
| `2wikimultihop` | 658 | 1,000 | Multi-hop reasoning, smallest |
| `hotpotqa` | 1,311 | 1,000 | Multi-hop reasoning |
| `musique` | 1,354 | 1,000 | 2-4 hop reasoning |
| `medical` | 225 | 2,062 | Medical domain |
| `novel` | 1,117 | 2,010 | Long-form literature |

See [Data Format](../advanced/data-format.md) for conversion instructions.
