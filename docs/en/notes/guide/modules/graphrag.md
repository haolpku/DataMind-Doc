---
title: Graph
icon: carbon:chart-relationship
permalink: /en/guide/modules/graphrag/
createTime: 2026/03/30 23:42:14
---

# Knowledge Graph

The Graph capability stores `(subject, relation, object)` triples in a `GraphStore` and lets the agent traverse them.

Default backend: **NetworkX**, persisted as a single JSON file at `storage/<profile>/graph.json`. Good for up to ~100k edges; swap for Neo4j by registering another provider.

## Ingesting triples

Two modes:

### A. From profile JSONL

Drop files under `data/profiles/<profile>/triplets/*.jsonl`, one object per line:

```jsonl
{"subject": "Ann", "relation": "leads", "object": "Search platform"}
{"subject": "Acme", "relation": "located_in", "object": "Shanghai", "confidence": 1.0}
```

Then warmup will load them automatically:

```python
await agent.warmup()
# -> calls graph.load_from_profile()
```

### B. Via the `graph_upsert_triples` tool

Useful when the user tells the agent to remember a fact:

```json
{
  "triples": [
    {"subject": "Ann", "relation": "manages", "object": "Bob"},
    {"subject": "Bob", "relation": "works_on", "object": "Search platform"}
  ]
}
```

## Data model

Each triple maps to:

- A **node** for `subject` and `object` (with `label` defaulting to the id and `type` defaulting to `"entity"`).
- An **edge** keyed by the relation, carrying `weight = confidence` and any properties.

Node `type` and edge `relation` are free strings — set a convention and stick to it.

## Tools exposed to the agent

| Tool | What it does |
|---|---|
| `graph_search_entities` | Exact + fuzzy name match against node ids/labels |
| `graph_traverse` | BFS out to `max_hops`, optionally filtered by allowed `relation_filter`. Returns paths sorted by avg edge weight. |
| `graph_neighbors` | Every in/out edge for one node (direction: `both` / `out` / `in`) |
| `graph_upsert_triples` | Add / update triples (marked destructive) |

## Example walkthrough

```bash
python -m datamind.scripts.hello_graph
```

With these seed triples:

```
Ann      —leads→        Search platform
Bob      —member_of→    Search platform
Search — part_of→       Acme Engineering
Acme     —located_in→   Shanghai
Shanghai —in_country→   China
```

3-hop traverse from `Ann` returns:

```
Ann → Acme → Shanghai        [works_at | located_in]
Ann → Project Alpha          [leads]
Ann → Acme → Shanghai → China [works_at | located_in | in_country]
…
```

Add `relation_filter=["works_at", "located_in", "in_country"]` to restrict the walk to the business chain.

## Configuration

```bash
DATAMIND__GRAPH__BACKEND=networkx          # networkx | neo4j (future)
# DATAMIND__GRAPH__DSN=bolt://user:pw@host:7687
DATAMIND__GRAPH__EMBED_ENTITIES=false
```

Adding Neo4j is a new file under `datamind/capabilities/graph/providers/neo4j_store.py` plus `@graph_registry.register("neo4j")`. `build_graph_service` already routes `backend != "networkx"` through a DSN-based constructor.
