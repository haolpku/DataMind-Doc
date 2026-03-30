---
title: Installation
icon: material-symbols-light:download-rounded
permalink: /en/guide/basicinfo/install/
createTime: 2026/03/23 00:55:54
---

# Installation

## Prerequisites

- Python 3.10+
- [Conda](https://docs.conda.io/) (recommended) or any Python virtual environment
- An OpenAI-compatible API key (OpenAI, DeepSeek, Zhipu, etc.)

## Setup

```bash
# 1. Create and activate environment
conda create -n datamind python=3.12
conda activate datamind

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure API keys
cp .env.example .env
# Edit .env with your API key and base URL
```

## Configuration

Edit the `.env` file:

```bash
# LLM — any OpenAI-compatible API
LLM_API_BASE=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=deepseek-chat

# Embedding
EMBEDDING_API_BASE=https://api.deepseek.com/v1
EMBEDDING_API_KEY=sk-xxx
EMBEDDING_MODEL=text-embedding-3-small
```

See [Configuration](../advanced/config.md) for all available settings.

## Run

### Web UI (Recommended)

```bash
python server.py
```

Open **http://localhost:8000** in your browser.

### Terminal CLI

```bash
python main.py
```

On first run, the system automatically builds vector indexes and knowledge graphs (requires API calls). Subsequent starts load existing indexes directly.

## Compatible API Services

| Provider | api_base | Model Example |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Zhipu | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
