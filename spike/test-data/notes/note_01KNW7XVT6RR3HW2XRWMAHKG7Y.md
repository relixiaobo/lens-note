---
id: note_01KNW7XVT6RR3HW2XRWMAHKG7Y
type: note
text: >-
  The SKILL.md three-level structure (metadata / main instruction /
  sub-resources) is structurally isomorphic to Manus's tool-loading hierarchy
  (atom tools in function-calling schema / CLI tools queried via bash / scripts
  written on demand). Both solve the same problem — giving an agent access to
  broad capability without paying full context cost upfront — using the same
  mechanism: a tiny always-present index, a medium-cost on-trigger body, and
  unbounded on-demand depth. Convergence across two independently designed
  systems suggests this three-level lazy-loading pattern is a general
  architectural solution to the capability-vs-context-budget tradeoff in agent
  design.
role: connection
source: src_01KNW7TXEXN9MNCK9NCTEA8501
status: active
created_at: '2026-04-10T17:44:37.940Z'
evidence:
  - text: Level 2 主指令（触发时加载）。Level 3 子资源（按需加载）。Level 1 元数据（始终加载，约100 tokens）。
    source: src_01KNW7TXEXN9MNCK9NCTEA8501
    locator: 'Section: 渐进式披露的具体实现：三层加载'
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: relationships
bridges:
  - note_01KNW4D0S283M907YMGX8Q52NW
  - note_01KNW4D0SGR459720TMMHG2SAY
---
The SKILL.md three-level structure (metadata / main instruction / sub-resources) is structurally isomorphic to Manus's tool-loading hierarchy (atom tools in function-calling schema / CLI tools queried via bash / scripts written on demand). Both solve the same problem — giving an agent access to broad capability without paying full context cost upfront — using the same mechanism: a tiny always-present index, a medium-cost on-trigger body, and unbounded on-demand depth. Convergence across two independently designed systems suggests this three-level lazy-loading pattern is a general architectural solution to the capability-vs-context-budget tradeoff in agent design.
