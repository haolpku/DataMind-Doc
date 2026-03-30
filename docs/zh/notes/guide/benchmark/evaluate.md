---
title: 答案评估
icon: carbon:checkmark-outline
permalink: /zh/guide/benchmark/evaluate/
createTime: 2026/03/30 23:43:32
---

# 答案评估

当问题集包含 `reference_answer` 时，可使用评估脚本对比生成答案与标准答案。

## 评估指标

| 指标 | 说明 |
|------|------|
| **Exact Match (EM)** | 标准答案（normalize 后）是否完整出现在生成答案中 |
| **Token F1** | 基于 token 重叠的 F1 Score，对表述差异更宽容 |

## 用法

```bash
python -m benchmark.evaluate benchmark_results.json
```

指定输出路径：

```bash
python -m benchmark.evaluate benchmark_results.json --output my_eval.json
```

## 输出

### 终端

```
=======================================================
  Evaluation Report
=======================================================
  Total evaluated:   1000
  Exact Match:       360/1000 (36.0%)
  Avg Token-F1:      0.4521
=======================================================

  ✗ 未命中的问题 (640 条):

    Q: Where does X's wife work at?
    A: I don't have information about X's wife...
    R: Sunday Times
    F1=0.0000
```

### JSON 报告

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

## 典型工作流

```bash
# 1. 运行测评
python -m benchmark.run --questions data/bench/2wiki.jsonl \
    --concurrency 50 --output bench_results.json

# 2. 评估
python -m benchmark.evaluate bench_results.json

# 3. 对比不同配置
RETRIEVER_MODE=multi_query python -m benchmark.run \
    --questions data/bench/2wiki.jsonl --output bench_multi_query.json
python -m benchmark.evaluate bench_multi_query.json
```
