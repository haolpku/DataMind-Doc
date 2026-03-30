---
title: RAG 向量检索
icon: carbon:search-locate
permalink: /zh/guide/modules/rag/
createTime: 2026/03/30 23:41:57
---

# RAG — 向量语义检索

RAG（Retrieval-Augmented Generation）将文档转换为高维向量，通过余弦相似度找到与查询语义最接近的文档片段，作为上下文传递给 LLM。

## 工作原理

```
文档 → 分块 → Embedding → Chroma 向量数据库
                                    │
用户问题 → Embedding ──── 相似度搜索
                                    │
                          Top-K 片段 → LLM → 回答
```

## 数据入库

支持两种方式：

### 方式 A：原始文档

将文件直接放入 profile 目录。支持格式：PDF、TXT、Markdown、DOCX、CSV、HTML、JSON、EPUB 等。

```
data/profiles/default/
├── 公司手册.pdf
├── 技术文档/
│   ├── API说明.md
│   └── 架构设计.txt
└── FAQ.docx
```

系统使用 `SentenceSplitter` 自动分块（默认：512 tokens, 64 overlap）。

### 方式 B：预分块 JSONL

将 JSONL 文件放入 `chunks/` 子目录：

```
data/profiles/default/chunks/
└── my_corpus.jsonl
```

每行格式：

```json
{"text": "chunk 内容...", "metadata": {"source": "公司手册.pdf"}}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | chunk 的文本内容 |
| `metadata` | object | 否 | 任意键值对，随检索结果传给 LLM |

**关于 metadata**：metadata **不参与向量检索的相似度计算**（检索只看 `text` 的 embedding），但会随检索结果一起传递给 LLM 作为上下文。比如填了 `{"source": "技术文档.md", "chapter": "概述"}`，LLM 在生成回答时就能看到这些来源信息。

## 检索策略

通过 `.env` 中的 `RETRIEVER_MODE` 配置：

| 模式 | 工作方式 |
|------|---------|
| `simple`（默认） | 单 query → 直接向量搜索 |
| `multi_query` | LLM 拆解子查询 → 并行搜索 → 去重合并 |

```bash
RETRIEVER_MODE=multi_query
MULTI_QUERY_COUNT=3
SIMILARITY_TOP_K=3
```

## Web 界面

点击 **RAG** 面板可以：
- 查看已索引的文档
- 上传新文档
- 删除文档
- 重建向量索引

## 重建索引

```bash
rm -rf storage/default/
python main.py  # 或 python server.py
```
