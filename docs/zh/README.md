---
pageLayout: home
externalLinkIcon: false
config:
  -
    type: hero
    full: true
    background: tint-plate
    hero:
      name: DataMind
      tagline: 统一检索型 Agent（v0.2）
      text: "KB · Graph · DB · Skills · Memory —— 一个 Agent 打通所有数据源"
      actions:
        -
          theme: brand
          text: 简介
          link: /zh/notes/guide/basicinfo/intro.md
        -
          theme: brand
          text: 快速开始
          link: /zh/notes/guide/basicinfo/install.md
        -
          theme: alt
          text: Github →
          link: https://github.com/your-org/DataMind
  -
    type: features
    features:
      -
        title: KB（混合检索）
        icon: carbon:search-locate
        details: Chroma + BM25 用 RRF 融合，三种可插拔策略（simple / multi_query / hybrid），多 profile 隔离
      -
        title: Graph 图谱
        icon: carbon:chart-relationship
        details: NetworkX + JSON 持久化，支持多跳遍历和关系过滤；Neo4j 可直接作为 provider 插入
      -
        title: Database（NL2SQL）
        icon: carbon:data-table
        details: 内置 SQLite / MySQL（Postgres 一个文件即可接入），三层安全闸保障只读
      -
        title: Skills
        icon: carbon:tools
        details: SDK 风格 .claude/skills/<name>/SKILL.md 知识型 skill + 代码型 skill（计算器、单位换算等）
      -
        title: Memory
        icon: carbon:ai-status-in-progress
        details: 短期滚动窗口 + SQLite 长期语义记忆 + 每轮 LLM 事实抽取
      -
        title: Agent 与 Server
        icon: carbon:machine-learning-model
        details: 自写 tool-use 循环，对接任意 Anthropic 兼容网关；FastAPI 真 SSE 流式输出；不依赖 claude CLI
---
