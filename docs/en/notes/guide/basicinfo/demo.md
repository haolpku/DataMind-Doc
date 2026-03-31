---
title: Demo Guide
icon: carbon:demo
permalink: /en/guide/basicinfo/demo/
createTime: 2026/03/31 16:00:00
---

# DataMind Demo Guide

This document provides a curated set of example questions to demonstrate how DataMind's Agent **automatically dispatches** different modules to answer questions. Each question notes which module is expected to run, so you can verify the system behaves as intended.

> How to use: start the Web UI (`python server.py`) or the terminal (`python main.py`), then enter the questions below in order.

## 1. RAG knowledge base retrieval

The RAG module retrieves semantically relevant content from documents under the profile directory.

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 1.1 | `DataMind 支持哪些文档格式？` | Retrieves sample.txt; returns PDF/TXT/MD/DOCX, etc. |
| 1.2 | `这个项目使用了什么向量数据库？` | Retrieves Chroma-related description |
| 1.3 | `RAG 检索的核心原理是什么？` | Retrieves description of vectorization + cosine similarity |
| 1.4 | `LlamaIndex 提供了哪些功能？` | Retrieves data connectors, index structures, query interfaces |

## 2. Multimodal RAG retrieval

Multimodal RAG can extract information from images and use it for retrieval-based Q&A. Switch to the multimodal demo profile first:

```bash
DATA_PROFILE=mm_demo IMAGE_EMBEDDING_MODE=vlm_describe python server.py
```

The built-in `mm_demo` profile contains mixed text + image data (`data/profiles/mm_demo/`), with three images showing a system architecture diagram, a retrieval strategy comparison bar chart, and a knowledge graph visualization.

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 2.1 | `系统架构有哪几层？每层包含什么组件？` | VLM extracts architecture info from arch.png; answer includes Data Layer / Service Layer / API Gateway, etc. |
| 2.2 | `哪种检索策略的召回率最高？具体是多少？` | VLM reads bar chart data from chart.png; answer includes Hybrid 91%, etc. |
| 2.3 | `知识图谱中有哪些实体和关系？` | VLM extracts graph structure from graph.png; answer includes entity/edge counts |

> Note: On the first run in multimodal mode, the system calls a VLM API (e.g. GPT-4o) to generate text descriptions for images. Descriptions are cached in the index afterwards.

## 3. GraphRAG graph retrieval

The GraphRAG module performs multi-hop reasoning over entities and relations in the knowledge graph.

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 3.1 | `DataMind 基于什么框架？` | Graph reasoning: DataMind → based on → LlamaIndex |
| 3.2 | `DataMind 包含哪些模块？` | Graph reasoning: DataMind → contains modules → RAG/GraphRAG/NL2SQL |
| 3.3 | `RAG 向量检索使用了什么技术？` | Graph reasoning: RAG vector retrieval → uses technology → Chroma |
| 3.4 | `LlamaIndex 和 Python 是什么关系？` | Graph reasoning: LlamaIndex → is → Python framework |

## 4. Database queries

The Database module turns natural language into SQL and runs it against SQLite.

The demo database currently includes:

- **employees** table: 8 employees (张三, 李四, 王五, 赵六, 孙七, 周八, 吴九, 郑十)
- **projects** table: 4 projects (RAG智能助手, 数据分析平台, 移动端App, 品牌推广)

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 4.1 | `工程部有几个人？` | SQL: SELECT COUNT(*) ... WHERE department='工程部' → 4 |
| 4.2 | `谁的工资最高？` | SQL: ORDER BY salary DESC LIMIT 1 → 孙七 45000 |
| 4.3 | `北京的员工有哪些？` | SQL: WHERE city='北京' → 张三, 王五, 孙七, 郑十 |
| 4.4 | `预算超过 20 万的项目有哪些？` | SQL: WHERE budget > 200000 → RAG智能助手, 数据分析平台 |
| 4.5 | `RAG 智能助手项目的负责人是谁？` | SQL: JOIN employees and projects → 孙七 |
| 4.6 | `各部门的平均工资是多少？` | SQL: GROUP BY department + AVG(salary) |

## 5. Skills — knowledge skills

The Skills knowledge module retrieves procedures and best practices from Markdown files under `data/skills/`.

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 5.1 | `数据库备份的最佳策略是什么？` | Retrieves SOP; returns full + incremental backup strategy |
| 5.2 | `数据库慢查询怎么排查？` | Retrieves SOP; returns slow-query analysis steps |
| 5.3 | `代码审查应该重点关注什么？` | Retrieves review guide; correctness / quality / security / performance |
| 5.4 | `Code Review 的反馈应该怎么写？` | Retrieves review guide; MUST / SHOULD / NICE tiers |
| 5.5 | `数据库故障排查的步骤？` | Retrieves SOP troubleshooting checklist |

## 6. Skills — tool skills

Tool skills are Python functions the Agent calls automatically for precise results.

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 6.1 | `现在几点了？` | Calls get_current_time → current date and time |
| 6.2 | `计算 sqrt(144) + 3^4` | Calls calculator → 12 + 81 = 93 |
| 6.3 | `100 公里等于多少英里？` | Calls unit_convert → 62.14 miles |
| 6.4 | `25 摄氏度等于多少华氏度？` | Calls unit_convert → 77°F |

## 7. Memory — conversation memory

The Memory module lets the Agent retain conversation context. Use a short sequence of questions to verify it.

| # | Step | Expected behavior |
|---|------|---------------------|
| 7.1 | First ask: `工程部有几个人？` | Normal answer: 4 |
| 7.2 | Then ask: `他们分别是谁？` | Agent recalls the "工程部" context; returns 张三, 李四, 孙七, 吴九 |
| 7.3 | Then ask: `其中谁的工资最高？` | Agent uses context; answers: 孙七 45000 |
| 7.4 | Ask: `我刚才问了什么？` | Agent summarizes prior turns from memory |

## 8. Multi-module orchestration

These prompts may cause the Agent to **invoke multiple tools at once**, showing intelligent dispatch.

| # | Example question | Expected modules |
|---|------------------|------------------|
| 8.1 | `DataMind 用了什么技术栈？各模块分别用了什么？` | RAG + GraphRAG |
| 8.2 | `工资最高的员工负责的是哪个项目？这个项目预算多少，折合多少美元？` | Database + calculator |
| 8.3 | `数据库出了性能问题，应该怎么排查？先帮我看看当前数据库有哪些表` | Skills + Database |
| 8.4 | `今天是几号？帮我算一下如果按全量备份策略，30天前的备份应该从哪天开始保留？` | get_current_time + calculator + Skills |

## 9. Casual chat

For these, the Agent answers with the LLM directly and does not need tools.

| # | Example question | Expected behavior |
|---|------------------|-------------------|
| 9.1 | `你好！` | Greeting |
| 9.2 | `你能做什么？` | Describes capabilities |
| 9.3 | `给我讲个笑话` | Generates content directly |

## Recommended demo flow

For a full walkthrough, use this order:

1. **RAG**: ask `DataMind 支持哪些文档格式？`
2. **Multimodal RAG**: switch to `mm_demo` profile, ask `系统架构有哪几层？`
3. **GraphRAG**: ask `DataMind 包含哪些模块？`
4. **Database**: ask `谁的工资最高？`
5. **Skills**: ask `数据库备份的最佳策略是什么？`
6. **Tool**: ask `现在几点了？`
7. **Memory**: ask `工程部有几个人？` then `他们分别是谁？`
8. **Orchestration**: ask `工资最高的员工负责哪个项目？预算折合多少美元？`

> Tip: in the Web UI, open the right-hand panel to watch module status change as you ask questions.
