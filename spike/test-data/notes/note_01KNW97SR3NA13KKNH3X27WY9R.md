---
id: note_01KNW97SR3NA13KKNH3X27WY9R
type: note
text: >-
  Constrained decoding for sub-agent outputs is a structural enforcement of the
  schema-communication principle. Manus uses constrained decoding to ensure
  sub-agent results conform to the planner-defined schema — the planner designs
  the schema, the sub-agent is *mechanically prevented* from outputting anything
  that violates it. This is not a soft prompt instruction ('please return
  results in this format') but a hard decoding-layer constraint. The
  implication: structured inter-agent communication doesn't depend on the
  model's instruction-following ability at the communication boundary — it's
  guaranteed by the generation process itself. This closes the failure mode
  where agent communication degrades under load or in edge cases because the
  model 'forgets' the output format.
role: observation
source: src_01KNW942AFYZ1TAZVA0YGYA9KE
status: active
created_at: '2026-04-10T18:07:32.077Z'
evidence:
  - text: |-
      Sub-agent用 submit_results 工具返回结果
      用constrained decoding确保输出符合schema
      Planner定义sub-agent的输出schema
    source: src_01KNW942AFYZ1TAZVA0YGYA9KE
    locator: 'Section: Manus Agent和Sub-Agent通信机制'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW4D0S8C6J6XX6FJEGW5R0E
  - note_01KNW89DC6GRF2MYBHV7X74M37
---
Constrained decoding for sub-agent outputs is a structural enforcement of the schema-communication principle. Manus uses constrained decoding to ensure sub-agent results conform to the planner-defined schema — the planner designs the schema, the sub-agent is *mechanically prevented* from outputting anything that violates it. This is not a soft prompt instruction ('please return results in this format') but a hard decoding-layer constraint. The implication: structured inter-agent communication doesn't depend on the model's instruction-following ability at the communication boundary — it's guaranteed by the generation process itself. This closes the failure mode where agent communication degrades under load or in edge cases because the model 'forgets' the output format.
