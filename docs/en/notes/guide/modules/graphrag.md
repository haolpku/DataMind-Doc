---
title: GraphRAG
icon: carbon:chart-relationship
permalink: /en/guide/modules/graphrag/
createTime: 2026/03/30 23:42:14
---

# GraphRAG — Knowledge Graph Retrieval

GraphRAG performs multi-hop reasoning over entities and relations in a knowledge graph. It is well suited to questions where understanding complex links between entities matters.

## RAG vs GraphRAG

| | RAG (Vector) | GraphRAG (Graph) |
|---|---|---|
| Best for | "What is X?" | "How are A and B related?" |
| Retrieval | Semantic similarity | Entity-relation traversal |
| Strength | Single-hop fact lookup | Multi-hop reasoning, relational understanding |
| Storage | Vector DB (Chroma) | Property Graph (NetworkX) |

## Data Ingestion

### Method A: Automatic extraction (default)

GraphRAG shares the same profile directory as RAG. An LLM extracts entities and relations from your documents.

**Tips for better extraction**:

- Keep entity names consistent in the text (e.g. always use the full name instead of mixing nicknames and titles)
- Write paragraphs around clear entities and relations
- Reduce noise (headers, footers, tables of contents, copyright notices, etc.)

### Method B: Pre-built triplets (JSONL)

Place JSONL files under `data/profiles/{profile}/triplets/`:

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `subject` | string | Yes | Subject entity |
| `relation` | string | Yes | Relation type |
| `object` | string | Yes | Object entity |
| `subject_type` | string | No | Subject type (e.g. `"Person"`); default `"entity"` |
| `object_type` | string | No | Object type (e.g. `"Organization"`); default `"entity"` |
| `subject_properties` | object | No | Extra subject attributes (reserved for multimodal, e.g. `{"image": "img/a.png"}`) |
| `object_properties` | object | No | Extra object attributes (multimodal reserved) |
| `confidence` | float | No | Confidence score (default 1.0) |
| `source` | string | No | Source identifier |

Examples:

```json
{"subject": "Entity A", "relation": "works_at", "object": "Entity B"}
{"subject": "Entity A", "relation": "works_at", "object": "Entity B", "subject_type": "Person", "object_type": "Organization"}
```

## Auto-detection priority

1. If a graph index already exists → load it directly
2. If `profiles/{profile}/triplets/*.jsonl` exists → Method B (import without LLM)
3. If there are documents under `profiles/{profile}/` → Method A (LLM extraction)

## Graph visualization

After building, the graph is saved as an interactive HTML file:

```
storage/{profile}/graph/knowledge_graph.html
```

Open it in a browser to explore entities and relations.

## Tuning extraction parameters

When reading documents from the profile directory, the default is `SimpleLLMPathExtractor` for entity and relation extraction.

```python
kg_extractor = SimpleLLMPathExtractor(max_paths_per_chunk=10)
```

For stricter extraction with predefined entity and relation types:

```python
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor

kg_extractor = SchemaLLMPathExtractor(
    possible_entities=["Person", "Company", "Product", "Technology"],
    possible_relations=["developed", "belongs_to", "uses", "located_in"],
)
```

## Web UI

In the **GraphRAG** panel you can:

- Browse all entities and relations
- Rebuild the knowledge graph
