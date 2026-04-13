---
id: note_01KNW4D0SKGHCB8DJXMA9CEHZD
type: note
text: >-
  Manus's Level 3 scripting layer reduces LLM round-trips, not just token count
  — and this is a qualitatively different optimization. Each round-trip is a
  latency boundary and a failure point; a loop of 100 iterations costs 1 LLM
  decision if scripted vs. 100 decisions if handled turn-by-turn. This is
  cognitive cost amortization: planning is paid once, deterministic execution
  handles the rest. The scaffold's job is to keep the LLM out of the hot loop
  wherever possible, not just to manage context size.
role: observation
source: src_01KNW48T2SDFREKNV0RQAHH0ZG
status: active
created_at: '2026-04-10T16:43:00.258Z'
evidence:
  - text: |-
      Level 3 - 代码/包层
      当任务涉及循环、条件、多步依赖时，让agent写脚本一次执行，而非多次LLM往返
      Layer 3省的不直接是token，是LLM往返次数。
    source: src_01KNW48T2SDFREKNV0RQAHH0ZG
    locator: 'Section: Manus的分层工具架构, Level 3'
qualifier: certain
voice: synthesized
scope: detail
structure_type: causal
supports:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
---
Manus's Level 3 scripting layer reduces LLM round-trips, not just token count — and this is a qualitatively different optimization. Each round-trip is a latency boundary and a failure point; a loop of 100 iterations costs 1 LLM decision if scripted vs. 100 decisions if handled turn-by-turn. This is cognitive cost amortization: planning is paid once, deterministic execution handles the rest. The scaffold's job is to keep the LLM out of the hot loop wherever possible, not just to manage context size.
