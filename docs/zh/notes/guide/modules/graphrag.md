---
title: GraphRAG 图谱检索
icon: carbon:chart-relationship
permalink: /zh/guide/modules/graphrag/
createTime: 2026/03/30 23:42:14
---

# GraphRAG — 知识图谱检索

GraphRAG 通过知识图谱中的实体和关系进行多跳推理，适合理解实体间的复杂关联。

## RAG vs GraphRAG

| | RAG（向量检索） | GraphRAG（图谱检索） |
|---|---|---|
| 适合的问题 | "X 是什么？" | "A 和 B 有什么关系？" |
| 检索方式 | 语义相似度匹配 | 实体关系遍历 |
| 强项 | 单跳事实查找 | 多跳推理、关系理解 |
| 数据存储 | 向量数据库 (Chroma) | 属性图 (NetworkX) |

## 数据入库

### 方式 A：自动抽取（默认）

与 RAG 共享同一个 profile 目录。LLM 自动从文档中抽取实体和关系。

**优化建议**：

- 确保文档中实体名称一致（统一用"张三"而非混用"小张"/"张经理"）
- 每个段落围绕明确的实体和关系展开
- 减少噪声文本（页眉页脚、目录、版权声明等）

### 方式 B：预构建三元组（JSONL）

将 JSONL 文件放入 `data/profiles/{profile}/triplets/`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subject` | string | 是 | 主体实体 |
| `relation` | string | 是 | 关系类型 |
| `object` | string | 是 | 客体实体 |
| `subject_type` | string | 否 | 主体类型（如 `"Person"`），默认 `"entity"` |
| `object_type` | string | 否 | 客体类型（如 `"Organization"`），默认 `"entity"` |
| `subject_properties` | object | 否 | 主体附加属性（多模态预留，如 `{"image": "img/a.png"}`） |
| `object_properties` | object | 否 | 客体附加属性（多模态预留） |
| `confidence` | float | 否 | 置信度（默认 1.0） |
| `source` | string | 否 | 来源标识 |

示例：

```json
{"subject": "实体A", "relation": "就职于", "object": "实体B"}
{"subject": "实体A", "relation": "就职于", "object": "实体B", "subject_type": "Person", "object_type": "Organization"}
```

## 自动检测优先级

1. 已有图索引 → 直接加载
2. `profiles/{profile}/triplets/*.jsonl` 存在 → 方式 B（直接导入，不经过 LLM）
3. `profiles/{profile}/` 下有文档 → 方式 A（LLM 自动抽取）

## 图谱可视化

构建完成后，图谱保存为交互式 HTML 文件：

```
storage/{profile}/graph/knowledge_graph.html
```

用浏览器打开即可查看实体和关系。

## 调整抽取参数

系统读取 profile 目录下的文档时，默认使用 `SimpleLLMPathExtractor` 自动抽取实体和关系。

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

## Web 界面

点击 **GraphRAG** 面板可以：

- 查看所有实体和关系
- 重建知识图谱
