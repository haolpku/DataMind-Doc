---
title: 简介
icon: mdi:tooltip-text-outline
permalink: /zh/guide/basicinfo/intro/
createTime: 2026/03/23 00:55:54
---

# 简介

**DataMind** 是一个基于 [LlamaIndex](https://www.llamaindex.ai/) 构建的一体化智能助手，集成五大核心模块：

| 模块 | 功能 | 后端 |
|------|------|------|
| **RAG** | 向量语义检索，支持多模态（CLIP / VLM 文本化） | Chroma |
| **GraphRAG** | 知识图谱检索 | NetworkX |
| **Database** | 自然语言转 SQL | SQLite |
| **Skills** | 可扩展工具系统 | FunctionTool |
| **Memory** | 对话记忆 | 短期 + 长期 |

**Agent** 会根据用户问题**自动选择**最合适的工具，无需手动指定。

## 为什么叫 DataMind？

名字精确地捕捉了系统的本质：**Data** 是静态的原材料，**Mind** 通过理解、推理、记忆和决策让数据活了起来。

每个模块映射了一种认知能力：

- **RAG** → 感知（将原始文本编码为向量表示）
- **GraphRAG** → 联想（通过实体关系网络连接概念）
- **Database** → 语言（在自然语言和形式查询语言之间架桥）
- **Memory** → 记忆（工作记忆 + 长期记忆，自动摘要）
- **Skills** → 技能（可调用的程序性知识）
- **Agent** → 执行控制（自主决策使用哪个能力）

## 两种使用方式

- **Web 界面** — 全功能界面，流式对话输出，RAG/GraphRAG/Database/Skills/Memory 可视化管理面板
- **终端命令行** — 交互式对话模式，功能完全一致，适合无图形界面的服务器

## 设计目标

1. **模块化可扩展** — 各模块独立，新增检索策略或工具无需改动其他模块
2. **Benchmark 就绪** — 内置并发推理测评，支持准确率评估
3. **以数据为中心** — 基于 Profile 的数据管理，方便对比不同预处理方案
4. **零 GPU 依赖** — 所有 LLM 推理和 Embedding 通过远程 API 完成
