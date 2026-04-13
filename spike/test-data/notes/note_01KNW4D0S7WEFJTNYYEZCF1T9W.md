---
id: note_01KNW4D0S7WEFJTNYYEZCF1T9W
type: note
text: >-
  Manus's layered tool architecture resolves the 'more tools = dumber agent'
  problem architecturally rather than by curation. By keeping fewer than 20
  atomic tools in the function-calling schema and routing everything else
  through bash, Manus gets unlimited effective capability at a fixed context
  cost. The KV cache stays stable because the schema prefix never changes. This
  is precisely the Unix insight applied to LLMs: a small, stable syscall surface
  (function-calling layer) + an unrestricted shell (bash) = tractable action
  space with infinite reach.
role: claim
source: src_01KNW48T2SDFREKNV0RQAHH0ZG
status: active
created_at: '2026-04-10T16:43:00.258Z'
evidence:
  - text: |-
      Level 1 -原子工具层（约20个核心工具）特点：稳定、数量少、对 KV-cache 友好
      Level 2 -沙箱CLI工具层...工具定义不占上下文，无限扩展能力
      更多工具可能让 Agent 变笨。
    source: src_01KNW48T2SDFREKNV0RQAHH0ZG
    locator: 'Section: Manus的分层工具架构'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
Manus's layered tool architecture resolves the 'more tools = dumber agent' problem architecturally rather than by curation. By keeping fewer than 20 atomic tools in the function-calling schema and routing everything else through bash, Manus gets unlimited effective capability at a fixed context cost. The KV cache stays stable because the schema prefix never changes. This is precisely the Unix insight applied to LLMs: a small, stable syscall surface (function-calling layer) + an unrestricted shell (bash) = tractable action space with infinite reach.
