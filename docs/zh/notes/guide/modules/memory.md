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
│  长期 — MemoryStore（Protocol，scope-typed）         │
│    • SQLite（默认）—— 余弦相似度召回                │  落盘到 storage/<profile>/memory.db
│    • Redis / Postgres —— 未来 provider              │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  事实抽取 — 每轮末尾跑一次廉价 LLM                  │
│    (user_turn + assistant_turn) -> JSON list        │
│    抽出的 facts 写入长期记忆                        │
└────────────────────────────────────────────────────┘
```

## 三层 scope（v0.3）

每条长期记忆都带一个 `scope` 标签，决定召回时谁能看到：

| scope | 生命周期 | 用法 |
|---|---|---|
| `global` | 跨所有租户 + 所有 session | "用中文回答"、"先给结论再给依据" |
| `profile` | 单个租户 / 项目内 | 客户专属术语、项目约定 |
| `session` | 单次会话内 | "这次写论文用审稿人视角" |

一次 `recall()` 调用返回**三层 scope-conditioned top-k 的 union**。每层默认预算 2 (session) + 4 (profile) + 2 (global)，合计 8 条——既能覆盖三个层级的相关上下文，又不会超过常见 LLM prompt 预算，更不会让租户偏好互相串味。

```python
# 默认：三层合并召回
hits = await agent.memory.recall(
    "what does ARR mean here",
    profile="lawfirm-A",        # 自动从 settings.data.profile 注入
    session_id="paper-2026",
)

# 跨租户隔离：profile-A 的偏好不会出现在 profile-B 的召回里
hits_b = await agent.memory.recall("what does ARR mean", profile="saas-B")
```

scope-typed 设计**消除了 flat-namespace 记忆在多租户场景下的偏好串味问题**。具体的隔离对比实验见 BYOP / multi-tenant 章节。

## kind 和 status

每条记忆还带：

* `kind` —— `preference` | `decision` | `workflow` | `summary` | `skill` | `fact`（默认）。支持类型化召回（`memory_recall(kinds=["decision"])`）
* `status` —— `active`（默认）| `archived`。`memory_forget` 默认软删除；`memory_forget(hard=True)` 才真删行

## 工具清单

| 工具 | 作用 |
|---|---|
| `memory_save` | 存一条记忆，带 `scope`（默认 `'profile'`）和 `kind`。profile 和 session_id 自动从 RequestContext 注入 |
| `memory_recall` | 三层 scope 合并 top-k 召回，可加 `scope_filter` 限制层级、`kinds` 过滤类型 |
| `memory_forget` | 按 id 软删除（默认）或硬删除 |
| `memory_list_profiles` | 列出所有已存有 active 记忆的租户 |

## LLM 事实抽取

每轮对话末尾可以调：

```python
facts = await agent.memory.extract_and_save(
    user_turn="I'm moving to Shenzhen next month and will start jogging in the morning.",
    assistant_turn="Nice — Shenzhen in April is great for outdoor runs.",
    scope="session",                # 抽取出来的 facts 默认进 session scope
    session_id="abc",
)
# ["User is moving to Shenzhen next month",
#  "User plans to start jogging in the morning"]
```

用 `fallback_model`（默认 Haiku，便宜）跑极精简 prompt。抽出来的 facts 默认 `scope='session'`；如果想跨 session 留存，传 `scope='profile'`。

## 语义 vs 词法召回

`SQLiteMemoryStore` 在没 embedding 的情况下降级为词法打分（词重叠）。这样即使没 LLM key 也能跑（单测就是这么做的）。

## 配置

```bash
DATAMIND__MEMORY__BACKEND=sqlite            # sqlite | redis (future) | postgres (future)
# DATAMIND__MEMORY__DSN=
DATAMIND__MEMORY__SHORT_TERM_TURNS=20
DATAMIND__MEMORY__LONG_TERM_ENABLED=true
```

新增 backend（必须满足 v0.3 scope-typed `MemoryStore` Protocol）：

```python
@memory_registry.register("redis")
class RedisMemoryStore:
    async def save(self, content, *, scope, profile=None, session_id=None,
                   kind="fact", metadata=None) -> str: ...
    async def recall(self, query, *, profile=None, session_id=None,
                     top_k=8, kinds=None, include_archived=False): ...
    async def forget(self, item_id, *, hard=False) -> bool: ...
    async def list_profiles(self) -> list[str]: ...
```

## v0.2 → v0.3 自动迁移

v0.2 部署不会丢数据。`SQLiteMemoryStore` 第一次打开会检测老的 `memory` 表，把每行迁进 `memory_v2`，统一打成 `scope='profile', profile=<原 namespace>`。迁移完后老表会被删掉，避免两份数据各说各话。

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
