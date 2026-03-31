---
title: Database 数据库查询
icon: carbon:data-table
permalink: /zh/guide/modules/database/
createTime: 2026/03/30 23:42:30
---

# Database — 自然语言查数据库

Database 模块使用 SQLite + SQLAlchemy，将自然语言转换为 SQL 查询。

## 工作原理

用户问题 → LLM 生成 SQL → SQLite 执行 → 结果返回

## 数据接入

系统**自动检测数据来源**，按以下优先级加载：

1. `data/profiles/{profile}/tables/*.sql` → 执行 SQL 文件建表 + 插入数据
2. 无 SQL 文件 → fallback 到内置 demo 员工数据库

不需要修改任何代码，系统会自动识别表名并配置 Agent 工具描述。

### 方式 A：SQL 文件导入（推荐）

将 `.sql` 文件放入 `data/profiles/{profile}/tables/` 目录：

```
data/profiles/mydata/tables/
├── 01_schema.sql     ← 建表语句（按文件名排序执行）
└── 02_data.sql       ← 插入数据
```

**01_schema.sql**（建表示例）：

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

**02_data.sql**（插入示例）：

```sql
INSERT INTO employees (id, name, department, position, salary, city) VALUES
  (1, '张三', '研发', '工程师', 25000, '北京'),
  (2, '李四', '市场', '经理', 30000, '上海');

INSERT INTO projects (id, project_name, lead_employee_id, budget, status) VALUES
  (1, '产品 A', 1, 500000, '进行中'),
  (2, '产品 B', 2, 800000, '规划中');
```

SQL 文件按文件名排序依次执行，建议用数字前缀控制顺序。

### 方式 B：直接提供 SQLite 文件

放到 `storage/{profile}/demo.db`。

### 数据类型建议

| Python/CSV 类型 | SQLite 类型 | 说明 |
|----------------|-------------|------|
| int | INTEGER | 整数、ID、数量 |
| float | REAL | 价格、分数、百分比 |
| str | TEXT | 名称、描述、类别 |
| date/datetime | TEXT | 建议存为 YYYY-MM-DD 格式 |
| bool | INTEGER | 0 / 1 |

## Demo 数据

内置 demo 数据库包含 **employees**（8 名员工）和 **projects**（4 个项目）表。

## Web 界面

点击 **Database** 面板 → 查看表结构 → 点击「查看数据」展示表内容。

## 安全注意事项

- NL2SQL 会执行 LLM 生成的 SQL，存在安全风险
- 建议使用只读数据库连接
- 不要连接包含敏感数据的生产数据库
