---
title: 数据格式
icon: carbon:document
permalink: /zh/guide/advanced/data-format/
createTime: 2026/03/30 23:44:03
---

# 数据格式参考

本页详细说明 DataMind 各模块接受的数据格式，面向数据处理流水线的开发者。

## Data Profile 机制

DataMind 支持多套知识库共存，每套称为一个 profile。通过 `DATA_PROFILE` 环境变量切换。每个 profile 的数据和索引完全隔离。

### 目录结构

```
data/
├── profiles/                    ← 知识库（按 profile 隔离）
│   ├── default/
│   │   ├── chunks/*.jsonl       ← RAG 预分块数据
│   │   ├── triplets/*.jsonl     ← GraphRAG 三元组
│   │   ├── tables/*.sql         ← Database SQL 文件
│   │   ├── images/              ← 多模态图片
│   │   └── *.txt / *.md / ...   ← 原始文档
│   └── {自定义profile}/
├── bench/                       ← 问题集（跨 profile 共享）
├── skills/                      ← 技能文档（跨 profile 共享）
└── bench_raw/                   ← 原始下载缓存

storage/
├── default/                     ← default 的索引
│   ├── chroma.sqlite3
│   ├── demo.db
│   └── graph/
└── {profile}/
```

## 整体数据流

```
上游数据处理流水线
    │
    ├── 非结构化文档 ──→ profiles/{profile}/ ───→ RAG 方式A + GraphRAG 方式A
    ├── 预分块数据 ───→ profiles/{profile}/chunks/*.jsonl → RAG 方式B
    ├── 预构建三元组 ─→ profiles/{profile}/triplets/*.jsonl → GraphRAG 方式B
    ├── SQL 建表脚本 ─→ profiles/{profile}/tables/*.sql → Database
    ├── 技能/SOP 文档 → data/skills/*.md → Skills
    └── 结构化数据 ──→ SQLite 文件 → Database
```

四个模块的数据相互独立，可以只准备其中一个或多个。

## RAG Chunks (JSONL)

位置：`data/profiles/{profile}/chunks/*.jsonl`

完整字段表（含多模态）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | chunk 文本（image 模态时可为空） |
| `metadata` | object | 否 | 任意键值对 |
| `image_path` | string | 否 | 图片相对路径 |
| `image_description` | string | 否 | VLM 图片描述 |
| `modality` | string | 否 | text / image / text_image |

metadata 不参与相似度计算，但会传给 LLM 作为上下文。

## GraphRAG 三元组 (JSONL)

位置：`data/profiles/{profile}/triplets/*.jsonl`

```jsonl
{"subject": "张三", "relation": "就职于", "object": "ABC公司"}
{"subject": "张三", "relation": "就职于", "object": "ABC公司", "subject_type": "Person", "object_type": "Organization", "confidence": 0.95, "source": "doc1.md"}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subject` | string | 是 | 主体实体 |
| `relation` | string | 是 | 关系类型 |
| `object` | string | 是 | 客体实体 |
| `subject_type` | string | 否 | 主体类型（如 `"Person"`），默认 `"entity"` |
| `object_type` | string | 否 | 客体类型（如 `"Organization"`），默认 `"entity"` |
| `subject_properties` | object | 否 | 主体附加属性（多模态预留，如 `{"image": "img/a.png"}`） |
| `object_properties` | object | 否 | 客体附加属性（多模态预留） |
| `confidence` | float | 否 | 置信度（默认 `1.0`） |
| `source` | string | 否 | 来源标识 |

## Database SQL

位置：`data/profiles/{profile}/tables/*.sql`

SQL 文件按文件名排序依次执行。示例 `01_schema.sql` 和 `02_data.sql`。

也可直接提供 SQLite：`storage/{profile}/demo.db`

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

## 一键导入脚本模板

以下完整脚本模板来自项目 `docs/data.md`，上游 pipeline 可直接参考或复制：

```python
"""
数据预处理输出脚本
将处理好的数据写入 DataMind 的 data/ 和 storage/ 目录
"""

import os
import json
import sqlite3

DATAMIND_ROOT = "/path/to/DataMind"
PROFILE = "default"  # 目标 profile 名称
DATA_DIR = os.path.join(DATAMIND_ROOT, "data", "profiles", PROFILE)
STORAGE_DIR = os.path.join(DATAMIND_ROOT, "storage", PROFILE)


def export_rag_documents(documents: list[dict]):
    """
    方式 A: 导出 RAG 原始文档（系统自动分块 + Embedding）

    Args:
        documents: [{"title": "文档标题", "content": "文档内容", "category": "分类"}]
    """
    for doc in documents:
        category_dir = os.path.join(DATA_DIR, doc.get("category", ""))
        os.makedirs(category_dir, exist_ok=True)
        filepath = os.path.join(category_dir, f"{doc['title']}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(doc["content"])
    print(f"[Export] RAG: 已导出 {len(documents)} 个文档到 {DATA_DIR}")


def export_rag_chunks(chunks: list[dict], filename: str = "chunks.jsonl"):
    """
    方式 B: 导出 RAG 预分块数据（系统只做 Embedding，跳过分块）

    Args:
        chunks: [{"text": "chunk文本", "metadata": {"source": "来源", ...}}]
        filename: 输出文件名
    """
    chunks_dir = os.path.join(DATA_DIR, "chunks")
    os.makedirs(chunks_dir, exist_ok=True)
    filepath = os.path.join(chunks_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    print(f"[Export] RAG Chunks: 已导出 {len(chunks)} 个预分块到 {filepath}")


def export_graph_triplets(triplets: list[dict]):
    """
    导出 GraphRAG 三元组

    Args:
        triplets: [{"subject": "实体A", "relation": "关系", "object": "实体B"}]
    """
    triplet_dir = os.path.join(DATA_DIR, "triplets")
    os.makedirs(triplet_dir, exist_ok=True)
    filepath = os.path.join(triplet_dir, "knowledge_graph.jsonl")
    with open(filepath, "w", encoding="utf-8") as f:
        for t in triplets:
            f.write(json.dumps(t, ensure_ascii=False) + "\n")
    print(f"[Export] GraphRAG: 已导出 {len(triplets)} 条三元组")


def export_skill_documents(skills: list[dict]):
    """
    导出 Skills 技能知识文档

    Args:
        skills: [{"title": "技能标题", "content": "Markdown 内容"}]
    """
    skills_dir = os.path.join(DATAMIND_ROOT, "data", "skills")
    os.makedirs(skills_dir, exist_ok=True)
    for skill in skills:
        filepath = os.path.join(skills_dir, f"{skill['title']}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(skill["content"])
    print(f"[Export] Skills: 已导出 {len(skills)} 个技能文档到 {skills_dir}")


def export_database_tables(tables: dict):
    """
    导出 Database 表数据

    Args:
        tables: {
            "table_name": {
                "columns": {"col1": "TEXT", "col2": "INTEGER", ...},
                "rows": [{"col1": "val1", "col2": 123}, ...]
            }
        }
    """
    os.makedirs(STORAGE_DIR, exist_ok=True)
    db_path = os.path.join(STORAGE_DIR, "demo.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for table_name, table_data in tables.items():
        columns = table_data["columns"]
        col_defs = ", ".join(f"{name} {dtype}" for name, dtype in columns.items())
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {table_name} ({col_defs})")

        if table_data["rows"]:
            col_names = list(columns.keys())
            placeholders = ", ".join(["?"] * len(col_names))
            col_str = ", ".join(col_names)
            for row in table_data["rows"]:
                values = [row.get(c) for c in col_names]
                cursor.execute(
                    f"INSERT OR REPLACE INTO {table_name} ({col_str}) VALUES ({placeholders})",
                    values,
                )

    conn.commit()
    conn.close()
    print(f"[Export] Database: 已导出 {len(tables)} 张表到 {db_path}")


# ---- 使用示例 ----
if __name__ == "__main__":
    # RAG 方式 A: 导出原始文档
    export_rag_documents([
        {"title": "产品介绍", "content": "# 产品介绍\n\n这是一个...", "category": "产品"},
        {"title": "技术架构", "content": "# 技术架构\n\n系统采用...", "category": "技术"},
    ])

    # RAG 方式 B: 导出预分块数据（与方式 A 二选一）
    export_rag_chunks([
        {"text": "LlamaIndex 是一个 Python 框架...", "metadata": {"source": "技术文档.md"}},
        {"text": "向量检索通过语义相似度匹配...", "metadata": {"source": "技术文档.md"}},
    ])

    export_graph_triplets([
        {"subject": "DataMind", "relation": "使用", "object": "LlamaIndex"},
        {"subject": "LlamaIndex", "relation": "基于", "object": "Python"},
    ])

    export_skill_documents([
        {"title": "部署流程", "content": "# 部署流程\n\n## 适用场景\n..."},
        {"title": "故障排查手册", "content": "# 故障排查手册\n\n## 排查步骤\n..."},
    ])

    export_database_tables({
        "products": {
            "columns": {"id": "INTEGER PRIMARY KEY", "name": "TEXT", "price": "REAL"},
            "rows": [
                {"id": 1, "name": "笔记本电脑", "price": 6999.0},
                {"id": 2, "name": "机械键盘", "price": 399.0},
            ],
        }
    })
```

## 数据更新策略

| 模块 | 增量更新 | 全量重建 |
|------|---------|---------|
| RAG | 往 profile 目录新增文件后点击「重建索引」 | 删除 `storage/{profile}/` 后重启 |
| GraphRAG | 当前仅支持全量重建 | 删除 `storage/{profile}/graph/` 后重启 |
| Skills | 往 `data/skills/` 新增 .md 后点击「重建索引」 | 删除 collection 后重启 |
| Database | 修改 `storage/{profile}/demo.db` 即时生效 | 删除 .db 后重启 |

**API / token 消耗说明**：

- 切换 `DATA_PROFILE` 后，索引自动使用对应 `storage/` 子目录，一般无需手动删索引。
- **RAG 方式 A**（原始文档自动分块）与 **GraphRAG 方式 A**（LLM 抽取图谱）重建会调用 LLM / Embedding，文档量大时 token 消耗较高。
- **RAG 方式 B**（预分块 JSONL）主要消耗 **Embedding** API，不涉及分块用 LLM。
- **GraphRAG 方式 B**（预构建三元组）**不消耗** LLM API token，直接写入图索引。
- **Skills** 索引构建主要消耗 **Embedding** API token。
- 建议在数据稳定后再执行重建。
