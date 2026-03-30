---
title: RAG
icon: carbon:search-locate
permalink: /en/guide/modules/rag/
createTime: 2026/03/30 23:38:51
---

# RAG — Vector Semantic Retrieval

RAG (Retrieval-Augmented Generation) converts documents into high-dimensional vectors, finds the most semantically similar chunks to a query via cosine similarity, and feeds them to the LLM as context.

## How It Works

```
Documents → Chunking → Embedding → Chroma Vector DB
                                         │
User Query → Embedding ──── Similarity Search
                                         │
                               Top-K Chunks → LLM → Answer
```

## Data Ingestion

Two methods are supported:

### Method A: Raw Documents

Place files directly in the profile directory. Supported formats: PDF, TXT, Markdown, DOCX, CSV, HTML, JSON, EPUB, etc.

```
data/profiles/default/
├── handbook.pdf
├── docs/
│   ├── api-guide.md
│   └── architecture.txt
└── faq.docx
```

The system uses `SentenceSplitter` to automatically chunk documents (default: 512 tokens, 64 overlap).

### Method B: Pre-chunked JSONL

Place JSONL files in the `chunks/` subdirectory:

```
data/profiles/default/chunks/
└── my_corpus.jsonl
```

Each line:

```json
{"text": "chunk content here...", "metadata": {"source": "handbook.pdf"}}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | The text content of the chunk |
| `metadata` | object | No | Key-value pairs passed to LLM as context |

`metadata` does **not** affect vector similarity search — retrieval only uses the `text` embedding. But metadata is passed alongside retrieved chunks to the LLM, so fields like `source` or `chapter` help the LLM attribute its answers.

## Retrieval Strategies

Configured via `RETRIEVER_MODE` in `.env`:

| Mode | How It Works |
|------|-------------|
| `simple` (default) | Single query → direct vector search |
| `multi_query` | LLM decomposes query into sub-queries → parallel search → merge results |

```bash
RETRIEVER_MODE=multi_query
MULTI_QUERY_COUNT=3
SIMILARITY_TOP_K=3
```

## Web UI

Click the **RAG** panel to:
- View all indexed documents
- Upload new documents
- Delete documents
- Rebuild the vector index

## Rebuild Index

```bash
rm -rf storage/default/
python main.py  # or python server.py
```
