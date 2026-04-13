---
id: note_01KNXJMZCA4AQWWM4E8E7J60HH
type: note
text: >-
  The residual failure profile of GAAT (~40% timing edge cases, ~35% ambiguous
  PII classification, ~25% incomplete lineage chains) tells us where enterprise
  multi-agent governance is fundamentally hard: not at the enforcement mechanism
  level (GAAT handles the mechanics well), but at the *classification* level.
  Ambiguous PII classification and incomplete lineage chains are not engineering
  failures — they are semantic failures. The system knows *how* to enforce but
  doesn't always know *what* counts as a violation. This mirrors the KB's
  observation about threat modeling: the hard part is not building the trap, it
  is knowing what paths to watch. Governance in production isn't limited by
  enforcement latency; it's limited by the precision of violation definition.
role: observation
source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
status: active
created_at: '2026-04-11T06:11:15.434Z'
evidence:
  - text: >-
      residual failures (~40% timing edge cases, ~35% ambiguous PII
      classification, ~25% incomplete lineage chains)
    source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
    locator: 'Abstract, 12,000 empirical traces results'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW5GTR6EHTCJV4EG6TPZR2C
---
The residual failure profile of GAAT (~40% timing edge cases, ~35% ambiguous PII classification, ~25% incomplete lineage chains) tells us where enterprise multi-agent governance is fundamentally hard: not at the enforcement mechanism level (GAAT handles the mechanics well), but at the *classification* level. Ambiguous PII classification and incomplete lineage chains are not engineering failures — they are semantic failures. The system knows *how* to enforce but doesn't always know *what* counts as a violation. This mirrors the KB's observation about threat modeling: the hard part is not building the trap, it is knowing what paths to watch. Governance in production isn't limited by enforcement latency; it's limited by the precision of violation definition.
