---
title: Introduction
icon: mdi:tooltip-text-outline
permalink: /en/guide/basicinfo/intro/
createTime: 2026/03/23 00:55:54
---

# Introduction

**DataMind** is an all-in-one intelligent assistant built on [LlamaIndex](https://www.llamaindex.ai/), integrating five core modules:

| Module | Description | Backend |
|--------|-------------|---------|
| **RAG** | Semantic vector retrieval | Chroma |
| **GraphRAG** | Knowledge graph retrieval | NetworkX |
| **Database** | Natural language to SQL | SQLite |
| **Skills** | Extensible tool system | FunctionTool |
| **Memory** | Conversation memory | Short-term + Long-term |

The **Agent** automatically selects the right tool based on the user's question — no manual specification needed.

## Why DataMind?

The name captures exactly what the system does: **Data** is static raw material; **Mind** brings it to life through understanding, reasoning, memory, and decision-making.

Each module maps to a cognitive capability:

- **RAG** → Perception (encoding raw text into vector representations)
- **GraphRAG** → Association (linking concepts through entity-relation networks)
- **Database** → Language (bridging natural language and formal query languages)
- **Memory** → Memory (working memory + long-term memory with automatic summarization)
- **Skills** → Skills (procedural knowledge — learned abilities the system can invoke)
- **Agent** → Executive function (autonomously deciding which capability to use)

## Two Ways to Use

- **Web UI** — Full-featured interface with real-time streaming, document management panels for RAG/GraphRAG/Database/Skills/Memory
- **Terminal CLI** — Interactive command-line mode, same functionality, suitable for headless servers

## Design Goals

1. **Modular & Extensible** — Each module is independent; add new retrieval strategies or tools without touching others
2. **Benchmark-Ready** — Built-in concurrent inference benchmarking with accuracy evaluation
3. **Data-Centric** — Profile-based data management for comparing different preprocessing strategies
4. **Zero GPU Required** — All LLM inference and embedding via remote API
