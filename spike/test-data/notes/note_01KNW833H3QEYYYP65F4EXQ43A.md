---
id: note_01KNW833H3QEYYYP65F4EXQ43A
type: note
text: >-
  用强化学习将搜索策略「内化进权重」，是对「提示词上限论」的釜底抽薪。note_01KNW5ZVD88Y3NBSKB7MVE148J
  指出提示式规划有内在上限——因为提示随上下文增长而被忽略。但 RL
  训练的方式绕开了这个上限：搜索策略不再存在于提示里，而是被内化进模型权重。这意味着「如何搜索」变成了模型的本能，而非外部指令。这不是对「工程化规划 vs.
  提示规划」这组对立的修补，而是对这组对立的超越——规划逻辑消失在训练过程中，既不需要提示，也不需要硬编码。
role: claim
source: src_01KNW80H8549BQPGFNFN4M156F
status: active
created_at: '2026-04-10T17:47:29.699Z'
evidence:
  - text: 使用 强化学习 (RL) 的方式，让模型在一个模拟的互联网环境中通过反复试错来学习最佳的搜索策略
    source: src_01KNW80H8549BQPGFNFN4M156F
    locator: source highlight
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
  - note_01KNW7204TPBP03YAEAZV47XTH
contradicts:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
---
用强化学习将搜索策略「内化进权重」，是对「提示词上限论」的釜底抽薪。note_01KNW5ZVD88Y3NBSKB7MVE148J 指出提示式规划有内在上限——因为提示随上下文增长而被忽略。但 RL 训练的方式绕开了这个上限：搜索策略不再存在于提示里，而是被内化进模型权重。这意味着「如何搜索」变成了模型的本能，而非外部指令。这不是对「工程化规划 vs. 提示规划」这组对立的修补，而是对这组对立的超越——规划逻辑消失在训练过程中，既不需要提示，也不需要硬编码。
