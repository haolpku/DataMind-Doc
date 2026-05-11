---
title: Ingest 数据导入
icon: carbon:cloud-upload
permalink: /zh/guide/modules/ingest/
createTime: 2026/05/11 17:00:00
---

# Ingest 模块

让 agent **通过对话往 KB / DB / Graph 写数据**。这一层把 DataMind 从纯只读检索 agent 变成可读可写的工作助手。

## 4 个工具

| 工具 | 说明 |
|---|---|
| `kb_add_file` | 单文件 → chunk → embed → upsert 进 Chroma，立刻可被 `kb_search` 检索到 |
| `kb_add_path` | 目录递归扫描或单文件，批量导入 |
| `db_import_csv` | CSV → 推断 schema → CREATE TABLE → INSERT，支持 `append` / `replace` / `fail` 模式 |
| `graph_add_triples_from_text` | 自然语言 → LLM 抽取 (subject, relation, object) → upsert 进图谱，并立即持久化 |

所有工具属于 `ingest` 组，注册到 `ToolRegistry` 后会出现在 system prompt 的"数据导入"分组里。`enable={"kb","db","graph",…}` 中加上 `"ingest"`（或不传 `enable`）即可启用。

## 使用方式

### 1. 直接对话（推荐）

```
[你]   帮我把 /Users/foo/policy.md 加进知识库
[agent] 调用 kb_add_file(path="/Users/foo/policy.md")
        ✓ 1 chunk 已导入，现在可以搜索

[你]   把 /Users/foo/sales-q2.csv 导入成数据表 sales_q2
[agent] 调用 db_import_csv(path=..., table="sales_q2", if_exists="append")
        ✓ 18 行已写入，可立刻 SQL 查询

[你]   陈诚晋升 Tech Lead，向 Ann 汇报，主要负责 Project Kepler
[agent] 调用 graph_add_triples_from_text(text="...")
        ✓ 抽出 3 条 triples 并写入图谱
```

### 2. 浏览器拖拽上传

打开 [http://127.0.0.1:8000](http://127.0.0.1:8000)，输入框上方有一块"📎 拖拽文件到这里上传"的区域：

1. 拖入任意 `.md` / `.txt` / `.csv` 文件
2. 后端 `POST /api/upload` 把文件存到 `data/profiles/<profile>/uploads/<filename>`
3. 文件出现在 dropzone 下方列表，每行有「**导入**」按钮
4. 点击后前端按扩展名构造 prompt（`.csv` → "导入成数据表"，`.md/.txt` → "加进知识库"），自动发给 agent
5. agent 自主选 ingest 工具完成导入

后端会做内容 hash 去重，重复同名上传不会污染。

### 3. 直接走 service 层（程序化）

```python
agent = await build_agent(settings)
res = await agent.ingest.kb_add_file(path="/path/to/file.md")
res = await agent.ingest.db_import_csv(
    path="/path/to/data.csv", table="customers", if_exists="replace"
)
res = await agent.ingest.graph_add_triples_from_text(
    text="Alice leads the Search team."
)
```

适合在脚本 / 后台任务里批量灌数据。

## 路径安全

`IngestService` 维护一个 **allow-list**，默认包含：

- 当前 profile 的 `data_dir`
- 当前 cwd
- cwd 的父目录（让用户能用 `~/Desktop/DataMind/demo-uploads/` 这样的相邻目录）
- 系统临时目录（`tempfile.gettempdir()`）
- macOS 下的 `/tmp` 与 `/private/tmp`

所有路径会先 `Path.resolve()`，再做前缀检查，所以软链接不能绕过。需要更宽的白名单时通过 `IngestService(..., allowed_roots=[...])` 显式注入。

工具还支持 **basename fallback**：如果用户只说 "把刚上传的 foo.md 加进去"，service 会去 `<profile>/uploads/foo.md` 找。这让前端拖拽 + 自动发 prompt 的流程不需要前端记住完整路径。

## 内容去重

KB 的 chunk id 是 `_hash(text, source)` 的 SHA1。同一文件再次导入产生相同 id，Chroma `upsert` 等价 no-op，**不会重复占空间**。

## 失败处理

- 单文件批量导入时（`kb_add_path`），其中一个文件出错不会中断其他文件
- CSV 导入失败（表名非法、文件空、SQL 错）会抛 `CapabilityError("ingest", ...)`，agent 看到友好错误并向用户反馈
- LLM 抽取 triples 失败（返回空数组、JSON 格式不对）会返回 `{"triples_added": 0, "raw_response": "..."}` 而不是异常

## 跟其他能力的协作

```
你：把 /tmp/customers.csv 导入成 customers 表
agent → db_import_csv → ✓ 已建表

你：customers 表里 Enterprise 套餐客户的 ARR 加起来是多少？
agent → db_query_nl → db_query_sql → 返回结果

你：再问"鼎元金融"对应的负责人是哪位 CSM？
agent → db_query_sql → "Leo"
agent → graph_search_entities("Leo") → "属于 Operations 部门"
```

ingest 出来的数据立刻被同一个 ToolRegistry 暴露给后续问答，**完全无缝**。

## 相关文档

- [安装 §7b 对话式 ingest](../basicinfo/install/#_7a-可选-切到-claude-agent-sdk-backend)
- [Demo §7 Ingest 演示](../basicinfo/demo/#_7-ingest-demo-对话式数据导入)
- [Quick start §9.1 对话式 ingest](../basicinfo/install/)
