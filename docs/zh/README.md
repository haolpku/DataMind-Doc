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
      tagline: 一体化智能助手
      text: 数据是静态的，Mind 让它活了。
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
        title: RAG 向量检索
        icon: carbon:search-locate
        details: 基于 Chroma 的语义向量检索，支持原始文档和预分块 JSONL 两种输入方式。
      -
        title: GraphRAG 图谱检索
        icon: carbon:chart-relationship
        details: 基于 NetworkX 的知识图谱检索，支持实体关系多跳推理。
      -
        title: Database 数据库查询
        icon: carbon:data-table
        details: 自然语言转 SQL，用日常语言查询结构化数据。
      -
        title: Skills 技能扩展
        icon: carbon:tools
        details: 灵活的工具系统，任何 Python 函数都可以变成 Agent 的技能。
      -
        title: Memory 对话记忆
        icon: carbon:ai-status-in-progress
        details: 短期 + 长期对话记忆，自动摘要，支持多 Session 隔离。
      -
        title: Benchmark 性能测评
        icon: carbon:meter-alt
        details: 并发推理测评，支持 EM / F1 指标对比生成答案与标准答案。
---
