---
title: Database
icon: carbon:data-table
permalink: /en/guide/modules/database/
createTime: 2026/03/30 23:42:30
---

# Database — Natural Language Database Queries

The Database module uses SQLite and SQLAlchemy to turn natural language into SQL queries.

## How it works

User question → LLM generates SQL → SQLite executes → results are returned

## Data loading

The system **detects the data source automatically** in this order:

1. `data/profiles/{profile}/tables/*.sql` → run SQL files to create tables and insert data
2. If no SQL files are present → fall back to the built-in demo employee database

You do not need to change code; table names are discovered and Agent tool descriptions are configured accordingly.

### Method A: SQL file import (recommended)

Place `.sql` files under `data/profiles/{profile}/tables/`:

```
data/profiles/mydata/tables/
├── 01_schema.sql     ← DDL (executed in filename order)
└── 02_data.sql       ← INSERT data
```

**01_schema.sql** (example DDL):

```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  salary REAL,
  city TEXT
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  project_name TEXT NOT NULL,
  lead_employee_id INTEGER,
  budget REAL,
  status TEXT
);
```

**02_data.sql** (example inserts):

```sql
INSERT INTO employees (id, name, department, position, salary, city) VALUES
  (1, 'Alice', 'Engineering', 'Developer', 25000, 'Beijing'),
  (2, 'Bob', 'Marketing', 'Manager', 30000, 'Shanghai');

INSERT INTO projects (id, project_name, lead_employee_id, budget, status) VALUES
  (1, 'Product A', 1, 500000, 'active'),
  (2, 'Product B', 2, 800000, 'planned');
```

Files are executed in sorted filename order; use numeric prefixes to control order.

### Method B: Provide a SQLite file directly

Put your database at `storage/{profile}/demo.db`.

### Recommended data types

| Python / CSV type | SQLite type | Notes |
|-------------------|-------------|-------|
| int | INTEGER | IDs, counts, integers |
| float | REAL | Prices, scores, percentages |
| str | TEXT | Names, descriptions, categories |
| date / datetime | TEXT | Prefer `YYYY-MM-DD` strings |
| bool | INTEGER | Use 0 / 1 |

## Demo data

The built-in demo has **employees** (8 rows) and **projects** (4 rows).

## Web UI

Open the **Database** panel → inspect table schemas → use **View data** to preview rows.

## Security

- NL2SQL runs LLM-generated SQL and carries inherent risk
- Prefer **read-only** database connections
- Do not point this at production databases that hold sensitive data
