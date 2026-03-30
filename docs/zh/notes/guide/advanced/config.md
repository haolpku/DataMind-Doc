---
title: 配置说明
icon: carbon:settings-adjust
permalink: /zh/guide/advanced/config/
createTime: 2026/03/30 23:43:41
---

# 配置说明

所有配置通过 `.env` 文件管理（也支持环境变量覆盖）。复制模板后编辑：

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

# 本地 Embedding（USE_LOCAL_EMBEDDING=true 时生效）
LOCAL_EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5    # CPU 可跑, ~100MB

# ── 检索器 ──
RETRIEVER_MODE=simple          # simple / multi_query
SIMILARITY_TOP_K=3             # 返回最相关的文档块数量
MULTI_QUERY_COUNT=3            # multi_query 模式下生成的子查询数量

# ── 记忆 ──
MEMORY_TOKEN_LIMIT=30000       # 短期+长期记忆的总 token 上限
CHAT_HISTORY_TOKEN_RATIO=0.7   # 短期记忆占比
```

## 工作原理

DataMind 使用 [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) 加载配置：

1. 读取项目根目录的 `.env` 文件
2. 环境变量会覆盖 `.env` 中的值
3. 未设置的变量使用内置默认值

因此可以临时覆盖任意配置：

```bash
LLM_MODEL=gpt-4o RETRIEVER_MODE=multi_query python main.py
```

## 路径

路径由 `config.py` 自动计算：

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `base_dir` | 项目根目录 | 基础目录 |
| `data_dir` | `{base_dir}/data` | 数据目录 |
| `storage_dir` | `{base_dir}/storage` | 索引持久化 |
| `skills_dir` | `{data_dir}/skills` | 技能文档 |
