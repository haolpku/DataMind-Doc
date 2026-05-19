---
title: Hooks
icon: carbon:security
permalink: /en/guide/modules/hooks/
createTime: 2026/05/13 12:00:00
---

# Hooks

Every tool call DataMind dispatches passes through a **hook chain** —
an ordered list of interceptors that may *Allow*, *Deny*, *Ask the user*,
or *Rewrite* the call before the handler runs.

```
agent → tool_use → HookChain.pre  ──┬─ Allow      → run handler
                                    ├─ Deny       → return error to agent
                                    ├─ AskUser    → return requires_confirmation
                                    └─ Rewrite    → run handler with new args
                       handler ──→ HookChain.post → audit log + metrics
```

This is where DataMind enforces **safety, multi-tenant isolation, and
auditability** without each tool reimplementing the policy.

## The four decisions

```python
from datamind.core.hooks import Allow, Deny, AskUser, Rewrite

class MyHook:
    name = "my_hook"

    async def pre_tool_use(self, ctx, tool_name, args):
        if tool_name == "db_query_sql" and "DROP" in args.get("sql", ""):
            return AskUser(
                prompt="Confirm DROP — this is irreversible.",
                details={"sql": args["sql"]},
                confirm_args={"confirm_destructive": True},
            )
        return Allow()

    async def post_tool_use(self, ctx, tool_name, args, result, error):
        ...  # observe the outcome (audit, metrics)
```

| Decision | Effect |
|---|---|
| `Allow` | Tool runs unmodified |
| `Deny(reason)` | Tool is blocked; agent sees `reason` as error |
| `AskUser(prompt, details, confirm_args)` | Tool is held back; the agent surfaces `prompt` to the human, and the next call carrying everything in `confirm_args` is approved |
| `Rewrite(new_args)` | Tool runs with mutated arguments (force `read_only=True`, append `LIMIT`, pin a tenant filter) |

`HookChain` runs hooks in registration order. The first non-`Allow`
decision wins. `Rewrite` is composable: hook N's rewrite is visible to
hook N+1's input.

## Three built-in hooks

DataMind v0.3 ships with three production hooks. Configure each
independently via `DATAMIND__HOOKS__*`.

### `PathAllowlistHook`

Refuses filesystem paths outside the allowed roots. Active on
`kb_add_file` / `kb_add_path` / `db_import_csv`.

Default roots: profile data dir + `cwd`. Extend via:

```bash
DATAMIND__HOOKS__PATH_ALLOWLIST_EXTRA='["/data/customer-a","/srv/uploads"]'
```

Resolves symlinks before the prefix check, so traversal via crafted
links is also caught.

### `DestructiveSqlHook`

Parses every `db_query_sql` call with `sqlglot` and:

| SQL | Decision |
|---|---|
| `SELECT` / `WITH` / `INSERT` / `CREATE` | `Allow` |
| `UPDATE` / `DELETE` (any) | `AskUser` |
| `DROP TABLE` / `TRUNCATE` / `ALTER` | `AskUser` |
| `DROP DATABASE` / `DROP SCHEMA` | `Deny` (blanket) |
| Unparseable SQL | `Deny` (paranoid) |

If the agent re-issues the same call with `confirm_destructive=True`,
the hook returns `Allow()` — that's how human consent flows back into
the agent loop.

### `AuditLogHook`

Appends one record per tool call to
`storage/<profile>/audit.jsonl`. Every record carries a Merkle-style
`prev_hash` + `record_hash`, so any modification or deletion of a
prior record breaks every later record's hash.

Verify with:

```python
from datamind.capabilities.hooks.audit import verify_audit_log
ok, first_bad, n = verify_audit_log("storage/customer-a/audit.jsonl")
```

Secret-shaped fields (`api_key`, `password`, `token`, `secret`,
`authorization`, `bearer`, ...) in args are replaced with `[REDACTED]`
before logging.

## Configuration

```bash
# All three on by default. Set DATAMIND__HOOKS__ENABLED=false to
# bypass the chain entirely (useful for the -hooks control arm of
# the R3 red-team experiment).
DATAMIND__HOOKS__ENABLED=true
DATAMIND__HOOKS__DESTRUCTIVE_SQL=true
DATAMIND__HOOKS__PATH_ALLOWLIST=true
DATAMIND__HOOKS__AUDIT_LOG=true
DATAMIND__HOOKS__PATH_ALLOWLIST_EXTRA='[]'
```

## Frontend confirmation

When a hook returns `AskUser`, the SSE stream emits a
`hook_asks_user` event in addition to the regular `tool_result`. The
browser UI catches it and pops a confirmation modal:

- **Confirm** — appends "已确认，可以继续" plus the `confirm_args` to the
  next user turn so the agent re-issues the call with consent
- **Cancel** — appends "不要继续，请换一种方式回答" so the agent backs off

Both decisions are logged in `audit.jsonl` independently of the
human's choice.

## Custom hooks

Implement the `Hook` protocol and add to the chain:

```python
from datamind.core.hooks import Hook, Allow, Deny, HookChain
from datamind.agent.options import build_agent

agent = await build_agent(settings)
agent.hooks.add(MyTenantQuotaHook(quota=1_000))
```

Hook bugs do not crash the agent — failures are logged and the chain
moves on. Order matters: cheaper hooks first, audit log last so it
captures every prior decision (including denials).

## Verify it

```bash
python -m datamind.scripts.hello_hooks
```

Output (abbreviated):

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
