---
id: note_01KNWBS1H88KGH4N46WHSF7595
type: note
text: >-
  The hot-path memory update has a second cost beyond latency: attention
  contamination. When an agent must reason about 'what should I remember?'
  before responding, that reasoning process occupies the same context window as
  the task itself. This is exactly the problem note_01KNW97SR57CKTH7SKMV970FB5
  identifies with mixed-purpose agents: co-locating memory logic with response
  logic pollutes attention. The implication is that background memory update is
  architecturally cleaner not just because it's non-blocking, but because it
  preserves context isolation — the same reason Manus uses isolated agent
  contexts rather than shared windows.
role: connection
source: src_01KNWBNX111SDHAPNZDEWTN8AD
status: active
created_at: '2026-04-10T18:51:54.250Z'
evidence:
  - text: 将记忆逻辑与代理逻辑混合在一起，可能会让代理的注意力分散
    source: src_01KNWBNX111SDHAPNZDEWTN8AD
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW97SR57CKTH7SKMV970FB5
  - note_01KNW4D0S8C6J6XX6FJEGW5R0E
supports:
  - note_01KNW97SR57CKTH7SKMV970FB5
---
The hot-path memory update has a second cost beyond latency: attention contamination. When an agent must reason about 'what should I remember?' before responding, that reasoning process occupies the same context window as the task itself. This is exactly the problem note_01KNW97SR57CKTH7SKMV970FB5 identifies with mixed-purpose agents: co-locating memory logic with response logic pollutes attention. The implication is that background memory update is architecturally cleaner not just because it's non-blocking, but because it preserves context isolation — the same reason Manus uses isolated agent contexts rather than shared windows.
