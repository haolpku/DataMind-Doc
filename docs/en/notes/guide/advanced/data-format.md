---
title: Data Format
icon: carbon:document
permalink: /en/guide/advanced/data-format/
createTime: 2026/03/30 23:40:34
---

# Data Format Reference

This page details all data formats accepted by DataMind modules.

## RAG Chunks (JSONL)

Location: `data/profiles/{profile}/chunks/*.jsonl`

```jsonl
{"text": "chunk content here...", "metadata": {"source": "handbook.pdf", "chapter": "Overview"}}
{"text": "another chunk..."}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text content of the chunk |
| `metadata` | object | No | Arbitrary key-value pairs |

**About metadata**: Metadata does **not** affect vector similarity search (only the `text` embedding is used for retrieval). However, metadata is passed alongside retrieved chunks to the LLM as context. For example, `{"source": "handbook.pdf", "chapter": "Overview"}` helps the LLM cite sources in its answer.

## GraphRAG Triplets (JSONL)

Location: `data/profiles/{profile}/triplets/*.jsonl`

```jsonl
{"subject": "Alice", "relation": "works_at", "object": "ACME Corp"}
{"subject": "Alice", "relation": "works_at", "object": "ACME Corp", "subject_type": "Person", "object_type": "Organization"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | Source entity |
| `relation` | string | Yes | Relation label |
| `object` | string | Yes | Target entity |
| `subject_type` | string | No | Type label for subject (default: `entity`) |
| `object_type` | string | No | Type label for object (default: `entity`) |

## Benchmark Questions (JSONL)

Location: `data/bench/*.jsonl`

```jsonl
{"question": "What is RAG?"}
{"question": "When was X born?", "reference_answer": "1982", "question_id": "q_001"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Question text |
| `reference_answer` | string | No | Ground truth for evaluation |
| `question_id` | string | No | Unique identifier |

## Skill Documents (Markdown)

Location: `data/skills/*.md`

Standard Markdown files. Each file is indexed and searchable via `skill_search`.

## Converting Public Datasets

When using datasets like [A-RAG](https://huggingface.co/datasets/Ayanami0730/rag_test):

### Download

```bash
pip install huggingface_hub
python -c "
from huggingface_hub import hf_hub_download
for f in ['chunks.json', 'questions.json']:
    hf_hub_download('Ayanami0730/rag_test', f'2wikimultihop/{f}',
                    repo_type='dataset', local_dir='data/bench_raw')
"
```

### Raw Format

**chunks.json** — JSON array of `"id:text"` strings:

```json
["0:teutberga (died 11 november...", "1:##lus the little pfalzgraf..."]
```

**questions.json** — JSON array of objects:

```json
[{"id": "xxx", "question": "When did X happen?", "answer": "1982", ...}]
```

### Convert

Write a script to convert these into the JSONL formats above. The exact conversion depends on your needs — the key is producing valid `{"text": "..."}` lines for chunks and `{"question": "..."}` lines for questions.
