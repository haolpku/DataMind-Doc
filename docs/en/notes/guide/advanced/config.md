---
title: Configuration
icon: carbon:settings-adjust
permalink: /en/guide/advanced/config/
createTime: 2026/03/30 23:43:41
---

# Configuration

All settings are managed through the `.env` file (environment variables can override it).

```bash
cp .env.example .env
```

## Full reference

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
LOCAL_EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5    # CPU-friendly, ~100MB

# ── Retriever ──
RETRIEVER_MODE=simple          # simple / multi_query
SIMILARITY_TOP_K=3
MULTI_QUERY_COUNT=3

# ── Multimodal ──
IMAGE_EMBEDDING_MODE=disabled  # disabled / clip / vlm_describe
CLIP_MODEL=openai/clip-vit-base-patch32
VLM_MODEL=                     # empty = reuse LLM_MODEL
USE_MULTIMODAL_LLM=false       # pass retrieved images to multimodal LLM when answering
IMAGE_SIMILARITY_TOP_K=2

# ── Memory ──
MEMORY_TOKEN_LIMIT=30000
CHAT_HISTORY_TOKEN_RATIO=0.7

# ── Data Profile ──
DATA_PROFILE=default           # switch knowledge-base profile
```

## Data Profile

Use `DATA_PROFILE` to switch between knowledge bases. Data and indexes are fully isolated per profile:

```bash
DATA_PROFILE=default python main.py     # default profile
DATA_PROFILE=2wiki python main.py       # switch to 2wiki dataset
```

Corresponding paths:

- Data: `data/profiles/{DATA_PROFILE}/`
- Indexes: `storage/{DATA_PROFILE}/`

## Multimodal settings

| Variable | Description |
|----------|-------------|
| `IMAGE_EMBEDDING_MODE` | `disabled` (default) / `clip` / `vlm_describe` |
| `CLIP_MODEL` | CLIP model name (used in clip mode) |
| `VLM_MODEL` | VLM model for `vlm_describe` (empty = reuse `LLM_MODEL`) |
| `USE_MULTIMODAL_LLM` | Whether to pass retrieved images to a multimodal LLM when answering |
| `IMAGE_SIMILARITY_TOP_K` | Number of image hits to return (clip mode) |

Install `llama-index-embeddings-clip` for `clip` mode and `llama-index-multi-modal-llms-openai` for `vlm_describe` mode.

## How it works

DataMind loads configuration with Pydantic Settings:

1. Read the `.env` file
2. Environment variables override values from `.env`
3. Unset variables fall back to built-in defaults

Temporary overrides:

```bash
LLM_MODEL=gpt-4o RETRIEVER_MODE=multi_query python main.py
```

## Paths

| Property | Default | Description |
|----------|---------|-------------|
| `data_dir` | `data/profiles/{DATA_PROFILE}/` | Profile-scoped data directory |
| `storage_dir` | `storage/{DATA_PROFILE}/` | Index persistence directory |
| `skills_dir` | `data/skills/` | Skill documents (shared across profiles) |
| `bench_dir` | `data/bench/` | Question sets (shared across profiles) |
