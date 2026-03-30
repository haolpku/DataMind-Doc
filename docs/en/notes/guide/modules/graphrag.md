---
title: GraphRAG
icon: carbon:chart-relationship
permalink: /en/guide/modules/graphrag/
createTime: 2026/03/30 23:39:02
---

# GraphRAG — Knowledge Graph Retrieval

GraphRAG builds a knowledge graph of entities and relations from documents, enabling multi-hop reasoning queries that traditional vector search cannot handle.

## RAG vs GraphRAG

| | RAG (Vector) | GraphRAG (Graph) |
|---|---|---|
| Best for | "What is X?" | "How are A and B related?" |
| Retrieval | Semantic similarity | Entity-relation traversal |
| Strength | Single-hop fact lookup | Multi-hop reasoning |
| Storage | Vector DB (Chroma) | Property Graph (NetworkX) |

## Data Ingestion

### Method A: LLM Auto-extraction

The system reads documents from the profile directory and uses `SimpleLLMPathExtractor` to automatically extract entities and relations.

```python
kg_extractor = SimpleLLMPathExtractor(max_paths_per_chunk=10)
```

For more precise extraction with predefined types:

```python
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor

kg_extractor = SchemaLLMPathExtractor(
    possible_entities=["Person", "Company", "Product", "Technology"],
    possible_relations=["developed", "belongs_to", "uses", "located_in"],
)
```

### Method B: Pre-built Triplets

Place JSONL files in `data/profiles/{profile}/triplets/`:

```json
{"subject": "Entity A", "relation": "works_at", "object": "Entity B"}
{"subject": "Entity A", "relation": "works_at", "object": "Entity B", "subject_type": "Person", "object_type": "Organization"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | Source entity |
| `relation` | string | Yes | Relation label |
| `object` | string | Yes | Target entity |
| `subject_type` | string | No | Entity type for subject |
| `object_type` | string | No | Entity type for object |

## Visualization

After building, the graph is saved as an interactive HTML file:

```
storage/{profile}/graph/knowledge_graph.html
```

Open in a browser to explore entities and relations visually.

## Web UI

Click the **GraphRAG** panel to:
- View all entities and relations
- Rebuild the knowledge graph
