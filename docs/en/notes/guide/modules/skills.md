---
title: Skills
icon: carbon:tools
permalink: /en/guide/modules/skills/
createTime: 2026/03/30 23:39:24
---

# Skills

The Skills capability has two faces:

1. **Knowledge skills** — Markdown SOPs/runbooks the model can search semantically.
2. **Code skills** — Safe Python utilities (calculator, unit converter, current time, text analyzer) the model can call directly.

Both live under one `ToolRegistry`.

## Knowledge skills — `.claude/skills/<name>/SKILL.md`

Format follows the Agent SDK convention: YAML frontmatter + Markdown body.

```markdown
---
name: code-review
description: Comprehensive code review guidance — process, checklist, feedback conventions. Use when the user asks about code review flow, review criteria, best practices, or how to give/receive review feedback.
keywords: [code review, 代码审查, PR, pull request, review]
---

# 代码审查指南

## 适用场景
…
```

At startup `SkillsService.load()`:
- Discovers every `.claude/skills/<dir>/SKILL.md`.
- Parses frontmatter (our hand-rolled parser needs no YAML dep).
- Indexes `description + body` into a dedicated Chroma collection (`skills`), so `skill_search` finds the best skill by semantic similarity.

## Code skills

Live in `datamind/capabilities/skills/code_skills.py`:

| Tool | Purpose |
|---|---|
| `calculator` | Safe `eval` against a pinned math namespace: `sqrt sin cos tan log exp pow abs floor ceil pi e min max round sum`. Rejects `__` / `import` / `exec` / etc. |
| `unit_convert` | Table-driven length / mass / temperature conversions |
| `get_current_time` | Local date + weekday |
| `analyze_text` | Char / line / paragraph / word counts |

Adding a new one is three lines:

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

## Tools exposed to the agent

| Tool | Purpose |
|---|---|
| `skill_search` | Semantic search across knowledge skills |
| `skill_get` | Return the full Markdown body for a named skill |
| `skill_list` | List every registered knowledge skill |
| `calculator`, `unit_convert`, `get_current_time`, `analyze_text` | Code skills |

## Example

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

Writing a new skill is **one file** with zero code changes:

```bash
mkdir -p .claude/skills/incident-response
cat > .claude/skills/incident-response/SKILL.md <<'EOF'
---
name: incident-response
description: Outage runbook — triage, comms, post-mortem. Use when the user asks about incidents or on-call duties.
keywords: [incident, outage, on-call, post-mortem]
---

# Incident Response

## Triage
…
EOF
```

The next `python -m datamind chat` will pick it up after calling `agent.warmup()`.
