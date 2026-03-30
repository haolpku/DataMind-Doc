---
title: 数据格式
icon: carbon:document
permalink: /zh/guide/advanced/data-format/
createTime: 2026/03/30 23:44:03
---

# 数据格式参考

本页详细说明 DataMind 各模块接受的数据格式。

## RAG Chunks (JSONL)

位置：`data/profiles/{profile}/chunks/*.jsonl`

```jsonl
{"text": "chunk 内容...", "metadata": {"source": "技术文档.md", "chapter": "概述"}}
{"text": "另一个 chunk..."}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | chunk 的文本内容 |
| `metadata` | object | 否 | 任意键值对 |

**关于 metadata**：metadata **不参与向量检索的相似度计算**（检索只看 `text` 的 embedding），但会随检索结果一起传递给 LLM 作为上下文。比如填了 `{"source": "技术文档.md", "chapter": "概述"}`，LLM 在生成回答时就能看到这些来源信息。对于 benchmark 场景，metadata 不影响测评结果，填一个 `source` 方便排查即可，也可以完全不填。

## GraphRAG 三元组 (JSONL)

位置：`data/profiles/{profile}/triplets/*.jsonl`

```jsonl
{"subject": "张三", "relation": "就职于", "object": "ABC公司"}
{"subject": "张三", "relation": "就职于", "object": "ABC公司", "subject_type": "Person", "object_type": "Organization"}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subject` | string | 是 | 源实体 |
| `relation` | string | 是 | 关系标签 |
| `object` | string | 是 | 目标实体 |
| `subject_type` | string | 否 | 源实体类型（默认 `entity`） |
| `object_type` | string | 否 | 目标实体类型（默认 `entity`） |

## Benchmark 问题集 (JSONL)

位置：`data/bench/*.jsonl`

```jsonl
{"question": "RAG的核心原理是什么？"}
{"question": "When was X born?", "reference_answer": "1982", "question_id": "q_001"}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question` | string | 是 | 问题文本 |
| `reference_answer` | string | 否 | 标准答案（用于评估） |
| `question_id` | string | 否 | 唯一标识 |

## 技能文档 (Markdown)

位置：`data/skills/*.md`

标准 Markdown 文件，每个文件会被索引并可通过 `skill_search` 检索。

## 转换公开数据集

使用 [A-RAG](https://huggingface.co/datasets/Ayanami0730/rag_test) 等公开数据集时：

### 下载

```bash
pip install huggingface_hub
python -c "
from huggingface_hub import hf_hub_download
for f in ['chunks.json', 'questions.json']:
    hf_hub_download('Ayanami0730/rag_test', f'2wikimultihop/{f}',
                    repo_type='dataset', local_dir='data/bench_raw')
"
```

### 原始格式

**chunks.json** — JSON 数组，每项是 `"id:text"` 格式的字符串：

```json
["0:teutberga (died 11 november...", "1:##lus the little pfalzgraf..."]
```

**questions.json** — JSON 数组，每项包含 question 和 answer：

```json
[{"id": "xxx", "question": "When did X happen?", "answer": "1982", ...}]
```

### 转换

编写脚本将上述格式转为 DataMind 的 JSONL 格式。关键是生成有效的 `{"text": "..."}` 行（chunks）和 `{"question": "..."}` 行（questions）。
