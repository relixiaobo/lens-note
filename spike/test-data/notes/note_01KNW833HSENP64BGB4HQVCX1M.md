---
id: note_01KNW833HSENP64BGB4HQVCX1M
type: note
text: >-
  「模拟环境中反复试错」这一训练范式，是 note_01KNVKYSM32PJQ4Z8576ZP78E0
  所说「编码发现过程而非编码任务本身」的更彻底实现。orchestrator-worker 模式是在推理时动态发现任务结构；而 RL
  训练则把「发现」这件事推到了训练时——模型在见到真实任务之前，已经在模拟环境里试错数百万次，把「怎样探索」这个元能力压缩进了参数。这是 Sutton
  的「发现能力」从架构层下沉到参数层的一个实例。
role: connection
source: src_01KNW80H8549BQPGFNFN4M156F
status: active
created_at: '2026-04-10T17:47:29.699Z'
evidence:
  - text: 使用 强化学习 (RL) 的方式，让模型在一个模拟的互联网环境中通过反复试错来学习最佳的搜索策略
    source: src_01KNW80H8549BQPGFNFN4M156F
    locator: source highlight
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNVKYSM32PJQ4Z8576ZP78E0
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
supports:
  - note_01KNVKYSM32PJQ4Z8576ZP78E0
---
「模拟环境中反复试错」这一训练范式，是 note_01KNVKYSM32PJQ4Z8576ZP78E0 所说「编码发现过程而非编码任务本身」的更彻底实现。orchestrator-worker 模式是在推理时动态发现任务结构；而 RL 训练则把「发现」这件事推到了训练时——模型在见到真实任务之前，已经在模拟环境里试错数百万次，把「怎样探索」这个元能力压缩进了参数。这是 Sutton 的「发现能力」从架构层下沉到参数层的一个实例。
