---
id: note_01KNWBS1H65RBTRAET9AK2YGGP
type: note
text: >-
  The hot-path vs. background memory update tradeoff is structurally identical
  to the consistency vs. availability tradeoff in distributed systems (CAP
  theorem logic). Hot-path memory: consistent (immediately usable), but costly
  in latency and attention. Background memory: available (non-blocking), but
  eventually consistent — the agent may act on stale memory during the window
  before update. Framing agent memory design as a distributed systems problem is
  more precise than framing it as a 'UX tradeoff': it predicts exactly what goes
  wrong in each regime and suggests the same mitigations (e.g., conflict
  resolution, versioning, eventual consistency guarantees).
role: frame
source: src_01KNWBNX111SDHAPNZDEWTN8AD
status: active
created_at: '2026-04-10T18:51:54.250Z'
evidence:
  - text: >-
      热更新（in the hot path）：在做出响应之前会明确决定记住哪些事实...后台更新（in the
      background）：在对话期间或之后，通过后台进程运行以更新记忆
    source: src_01KNWBNX111SDHAPNZDEWTN8AD
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
sees: Memory update timing as a distributed systems consistency problem
ignores: >-
  The actual staleness window duration, which depends heavily on interaction
  cadence
supports:
  - note_01KNW7K7M62P7E9YZMK1CTKR6S
---
The hot-path vs. background memory update tradeoff is structurally identical to the consistency vs. availability tradeoff in distributed systems (CAP theorem logic). Hot-path memory: consistent (immediately usable), but costly in latency and attention. Background memory: available (non-blocking), but eventually consistent — the agent may act on stale memory during the window before update. Framing agent memory design as a distributed systems problem is more precise than framing it as a 'UX tradeoff': it predicts exactly what goes wrong in each regime and suggests the same mitigations (e.g., conflict resolution, versioning, eventual consistency guarantees).
