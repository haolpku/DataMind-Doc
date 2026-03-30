---
title: 运行测评
icon: carbon:meter-alt
permalink: /zh/guide/benchmark/quickstart/
createTime: 2026/03/30 23:43:20
---

# 运行测评

`benchmark/` 包提供 DataMind 的并发推理测评，直接调用 Python API（不经过 HTTP）。

## 功能

- 可配置的并发数
- 每个请求独立的 Session 隔离（无记忆交叉污染）
- 实时进度条
- 延迟统计（Avg / P50 / P90 / P95 / Max）
- 吞吐量（QPS）
- 可选 `reference_answer` 透传用于评估

## 问题集格式

JSONL，每行一个 JSON：

```jsonl
{"question": "RAG的核心原理是什么？"}
{"question": "When was X born?", "reference_answer": "1982", "question_id": "q_001"}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question` | string | 是 | 问题文本 |
| `reference_answer` | string | 否 | 标准答案（用于评估） |
| `question_id` | string | 否 | 问题 ID（用于追踪） |

## 用法

```bash
# 基础用法（默认 5 并发）
python -m benchmark.run --questions data/bench/2wiki.jsonl

# 指定并发数
python -m benchmark.run --questions data/bench/2wiki.jsonl --concurrency 50

# 指定输出文件
python -m benchmark.run --questions data/bench/2wiki.jsonl --output results.json
```

### 通过环境变量切换配置

```bash
RETRIEVER_MODE=multi_query python -m benchmark.run --questions data/bench/2wiki.jsonl
LLM_MODEL=gpt-4o python -m benchmark.run --questions data/bench/2wiki.jsonl
SIMILARITY_TOP_K=5 python -m benchmark.run --questions data/bench/2wiki.jsonl
```

## 输出

### 终端输出

```
[INFO] 加载了 1000 个问题 (360 条含参考答案)，并发数: 50

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

### JSON 结果文件

每条记录：

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

`reference_answer` 和 `question_id` 仅在问题集包含这些字段时才会出现。

## 使用公开 RAG 数据集

推荐使用 [A-RAG Benchmark](https://huggingface.co/datasets/Ayanami0730/rag_test)：

| 数据集 | Chunks | Questions | 特点 |
|--------|--------|-----------|------|
| `2wikimultihop` | 658 | 1,000 | 多跳推理，体积最小 |
| `hotpotqa` | 1,311 | 1,000 | 多跳推理 |
| `musique` | 1,354 | 1,000 | 2-4 跳推理 |
| `medical` | 225 | 2,062 | 医学领域 |
| `novel` | 1,117 | 2,010 | 长文本文学 |

数据转换方法参见 [数据格式](../advanced/data-format.md)。
