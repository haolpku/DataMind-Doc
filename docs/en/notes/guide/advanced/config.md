---
title: Configuration
icon: carbon:settings-adjust
permalink: /en/guide/advanced/config/
createTime: 2026/03/30 23:40:20
---

# Configuration

All settings are managed via `.env` file (environment variables also supported). Copy the template to start:

```bash
cp .env.example .env
```

## Full Reference

```bash
# ── LLM ──
LLM_API_BASE=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=deepseek-chat

# ── Embedding ──
USE_LOCAL_EMBEDDING=false
EMBEDDING_API_BASE=https://api.deepseek.com/v1
EMBEDDING_API_KEY=sk-xxx
EMBEDDING_MODEL=text-embedding-3-small

# Local embedding (when USE_LOCAL_EMBEDDING=true)
LOCAL_EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5    # CPU-friendly, ~100MB

# ── Retriever ──
RETRIEVER_MODE=simple          # simple / multi_query
SIMILARITY_TOP_K=3             # number of top results
MULTI_QUERY_COUNT=3            # sub-queries in multi_query mode

# ── Memory ──
MEMORY_TOKEN_LIMIT=30000       # total token budget
CHAT_HISTORY_TOKEN_RATIO=0.7   # short-term memory ratio
```

## How It Works

DataMind uses [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) to load configuration:

1. Reads `.env` file from the project root
2. Environment variables override `.env` values
3. Unset variables use built-in defaults

This means you can temporarily override any setting:

```bash
LLM_MODEL=gpt-4o RETRIEVER_MODE=multi_query python main.py
```

## Paths

Paths are computed automatically from `config.py`:

| Property | Default | Description |
|----------|---------|-------------|
| `base_dir` | Project root | Base directory |
| `data_dir` | `{base_dir}/data` | Data directory |
| `storage_dir` | `{base_dir}/storage` | Index persistence |
| `skills_dir` | `{data_dir}/skills` | Skill documents |
