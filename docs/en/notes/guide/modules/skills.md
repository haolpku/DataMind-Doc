---
title: Skills
icon: carbon:tools
permalink: /en/guide/modules/skills/
createTime: 2026/03/30 23:39:24
---

# Skills — Extensible Tool System

Skills are the most flexible extension mechanism — any Python function can become an Agent tool.

## Built-in Skills

| Skill | Function | Description |
|-------|----------|-------------|
| Current Time | `get_current_time` | Get current date and time |
| Calculator | `calculator` | Precise math calculations |
| Text Analysis | `analyze_text` | Count words, lines, paragraphs |
| Unit Converter | `unit_convert` | Length, weight, temperature conversion |

## Adding a New Skill

### Step 1: Write a Python function

Edit `modules/skills/tools.py`:

```python
def my_new_skill(param1: str, param2: int = 10) -> str:
    """Tool description — the Agent uses this to decide when to call it.
    param1: description of param1
    param2: description of param2, defaults to 10
    """
    result = do_something(param1, param2)
    return f"Result: {result}"
```

Key requirements:
- The **docstring is critical** — the Agent decides when to invoke the tool based entirely on it
- Parameters need **type annotations** (`str`, `int`, `float`, etc.)
- Return type is `str`
- Describe **when to use** and **parameter meanings** in the docstring

### Step 2: Register in `get_all_skills()`

```python
def get_all_skills() -> list:
    return [
        FunctionTool.from_defaults(fn=get_current_time),
        FunctionTool.from_defaults(fn=calculator),
        FunctionTool.from_defaults(fn=analyze_text),
        FunctionTool.from_defaults(fn=unit_convert),
        FunctionTool.from_defaults(fn=my_new_skill),   # add here
    ]
```

No other files need to change. Restart and the new skill is available.

## Knowledge Skills

Beyond tool functions, DataMind also supports **knowledge skills** — Markdown documents placed in `data/skills/` that are indexed and searchable:

```
data/skills/
├── database-ops-sop.md
└── code-review-guide.md
```

The Agent uses `skill_search` to find relevant procedures and best practices from these documents.

## How the Agent Decides

1. Receives user question
2. Reads all tool descriptions (docstrings)
3. LLM judges which tool best matches the intent
4. Extracts parameters and calls the tool
5. Integrates tool output into the final answer
