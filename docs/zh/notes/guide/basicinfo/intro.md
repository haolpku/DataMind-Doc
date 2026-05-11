---
title: 简介
icon: mdi:tooltip-text-outline
permalink: /zh/guide/basicinfo/intro/
createTime: 2026/03/23 00:55:54
---

# 简介

**DataMind** 是一个统一的检索型 Agent，把五种知识能力接到同一个 Claude 智能助手里：

| 能力 | 作用 | 默认后端 |
|---|---|---|
| **KB（RAG）** | 基于语义 + 词法的文档检索 | Chroma + BM25（RRF 融合） |
| **Graph** | 实体查找与多跳图谱遍历 | NetworkX（JSON 持久化） |
| **Database** | 自然语言 → SQL 查询 | SQLAlchemy（SQLite / MySQL / …） |
| **Skills** | Markdown 运维手册 + 安全代码技能（计算器、单位换算等） | `.claude/skills/<name>/SKILL.md` |
| **Memory** | 短期对话缓冲 + 长期语义记忆 | SQLite + 向量召回 |

**Agent 主循环** 自行选择工具、能从工具错误中恢复、全程流式输出。你**不用**硬编码哪类问题走哪个能力。

## v0.2 相对 v0.1 的变化

v0.1 是一个 LlamaIndex `FunctionAgent`，所有能力都硬绑在全局 `AppState` 里。v0.2 保留这五个能力，但：

- 每个能力背后是一个 `Protocol`（接口）+ `Registry`（注册表）——新增一个 DB 方言 / Embedding 提供商 / 检索策略都是**单文件改动**，核心零改动。
- Agent 主循环自己写（对接任意 Anthropic 兼容 `/v1/messages` 网关），**不依赖** `claude` CLI（避免部分环境中被第三方二进制劫持）。
- 流式是**真正的 SSE**（SDK 流 → FastAPI SSE），不是旧版的"字符切片伪流式"。
- 零全局状态；每个请求有自己的 `RequestContext`。
- **旧版未删除**——旧 `main.py` / `server.py` / `modules/` 仍可运行，可以随时对照两种实现。

## 新目录速查

```
datamind/
├── agent/              # agent loop + 系统提示 + 能力装配
├── capabilities/
│   ├── embedding/      # OpenAI 兼容 + HuggingFace
│   ├── kb/             # Chroma + simple/multi_query/hybrid 三个检索器
│   ├── graph/          # NetworkX graph store
│   ├── db/             # SQLAlchemy + SQLite/MySQL 方言 + NL2SQL
│   ├── memory/         # 短期滚动 + SQLite 长期记忆
│   └── skills/         # SKILL.md 加载器 + code skills
├── core/               # Protocol / Registry / Config / Logging / Tool 框架
├── scripts/            # 每个能力一个 hello_*.py 真实冒烟脚本
├── cli.py              # `python -m datamind ...`
└── server.py           # FastAPI + 真流式 SSE
```

每个能力都配了一个 `hello_<cap>.py`，会连真实网关跑端到端测试。详见[快速开始](./install.md)。
