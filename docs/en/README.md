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
      tagline: Unified retrieval agent (v0.2)
      text: "KB · Graph · DB · Skills · Memory — one agent, every source."
      actions:
        -
          theme: brand
          text: Introduction
          link: /en/notes/guide/basicinfo/intro.md
        -
          theme: brand
          text: Quick Start
          link: /en/notes/guide/basicinfo/install.md
        -
          theme: alt
          text: Github →
          link: https://github.com/your-org/DataMind
  -
    type: features
    features:
      -
        title: KB (Hybrid RAG)
        icon: carbon:search-locate
        details: Chroma + BM25 fused with Reciprocal Rank Fusion. Three pluggable strategies (simple / multi_query / hybrid). Multi-profile isolation.
      -
        title: Graph
        icon: carbon:chart-relationship
        details: NetworkX knowledge graph with JSON persistence. Multi-hop traversal with optional relation filters; Neo4j plug-in ready.
      -
        title: Database (NL2SQL)
        icon: carbon:data-table
        details: SQLite and MySQL out of the box (Postgres via one provider file). Three-layer safeguard keeps read-only truly read-only.
      -
        title: Skills
        icon: carbon:tools
        details: "SDK-style .claude/skills/<name>/SKILL.md manifests for knowledge skills; safe Python code skills (calculator, unit conversion, …)."
      -
        title: Memory
        icon: carbon:ai-status-in-progress
        details: Short-term rolling window + SQLite long-term with cosine recall + live LLM fact extraction at turn boundary.
      -
        title: Agent & Server
        icon: carbon:machine-learning-model
        details: Self-written tool-use loop against any Anthropic-compatible gateway. Real SSE streaming via FastAPI. No claude CLI dependency.
---
