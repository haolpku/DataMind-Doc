---
title: Database 数据库查询
icon: carbon:data-table
permalink: /zh/guide/modules/database/
createTime: 2026/03/30 23:42:30
---

# 数据库（NL2SQL）

DB 能力让 Agent **只读**访问真实 SQL 数据库。内置两个方言——**SQLite** 和 **MySQL**；Postgres / DuckDB 只需一个文件即可接入。

## 三层安全闸

哪怕模型出错生成了 `DELETE`，也会被拦掉：

1. **语法首词检查** —— 首词在 `{INSERT, UPDATE, DELETE, REPLACE, DROP, CREATE, ALTER, TRUNCATE, RENAME, GRANT, REVOKE, ATTACH, DETACH, CALL, EXEC, BEGIN, COMMIT, ROLLBACK, SAVEPOINT, RELEASE, LOAD, COPY, KILL, LOCK, UNLOCK, PRAGMA}` 中的直接拒绝。
2. **拒绝多语句** —— `SELECT 1; DELETE …` 被拒；字符串字面量会先被 mask，`SELECT ';' FROM t` 这种正常放行。
3. **行数上限包装** —— 每条 SQL 都会被包成 `SELECT * FROM (<user-sql>) LIMIT <row_limit+1>`，到上限就把 `truncated=True` 标出来。

每个方言还有额外的连接级保护：

- **SQLite**：每次连接开头 `PRAGMA query_only = ON`
- **MySQL**：`SET SESSION TRANSACTION READ ONLY`（需权限；即使失败上面三层也守着）

## 工具清单

| 工具 | 作用 |
|---|---|
| `db_list_tables` | 列出所有表 + 视图 |
| `db_describe_table` | 某表的列定义（名/类型/PK/nullability）+ 行数估计 |
| `db_query_sql` | 执行一条只读 SELECT，限行数 + 限超时 + 安全闸检查 |
| `db_query_nl` | Agent LLM 根据自然语言问题生成 SQL 后执行 |

## NL2SQL 流程

1. `db_query_nl(question, tables=None)` 请求主 LLM 输出**一条**只读 SELECT，上下文是 schema。
2. 生成的 SQL 会走和 `db_query_sql` 一样的三层安全闸。
3. 返回中同时包含生成 SQL + 结果行，Agent（和你）都能审计。

观察到的自动恢复：模型列错不存在的字段 → 安全闸报错 → Agent 读到 tool_result → 调 `db_describe_table` → 重写 SQL。

## 配置

```bash
DATAMIND__DB__DIALECT=sqlite                 # sqlite | mysql | …
# SQLite（默认）：DSN 留空，会自动用 storage/<profile>/demo.db
# DATAMIND__DB__DSN=

# MySQL
# DATAMIND__DB__DIALECT=mysql
# DATAMIND__DB__DSN=mysql+pymysql://user:pw@host:3306/dbname
# 装 extra: pip install -e '.[mysql]'

# Postgres（规划中）
# DATAMIND__DB__DIALECT=postgres
# DATAMIND__DB__DSN=postgresql+psycopg://user:pw@host:5432/db

DATAMIND__DB__READ_ONLY=true
DATAMIND__DB__ROW_LIMIT=1000
DATAMIND__DB__QUERY_TIMEOUT_S=10.0
```

## 新增方言

```python
# datamind/capabilities/db/providers/postgres.py
from sqlalchemy import text
from datamind.core.registry import db_registry
from ..base import BaseSQLDialect

@db_registry.register("postgres")
class PostgresDialect(BaseSQLDialect):
    name = "postgres"
    def build_engine(self, dsn, **kw):
        if not dsn or not dsn.startswith(("postgres", "postgresql")):
            raise ConfigError("invalid postgres DSN")
        return super().build_engine(dsn, **kw)
    def _before_query(self, conn):
        conn.execute(text("SET TRANSACTION READ ONLY"))
    def _quote_ident(self, name):
        return '"' + name.replace('"', '""') + '"'
```

在 `providers/__init__.py` 加一行 import 即可。

## 验证

```bash
python -m datamind.scripts.hello_db
```

会建一个 employees + projects 小库，跑 SQL、跑 NL2SQL、验证 `DELETE` 被拒。
