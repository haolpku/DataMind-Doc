---
title: 运行测评
icon: carbon:meter-alt
permalink: /zh/guide/benchmark/quickstart/
createTime: 2026/03/30 23:43:20
---

# Benchmark

`benchmark/` 包提供并发推理测评，调用 Python API（不走 HTTP）。它是为 **v0.1 legacy 栈** 写的，现在仍能用；v0.2 原生的 benchmark 会在后续 Phase 加上。

::: tip
v0.2 的端到端功能验证由 `hello_<cap>.py` 冒烟脚本和 `pytest datamind/tests/` 覆盖。`benchmark/` 用来大规模跑吞吐 / 准确率。
:::

## 特性

- 并发度可配置（asyncio semaphore）
- 每请求独立 session（记忆互不污染）
- 实时进度条
- 延迟统计（Avg / P50 / P90 / P95 / Max）
- 吞吐（QPS）
- 可选 `reference_answer` 透传，配合 evaluate 计准确率

## 问题集格式

JSONL，一行一个 JSON：

```jsonl
{"question": "什么是 RAG？"}
{"question": "X 是哪一年出生的？", "reference_answer": "1982", "question_id": "q_001"}
```

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `question` | string | 是 | 发给 Agent 的问题 |
| `reference_answer` | string | 否 | 标准答案（evaluate 时用） |
| `question_id` | string | 否 | 追踪 id |

## 用法

```bash
# 基础（5 并发）
python -m benchmark.run --questions data/bench/2wiki.jsonl

# 指定并发
python -m benchmark.run --questions data/bench/2wiki.jsonl --concurrency 50

# 指定输出文件
python -m benchmark.run --questions data/bench/2wiki.jsonl --output results.json

# 切换 profile（用 v0.1 配置变量 LLM_MODEL / RETRIEVER_MODE / …）
DATA_PROFILE=2wiki python -m benchmark.run --questions data/bench/2wiki.jsonl
```

### 通过环境变量切配置（legacy）

```bash
RETRIEVER_MODE=multi_query python -m benchmark.run --questions data/bench/2wiki.jsonl
LLM_MODEL=gpt-4o python -m benchmark.run --questions data/bench/2wiki.jsonl
SIMILARITY_TOP_K=5 python -m benchmark.run --questions data/bench/2wiki.jsonl
```

## 输出

### 终端

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

### JSON 记录

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

## 公开 RAG 数据集

推荐 [A-RAG Benchmark](https://huggingface.co/datasets/Ayanami0730/rag_test)：

| 数据集 | Chunks | Questions | 说明 |
|---|---|---|---|
| `2wikimultihop` | 658 | 1,000 | 多跳推理 |
| `hotpotqa` | 1,311 | 1,000 | 多跳推理 |
| `musique` | 1,354 | 1,000 | 2-4 跳推理 |
| `medical` | 225 | 2,062 | 医疗领域 |
| `novel` | 1,117 | 2,010 | 长篇文学 |

看 [数据格式](../advanced/data-format.md) 把它们转成 DataMind 用的 `chunks/*.jsonl`。

## 参考结果

2WikiMultiHop，658 chunks，`gpt-4o`（v0.1 stack）：

| 并发 | 题数 | 错误 | 墙钟 | Avg | P50 | P95 | 吞吐 |
|---|---|---|---|---|---|---|---|
| 3 | 20 | 0 | 56.1s | 6.32s | 4.75s | 32.99s | 0.36 QPS |
| 30 | 20 | 0 | 16.1s | 7.33s | 7.28s | 16.12s | 1.24 QPS |
| 50 | 1000 | 0 | 168.1s | 8.10s | 7.04s | 15.61s | 5.95 QPS |

准确率（参考答案被包含在生成答案里）：36.0%。2WikiMultiHop 是多跳，可以 `RETRIEVER_MODE=multi_query` 或加大 `SIMILARITY_TOP_K` 提高召回。

## Roadmap

v0.2 原生的 benchmark（直接调 `AgentLoop.run_turn` / `/api/chat`，准确统计 tool_use）会在后续 Phase 补上。JSONL 题集格式和输出 JSON 格式保持一致，旧结果文件仍可继续用。
