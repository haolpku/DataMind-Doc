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
      tagline: All-in-One Intelligent Assistant
      text: "Data is static. Mind makes it alive."
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
        title: RAG
        icon: carbon:search-locate
        details: Semantic vector retrieval powered by Chroma. Supports raw documents and pre-chunked JSONL.
      -
        title: GraphRAG
        icon: carbon:chart-relationship
        details: Knowledge graph retrieval with NetworkX. Multi-hop reasoning over entities and relations.
      -
        title: Database
        icon: carbon:data-table
        details: Natural language to SQL. Query structured data with plain questions.
      -
        title: Skills
        icon: carbon:tools
        details: Extensible tool system. Any Python function becomes an Agent skill.
      -
        title: Memory
        icon: carbon:ai-status-in-progress
        details: Short-term + long-term conversation memory with automatic summarization.
      -
        title: Benchmark
        icon: carbon:meter-alt
        details: Concurrent inference benchmarking with EM / F1 evaluation against reference answers.
---
