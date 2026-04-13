---
id: note_01KNW4D0SGR459720TMMHG2SAY
type: note
text: >-
  Manus's three-tier context compaction strategy (raw → file-offload → LLM
  summarization) is a tiered memory hierarchy for attention — the same idea as
  CPU cache levels but applied to context. Hot data (recent tool results) stays
  raw. Warm data gets offloaded to filesystem as a pointer, retrievable on
  demand. Cold data gets summarized by an LLM, losing fidelity for efficiency.
  Critically, the trigger is threshold-based (context size), not round-based.
  This is more principled than 'summarize every N turns' and avoids premature
  compression of still-relevant recent data.
role: observation
source: src_01KNW48T2SDFREKNV0RQAHH0ZG
status: active
created_at: '2026-04-10T16:43:00.258Z'
evidence:
  - text: |-
      Manus的策略：三级递进，能用前面的就不用后面的
      Raw：新结果、最近结果保持完整
      Compaction：旧结果用引用替换
      Summarization：当压缩还不够时，用LLM总结历史轨迹
      触发条件：不是几轮之后，而是context达到阈值
    source: src_01KNW48T2SDFREKNV0RQAHH0ZG
    locator: 'Section: 上下文的渐进压缩'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: process
---
Manus's three-tier context compaction strategy (raw → file-offload → LLM summarization) is a tiered memory hierarchy for attention — the same idea as CPU cache levels but applied to context. Hot data (recent tool results) stays raw. Warm data gets offloaded to filesystem as a pointer, retrievable on demand. Cold data gets summarized by an LLM, losing fidelity for efficiency. Critically, the trigger is threshold-based (context size), not round-based. This is more principled than 'summarize every N turns' and avoids premature compression of still-relevant recent data.
