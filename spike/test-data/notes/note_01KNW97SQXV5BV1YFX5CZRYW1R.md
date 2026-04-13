---
id: note_01KNW97SQXV5BV1YFX5CZRYW1R
type: note
text: >-
  Manus's two-mode task delegation reveals a nuanced position on context
  isolation: isolation is the *default*, not the absolute. For simple tasks, the
  planner passes only the instruction to a sub-agent with a clean context
  window. For complex tasks — where the sub-agent needs access to files the
  planner is also working with — the planner passes its full context. This means
  context isolation is a *policy*, not a constraint: the architecture allows
  sharing when the task semantics require it, but defaults to isolation to
  prevent accidental pollution. The decision to share context is itself a
  deliberate, planner-level choice, not an emergent byproduct.
role: claim
source: src_01KNW942AFYZ1TAZVA0YGYA9KE
status: active
created_at: '2026-04-10T18:07:32.077Z'
evidence:
  - text: |-
      复杂任务：共享context
      Planner → 指令 + 完整context → Sub-agent → 结果 → Planner
      当sub-agent需要访问planner也在用的文件时
      简单任务：只传指令
      Planner → 指令 → Sub-agent → 结果 → Planner
    source: src_01KNW942AFYZ1TAZVA0YGYA9KE
    locator: 'Section: 两种任务分配模式'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
---
Manus's two-mode task delegation reveals a nuanced position on context isolation: isolation is the *default*, not the absolute. For simple tasks, the planner passes only the instruction to a sub-agent with a clean context window. For complex tasks — where the sub-agent needs access to files the planner is also working with — the planner passes its full context. This means context isolation is a *policy*, not a constraint: the architecture allows sharing when the task semantics require it, but defaults to isolation to prevent accidental pollution. The decision to share context is itself a deliberate, planner-level choice, not an emergent byproduct.
