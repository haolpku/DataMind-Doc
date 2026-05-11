---
title: 安装
icon: material-symbols-light:download-rounded
permalink: /zh/guide/basicinfo/install/
createTime: 2026/03/23 00:55:54
---

# 安装与运行

## 1. 先决条件

- Python **3.11+**
- 一个 Anthropic 兼容的网关 URL + API key（示例使用 `http://35.220.164.252:3888`）
- 可选：MySQL / PostgreSQL 客户端库（只有当 `db` 指向这些后端时才需要）

::: tip
DataMind v0.2 **不需要** `claude` CLI 或 `claude-agent-sdk`。我们通过官方 `anthropic` Python SDK 直接对接网关——某些环境里的 `claude` 是被厂商改过的二进制，会忽略 `ANTHROPIC_API_KEY`，我们彻底绕开了这个问题。
:::

## 2. 安装

```bash
git clone https://github.com/your-org/DataMind.git
cd DataMind
python -m venv .venv && source .venv/bin/activate

# 安装 v0.2 包
pip install -e .

# 可选 extras
pip install -e '.[mysql]'        # pymysql + cryptography
pip install -e '.[huggingface]'  # sentence-transformers（本地 embedding）
pip install -e '.[dev]'          # pytest + pytest-asyncio
```

## 3. 配置

```bash
cp .env.datamind.example .env.datamind
$EDITOR .env.datamind
```

最少配置：

```bash
DATAMIND__LLM__API_BASE=http://35.220.164.252:3888
DATAMIND__LLM__API_KEY=sk-your-key-here
DATAMIND__LLM__MODEL=claude-sonnet-4-6
```

就这么多。同一个 key 也给 embedding 用——如果没单独设 `DATAMIND__EMBEDDING__*`，embedding provider 会自动回退到 LLM 凭证。

## 4. 验证网关连通

```bash
python -m datamind.scripts.hello_sdk
```

预期输出：

```
[hello_sdk] gateway = http://35.220.164.252:3888/
[hello_sdk] model   = claude-sonnet-4-6
[hello_sdk] prompt  = 'Reply with just the single word: pong'
[hello_sdk] --- stream ---
pong
[hello_sdk] OK: gateway reachable, streaming works, model replied 'pong'.
```

这一步失败的话，后面都别往下做——先把 API key / base URL 修对。

## 5. 单独跑每个能力

每个能力都配了一个独立冒烟脚本，都用临时 profile（`hello_<cap>_demo`），**不会碰你的真实数据**。

```bash
python -m datamind.scripts.hello_kb       # Chroma + hybrid 检索器
python -m datamind.scripts.hello_db       # SQLite + NL2SQL + 安全闸
python -m datamind.scripts.hello_graph    # NetworkX 多跳遍历（不需要 LLM）
python -m datamind.scripts.hello_skills   # SKILL.md 语义检索
python -m datamind.scripts.hello_memory   # 短期 + 长期 + 事实抽取
python -m datamind.scripts.hello_agent    # 完整 Agent——4 个真实中文提问
```

## 6. 启动完整 Agent

```bash
# 交互式 REPL
python -m datamind chat

# 一次性提问
python -m datamind ask "如何做好代码审查？"

# 为当前 profile 构建 / 重建 KB 向量索引
python -m datamind ingest

# 打印配置 + 已注册的所有工具
python -m datamind info
```

## 7. HTTP 服务 + 浏览器 UI

```bash
python -m uvicorn datamind.server:app --host 127.0.0.1 --port 8000
```

**在浏览器打开 [http://127.0.0.1:8000](http://127.0.0.1:8000)** 即可使用 Chat UI：流式回答、可折叠的工具调用卡片、侧边栏（配置 / 工具清单 / 图谱统计 / KB 文档 / 记忆查看器 / 一键重建索引）。

也可以直接用 API：

| 方法 + 路径 | 作用 |
|---|---|
| `GET /` | 浏览器 UI（服务 `static/app.html`） |
| `GET /api/health` | 存活 + 配置快照 |
| `GET /api/tools` | 所有已注册工具的名字、描述、JSON schema |
| `POST /api/ask` | 非流式 |
| `POST /api/chat` | **真 SSE 流** — `text` / `tool_use` / `tool_result` / `done` 事件 |
| `POST /api/kb/reindex` | 重建 KB |
| `GET /api/kb/documents` | 当前 profile 下的文档清单 |
| `GET /api/memory/{namespace}` | 查看某 namespace 的记忆 |
| `GET /api/graph/stats` | 图谱节点 / 边统计 |

快速测：

```bash
curl -s http://127.0.0.1:8000/api/health | jq
curl -s -X POST http://127.0.0.1:8000/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"message":"你好"}' | jq
```

流式：

```bash
curl -N -X POST http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"告诉我 Status meeting 的时间"}'
```

## 7a. （可选）切到 `claude-agent-sdk` backend

DataMind 自带两套 agent loop 实现，通过 `DATAMIND__AGENT__BACKEND` 一个环境变量切换：

| Backend | 路径 | 适合场景 |
|---|---|---|
| `native`（默认）| 纯 Python，`anthropic` SDK 直连网关 | 部署最简、依赖最少 |
| `sdk` | `claude-agent-sdk` → `claude` CLI → **CCR** → 你的网关 | 想白嫖 Hooks / Subagents / Compaction / Plan mode |

23 个 DataMind 工具、SSE 事件协议、前端页面**两套下完全一致**——只有内部 loop 不同。

### 为什么需要 CCR

SDK 始终说 Anthropic 协议（`/v1/messages`）。如果你的网关只支持 OpenAI 格式（`/v1/chat/completions`），中间塞一层 `claude-code-router`（CCR）就能互转——一个很小的 Node 进程，单次请求开销 ~20ms。

### 启动 CCR

```bash
# 需要 node >= 18
export UPSTREAM_BASE=http://your-gateway.example.com/v1
export UPSTREAM_KEY=sk-...
export UPSTREAM_MODEL=claude-sonnet-4-6

bash scripts/start_ccr.sh
# → 监听 http://127.0.0.1:13456
```

另起一个终端留给它跑着。

### 切 DataMind 到 SDK backend

```bash
# .env.datamind 里或直接 export：
export DATAMIND__AGENT__BACKEND=sdk
export DATAMIND__AGENT__CCR_BASE_URL=http://127.0.0.1:13456

# 其他一切照旧：
python -m datamind chat
python -m uvicorn datamind.server:app --port 8000
```

server 启动日志里能看到 backend 选择：

```
INFO agent_loop_backend backend=sdk ccr=http://127.0.0.1:13456
```

随时切回 native（`DATAMIND__AGENT__BACKEND=native` 或直接不设）。

## 8. 跑单测

```bash
pytest datamind/tests/
# 95 passed in ~0.6s — 不打网络
```

## v0.1 仍可用

如果你要对照，旧 `main.py` / `server.py` / `modules/` 原样保留。它仍然读旧的 `.env` key（`LLM_API_BASE`、`LLM_API_KEY` 等）。

## 可用网关与模型

任何 Anthropic 兼容的 `/v1/messages` 服务都能跑。在 `http://35.220.164.252:3888` 上验证过的模型：

| 模型 | 适用场景 |
|---|---|
| `claude-opus-4-7` | 复杂推理 / subagent |
| `claude-sonnet-4-6` | 主 Agent（默认） |
| `claude-haiku-4-5-20251001` | Memory 事实抽取 / 廉价子任务 |

## 常见问题

| 现象 | 处理 |
|---|---|
| `ValidationError: llm.api_key: Field required` | 在环境变量或 `.env.datamind` 里设 `DATAMIND__LLM__API_KEY` |
| `401 Invalid token` | key / 网关不匹配，先用 `curl $BASE/v1/messages` 验证 |
| `Unknown embedding provider 'openai'` | 要在仓库根目录运行，保证能 `import datamind` |
| `no such table: employees` | NL2SQL 前没种子数据，先跑 `hello_agent.py` 或手动 INSERT |
| HTTP server 返回 `Agent not ready` | lifespan 还在热身，等几秒再查 `/api/health` |
