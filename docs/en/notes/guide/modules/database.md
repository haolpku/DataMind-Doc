---
title: Database
icon: carbon:data-table
permalink: /en/guide/modules/database/
createTime: 2026/03/30 23:42:30
---

# Database (NL2SQL)

The DB capability lets the agent run **read-only** SQL against any SQLAlchemy-supported engine. Built-in dialects: SQLite, MySQL. Postgres / DuckDB are one file away.

## Tools exposed to the agent

| Tool | What it does |
|---|---|
| `db_list_tables` | `SHOW TABLES` equivalent — also includes views |
| `db_describe_table` | Columns (names + types + PK + nullability) + row-count estimate |
| `db_query_sql` | Execute a single SELECT; row-limited, timeout-bounded, destructive-safe |
| `db_query_nl` | LLM generates SQL from a natural-language question, then runs it |

## Three layers of safety

Even if the model hallucinates `DELETE`, the dialect will refuse it:

1. **Syntactic check** — leading verb must not be in `{INSERT, UPDATE, DELETE, REPLACE, DROP, CREATE, ALTER, TRUNCATE, RENAME, GRANT, REVOKE, ATTACH, DETACH, CALL, EXEC, BEGIN, COMMIT, ROLLBACK, SAVEPOINT, RELEASE, LOAD, COPY, KILL, LOCK, UNLOCK, PRAGMA}`.
2. **Multi-statement rejection** — `SELECT 1; DELETE …` is blocked; string literals are masked first so `SELECT ';' FROM t` is fine.
3. **Row-limit wrapping** — every statement is wrapped `SELECT * FROM (<user-sql>) LIMIT <row_limit+1>` and the result is marked `truncated=True` if the limit was hit.

Additionally, per-dialect hooks strengthen the guard:

- **SQLite**: `PRAGMA query_only = ON` at the start of each connection.
- **MySQL**: `SET SESSION TRANSACTION READ ONLY` (privilege-dependent; the safeguards above catch it when that fails).

## NL2SQL

```python
await service.query_nl("How many engineers in Shanghai?", tables=["employees"])
```

Flow:
1. `db_describe_table` is called for every table (or just the `tables=` subset).
2. A compact schema block is built: `TABLE employees (~5 rows): id INTEGER PK, name TEXT NOT NULL, …`.
3. Claude generates **one** SELECT. Code fences and trailing semicolons are stripped.
4. The SQL goes through `execute_readonly`, which re-runs the safeguards.

Observed recovery: if the model emits a column that doesn't exist, the safeguard error propagates as a tool_result, the agent reads it, calls `db_describe_table`, and re-writes the SQL.

## Configuration

```bash
DATAMIND__DB__DIALECT=sqlite              # sqlite | mysql | …
# SQLite (default): leaves DSN blank, creates storage/<profile>/demo.db
# DATAMIND__DB__DSN=

# MySQL
# DATAMIND__DB__DIALECT=mysql
# DATAMIND__DB__DSN=mysql+pymysql://user:pw@host:3306/dbname
# Install the extra once: pip install -e '.[mysql]'

# Postgres (future)
# DATAMIND__DB__DIALECT=postgres
# DATAMIND__DB__DSN=postgresql+psycopg://user:pw@host:5432/db

DATAMIND__DB__READ_ONLY=true
DATAMIND__DB__ROW_LIMIT=1000
DATAMIND__DB__QUERY_TIMEOUT_S=10.0
```

## Adding a dialect

```python
# datamind/capabilities/db/providers/postgres.py
from datamind.core.registry import db_registry
from ..base import BaseSQLDialect

@db_registry.register("postgres")
class PostgresDialect(BaseSQLDialect):
    name = "postgres"

    def build_engine(self, dsn, **kwargs):
        if not dsn or not dsn.startswith(("postgres", "postgresql")):
            raise ConfigError("invalid postgres DSN")
        return super().build_engine(dsn, **kwargs)

    def _before_query(self, conn):
        conn.execute(text("SET TRANSACTION READ ONLY"))

    def _quote_ident(self, name):
        return '"' + name.replace('"', '""') + '"'
```

Then add `from . import postgres  # noqa: F401` to `providers/__init__.py`. No other file changes.

## Verify it

```bash
python -m datamind.scripts.hello_db
```

Seeds a tiny employees + projects schema, runs SQL, NL2SQL, and verifies `DELETE` is rejected.
