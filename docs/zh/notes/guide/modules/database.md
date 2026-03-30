---
title: Database 数据库查询
icon: carbon:data-table
permalink: /zh/guide/modules/database/
createTime: 2026/03/30 23:42:22
---

# Database — 自然语言转 SQL

Database 模块使用 SQLite + SQLAlchemy，通过 LLM 驱动的 NL2SQL 将自然语言问题转换为 SQL 查询并执行。

## Demo 数据

项目自带示例数据库（`storage/demo.db`），包含两张表：

**employees 员工表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | VARCHAR(50) | 姓名 |
| department | VARCHAR(50) | 部门 |
| position | VARCHAR(50) | 职位 |
| salary | FLOAT | 工资 |
| city | VARCHAR(50) | 城市 |

**projects 项目表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| project_name | VARCHAR(100) | 项目名称 |
| lead_employee_id | INTEGER | 负责人 ID |
| budget | FLOAT | 预算 |
| status | VARCHAR(20) | 状态 |

## 示例问题

- "各部门平均工资是多少？"
- "预算最高的项目由谁负责？"
- "列出北京所有工资超过 20000 的员工"

## 使用自己的数据库

### 方式 1：修改表结构和数据

编辑 `modules/database/database.py` 中的 `init_demo_database()` 函数。

### 方式 2：连接已有数据库

```python
# SQLite 文件
engine = create_engine("sqlite:///path/to/your/database.db")

# MySQL
engine = create_engine("mysql+pymysql://user:password@host:3306/dbname")

# PostgreSQL
engine = create_engine("postgresql://user:password@host:5432/dbname")
```

更新 `create_sql_query_engine()` 中的表名列表，同时更新 `modules/agent/agent.py` 中 `database_query` 工具的 `description`，告诉 Agent 你的数据库有哪些表和字段。

## 安全注意事项

- NL2SQL 会执行 LLM 生成的 SQL，存在安全风险
- 建议使用**只读数据库连接**
- 不要将此功能连接到包含敏感数据的生产数据库
