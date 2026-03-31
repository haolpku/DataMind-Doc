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

# Switch data profile (use different knowledge base)
DATA_PROFILE=2wiki python -m benchmark.run --questions data/bench/2wiki.jsonl

# Combined: different profile + retrieval strategy
DATA_PROFILE=2wiki RETRIEVER_MODE=multi_query SIMILARITY_TOP_K=5 LLM_MODEL=gpt-4o \
  python -m benchmark.run --questions data/bench/2wiki.jsonl --concurrency 50
```

### Switch Config via Environment

```bash
RETRIEVER_MODE=multi_query python -m benchmark.run --questions data/bench/2wiki.jsonl
LLM_MODEL=gpt-4o python -m benchmark.run --questions data/bench/2wiki.jsonl
SIMILARITY_TOP_K=5 python -m benchmark.run --questions data/bench/2wiki.jsonl
```

### Multimodal RAG Benchmark

When benchmarking a knowledge base that contains images, set `IMAGE_EMBEDDING_MODE` as well:

```bash
# vlm_describe mode: VLM describes images as text before embedding
DATA_PROFILE=mm_demo IMAGE_EMBEDDING_MODE=vlm_describe \
  python -m benchmark.run --questions data/bench/mm_questions.jsonl --concurrency 5

# clip mode: CLIP for unified image-text embedding
DATA_PROFILE=mm_demo IMAGE_EMBEDDING_MODE=clip \
  python -m benchmark.run --questions data/bench/mm_questions.jsonl --concurrency 5
```

Things to keep in mind for multimodal benchmarks:

- **Higher first-run latency**: In `vlm_describe` mode, the first run calls the VLM API to generate a description for each image, so index building takes longer. Subsequent runs load the cached index and latency returns to normal.
- **Images must be inside the profile directory**: `image_path` is relative to `data/profiles/{profile}/`; make sure the image files exist.
- **Questions should target image content**: The question set for a multimodal benchmark should include questions that require information from images to answer; otherwise there is no difference from a text-only benchmark.

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

## Reference Results

Results from 2WikiMultiHop dataset (658 chunks, gpt-4o) at various concurrency levels:

| Concurrency | Questions | Errors | Wall Time | Avg Latency | P50 | P95 | Throughput |
|-------------|-----------|--------|-----------|-------------|-----|-----|------------|
| 3 | 20 | 0 | 56.1s | 6.32s | 4.75s | 32.99s | 0.36 QPS |
| 30 | 20 | 0 | 16.1s | 7.33s | 7.28s | 16.12s | 1.24 QPS |
| 50 | 1000 | 0 | 168.1s | 8.10s | 7.04s | 15.61s | 5.95 QPS |

Accuracy (reference answer contained in response): **36.0%**

> 2WikiMultiHop is a multi-hop reasoning dataset; single-pass vector retrieval with top_k=3 is inherently challenging. Use `RETRIEVER_MODE=multi_query` or increase `SIMILARITY_TOP_K` to improve recall.
