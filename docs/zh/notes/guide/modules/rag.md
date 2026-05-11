---
title: RAG 向量检索
icon: carbon:search-locate
permalink: /zh/guide/modules/rag/
createTime: 2026/03/30 23:41:57
---

# KB（RAG）

KB 能力把文档做成可检索的 chunk。Agent 通过 `kb_search`、`kb_list_documents`、`kb_count`、`kb_reindex` 四个工具使用它。

## 流水线

```
data/profiles/<profile>/          ─────────────────
├── *.md / *.txt   ─┬─ _split_text(chunk_size, overlap) ─┐
│                   │                                     │
└── chunks/*.jsonl  ┴─ 预切分（跳过切分）                  ─┤
                                                           ▼
                             EmbeddingProvider.embed_texts([...])
                                                           │
                                                           ▼
                             VectorStore.add(ids, texts, vectors, metas)
                                    │
                                    ▼
                             storage/<profile>/chroma/
```

查询：

```
query ──► EmbeddingProvider.embed_query ──► VectorStore.query(top_k)  ┐
                                                                       │
              BM25Okapi(tokens) ──► lexical top-k  ─────────────────────┤
                                                                       ▼
                                        ReciprocalRankFusion ──► 最终 top-k
```

## 配置

```bash
DATAMIND__RETRIEVAL__STRATEGY=hybrid   # simple | multi_query | hybrid
DATAMIND__RETRIEVAL__TOP_K=5
DATAMIND__RETRIEVAL__CHUNK_SIZE=512
DATAMIND__RETRIEVAL__CHUNK_OVERLAP=64
```

| 策略 | 做什么 | 适用场景 |
|---|---|---|
| `simple` | embed → 取 top-k | 最便宜的 baseline |
| `multi_query` | LLM 重写出 N 条子查询 → 并发召回 → 合并 | 查询与文档词汇不对齐 |
| `hybrid` | BM25 + 向量用 RRF 融合 | 默认，在多数语料上都优于单策略 |

## Embedding 提供商

独立于 LLM 配置：

```bash
DATAMIND__EMBEDDING__PROVIDER=openai     # openai | openai_compatible | huggingface
DATAMIND__EMBEDDING__API_BASE=...        # 可选，不填自动回退到 LLM gateway
DATAMIND__EMBEDDING__API_KEY=...         # 可选，不填自动回退到 LLM key
DATAMIND__EMBEDDING__MODEL=text-embedding-3-small
DATAMIND__EMBEDDING__BATCH_SIZE=32
```

加一个新 provider 就是一个新文件：

```python
# datamind/capabilities/embedding/providers/voyage.py
from datamind.core.registry import embedding_registry

@embedding_registry.register("voyage")
class VoyageEmbedding:
    name = "voyage"
    dimension = 1024
    async def embed_texts(self, texts): ...
    async def embed_query(self, q): ...
```

然后在 `providers/__init__.py` 里加一行 import，切换 `DATAMIND__EMBEDDING__PROVIDER=voyage` 即可。

## 向量库

默认 `chroma`（文件型）。接其他 VS 同样方式：

```python
@vector_store_registry.register("qdrant")
class QdrantVectorStore: ...
```

## 导入文档

两种方式：

**原始 markdown / 文本** —— 把文件放在 `data/profiles/<profile>/`，按 `chunk_size` / `chunk_overlap` 切。

**预切分 JSONL** —— 放在 `data/profiles/<profile>/chunks/*.jsonl`，一行一个：

```jsonl
{"id": "1", "text": "…", "source": "doc_a.pdf", "metadata": {"page": 3}}
{"text": "…", "source": "doc_b.pdf"}
```

重建索引：

```bash
python -m datamind ingest
# 或
curl -X POST http://localhost:8000/api/kb/reindex
```

## 工具清单

| 工具 | 输入 | 返回 |
|---|---|---|
| `kb_search` | `query, top_k?, filters?` | `{results: [RetrievedChunk, …]}` |
| `kb_list_documents` | — | `{count, items: [{path, size, kind, ext}]}` |
| `kb_count` | — | `{chunks: N}` |
| `kb_reindex` | — | `{pre_chunked, raw_chunks, total_embedded}` |

## 验证

```bash
python -m datamind.scripts.hello_kb
```

期望输出见[演示指南](../basicinfo/demo.md#1-kb-rag-hello_kb)。
