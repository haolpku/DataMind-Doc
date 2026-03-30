---
title: Memory
icon: carbon:ai-status-in-progress
permalink: /en/guide/modules/memory/
createTime: 2026/03/30 23:39:35
---

# Memory — Conversation Memory

Memory gives the Agent the ability to understand multi-turn conversation context through short-term and long-term memory mechanisms.

## How It Works

```
User Message → Store in Short-term Memory (FIFO queue)
                    │
                    ▼
         Short-term full? ──Yes──→ Overflow messages → Long-term Memory
                    │                                       │
                    No                                      ▼
                    │                            LLM extracts key info
                    │                            Stored as MemoryBlock
                    ▼
            Agent reads memory:
            Short-term (full messages) + Long-term (key info summaries)
            Both sent to LLM as context
```

## Short-term Memory

- FIFO (First In, First Out) message queue
- Stores recent `ChatMessage` objects
- Has a token limit; oldest messages are evicted when exceeded
- Default: 70% of total token budget (`CHAT_HISTORY_TOKEN_RATIO = 0.7`)

## Long-term Memory

- Triggered automatically when short-term memory overflows
- Overflowed messages are processed by `MemoryBlock`
- LLM extracts key information (facts, preferences, important details)
- Extracted info is stored as summaries
- Both long-term summaries and short-term messages are sent to the LLM

## Configuration

In `.env`:

```bash
MEMORY_TOKEN_LIMIT=30000           # Total token budget (short + long)
CHAT_HISTORY_TOKEN_RATIO=0.7       # Short-term memory ratio
```

- `MEMORY_TOKEN_LIMIT=30000` ≈ ~15,000 Chinese characters of conversation history
- Higher ratio → more recent conversation retained, less long-term memory
- Lower ratio → less short-term context, more historical key information

## Multi-Session Support

```python
from core.session import SessionManager

session_mgr = SessionManager()
memory_user_a = session_mgr.get_memory("user_a")
memory_user_b = session_mgr.get_memory("user_b")
```

## Lifecycle

Memory is **not persisted across restarts** in the current version. Each program restart begins with empty memory. For cross-session persistence, consider integrating Mem0 or Zep.
