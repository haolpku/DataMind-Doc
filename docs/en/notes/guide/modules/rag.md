---
title: RAG
icon: carbon:search-locate
permalink: /en/guide/modules/rag/
createTime: 2026/03/30 23:41:57
---

# RAG — Vector Semantic Retrieval

RAG (Retrieval-Augmented Generation) converts documents into high-dimensional vectors, finds the document chunks most semantically similar to a query via cosine similarity, and passes them to the LLM as context.

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

Place files directly in the profile directory.

```
data/profiles/default/
├── company-handbook.pdf
├── docs/
│   ├── api-guide.md
│   └── architecture.txt
└── faq.docx
```

The system uses `SentenceSplitter` to chunk documents automatically (default: 512 tokens, 64 overlap).

### Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Plain text | `.txt` | Simplest; UTF-8 encoding recommended |
| Markdown | `.md` | Preserves heading structure; chunks well |
| PDF | `.pdf` | Text extracted automatically; scanned PDFs need OCR first |
| Word | `.docx` | Text and tables extracted automatically |
| CSV | `.csv` | Each row is one record |
| HTML | `.html` | Main content extracted automatically |
| JSON | `.json` | Must be JSON whose payload is text content |
| EPUB | `.epub` | E-book format |

### Best Practices

- **Document scope**: One topic per file; for very large PDFs (>100 pages), split by chapter
- **Format preference (retrieval quality, best to worst)**: Markdown > TXT > PDF > DOCX
- **Encoding**: Use UTF-8 for all text files
- **Naming**: Filenames are used as metadata; prefer meaningful names

### Method B: Pre-chunked JSONL

One JSON object per line; place files under `data/profiles/{profile}/chunks/`:

```
data/profiles/default/chunks/
└── my_corpus.jsonl
```

Example:

```json
{"text": "chunk content...", "metadata": {"source": "handbook.pdf"}}
```

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `text` | string | Yes | Text of the chunk (may be empty when `modality` is `image`) |
| `metadata` | object | No | Arbitrary key–value pairs passed to the LLM with retrieval results |
| `image_path` | string | No | Image path relative to the profile directory |
| `image_description` | string | No | VLM-generated image caption (used in `vlm_describe` mode) |
| `modality` | string | No | `"text"` / `"image"` / `"text_image"` (default `"text"`) |

**About `metadata`**: Metadata does not participate in vector similarity (retrieval uses only the embedding of `text`), but it is passed to the LLM together with retrieved chunks as context.

**Chunking guidance**: Aim for roughly 200–1000 Chinese characters per chunk; chunks that are too long hurt precision, and chunks that are too short lose context.

## Multimodal RAG

When `IMAGE_EMBEDDING_MODE` is not `disabled`, the system processes `image_path` in JSONL:

```jsonl
{"text": "The core idea of RAG is...", "modality": "text"}
{"text": "As shown in the figure, the architecture has three layers...", "image_path": "images/arch.png", "modality": "text_image"}
{"text": "", "image_path": "images/chart.png", "modality": "image", "image_description": "A bar chart showing..."}
```

Store image files under the profile directory: `data/profiles/{profile}/images/`

| Mode | Description |
|------|-------------|
| `disabled` | Default; ignores `image_path`; text-only behavior |
| `clip` | CLIP for unified image–text embeddings; builds `MultiModalVectorStoreIndex` |
| `vlm_describe` | VLM API describes the image as text, concatenated with `text` for text embedding |

`clip` requires `llama-index-embeddings-clip`; `vlm_describe` requires `llama-index-multi-modal-llms-openai`.

Configure in `.env`:

```bash
IMAGE_EMBEDDING_MODE=clip          # disabled / clip / vlm_describe
USE_MULTIMODAL_LLM=true            # Whether to pass images to a multimodal LLM at answer time
IMAGE_SIMILARITY_TOP_K=2           # Number of image hits to retrieve
```

### End-to-End Example

The project ships with an `mm_demo` profile for quick multimodal RAG verification. Data is in `data/profiles/mm_demo/`:

```
data/profiles/mm_demo/
├── chunks/
│   └── demo.jsonl          ← mixed text + image chunks
└── images/
    ├── arch.png            ← system architecture diagram
    ├── chart.png           ← retrieval strategy comparison bar chart
    └── graph.png           ← knowledge graph visualization
```

The JSONL contains all three modality types:

```jsonl
{"text": "DataMind is an all-in-one assistant built on LlamaIndex...", "modality": "text"}
{"text": "As shown in the figure, the architecture has three layers...", "image_path": "images/arch.png", "modality": "text_image"}
{"text": "", "image_path": "images/chart.png", "modality": "image", "image_description": "A bar chart comparing recall rates of different retrieval strategies..."}
```

Start it up:

```bash
DATA_PROFILE=mm_demo IMAGE_EMBEDDING_MODE=vlm_describe python server.py
```

Verify with sample questions:

| Question | Expected answer source |
|----------|----------------------|
| `系统架构有哪几层？` | VLM extracts from arch.png; answer includes Data Layer / Service Layer / API Gateway |
| `哪种检索策略的召回率最高？` | VLM reads bar chart data from chart.png; answer includes specific percentages |

On the first run, the VLM calls the API to generate descriptions for images that lack a pre-filled `image_description`. These are cached in the index so subsequent runs skip the API call.

## Auto-Detection Priority

1. If an index already exists → load it (no rebuild)
2. If `profiles/{profile}/chunks/*.jsonl` exists → Method B (pre-chunked)
3. If there are documents under `profiles/{profile}/` → Method A (auto chunking)

## Retrieval Strategies

Configured via `RETRIEVER_MODE` in `.env`:

| Mode | How It Works |
|------|-------------|
| `simple` (default) | Single query → direct vector search |
| `multi_query` | LLM decomposes into sub-queries → parallel search → dedupe and merge |

```bash
RETRIEVER_MODE=multi_query
MULTI_QUERY_COUNT=3
SIMILARITY_TOP_K=3
```

## Web UI

In the **RAG** panel you can:

- View indexed documents
- Upload new documents
- Delete documents
- Rebuild the vector index

## Rebuild Index

```bash
rm -rf storage/default/
python main.py  # or python server.py
```
