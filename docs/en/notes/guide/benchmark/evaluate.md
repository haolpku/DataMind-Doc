---
title: Answer Evaluation
icon: carbon:checkmark-outline
permalink: /en/guide/benchmark/evaluate/
createTime: 2026/03/30 23:40:10
---

# Answer Evaluation

When the question set includes `reference_answer`, use the evaluation script to compare generated answers against ground truth.

## Metrics

| Metric | Description |
|--------|-------------|
| **Exact Match (EM)** | Whether the normalized reference answer appears in the generated answer |
| **Token F1** | Token-overlap F1 score, more tolerant of phrasing differences |

## Usage

```bash
python -m benchmark.evaluate benchmark_results.json
```

Specify output path:

```bash
python -m benchmark.evaluate benchmark_results.json --output my_eval.json
```

## Output

### Terminal

```
=======================================================
  Evaluation Report
=======================================================
  Total evaluated:   1000
  Exact Match:       360/1000 (36.0%)
  Avg Token-F1:      0.4521
=======================================================

  ✗ Missed questions (640):

    Q: Where does X's wife work at?
    A: I don't have information about X's wife...
    R: Sunday Times
    F1=0.0000
```

### JSON Report

```json
{
  "summary": {
    "total": 1000,
    "exact_match_count": 360,
    "exact_match_rate": 0.36,
    "avg_f1": 0.4521
  },
  "details": [
    {
      "index": 0,
      "question": "...",
      "answer": "...",
      "reference_answer": "...",
      "exact_match": true,
      "f1": 0.8523
    }
  ]
}
```

## Workflow

A typical benchmarking workflow:

```bash
# 1. Run benchmark
python -m benchmark.run --questions data/bench/2wiki.jsonl \
    --concurrency 50 --output bench_results.json

# 2. Evaluate
python -m benchmark.evaluate bench_results.json

# 3. Compare different configs
RETRIEVER_MODE=multi_query python -m benchmark.run \
    --questions data/bench/2wiki.jsonl --output bench_multi_query.json
python -m benchmark.evaluate bench_multi_query.json
```
