---
id: note_01KNW4D0SMXMTMPFMRHKPYTYEN
type: note
text: >-
  The compact tool-result representation in Manus (URL pointer in context, page
  content on filesystem) has a non-obvious cache implication: compact
  representations skip the immediate next-turn cache hit but can hit cache on
  subsequent turns. This means the design is optimizing for long-horizon cost
  efficiency, not greedy per-turn savings. It reveals a tradeoff space in
  context engineering that is rarely made explicit: context freshness vs. cache
  reuse, and the choice reveals assumptions about task horizon length.
role: observation
source: src_01KNW48T2SDFREKNV0RQAHH0ZG
status: active
created_at: '2026-04-10T16:43:00.258Z'
evidence:
  - text: 跨轮次的message中，所有的工具结果都是紧缩版本，不会在下一轮直接命中缓存，但可以在下下轮或者后续命中缓存
    source: src_01KNW48T2SDFREKNV0RQAHH0ZG
    locator: 'Section: 上下文精简'
qualifier: presumably
voice: synthesized
scope: detail
structure_type: causal
---
The compact tool-result representation in Manus (URL pointer in context, page content on filesystem) has a non-obvious cache implication: compact representations skip the immediate next-turn cache hit but can hit cache on subsequent turns. This means the design is optimizing for long-horizon cost efficiency, not greedy per-turn savings. It reveals a tradeoff space in context engineering that is rarely made explicit: context freshness vs. cache reuse, and the choice reveals assumptions about task horizon length.
