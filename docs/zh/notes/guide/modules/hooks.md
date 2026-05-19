---
title: Hooks 沙盒执行
icon: carbon:security
permalink: /zh/guide/modules/hooks/
createTime: 2026/05/13 12:00:00
---

# Hooks

DataMind 的每一次 tool 调用都要穿过一条 **hook chain**——一组按顺序执行的拦截器，每一个 hook 都可以**放行 / 拒绝 / 询问用户 / 改写参数**：

```
agent → tool_use → HookChain.pre  ──┬─ Allow      → 跑 handler
                                    ├─ Deny       → 把错误丢回 agent
                                    ├─ AskUser    → 返回 requires_confirmation
                                    └─ Rewrite    → 用新 args 跑 handler
                       handler ──→ HookChain.post → audit log + 指标
```

这是 DataMind 把**安全 / 多租户隔离 / 审计**这些横切关注点统一表达的地方，每个工具不用重复实现一遍策略。

## 四种决策

```python
from datamind.core.hooks import Allow, Deny, AskUser, Rewrite

class MyHook:
    name = "my_hook"

    async def pre_tool_use(self, ctx, tool_name, args):
        if tool_name == "db_query_sql" and "DROP" in args.get("sql", ""):
            return AskUser(
                prompt="确认 DROP——这是不可逆操作。",
                details={"sql": args["sql"]},
                confirm_args={"confirm_destructive": True},
            )
        return Allow()

    async def post_tool_use(self, ctx, tool_name, args, result, error):
        ...  # 观察结果（审计 / 指标）
```

| 决策 | 效果 |
|---|---|
| `Allow` | 工具按原参跑 |
| `Deny(reason)` | 工具被拦下，`reason` 作为错误回到 agent |
| `AskUser(prompt, details, confirm_args)` | 工具暂停；agent 把 `prompt` 给人看，下一轮带上 `confirm_args` 才放行 |
| `Rewrite(new_args)` | 工具用改写后的参数跑（强制 `read_only=True`、加 `LIMIT`、注入租户过滤……）|

`HookChain` 按注册顺序跑 hook，**第一个非 `Allow` 决策胜出**。`Rewrite` 是可组合的：第 N 个 hook 改写后的 args 是第 N+1 个 hook 的输入。

## 三个内置 hook

v0.3 自带三个生产可用的 hook，分别独立通过 `DATAMIND__HOOKS__*` 控制。

### `PathAllowlistHook`

拦截路径在 allowlist 之外的工具调用，作用于 `kb_add_file` / `kb_add_path` / `db_import_csv`。

默认 allowlist：profile data dir + cwd。扩展：

```bash
DATAMIND__HOOKS__PATH_ALLOWLIST_EXTRA='["/data/customer-a","/srv/uploads"]'
```

会先 resolve 符号链接再做前缀比较，构造的 symlink 也拦得住。

### `DestructiveSqlHook`

用 `sqlglot` 解析每次 `db_query_sql` 调用：

| SQL | 决策 |
|---|---|
| `SELECT` / `WITH` / `INSERT` / `CREATE` | `Allow` |
| `UPDATE` / `DELETE`（任意） | `AskUser` |
| `DROP TABLE` / `TRUNCATE` / `ALTER` | `AskUser` |
| `DROP DATABASE` / `DROP SCHEMA` | `Deny`（blanket） |
| 解析失败 | `Deny`（paranoid） |

agent 重新发起同一调用并带上 `confirm_destructive=True` 时，hook 返回 `Allow()`——这是人类同意流回 agent loop 的通道。

### `AuditLogHook`

把每次 tool 调用追加到 `storage/<profile>/audit.jsonl`。每条记录带 Merkle 风格的 `prev_hash` + `record_hash`，**任意篡改或删除前面的记录都会让后面所有记录的 hash 对不上**。

校验：

```python
from datamind.capabilities.hooks.audit import verify_audit_log
ok, first_bad, n = verify_audit_log("storage/customer-a/audit.jsonl")
```

参数里 key 命中 secret 模式（`api_key` / `password` / `token` / `secret` / `authorization` / `bearer` ...）的字段在写入前被替换为 `[REDACTED]`。

## 配置

```bash
# 默认三个 hook 全开。DATAMIND__HOOKS__ENABLED=false 整个 chain 关掉
# （R3 红队实验的 -hooks 控制组就这么开）
DATAMIND__HOOKS__ENABLED=true
DATAMIND__HOOKS__DESTRUCTIVE_SQL=true
DATAMIND__HOOKS__PATH_ALLOWLIST=true
DATAMIND__HOOKS__AUDIT_LOG=true
DATAMIND__HOOKS__PATH_ALLOWLIST_EXTRA='[]'
```

## 前端确认弹窗

hook 返回 `AskUser` 时，SSE 流会在 `tool_result` 之外多发一个 `hook_asks_user` 事件，浏览器 UI 监听到后弹一个 modal：

- **确认** —— 把"已确认，可以继续" + `confirm_args` 追加到下一轮 user message，agent 看到后带 confirm 重发
- **取消** —— 把"不要继续，请换一种方式回答"追加到下一轮，agent 自然换路径

两种选择都会**独立**记入 `audit.jsonl`。

## 自定义 hook

实现 `Hook` Protocol，加进 chain：

```python
from datamind.core.hooks import Hook, Allow, Deny, HookChain
from datamind.agent.options import build_agent

agent = await build_agent(settings)
agent.hooks.add(MyTenantQuotaHook(quota=1_000))
```

hook 的 bug 不会让 agent 挂掉——异常会被记日志，chain 接着跑下一个 hook。**顺序很重要**：便宜的 hook 在前，audit log 放在最后好捕获所有前序决策（包括 deny）。

## 验证

```bash
python -m datamind.scripts.hello_hooks
```

输出（节选）：

```
[hello_hooks] hooks       = ['path_allowlist', 'destructive_sql', 'audit_log']

[hello_hooks] scenario 1: kb_add_file('/etc/passwd')
  → decision = Deny

[hello_hooks] scenario 2: db_query_sql('DELETE FROM employees ...')
  → decision = AskUser
    confirm  = {'confirm_destructive': True}

[hello_hooks] scenario 3: same SQL with confirm_destructive=True
  → decision = Allow

[hello_hooks] audit chain verified: 4 record(s), no tampering detected
```
