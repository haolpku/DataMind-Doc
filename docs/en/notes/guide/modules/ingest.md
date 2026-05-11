---
title: Ingest
icon: carbon:cloud-upload
permalink: /en/guide/modules/ingest/
createTime: 2026/05/11 17:00:00
---

# Ingest

Lets the agent **write to KB / DB / Graph during a conversation**. Turns DataMind from a read-only retrieval agent into a working assistant.

## Four tools

| Tool | What it does |
|---|---|
| `kb_add_file` | Single file → chunk → embed → upsert to Chroma, immediately searchable via `kb_search` |
| `kb_add_path` | Recursively walks a directory (or accepts a single file) for batch ingest |
| `db_import_csv` | CSV → infer schema → CREATE TABLE → INSERT, with `append` / `replace` / `fail` modes |
| `graph_add_triples_from_text` | Free-form text → LLM extracts (subject, relation, object) → upsert to graph + persist |

All four belong to the `ingest` group. They register into the same `ToolRegistry` everything else uses, and surface under "数据导入 (ingest)" in the system-prompt grouping.

## How to use it

### 1. Conversational (recommended)

```
you   → "add /Users/foo/policy.md to the KB"
agent → calls kb_add_file(path="/Users/foo/policy.md")
        ✓ 1 chunk added, retrievable now

you   → "import /Users/foo/sales-q2.csv as table sales_q2"
agent → calls db_import_csv(path=..., table="sales_q2", if_exists="append")
        ✓ 18 rows inserted, queryable now

you   → "陈诚 was promoted to Tech Lead, reports to Ann, owns Project Kepler"
agent → calls graph_add_triples_from_text(text="...")
        ✓ extracted 3 triples and upserted them
```

### 2. Browser drag-and-drop

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Above the input there's a "📎 drop files here" zone:

1. Drop any `.md` / `.txt` / `.csv` file
2. Backend `POST /api/upload` saves it to `data/profiles/<profile>/uploads/<filename>`
3. The file appears in the list below the dropzone with an **导入** button
4. Clicking it builds a prompt based on extension (`.csv` → "import as table", `.md/.txt` → "add to KB") and sends it to the agent
5. Agent picks the right ingest tool autonomously

The backend dedups by content hash so repeated uploads of the same name don't pollute storage.

### 3. Programmatic

```python
agent = await build_agent(settings)
res = await agent.ingest.kb_add_file(path="/path/to/file.md")
res = await agent.ingest.db_import_csv(
    path="/path/to/data.csv", table="customers", if_exists="replace"
)
res = await agent.ingest.graph_add_triples_from_text(
    text="Alice leads the Search team."
)
```

Useful for batch loaders or scheduled jobs.

## Path safety

`IngestService` maintains an **allow-list** that includes by default:

- The active profile's `data_dir`
- The current working directory
- Cwd's parent (lets you keep demo data in a sibling like `~/Desktop/DataMind/demo-uploads/`)
- The system temp directory (`tempfile.gettempdir()`)
- `/tmp` and `/private/tmp` (macOS-specific aliases)

Paths are `Path.resolve()`d before the prefix check, so symlinks can't escape. Add more roots via `IngestService(..., allowed_roots=[...])` when needed.

There's also a **basename fallback**: if the user just says "add the file foo.md", the service looks under `<profile>/uploads/foo.md`. This lets the drag-drop UI work without ever showing a full path to the agent.

## De-duplication

KB chunk ids are `SHA1(text, source)`. Re-ingesting the same content yields the same id, so Chroma `upsert` is a no-op — **no duplicate storage**.

## Error handling

- During a directory ingest (`kb_add_path`), one bad file doesn't abort the rest
- CSV import errors (illegal table name, empty file, SQL error) raise `CapabilityError("ingest", ...)` with a friendly message, surfaced to the user via the agent
- Triple extraction failures (empty result, malformed JSON) return `{"triples_added": 0, "raw_response": "..."}` instead of throwing

## Plays well with others

```
you:   import /tmp/customers.csv as table customers
agent: db_import_csv → ✓ table created

you:   what's the total ARR for Enterprise-tier customers?
agent: db_query_nl → db_query_sql → returns numbers

you:   who's the CSM owning the 鼎元金融 account?
agent: db_query_sql → "Leo"
agent: graph_search_entities("Leo") → "in Operations dept"
```

Data ingested mid-conversation is exposed by the same `ToolRegistry` to every subsequent turn — **zero seam**.

## See also

- [Install §7a — Conversational ingest](../basicinfo/install/)
- [Demo §7 — Ingest demo](../basicinfo/demo/)
- [Architecture overview](../basicinfo/architecture/)
