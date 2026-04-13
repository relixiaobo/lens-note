---
id: note_01KNWAQDJA233K4KMV3RM9XW35
type: note
text: >-
  Agent search over-specification is a mismatch between training distribution
  and tool use. LLMs are trained to produce precise, complete responses — but
  this precision-as-output behavior contaminates precision-as-query behavior. A
  good search query is strategically imprecise: it opens space rather than
  closes it. Prompting agents to start broad and narrow is a band-aid; the
  deeper fix would be RL training on search outcomes (as described in existing
  notes on RL-trained search agents) where the model learns from feedback that
  broad initial queries yield better final results. The prompt-instruction
  workaround and the RL-training solution target the same behavioral
  misalignment from different levels.
role: connection
source: src_01KNWAN527ENGP17D721BVSAQ5
status: active
created_at: '2026-04-10T18:33:32.469Z'
evidence:
  - text: >-
      agent 通常倾向于构建 非常详细、具体的 query，这样可能搜索结果很少，为了克服这种倾向，可以建议 agent 从 简短、宽泛的 query
      开始
    source: src_01KNWAN527ENGP17D721BVSAQ5
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW5VHCPKXMJSX2R448FS4RY
  - note_01KNW833H3QEYYYP65F4EXQ43A
---
Agent search over-specification is a mismatch between training distribution and tool use. LLMs are trained to produce precise, complete responses — but this precision-as-output behavior contaminates precision-as-query behavior. A good search query is strategically imprecise: it opens space rather than closes it. Prompting agents to start broad and narrow is a band-aid; the deeper fix would be RL training on search outcomes (as described in existing notes on RL-trained search agents) where the model learns from feedback that broad initial queries yield better final results. The prompt-instruction workaround and the RL-training solution target the same behavioral misalignment from different levels.
