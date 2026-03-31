---
title: Data Format
icon: carbon:document
permalink: /en/guide/advanced/data-format/
createTime: 2026/03/30 23:44:03
---

# Data Format Reference

This page describes the data formats accepted by DataMind modules, for developers building upstream data pipelines.

## Data Profile mechanism

DataMind can host multiple knowledge bases; each one is a **profile**, selected with the `DATA_PROFILE` environment variable. Data and indexes are fully isolated per profile.

### Directory layout

```
data/
├── profiles/                    ← knowledge bases (per profile)
│   ├── default/
│   │   ├── chunks/*.jsonl       ← pre-chunked RAG data
│   │   ├── triplets/*.jsonl     ← GraphRAG triplets
│   │   ├── tables/*.sql         ← Database SQL files
│   │   ├── images/              ← multimodal images
│   │   └── *.txt / *.md / ...   ← raw documents
│   └── {custom_profile}/
├── bench/                       ← question sets (shared)
├── skills/                      ← skill docs (shared)
└── bench_raw/                   ← raw download cache

storage/
├── default/                     ← indexes for default
│   ├── chroma.sqlite3
│   ├── demo.db
│   └── graph/
└── {profile}/
```

## End-to-end data flow

```
Upstream data pipeline
    │
    ├── Unstructured docs ──→ profiles/{profile}/ ───→ RAG mode A + GraphRAG mode A
    ├── Pre-chunked data ──→ profiles/{profile}/chunks/*.jsonl → RAG mode B
    ├── Pre-built triplets ─→ profiles/{profile}/triplets/*.jsonl → GraphRAG mode B
    ├── SQL DDL/DML ───────→ profiles/{profile}/tables/*.sql → Database
    ├── Skills / SOP docs ──→ data/skills/*.md → Skills
    └── Structured data ───→ SQLite file → Database
```

The four modules are independent; you can prepare one or several.

## RAG chunks (JSONL)

Location: `data/profiles/{profile}/chunks/*.jsonl`

Full field list (including multimodal):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Chunk text (may be empty for pure `image` modality) |
| `metadata` | object | No | Arbitrary key-value pairs |
| `image_path` | string | No | Image path relative to the profile directory |
| `image_description` | string | No | VLM-generated image caption |
| `modality` | string | No | `text` / `image` / `text_image` |

`metadata` is not used in similarity scoring but is passed to the LLM as context.

## GraphRAG triplets (JSONL)

Location: `data/profiles/{profile}/triplets/*.jsonl`

```jsonl
{"subject": "Alice", "relation": "works_at", "object": "ACME Corp"}
{"subject": "Alice", "relation": "works_at", "object": "ACME Corp", "subject_type": "Person", "object_type": "Organization", "confidence": 0.95, "source": "doc1.md"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | Subject entity |
| `relation` | string | Yes | Relation type |
| `object` | string | Yes | Object entity |
| `subject_type` | string | No | Subject type (e.g. `"Person"`), default `"entity"` |
| `object_type` | string | No | Object type (e.g. `"Organization"`), default `"entity"` |
| `subject_properties` | object | No | Extra subject fields (multimodal hook, e.g. `{"image": "img/a.png"}`) |
| `object_properties` | object | No | Extra object fields (multimodal hook) |
| `confidence` | float | No | Confidence score (default `1.0`) |
| `source` | string | No | Source identifier |

## Database SQL

Location: `data/profiles/{profile}/tables/*.sql`

SQL files run in filename sort order—for example `01_schema.sql` then `02_data.sql`.

You can also ship a SQLite file directly at `storage/{profile}/demo.db`.

## Benchmark questions (JSONL)

Location: `data/bench/*.jsonl`

```jsonl
{"question": "What is the core idea of RAG?"}
{"question": "When was X born?", "reference_answer": "1982", "question_id": "q_001"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Question text |
| `reference_answer` | string | No | Ground truth for evaluation |
| `question_id` | string | No | Unique id |

## Skill documents (Markdown)

Location: `data/skills/*.md`

Standard Markdown files. Each file is indexed and retrievable via `skill_search`.

## Converting public datasets

When using datasets such as [A-RAG](https://huggingface.co/datasets/Ayanami0730/rag_test):

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

### Raw format

**chunks.json** — JSON array of `"id:text"` strings:

```json
["0:teutberga (died 11 november...", "1:##lus the little pfalzgraf..."]
```

**questions.json** — JSON array of objects with `question`, `answer`, etc.:

```json
[{"id": "xxx", "question": "When did X happen?", "answer": "1982", ...}]
```

### Convert

Write a script to convert these into DataMind JSONL: valid `{"text": "..."}` lines for chunks and `{"question": "..."}` lines for questions.

## One-shot export script template

Full template (aligned with `docs/data.md` in the project) for upstream pipelines:

```python
"""
Data export script for preprocessing pipelines.
Writes prepared data under DataMind data/ and storage/.
"""

import os
import json
import sqlite3

DATAMIND_ROOT = "/path/to/DataMind"
PROFILE = "default"  # target profile name
DATA_DIR = os.path.join(DATAMIND_ROOT, "data", "profiles", PROFILE)
STORAGE_DIR = os.path.join(DATAMIND_ROOT, "storage", PROFILE)


def export_rag_documents(documents: list[dict]):
    """
    Mode A: export raw RAG documents (app chunks + embeds automatically).

    Args:
        documents: [{"title": "...", "content": "...", "category": "..."}]
    """
    for doc in documents:
        category_dir = os.path.join(DATA_DIR, doc.get("category", ""))
        os.makedirs(category_dir, exist_ok=True)
        filepath = os.path.join(category_dir, f"{doc['title']}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(doc["content"])
    print(f"[Export] RAG: wrote {len(documents)} documents to {DATA_DIR}")


def export_rag_chunks(chunks: list[dict], filename: str = "chunks.jsonl"):
    """
    Mode B: export pre-chunked RAG JSONL (embed only, skip splitting).

    Args:
        chunks: [{"text": "...", "metadata": {"source": "...", ...}}]
        filename: output file name
    """
    chunks_dir = os.path.join(DATA_DIR, "chunks")
    os.makedirs(chunks_dir, exist_ok=True)
    filepath = os.path.join(chunks_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    print(f"[Export] RAG Chunks: wrote {len(chunks)} chunks to {filepath}")


def export_graph_triplets(triplets: list[dict]):
    """
    Export GraphRAG triplets.

    Args:
        triplets: [{"subject": "...", "relation": "...", "object": "..."}]
    """
    triplet_dir = os.path.join(DATA_DIR, "triplets")
    os.makedirs(triplet_dir, exist_ok=True)
    filepath = os.path.join(triplet_dir, "knowledge_graph.jsonl")
    with open(filepath, "w", encoding="utf-8") as f:
        for t in triplets:
            f.write(json.dumps(t, ensure_ascii=False) + "\n")
    print(f"[Export] GraphRAG: wrote {len(triplets)} triplets")


def export_skill_documents(skills: list[dict]):
    """
    Export Skills markdown documents.

    Args:
        skills: [{"title": "...", "content": "Markdown..."}]
    """
    skills_dir = os.path.join(DATAMIND_ROOT, "data", "skills")
    os.makedirs(skills_dir, exist_ok=True)
    for skill in skills:
        filepath = os.path.join(skills_dir, f"{skill['title']}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(skill["content"])
    print(f"[Export] Skills: wrote {len(skills)} files to {skills_dir}")


def export_database_tables(tables: dict):
    """
    Export Database tables into demo.db.

    Args:
        tables: {
            "table_name": {
                "columns": {"col1": "TEXT", "col2": "INTEGER", ...},
                "rows": [{"col1": "val1", "col2": 123}, ...]
            }
        }
    """
    os.makedirs(STORAGE_DIR, exist_ok=True)
    db_path = os.path.join(STORAGE_DIR, "demo.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for table_name, table_data in tables.items():
        columns = table_data["columns"]
        col_defs = ", ".join(f"{name} {dtype}" for name, dtype in columns.items())
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {table_name} ({col_defs})")

        if table_data["rows"]:
            col_names = list(columns.keys())
            placeholders = ", ".join(["?"] * len(col_names))
            col_str = ", ".join(col_names)
            for row in table_data["rows"]:
                values = [row.get(c) for c in col_names]
                cursor.execute(
                    f"INSERT OR REPLACE INTO {table_name} ({col_str}) VALUES ({placeholders})",
                    values,
                )

    conn.commit()
    conn.close()
    print(f"[Export] Database: wrote {len(tables)} tables to {db_path}")


# ---- Example ----
if __name__ == "__main__":
    export_rag_documents([
        {"title": "Product", "content": "# Product\n\n...", "category": "product"},
        {"title": "Architecture", "content": "# Architecture\n\n...", "category": "tech"},
    ])

    export_rag_chunks([
        {"text": "LlamaIndex is a Python framework...", "metadata": {"source": "doc.md"}},
        {"text": "Vector search matches by semantic similarity...", "metadata": {"source": "doc.md"}},
    ])

    export_graph_triplets([
        {"subject": "DataMind", "relation": "uses", "object": "LlamaIndex"},
        {"subject": "LlamaIndex", "relation": "built_on", "object": "Python"},
    ])

    export_skill_documents([
        {"title": "deploy_runbook", "content": "# Deploy\n\n## When\n..."},
        {"title": "troubleshooting", "content": "# Troubleshooting\n\n## Steps\n..."},
    ])

    export_database_tables({
        "products": {
            "columns": {"id": "INTEGER PRIMARY KEY", "name": "TEXT", "price": "REAL"},
            "rows": [
                {"id": 1, "name": "Laptop", "price": 6999.0},
                {"id": 2, "name": "Keyboard", "price": 399.0},
            ],
        }
    })
```

## Data refresh strategy

| Module | Incremental | Full rebuild |
|--------|-------------|--------------|
| RAG | Add files under the profile, then click **Rebuild index** | Remove `storage/{profile}/` and restart |
| GraphRAG | Full rebuild only for now | Remove `storage/{profile}/graph/` and restart |
| Skills | Add `.md` under `data/skills/`, then **Rebuild index** | Drop the skills collection and restart |
| Database | Editing `storage/{profile}/demo.db` takes effect immediately | Delete the `.db` and restart |

**API / token usage**:

- After changing `DATA_PROFILE`, indexes use that profile’s `storage/` subtree; you usually do not need to delete indexes by hand.
- **RAG mode A** (raw docs, auto chunking) and **GraphRAG mode A** (LLM extraction) call LLM / embedding APIs; large corpora can cost many tokens.
- **RAG mode B** (pre-chunked JSONL) mainly uses **embedding** APIs, not an LLM for splitting.
- **GraphRAG mode B** (pre-built triplets) uses **no** LLM API tokens—direct graph import.
- **Skills** indexing mainly uses **embedding** APIs.
- Prefer rebuilding after data stabilizes.
