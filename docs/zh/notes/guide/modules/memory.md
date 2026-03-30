---
title: Memory 对话记忆
icon: carbon:ai-status-in-progress
permalink: /zh/guide/modules/memory/
createTime: 2026/03/30 23:42:51
---

# Memory — 对话记忆

Memory 模块提供对话记忆能力，让 Agent 能理解多轮对话的上下文。

## 工作原理

```
用户消息 → 存入短期记忆 (FIFO 队列)
                  │
                  ▼
         短期记忆满了？ ──是──→ 溢出的消息 → 长期记忆
                  │                              │
                  否                              ▼
                  │                     LLM 提取关键信息
                  │                     存为 MemoryBlock
                  ▼
          Agent 读取记忆:
          短期记忆(完整消息) + 长期记忆(关键信息摘要)
          一起作为上下文传给 LLM
```

## 短期记忆

- **FIFO（先进先出）消息队列**
- 存储最近的 `ChatMessage` 对象
- 有 token 上限，超出后最旧的消息被移出
- 默认占总 token 预算的 70%（`CHAT_HISTORY_TOKEN_RATIO = 0.7`）

## 长期记忆

- 当短期记忆溢出时自动触发
- 溢出的消息被 `MemoryBlock` 处理
- LLM 从旧消息中提取关键信息（事实、偏好、重要细节）
- 提取的信息以摘要形式长期保存

## 配置参数

在 `.env` 中调整：

```bash
MEMORY_TOKEN_LIMIT=30000           # 短期+长期记忆的总 token 上限
CHAT_HISTORY_TOKEN_RATIO=0.7       # 短期记忆占比 (0.7 = 70%)
```

- `MEMORY_TOKEN_LIMIT=30000` ≈ ~15000 个中文字的对话历史
- 调高比例 → 记住更多最近对话，但长期记忆减少
- 调低比例 → 短期记忆更少，但能记住更多历史关键信息

## 多 Session 支持

```python
from core.session import SessionManager

session_mgr = SessionManager()
memory_user_a = session_mgr.get_memory("user_a")
memory_user_b = session_mgr.get_memory("user_b")
```

## 生命周期

当前版本的 Memory **不会跨 session 持久化**。每次重启程序记忆重新开始。如需跨 session 的持久化记忆，可以集成 Mem0 或 Zep。
