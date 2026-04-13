---
id: note_01KNWE2G7BN64J3QQXAJNNFG9C
type: note
text: >-
  Ng's framing of 'Planning' emphasizes *replanning on failure* — the agent can
  detect task failure and replan its path. This is meaningfully different from
  what the KB's orchestrator-worker pattern captures. The orchestrator-worker
  pattern is about decomposing an uncertain task at the *start*, but implicitly
  assumes that once the plan is made, execution proceeds forward. Replanning
  adds a *reactive* loop: the agent monitors outcomes and can change course
  mid-execution when a step fails. This is the difference between
  planning-as-decomposition (what to do) and planning-as-control (what to do
  *next given what just happened*). The KB's engineering-controlled planning
  notes (note_01KNW5ZVD88Y3NBSKB7MVE148J) discuss stability of plans but not
  their adaptability. Replanning is the dynamic counterpart to that static
  stability.
role: claim
source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
status: active
created_at: '2026-04-10T19:32:01.367Z'
evidence:
  - text: >-
      规划（Planning）：使用规划算法让AI代理能够自主决定执行任务的步骤，并在遇到失败时重新规划路径。这种方法可以显著提高AI代理的自主性和灵活性。
    source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
sees: >-
  Planning not as one-time decomposition but as ongoing reactive control —
  failure triggers replanning, not just retry
bridges:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
  - note_01KNW89DCAJSAV3212RRWG44FT
---
Ng's framing of 'Planning' emphasizes *replanning on failure* — the agent can detect task failure and replan its path. This is meaningfully different from what the KB's orchestrator-worker pattern captures. The orchestrator-worker pattern is about decomposing an uncertain task at the *start*, but implicitly assumes that once the plan is made, execution proceeds forward. Replanning adds a *reactive* loop: the agent monitors outcomes and can change course mid-execution when a step fails. This is the difference between planning-as-decomposition (what to do) and planning-as-control (what to do *next given what just happened*). The KB's engineering-controlled planning notes (note_01KNW5ZVD88Y3NBSKB7MVE148J) discuss stability of plans but not their adaptability. Replanning is the dynamic counterpart to that static stability.
