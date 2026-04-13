---
id: note_01KNW9BGTDYKHTAFRBD1R9R0MG
type: note
text: >-
  Progressive disclosure in Skills — only metadata loaded always, content loaded
  on trigger, deep references loaded on demand — solves the same problem that
  Manus solves with context isolation across agents, but through a different
  mechanism. Manus isolates context by *splitting across agents*; Skills
  isolates context by *deferring within one agent*. Both are responses to the
  same root constraint: LLM attention is scarce and pollutable. The approaches
  are architecturally complementary: Skills-style progressive disclosure works
  best when the agent knows in advance which skill to load (intent is clear);
  Manus-style agent isolation works best when tasks are genuinely parallel or
  context-contaminating. Neither is universally superior — they address
  different shapes of the attention-scarcity problem.
role: connection
source: src_01KNW97ST9TBYZX2WYWK2N5QP9
status: active
created_at: '2026-04-10T18:09:34.005Z'
evidence:
  - text: >-
      At this point, skills can contain a lot of information, and we want to
      protect the context window so that we can fit in hundreds of skills and
      make them truly composable. That's why skills are progressively disclosed.
    source: src_01KNW97ST9TBYZX2WYWK2N5QP9
    locator: Progressive disclosure section
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW4D0S8C6J6XX6FJEGW5R0E
  - note_01KNW7XVT38DPG0HX1X9M6EYPW
supports:
  - note_01KNW4D0S8C6J6XX6FJEGW5R0E
---
Progressive disclosure in Skills — only metadata loaded always, content loaded on trigger, deep references loaded on demand — solves the same problem that Manus solves with context isolation across agents, but through a different mechanism. Manus isolates context by *splitting across agents*; Skills isolates context by *deferring within one agent*. Both are responses to the same root constraint: LLM attention is scarce and pollutable. The approaches are architecturally complementary: Skills-style progressive disclosure works best when the agent knows in advance which skill to load (intent is clear); Manus-style agent isolation works best when tasks are genuinely parallel or context-contaminating. Neither is universally superior — they address different shapes of the attention-scarcity problem.
