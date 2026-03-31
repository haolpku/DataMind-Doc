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

将文件直接放入 profile 目录。

```
data/profiles/default/
├── 公司手册.pdf
├── 技术文档/
│   ├── API说明.md
│   └── 架构设计.txt
└── FAQ.docx
```

系统使用 `SentenceSplitter` 自动分块（默认：512 tokens，64 overlap）。

### 支持的格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| 纯文本 | `.txt` | 最简单，推荐 UTF-8 编码 |
| Markdown | `.md` | 保留标题结构，分块效果好 |
| PDF | `.pdf` | 自动提取文字，扫描件需先 OCR |
| Word | `.docx` | 自动提取文字和表格 |
| CSV | `.csv` | 每行作为一条记录 |
| HTML | `.html` | 自动提取正文 |
| JSON | `.json` | 需要是文本内容的 JSON |
| EPUB | `.epub` | 电子书格式 |

### 最佳实践

- **文档粒度**：每个文件覆盖一个主题，大文件（>100 页 PDF）建议按章节拆分
- **格式偏好（检索效果从优到劣）**：Markdown > TXT > PDF > DOCX
- **编码**：所有文本文件统一使用 UTF-8 编码
- **命名**：文件名会作为元数据，建议用有意义的名称

### 方式 B：预分块 JSONL

每行一个 JSON 对象，文件放在 `data/profiles/{profile}/chunks/` 目录下：

```
data/profiles/default/chunks/
└── my_corpus.jsonl
```

示例：

```json
{"text": "chunk 内容...", "metadata": {"source": "公司手册.pdf"}}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | chunk 的文本内容（`image` 模态时可为空） |
| `metadata` | object | 否 | 任意键值对，随检索结果传给 LLM |
| `image_path` | string | 否 | 图片文件相对路径（相对于 profile 目录） |
| `image_description` | string | 否 | VLM 生成的图片描述（`vlm_describe` 模式使用） |
| `modality` | string | 否 | `"text"` / `"image"` / `"text_image"`（默认 `"text"`） |

**关于 metadata**：metadata 不参与向量检索的相似度计算（检索只看 text 的 embedding），但会随检索结果一起传递给 LLM 作为上下文。

**分块建议**：每个 chunk 建议 200–1000 字（中文），过长会降低检索精度，过短会丢失上下文。

## 多模态 RAG

当 `IMAGE_EMBEDDING_MODE` 不为 `disabled` 时，系统会处理 JSONL 中的 `image_path` 字段。示例：

```jsonl
{"text": "RAG 的核心原理是...", "modality": "text"}
{"text": "如图所示，系统架构包含三层...", "image_path": "images/arch.png", "modality": "text_image"}
{"text": "", "image_path": "images/chart.png", "modality": "image", "image_description": "一张柱状图展示了..."}
```

图片文件放在 profile 目录下：`data/profiles/{profile}/images/`

| 模式 | 说明 |
|------|------|
| `disabled` | 默认，忽略 `image_path`，纯文本行为 |
| `clip` | CLIP 模型做图文统一 embedding，构建 `MultiModalVectorStoreIndex` |
| `vlm_describe` | VLM API 把图片描述为文本，拼入 text 走文本 embedding |

`clip` 模式需要安装 `llama-index-embeddings-clip`，`vlm_describe` 模式需要安装 `llama-index-multi-modal-llms-openai`。

配置（在 `.env` 中）：

```bash
IMAGE_EMBEDDING_MODE=clip          # disabled / clip / vlm_describe
USE_MULTIMODAL_LLM=true            # 回答时是否传图给多模态 LLM
IMAGE_SIMILARITY_TOP_K=2           # 图片检索数量
```

### 端到端示例

项目内置了 `mm_demo` profile 用于快速验证多模态 RAG。数据位于 `data/profiles/mm_demo/`：

```
data/profiles/mm_demo/
├── chunks/
│   └── demo.jsonl          ← 文本 + 图片混合 chunks
└── images/
    ├── arch.png            ← 系统架构图
    ├── chart.png           ← 检索策略对比柱状图
    └── graph.png           ← 知识图谱可视化
```

JSONL 数据中包含三种 modality：

```jsonl
{"text": "DataMind 是一个基于 LlamaIndex 的一体化智能助手...", "modality": "text"}
{"text": "系统架构如图所示...", "image_path": "images/arch.png", "modality": "text_image"}
{"text": "", "image_path": "images/chart.png", "modality": "image", "image_description": "一张柱状图展示了不同检索策略的召回率对比..."}
```

启动：

```bash
DATA_PROFILE=mm_demo IMAGE_EMBEDDING_MODE=vlm_describe python server.py
```

验证问答：

| 问题 | 预期回答来源 |
|------|------------|
| `系统架构有哪几层？` | VLM 从 arch.png 提取，回答包含 Data Layer / Service Layer / API Gateway |
| `哪种检索策略的召回率最高？` | VLM 从 chart.png 读取柱状图数据，回答包含具体数值 |

首次启动时 VLM 会为无预填描述的图片调用 API 生成描述，之后缓存在索引中无需重复调用。

## 自动检测优先级

1. 已有索引 → 直接加载（不重新构建）
2. `profiles/{profile}/chunks/*.jsonl` 存在 → 方式 B（预分块）
3. `profiles/{profile}/` 下有文档 → 方式 A（自动分块）

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
