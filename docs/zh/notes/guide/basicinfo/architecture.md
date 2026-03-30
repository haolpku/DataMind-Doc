---
title: 架构设计
icon: material-symbols:auto-transmission-sharp
permalink: /zh/guide/basicinfo/architecture/
createTime: 2026/03/30 23:41:34
---

# 架构设计

## 项目结构

```
DataMind/
├── config.py              # 配置中心 (Pydantic Settings, 从 .env 读取)
├── .env.example           # 环境变量模板
├── server.py              # Web 入口: FastAPI 后端 + 前端页面
├── main.py                # 终端入口: 交互式命令行
├── benchmark/             # 并发推理测评
│   ├── run.py             #   测评运行器 (并发推理 + 指标统计)
│   └── evaluate.py        #   答案评估 (EM / F1)
├── core/                  # 核心层
│   ├── bootstrap.py       #   共享初始化逻辑 (AppState)
│   └── session.py         #   Session 隔离 (SessionManager)
├── modules/               # 各功能模块
│   ├── rag/               #   RAG 向量检索
│   │   ├── indexer.py     #     文档加载 + Chroma 向量索引
│   │   └── retriever.py   #     检索策略 (Simple / MultiQuery)
│   ├── graphrag/          #   GraphRAG 知识图谱
│   │   └── graph_rag.py   #     图谱构建 + 查询
│   ├── database/          #   Database NL2SQL
│   │   └── database.py    #     SQLite 示例 + NL2SQL 引擎
│   ├── skills/            #   技能系统
│   │   ├── tools.py       #     工具型: 计算器/时间/换算等
│   │   └── knowledge.py   #     知识型: Markdown 文档检索
│   ├── memory/            #   对话记忆
│   │   └── memory.py      #     短期 + 长期记忆管理
│   └── agent/             #   Agent 智能调度
│       └── agent.py       #     整合所有工具的 FunctionAgent
├── data/                  # 数据目录
│   ├── profiles/          #   知识库 (按 DATA_PROFILE 隔离)
│   ├── bench/             #   Benchmark 问题集
│   └── skills/            #   技能文档 (跨 profile 共享)
└── storage/               # 自动生成: 索引持久化
```

## 初始化流程

`core/bootstrap.py` 定义了 `AppState` 数据类和 `initialize()` 函数：

```
initialize()
  │
  ├── 配置 LlamaSettings (LLM + Embedding)
  ├── 构建/加载 RAG 索引 (Chroma)
  ├── 构建/加载 GraphRAG 索引 (NetworkX)
  ├── 初始化 Database (SQLite + NL2SQL 引擎)
  ├── 构建/加载 Skills 索引 (Chroma)
  └── 创建 FunctionAgent (挂载所有工具)
        │
        └── AppState (持有所有组件)
```

`server.py`（Web）和 `main.py`（CLI）在启动时各调用一次 `initialize()`。

## Agent 决策流程

```
用户问题
    │
    ▼
FunctionAgent 接收问题 + 所有工具描述
    │
    ▼
LLM 决定调用哪个工具
    │
    ├── knowledge_search  → RAG 向量检索
    ├── graph_search      → GraphRAG 实体/关系遍历
    ├── database_query    → NL2SQL → 执行 SQL
    ├── skill_search      → 知识技能检索
    ├── calculator / ...  → 工具技能执行
    └── (无)              → 直接 LLM 回答
    │
    ▼
整合工具结果 → 生成最终回答
```

## Session 隔离

`core/session.py` 提供 `SessionManager`，实现按用户隔离记忆：

```python
from core.session import SessionManager

session_mgr = SessionManager()
memory_a = session_mgr.get_memory("user_a")
memory_b = session_mgr.get_memory("user_b")
```

这对并发 Benchmark 测试和多用户 Web 服务至关重要。

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | LlamaIndex | 核心编排 |
| LLM | OpenAI 兼容 API | 不需要 GPU |
| 向量数据库 | Chroma | 本地, 纯 Python |
| 知识图谱 | NetworkX | 本地, 纯 Python |
| 关系数据库 | SQLite | 零配置 |
| Agent | FunctionAgent | 自动工具选择 |
| Web 后端 | FastAPI | 异步, SSE 流式输出 |
| Web 前端 | 纯 HTML/CSS/JS | 无需 npm, 零前端依赖 |
