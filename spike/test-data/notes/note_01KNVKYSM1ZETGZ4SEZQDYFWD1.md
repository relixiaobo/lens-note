---
id: note_01KNVKYSM1ZETGZ4SEZQDYFWD1
type: note
text: >-
  The five agent workflow patterns each encode a specific theory about task
  uncertainty. Prompt chaining assumes tasks can be cleanly pre-decomposed (low
  uncertainty). Orchestrator-worker assumes decomposition must be discovered at
  runtime (high uncertainty). Routing assumes task identity is classifiable but
  processing is specialized. Parallelization assumes either independence
  (splitting) or diversity of judgment (voting). Evaluator-optimizer assumes
  quality is measurable and refinable. Each pattern is only appropriate when its
  underlying uncertainty assumption holds — mismatching pattern to task type is
  the core design error.
role: frame
source: src_01KNVKW56MX7V1TA16V891663R
status: active
created_at: '2026-04-10T11:55:36.951Z'
evidence:
  - text: 适用于可以任务轻松且清晰地拆分为固定子任务的情况 ... 由于任务的不确定性，人类无法提前将任务拆解成固定子任务的集合
    source: src_01KNVKW56MX7V1TA16V891663R
  - text: 适用于可以任务轻松且清晰地拆分为固定子任务的情况 ... 由于任务的不确定性，人类无法提前将任务拆解成固定子任务的集合
    source: src_01KNW8PNXPSAJB5BXXC0BSYJ1A
qualifier: certain
voice: synthesized
scope: big_picture
structure_type: taxonomy
sees: >-
  Agent workflows as uncertainty-matching instruments — each workflow encodes a
  specific assumption about task predictability
ignores: >-
  Hybrid situations where a task begins with low uncertainty but evolves toward
  high uncertainty mid-execution
---
The five agent workflow patterns each encode a specific theory about task uncertainty. Prompt chaining assumes tasks can be cleanly pre-decomposed (low uncertainty). Orchestrator-worker assumes decomposition must be discovered at runtime (high uncertainty). Routing assumes task identity is classifiable but processing is specialized. Parallelization assumes either independence (splitting) or diversity of judgment (voting). Evaluator-optimizer assumes quality is measurable and refinable. Each pattern is only appropriate when its underlying uncertainty assumption holds — mismatching pattern to task type is the core design error.
