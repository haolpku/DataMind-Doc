---
title: Skills 技能扩展
icon: carbon:tools
permalink: /zh/guide/modules/skills/
createTime: 2026/03/30 23:42:41
---

# Skills — 可扩展工具系统

Skills 是最灵活的扩展方式——任何 Python 函数都可以变成 Agent 的工具。

## 内置技能

| 技能 | 函数名 | 说明 |
|------|--------|------|
| 当前时间 | `get_current_time` | 获取日期和时间 |
| 计算器 | `calculator` | 精确数学计算 |
| 文本分析 | `analyze_text` | 统计字数、行数、段落数 |
| 单位换算 | `unit_convert` | 长度、重量、温度换算 |

## 添加新技能

### 第 1 步：写一个 Python 函数

编辑 `modules/skills/tools.py`：

```python
def my_new_skill(param1: str, param2: int = 10) -> str:
    """这里写工具描述 - Agent 靠这段文字判断何时调用此工具。
    param1: 参数1的说明
    param2: 参数2的说明，默认值为10
    """
    result = do_something(param1, param2)
    return f"结果: {result}"
```

关键要求：
- 函数的 **docstring 是最重要的** — Agent 完全靠它决定何时调用这个工具
- 参数需要有**类型标注**（`str`, `int`, `float` 等）
- 返回值是 `str`
- docstring 中说清楚**什么场景该用**、**参数含义**

### 第 2 步：注册到 `get_all_skills()`

```python
def get_all_skills() -> list:
    return [
        FunctionTool.from_defaults(fn=get_current_time),
        FunctionTool.from_defaults(fn=calculator),
        FunctionTool.from_defaults(fn=analyze_text),
        FunctionTool.from_defaults(fn=unit_convert),
        FunctionTool.from_defaults(fn=my_new_skill),   # ← 加这一行
    ]
```

不需要改其他文件，重启即可生效。

## 知识型技能

除了工具函数，DataMind 还支持**知识型技能** — 放在 `data/skills/` 下的 Markdown 文档会被索引并可检索：

```
data/skills/
├── 数据库运维SOP.md
└── 代码审查指南.md
```

Agent 通过 `skill_search` 工具从这些文档中查找相关的流程和最佳实践。

## Agent 如何决策

1. 接收用户问题
2. 读取所有工具的 `description`（即函数的 docstring）
3. LLM 判断哪个工具的描述最匹配用户意图
4. 自动提取参数并调用该工具
5. 将工具返回结果整合成最终回答
