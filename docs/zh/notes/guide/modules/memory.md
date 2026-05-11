---
title: Memory 对话记忆
icon: carbon:ai-status-in-progress
permalink: /zh/guide/modules/memory/
createTime: 2026/03/30 23:42:51
---

# Memory

三层，同一个 service：

```
┌────────────────────────────────────────────────────┐
│  短期 — ShortTermMemory（每 session 一个 deque）    │  内存存，重启丢
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  长期 — MemoryStore（Protocol）                     │
│    • SQLite（默认）—— 余弦相似度召回                │  落盘到 storage/<profile>/memory.db
│    • Redis / Postgres —— 未来 provider              │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  事实抽取 — 每轮末尾跑一次廉价 LLM                  │
│    (user_turn + assistant_turn) -> JSON list        │
│    抽出的 facts 写入长期记忆                        │
└────────────────────────────────────────────────────┘
```

## Namespace

每条长期记忆都落在一个 namespace 下。常用前缀：

| 前缀 | 范围 |
|---|---|
| `session:<id>` | 一次对话 |
| `user:<id>` | 跨 session，按用户 |
| `global` | 系统级 |

装配时给当前 session 设置默认 namespace：

```python
agent = await build_agent(settings, default_memory_namespace="session:abc")
```

## 工具清单

| 工具 | 作用 |
|---|---|
| `memory_save` | 存一条事实，namespace 默认用装配时给的；可用参数覆盖 |
| `memory_recall` | 在某个 namespace 里做 top-K 语义召回 |
| `memory_forget` | 按 id 删（id 从 `memory_recall` 拿） |
| `memory_list_namespaces` | 列出所有已填充的 namespace |

## LLM 事实抽取

每轮对话末尾可以调：

```python
facts = await agent.memory.extract_and_save(
    "session:abc",
    user_turn="I'm moving to Shenzhen next month and will start jogging in the morning.",
    assistant_turn="Nice — Shenzhen in April is great for outdoor runs.",
)
# ["User is moving to Shenzhen next month",
#  "User plans to start jogging in the morning"]
```

用 `fallback_model`（默认 Haiku，便宜）跑极精简 prompt。抽取每轮一次，召回是 O(namespace 大小) 的余弦计算。

## 语义 vs 词法召回

`SQLiteMemoryStore` 在没 embedding 的情况下降级为词法打分（词重叠）。这样即使没 LLM key 也能跑（单测就是这么做的）。

## 配置

```bash
DATAMIND__MEMORY__BACKEND=sqlite            # sqlite | redis (future) | postgres (future)
# DATAMIND__MEMORY__DSN=
DATAMIND__MEMORY__SHORT_TERM_TURNS=20
DATAMIND__MEMORY__LONG_TERM_ENABLED=true
```

新增 backend：

```python
@memory_registry.register("redis")
class RedisMemoryStore:
    async def save(...): ...
    async def recall(...): ...
    async def forget(...): ...
    async def list_namespaces(...): ...
```

## 验证

```bash
python -m datamind.scripts.hello_memory
```

```
[hello_memory] memory_recall: "What do we know about Ann's coffee preference?"
  score=0.587  Ann takes oat milk in her coffee.

[hello_memory] extracted 2 fact(s):
  - User is moving to Shenzhen next month
  - User plans to start jogging in the morning
```
