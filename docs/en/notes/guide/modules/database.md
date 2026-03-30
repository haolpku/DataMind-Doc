---
title: Database
icon: carbon:data-table
permalink: /en/guide/modules/database/
createTime: 2026/03/30 23:39:11
---

# Database — Natural Language to SQL

The Database module translates natural language questions into SQL queries using LLM-powered NL2SQL, then executes them against a SQLite database.

## Demo Schema

The built-in demo database (`storage/demo.db`) contains two tables:

**employees**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | VARCHAR(50) | Name |
| department | VARCHAR(50) | Department |
| position | VARCHAR(50) | Position |
| salary | FLOAT | Salary |
| city | VARCHAR(50) | City |

**projects**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| project_name | VARCHAR(100) | Project name |
| lead_employee_id | INTEGER | Lead employee ID |
| budget | FLOAT | Budget |
| status | VARCHAR(20) | Status |

## Example Queries

- "What is the average salary by department?"
- "Who leads the most expensive project?"
- "List all employees in Beijing with salary above 20000"

## Using Your Own Database

### Option 1: Modify tables and data

Edit `modules/database/database.py` to change the `init_demo_database()` function.

### Option 2: Connect to an existing database

```python
# SQLite file
engine = create_engine("sqlite:///path/to/your/database.db")

# MySQL
engine = create_engine("mysql+pymysql://user:password@host:3306/dbname")

# PostgreSQL
engine = create_engine("postgresql://user:password@host:5432/dbname")
```

Update `create_sql_query_engine()` with your table names, and update the `database_query` tool description in `modules/agent/agent.py` so the Agent knows your schema.

## Security

- NL2SQL executes LLM-generated SQL — use **read-only** database connections
- Do not connect to production databases with sensitive data
