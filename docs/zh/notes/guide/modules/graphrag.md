---
title: GraphRAG 图谱检索
icon: carbon:chart-relationship
permalink: /zh/guide/modules/graphrag/
createTime: 2026/03/30 23:42:11
---

# GraphRAG — 知识图谱检索

GraphRAG 从文档中构建实体和关系的知识图谱，支持多跳推理查询——这是传统向量检索无法处理的场景。

## RAG vs GraphRAG

| | RAG（向量检索） | GraphRAG（图谱检索） |
|---|---|---|
| 适合的问题 | "X 是什么？" | "A 和 B 有什么关系？" |
| 检索方式 | 语义相似度匹配 | 实体关系遍历 |
| 强项 | 单跳事实查找 | 多跳推理、关系理解 |
| 数据存储 | 向量数据库 (Chroma) | 属性图 (NetworkX) |

## 数据入库

### 方式 A：LLM 自动抽取

系统读取 profile 目录下的文档，使用 `SimpleLLMPathExtractor` 自动抽取实体和关系。

```python
kg_extractor = SimpleLLMPathExtractor(max_paths_per_chunk=10)
```

如需更精确的抽取（预定义实体和关系类型）：

```python
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor

kg_extractor = SchemaLLMPathExtractor(
    possible_entities=["人物", "公司", "产品", "技术", "地点"],
    possible_relations=["开发了", "属于", "使用", "位于", "合作"],
)
```

### 方式 B：预构建三元组

将 JSONL 文件放入 `data/profiles/{profile}/triplets/`：

```json
{"subject": "实体A", "relation": "就职于", "object": "实体B"}
{"subject": "实体A", "relation": "就职于", "object": "实体B", "subject_type": "Person", "object_type": "Organization"}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subject` | string | 是 | 源实体 |
| `relation` | string | 是 | 关系标签 |
| `object` | string | 是 | 目标实体 |
| `subject_type` | string | 否 | 源实体类型 |
| `object_type` | string | 否 | 目标实体类型 |

## 可视化

构建完成后，图谱保存为交互式 HTML 文件：

```
storage/{profile}/graph/knowledge_graph.html
```

用浏览器打开即可查看实体和关系。

## Web 界面

点击 **GraphRAG** 面板可以：
- 查看所有实体和关系
- 重建知识图谱
