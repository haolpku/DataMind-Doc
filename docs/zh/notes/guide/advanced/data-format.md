---
title: 数据格式
icon: carbon:document
permalink: /zh/guide/advanced/data-format/
createTime: 2026/03/30 23:44:03
---

# 数据格式

所有能力共用同一套 profile 目录结构：

```
data/profiles/<profile>/
├── *.md  *.txt                  # KB 原始文档
├── chunks/
│   └── *.jsonl                  # KB 预切分的 chunk
├── triplets/
│   └── *.jsonl                  # 图谱三元组
├── tables/
│   └── *.sql                    # DB 种子脚本（可选）
└── images/                      # （未来）多模态素材
```

通过 `DATAMIND__DATA__PROFILE=<name>` 切换，索引会落到 `storage/<name>/` 下。

## KB — `chunks/*.jsonl`

一行一个 JSON：

```jsonl
{"id": "ch-1", "text": "chunk 内容…", "source": "manual_v3.pdf", "metadata": {"page": 4}}
{"text": "没显式 id 会自动用 hash", "source": "faq.md"}
```

字段：

- `text`（必填）—— chunk 正文
- `id`（可选）—— 不给会用 `sha1(source\0text)`
- `source`（可选）—— 来源路径，检索结果里会带
- `metadata`（可选）—— 任意 JSON，原样保留

## KB — 原始文档

把 `.md` / `.txt` / `.markdown` 放在 profile 根下任意位置即可。切分会优先沿段落，超长段落硬切（带 overlap）。相对路径会作为 `metadata.source`。

保留子目录名（不会当原始文档）：`chunks/`、`triplets/`、`tables/`、`images/`。

## Graph — `triplets/*.jsonl`

一行一个三元组：

```jsonl
{"subject": "Ann", "relation": "leads", "object": "Search platform"}
{"subject": "Acme", "relation": "located_in", "object": "Shanghai", "confidence": 1.0}
{"subject": "X", "relation": "related_to", "object": "Y", "properties": {"since": "2023"}}
```

Pydantic schema：

```python
class GraphTriple(BaseModel):
    subject: str
    relation: str
    object: str
    subject_type: str = "entity"
    object_type: str = "entity"
    confidence: float = 1.0
    source: str | None = None
    properties: dict[str, Any] = {}
```

非法行会被跳过并打 WARNING，其余正常加载。

## Database — `tables/*.sql`（可选）

如果你想让 DB 有可复现种子：

```sql
-- data/profiles/customer_a/tables/001_employees.sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    salary INTEGER
);
INSERT INTO employees VALUES (1, 'Ann', 'Eng', 15000);
```

当前的新 service 不会自动应用这些文件（legacy 才会）。手动应用：`sqlite3 storage/<profile>/demo.db < data/profiles/<profile>/tables/001_employees.sql`，或者像 `hello_db.py` 那样通过 `DBService.engine` 灌数据。

## Skills — `.claude/skills/<name>/SKILL.md`

放在 profile 树**之外**（skills 是跨 profile 共享的）。每个 skill 一个目录：

```markdown
---
name: code-review
description: 代码审查流程、审查要点、反馈规范。用户询问 code review / PR 审查时使用。
keywords: [code review, 代码审查, PR, pull request]
---

# 正文 …
```

frontmatter 解析器手写，接受标量字符串和方括号列表——不需要装 PyYAML。

## Memory —— 自动管理

你不需要手动写这些文件。`SQLiteMemoryStore` 会创建 `storage/<profile>/memory.db`，表结构 `memory(id, namespace, content, metadata, embedding, created_at)`。通过 `forget(namespace, id)` 删除，或者你懂 SQL 的话直接 `DELETE FROM memory WHERE namespace = ?`。

## v0.1 兼容

v0.1 的 `data/profiles/<profile>/` 目录原封不动可用 —— 新版 indexer 读完全相同的结构。唯一新增的只有 `.claude/skills/` 存放 SDK 风格 skill manifest，legacy 版不会碰它。
