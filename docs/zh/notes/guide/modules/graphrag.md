---
title: GraphRAG 图谱检索
icon: carbon:chart-relationship
permalink: /zh/guide/modules/graphrag/
createTime: 2026/03/30 23:42:14
---

# 知识图谱（Graph）

Graph 能力把 `(subject, relation, object)` 三元组存进 `GraphStore`，让 Agent 可遍历。

默认后端：**NetworkX**，持久化为 `storage/<profile>/graph.json`。≤ 100k 边都够用；更大就在 `graph_registry` 里注册 Neo4j 之类的后端。

## 导入三元组

两种方式：

### A. profile JSONL

把文件放到 `data/profiles/<profile>/triplets/*.jsonl`，一行一个：

```jsonl
{"subject": "Ann", "relation": "leads", "object": "Search platform"}
{"subject": "Acme", "relation": "located_in", "object": "Shanghai", "confidence": 1.0}
```

warmup 时会自动加载：

```python
await agent.warmup()
# -> 调用 graph.load_from_profile()
```

### B. `graph_upsert_triples` 工具

用户让 Agent 记住新关系时用：

```json
{
  "triples": [
    {"subject": "Ann", "relation": "manages", "object": "Bob"},
    {"subject": "Bob", "relation": "works_on", "object": "Search platform"}
  ]
}
```

## 数据模型

每个三元组产生：

- `subject` / `object` 对应两个 **节点**（`label` 默认 = id，`type` 默认 `"entity"`）
- relation 作为 **边** 的 key，携带 `weight = confidence` 和 properties

`type` 和 `relation` 都是自由字符串——定一套规范并坚持用。

## 工具清单

| 工具 | 作用 |
|---|---|
| `graph_search_entities` | 按名字精确 + 模糊匹配节点 |
| `graph_traverse` | 从 start BFS 到 `max_hops`，可传 `relation_filter` 限制走哪些边。返回按平均权重排序的路径 |
| `graph_neighbors` | 某个节点的所有入/出边（`direction` = both/out/in） |
| `graph_upsert_triples` | 写入新三元组（标注为 destructive） |

## 端到端示例

```bash
python -m datamind.scripts.hello_graph
```

种的三元组：

```
Ann      —leads→         Search platform
Bob      —member_of→     Search platform
Search   — part_of→      Acme Engineering
Acme     —located_in→    Shanghai
Shanghai —in_country→    China
```

`Ann` 出发的 3-hop 遍历返回：

```
Ann → Acme → Shanghai         [works_at | located_in]
Ann → Project Alpha           [leads]
Ann → Acme → Shanghai → China [works_at | located_in | in_country]
…
```

加上 `relation_filter=["works_at", "located_in", "in_country"]` 会只保留业务链。

## 配置

```bash
DATAMIND__GRAPH__BACKEND=networkx      # networkx | neo4j (future)
# DATAMIND__GRAPH__DSN=bolt://user:pw@host:7687
DATAMIND__GRAPH__EMBED_ENTITIES=false
```

接 Neo4j 就在 `datamind/capabilities/graph/providers/neo4j_store.py` 下新建一个类 + `@graph_registry.register("neo4j")`。`build_graph_service` 已经为 DSN-based 后端做好了路由。
