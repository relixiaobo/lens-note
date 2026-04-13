# Task Design — lens task support

## Why

Task is not productivity management. It's the **collaboration protocol between human and agent**, with a knowledge feedback loop:

```
Knowledge (note) → inspires → Task → doing → produces → Knowledge (note)
```

Doing things produces insights. Insights guide future work. The task is the bridge between understanding and action. Without it, the knowledge loop is broken — agent learns but never acts, or acts but never learns from acting.

## Principle

Task is a Note with status. Same infrastructure, same links, same files. Only 1 new field: `status`.

## Data Model

```yaml
---
id: task_01ABC
type: task
title: 实现阅读辅助的互动问答功能
status: open
links:
  - to: note_01DEF
    rel: related
    reason: 来自「AI辅助阅读方案」的具体落地
created_at: '2026-04-13T06:30:43.574Z'
updated_at: '2026-04-13T06:30:43.574Z'
---
具体的任务描述、拆解、进展记录...
```

### vs Note

| | Note | Task |
|---|------|------|
| New field | — | `status: open \| done` |
| Prefix | `note_` | `task_` |
| Directory | `~/.lens/notes/` | `~/.lens/tasks/` |

Everything else is identical: id, type, title, source, links, created_at, updated_at, body.

### Status: 2 states only

`open` and `done`.

- "Doing" → track in body, not status
- "Cancelled" → delete, or mark done with body explanation
- Completion time → `updated_at` + `git log`

### Link types: no additions

Use existing `supports`, `contradicts`, `refines`, `related` with descriptive `reason` strings.

```yaml
links:
  - to: note_01DEF
    rel: related
    reason: 这个任务来自那篇阅读笔记的启发
```

### Search: tasks included by default

No special exclusion. If clutter becomes a problem, address later.

## CLI

### `lens tasks`

```bash
lens tasks --json               # open tasks (default)
lens tasks --all --json          # all tasks
lens tasks --done --json         # done tasks
```

### Write

```bash
# Create
printf '%s' '{"command":"write","input":{"type":"task","title":"重构搜索模块","status":"open"}}' | lens --stdin

# Complete
printf '%s' '{"command":"write","input":{"type":"update","id":"task_01ABC","set":{"status":"done"}}}' | lens --stdin

# Complete with reflection (batch)
printf '%s' '{"command":"write","input":[
  {"type":"update","id":"task_01ABC","set":{"status":"done"}},
  {"type":"note","title":"重构的教训","body":"...","links":[{"to":"$0","rel":"related","reason":"完成任务后的反思"}]}
]}' | lens --stdin
```

### `lens status`

```json
{
  "notes": 17,
  "sources": 2,
  "tasks": {"open": 3, "done": 12, "total": 15},
  "total": 34
}
```

## What NOT to add

- **`done_at`**: `updated_at` + git history is sufficient
- **New link types**: `related` + reason covers all task-note relationships
- **Priority**: If you need it, your list is too long
- **Due dates as field**: Put in body. Agents handle scheduling
- **Projects**: A project is just a note that tasks link to
- **Recurrence**: Scheduling logic, not storage
- **Subtasks**: Use `refines` link between tasks

## Implementation

### Files to change

| File | Change |
|------|--------|
| `types.ts` | Add `Task` interface, `task` to `generateId` prefix |
| `paths.ts` | Add `tasks` dir, `task` prefix in `dirMap` + `VALID_ID_PATTERN` |
| `write.ts` | Add `writeTask()`, handle status in `writeUpdate()` |
| `commands.ts` | Add `tasksCommand`, update `dispatchRequest` |
| `status.ts` | Show task counts (open/done/total) |
| `main.ts` | Add `tasks` to help text |
| `SKILL.md` | Add task examples |
