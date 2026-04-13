---
id: note_01KNW7XVT38DPG0HX1X9M6EYPW
type: note
text: >-
  The three-level skill loading architecture (L1 metadata always loaded, L2
  triggered on activation, L3 loaded on demand) makes skill capacity
  theoretically unbounded. Only L1 (~100 tokens per skill) scales linearly with
  skill count. A system with 100 skills pays ~10,000 tokens in constant
  overhead; everything else loads only when needed. Contrast with the naive
  approach of loading all skill docs always, which makes each new skill a fixed
  recurring cost. The architecture is a token budget multiplier: the same
  context window supports far more declared capability.
role: claim
source: src_01KNW7TXEXN9MNCK9NCTEA8501
status: active
created_at: '2026-04-10T17:44:37.940Z'
evidence:
  - text: 解决了上下文窗口有限的问题，使 Skill 可承载的内容理论上无上限
    source: src_01KNW7TXEXN9MNCK9NCTEA8501
    locator: 'Section: 渐进式披露很重要'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
The three-level skill loading architecture (L1 metadata always loaded, L2 triggered on activation, L3 loaded on demand) makes skill capacity theoretically unbounded. Only L1 (~100 tokens per skill) scales linearly with skill count. A system with 100 skills pays ~10,000 tokens in constant overhead; everything else loads only when needed. Contrast with the naive approach of loading all skill docs always, which makes each new skill a fixed recurring cost. The architecture is a token budget multiplier: the same context window supports far more declared capability.
