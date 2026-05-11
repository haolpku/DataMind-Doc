---
title: 配置说明
icon: carbon:settings-adjust
permalink: /zh/guide/advanced/config/
createTime: 2026/03/30 23:43:41
---

# 配置说明

DataMind v0.2 使用嵌套 [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)，前缀 `DATAMIND__`，分层用双下划线：

```bash
DATAMIND__<section>__<field>=value
```

配置从仓库根目录的 `.env` 和 `.env.datamind` 读取，再被进程环境变量覆盖。

## 快速参考

```bash
# ── LLM ─────────────────────────────────────────────────────────
DATAMIND__LLM__API_BASE=http://35.220.164.252:3888
DATAMIND__LLM__API_KEY=sk-...
DATAMIND__LLM__MODEL=claude-sonnet-4-6
DATAMIND__LLM__FALLBACK_MODEL=claude-haiku-4-5-20251001
DATAMIND__LLM__MAX_TOKENS=4096
DATAMIND__LLM__TEMPERATURE=1.0
DATAMIND__LLM__TIMEOUT_S=60.0

# ── Embedding ───────────────────────────────────────────────────
DATAMIND__EMBEDDING__PROVIDER=openai             # openai | openai_compatible | huggingface
# 留空 = 复用 LLM__ 的 gateway 凭证
DATAMIND__EMBEDDING__API_BASE=
DATAMIND__EMBEDDING__API_KEY=
DATAMIND__EMBEDDING__MODEL=text-embedding-3-small
DATAMIND__EMBEDDING__BATCH_SIZE=32
# DATAMIND__EMBEDDING__DIMENSION=1536          # 不填则自动探测

# ── Retrieval ───────────────────────────────────────────────────
DATAMIND__RETRIEVAL__STRATEGY=hybrid             # simple | multi_query | hybrid
DATAMIND__RETRIEVAL__TOP_K=5
DATAMIND__RETRIEVAL__CHUNK_SIZE=512
DATAMIND__RETRIEVAL__CHUNK_OVERLAP=64
DATAMIND__RETRIEVAL__RERANK=false

# ── Graph ───────────────────────────────────────────────────────
DATAMIND__GRAPH__BACKEND=networkx                # networkx | neo4j (future)
# DATAMIND__GRAPH__DSN=bolt://user:pw@host:7687
DATAMIND__GRAPH__EMBED_ENTITIES=false

# ── Database ────────────────────────────────────────────────────
DATAMIND__DB__DIALECT=sqlite                     # sqlite | mysql | postgres (future)
# DATAMIND__DB__DSN=mysql+pymysql://user:pw@host:3306/dbname
DATAMIND__DB__READ_ONLY=true
DATAMIND__DB__ROW_LIMIT=1000
DATAMIND__DB__QUERY_TIMEOUT_S=10.0

# ── Memory ──────────────────────────────────────────────────────
DATAMIND__MEMORY__BACKEND=sqlite                 # sqlite | redis (future) | postgres (future)
# DATAMIND__MEMORY__DSN=
DATAMIND__MEMORY__SHORT_TERM_TURNS=20
DATAMIND__MEMORY__LONG_TERM_ENABLED=true

# ── Data / profile ──────────────────────────────────────────────
DATAMIND__DATA__PROFILE=default                  # data/profiles/<>/ 和 storage/<>/ 一起切换

# ── 日志 ────────────────────────────────────────────────────────
DATAMIND__LOGGING__LEVEL=INFO
```

## Profile 切换

一条环境变量搞定：

```bash
DATAMIND__DATA__PROFILE=customer_a python -m datamind chat
```

会同时切换：

- `data/profiles/customer_a/` —— 文档、三元组、SQL 种子
- `storage/customer_a/` —— Chroma 集合、SQLite、memory、graph

其他 flag 都不用改。

## 兼容的提供商

### LLM（Anthropic 兼容 `/v1/messages`）

- Anthropic 直连（`https://api.anthropic.com`）
- AWS Bedrock / Vertex / Azure Foundry（有需要就自建代理）
- 第三方代理 — 例如 `http://35.220.164.252:3888`，它还同时提供 OpenAI 风格的 `/v1/embeddings`（1536 维）

### Embedding（OpenAI 兼容 `/v1/embeddings`）

- OpenAI（`text-embedding-3-small`、`3-large`）
- 硅基流动 / DeepSeek / 智谱 / Moonshot
- 上述网关（同端点路径）

### DB 方言

- 内置：`sqlite`、`mysql`（需 pymysql）
- 可插拔：任何 SQLAlchemy 支持的后端，写一个继承 `BaseSQLDialect` 的类 + `@db_registry.register(...)`

## 启动时校验

Pydantic 在 Agent 启动前就校验每个字段：

- `chunk_overlap < chunk_size`
- `LLMConfig.api_key` 必填
- MySQL DSN 必须以 `mysql+` 或 `mysql://` 开头
- 所有数值 / 枚举类型必须匹配

配置非法时直接快速失败，不会带着半坏状态运行。
