---
title: Skills 技能扩展
icon: carbon:tools
permalink: /zh/guide/modules/skills/
createTime: 2026/03/30 23:42:41
---

# Skills

Skills 能力有两面：

1. **知识型 skill** —— 可语义检索的 Markdown 运维手册 / SOP。
2. **代码型 skill** —— 安全的 Python 工具（计算器、单位换算、当前时间、文本分析），Agent 直接调用。

两者都注册到同一个 `ToolRegistry`。

## 知识型 skill —— `.claude/skills/<name>/SKILL.md`

格式遵循 Agent SDK 约定：YAML frontmatter + Markdown 正文。

```markdown
---
name: code-review
description: 代码审查流程、审查要点、反馈规范。用户询问 code review / PR 审查 / 代码质量时使用。
keywords: [code review, 代码审查, PR, pull request, review]
---

# 代码审查指南

## 适用场景
…
```

启动时 `SkillsService.load()` 做三件事：
- 扫描 `.claude/skills/<dir>/SKILL.md`
- 解析 frontmatter（手写解析器，不用装 PyYAML）
- 把 `description + 正文` 写入独立 Chroma collection（`skills`），这样 `skill_search` 就能按语义找出最合适的 skill

## 代码型 skill

位置：`datamind/capabilities/skills/code_skills.py`

| 工具 | 作用 |
|---|---|
| `calculator` | 在安全的数学命名空间内 `eval`：`sqrt sin cos tan log exp pow abs floor ceil pi e min max round sum`。拒绝 `__` / `import` / `exec` 等 |
| `unit_convert` | 长度 / 质量 / 温度查表换算 |
| `get_current_time` | 本地日期 + 星期 |
| `analyze_text` | 字 / 行 / 段落 / 词数统计 |

新增一个就三行：

```python
async def _uuid4() -> dict:
    import uuid
    return {"uuid": str(uuid.uuid4())}

SPECS.append(ToolSpec(
    name="uuid4",
    description="Generate a random UUID v4.",
    input_schema={"type": "object", "properties": {}},
    handler=_uuid4,
    metadata={"group": "skill.code"},
))
```

## 工具清单

| 工具 | 作用 |
|---|---|
| `skill_search` | 在所有知识型 skill 里做语义检索 |
| `skill_get` | 按名字取某个 skill 的完整正文 |
| `skill_list` | 列出所有已注册的知识型 skill |
| `calculator`、`unit_convert`、`get_current_time`、`analyze_text` | 代码型 skill |

## 例子

```bash
python -m datamind.scripts.hello_skills
```

```
skill_search 'how should I review a pull request?'
  score=0.513  name=code-review
  score=0.194  name=db-ops-sop

skill_search '慢查询怎么排查'
  score=0.392  name=db-ops-sop
  score=0.330  name=code-review
```

新增一个 skill 就是**一个文件**（零代码改动）：

```bash
mkdir -p .claude/skills/incident-response
cat > .claude/skills/incident-response/SKILL.md <<'EOF'
---
name: incident-response
description: 事故响应 runbook：定位、沟通、复盘。用户询问故障 / 值班时使用。
keywords: [incident, 故障, 事故, on-call, 值班, 复盘]
---

# 事故响应

## 定位
…
EOF
```

下次 `python -m datamind chat`（执行 `agent.warmup()` 时）就会加载。
