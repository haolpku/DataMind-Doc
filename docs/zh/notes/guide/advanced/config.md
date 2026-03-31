---
title: 配置说明
icon: carbon:settings-adjust
permalink: /zh/guide/advanced/config/
createTime: 2026/03/30 23:43:41
---

# 配置说明

所有配置通过 `.env` 文件管理（也支持环境变量覆盖）。

```bash
cp .env.example .env
```

## 完整参数

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
LOCAL_EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5    # CPU 可跑, ~100MB

# ── 检索器 ──
RETRIEVER_MODE=simple          # simple / multi_query
SIMILARITY_TOP_K=3
MULTI_QUERY_COUNT=3

# ── 多模态 ──
IMAGE_EMBEDDING_MODE=disabled  # disabled / clip / vlm_describe
CLIP_MODEL=openai/clip-vit-base-patch32
VLM_MODEL=                     # 为空时复用 LLM_MODEL
USE_MULTIMODAL_LLM=false       # 回答时是否传图给多模态 LLM
IMAGE_SIMILARITY_TOP_K=2

# ── 记忆 ──
MEMORY_TOKEN_LIMIT=30000
CHAT_HISTORY_TOKEN_RATIO=0.7

# ── Data Profile ──
DATA_PROFILE=default           # 切换知识库 profile
```

## Data Profile

通过 `DATA_PROFILE` 切换不同的知识库。每个 profile 的数据和索引完全隔离：

```bash
DATA_PROFILE=default python main.py     # 默认 profile
DATA_PROFILE=2wiki python main.py       # 切换到 2wiki 数据集
```

对应的目录：

- 数据：`data/profiles/{DATA_PROFILE}/`
- 索引：`storage/{DATA_PROFILE}/`

## 多模态配置

| 配置项 | 说明 |
|--------|------|
| `IMAGE_EMBEDDING_MODE` | `disabled`（默认）/ `clip` / `vlm_describe` |
| `CLIP_MODEL` | CLIP 模型名（clip 模式使用） |
| `VLM_MODEL` | VLM 模型（vlm_describe 模式，为空时复用 LLM_MODEL） |
| `USE_MULTIMODAL_LLM` | 回答时是否把检索到的图片传给多模态 LLM |
| `IMAGE_SIMILARITY_TOP_K` | 图片检索返回数量（clip 模式） |

`clip` 模式需要安装 `llama-index-embeddings-clip`，`vlm_describe` 模式需要安装 `llama-index-multi-modal-llms-openai`。

## 工作原理

DataMind 使用 Pydantic Settings 加载配置：

1. 读取 `.env` 文件
2. 环境变量会覆盖 `.env` 中的值
3. 未设置的变量使用内置默认值

临时覆盖：

```bash
LLM_MODEL=gpt-4o RETRIEVER_MODE=multi_query python main.py
```

## 路径

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `data_dir` | `data/profiles/{DATA_PROFILE}/` | Profile 级数据目录 |
| `storage_dir` | `storage/{DATA_PROFILE}/` | 索引持久化目录 |
| `skills_dir` | `data/skills/` | 技能文档（跨 profile 共享） |
| `bench_dir` | `data/bench/` | 问题集（跨 profile 共享） |
