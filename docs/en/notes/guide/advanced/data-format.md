---
title: Data Format
icon: carbon:document
permalink: /en/guide/advanced/data-format/
createTime: 2026/03/30 23:44:03
---

# Data formats

Every capability reads from the same per-profile tree:

```
data/profiles/<profile>/
├── *.md  *.txt                  # KB raw docs
├── chunks/
│   └── *.jsonl                  # KB pre-chunked corpus
├── triplets/
│   └── *.jsonl                  # Graph triples
├── tables/
│   └── *.sql                    # DB bootstrap scripts (optional)
└── images/                      # (future) multimodal assets
```

Swap `default` for any name via `DATAMIND__DATA__PROFILE`. Indices land under `storage/<profile>/`.

## KB — `chunks/*.jsonl`

One JSON object per line:

```jsonl
{"id": "ch-1", "text": "Chunk body…", "source": "manual_v3.pdf", "metadata": {"page": 4, "section": "install"}}
{"text": "Chunk without explicit id (hash will be derived)", "source": "faq.md"}
```

Fields:

- `text` (required) — the chunk body.
- `id` (optional) — otherwise a SHA1 of `source\0text` is used.
- `source` (optional) — citation path; used in retrieval results.
- `metadata` (optional) — arbitrary JSON, preserved verbatim.

## KB — raw documents

Drop `.md` / `.txt` / `.markdown` files anywhere under the profile root. Paragraphs are split first; overly long paragraphs get hard-sliced with overlap. The original path relative to the profile is stored as `metadata.source`.

Reserved subdirectory names (not treated as raw docs): `chunks/`, `triplets/`, `tables/`, `images/`.

## Graph — `triplets/*.jsonl`

One triple per line:

```jsonl
{"subject": "Ann", "relation": "leads", "object": "Search platform"}
{"subject": "Acme", "relation": "located_in", "object": "Shanghai", "confidence": 1.0}
{"subject": "X", "relation": "related_to", "object": "Y", "properties": {"since": "2023"}}
```

Schema (Pydantic-validated):

```python
class GraphTriple(BaseModel):
    subject: str
    relation: str
    object: str
    subject_type: str = "entity"
    object_type: str = "entity"
    confidence: float = 1.0
    source: str | None = None
    properties: dict[str, Any] = {}
```

Invalid lines are skipped with a `WARNING` log; the rest still load.

## Database — `tables/*.sql` (optional)

If you want a reproducible seed, drop SQL files under `tables/`:

```sql
-- data/profiles/customer_a/tables/001_employees.sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    salary INTEGER
);
INSERT INTO employees VALUES (1, 'Ann', 'Eng', 15000);
```

These are not auto-applied by the current service — hooked in by the legacy stack only. Use `sqlite3 storage/<profile>/demo.db < data/profiles/<profile>/tables/001_employees.sql` manually, or seed via `DBService.engine` as `hello_db.py` does.

## Skills — `.claude/skills/<name>/SKILL.md`

Lives **outside** the profile tree (skills are shared across profiles). One directory per skill:

```markdown
---
name: code-review
description: Comprehensive code review guidance — process, checklist, feedback conventions. Use when the user asks about code review flow, review criteria, best practices, or how to give/receive review feedback.
keywords: [code review, 代码审查, PR, pull request]
---

# Body …
```

The frontmatter parser accepts scalar strings and bracketed string lists; you don't need PyYAML installed.

## Memory — auto-managed

You never author these files by hand. `SQLiteMemoryStore` creates `storage/<profile>/memory.db` with a `memory(id, namespace, content, metadata, embedding, created_at)` table. Deletion is by `forget(namespace, id)` or `DELETE FROM memory WHERE namespace = ?` if you know what you're doing.

## Legacy compatibility

If you already have v0.1 `data/profiles/<profile>/` populated, it works as-is — the indexer reads the exact same structure. The only new addition is `.claude/skills/` for SDK-style manifests, which the legacy stack never used.
