---
id: note_01KNW89DBA0CDGH9GKBDV3KTEH
type: note
text: >-
  错误保留在上下文中，是 Agent
  的真正学习信号——这是反直觉但关键的设计原则。大多数工程师的本能是「清洁上下文」：移除失败记录，让模型从干净的状态重试。但这恰恰剥夺了模型的适应能力。当模型看到「我执行了动作X
  → 收到错误Y」这个完整序列，它在 in-context 层面会降低重复犯同类错误的概率。移除错误 = 移除证据 =
  移除自适应的可能。这与「错误是常态，而非异常」的多步骤任务哲学直接呼应：隐藏失败不是整洁，而是认知失明。
role: claim
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: >-
      在多步任务中，失败不是异常，而是常态的一部分。隐藏失败 = 移除学习机会。Erasing failure removes evidence. And
      without evidence, the model can't adapt.
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: in-context learning: 把错误留在上下文中'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
assumptions:
  - 模型在推理时能根据上下文中的错误信号调整自身行为倾向
  - 错误序列不会以噪音形式稀释上下文的有效信号
supports:
  - note_01KNW89DBND94XHNN7WGCKTG4Q
---
错误保留在上下文中，是 Agent 的真正学习信号——这是反直觉但关键的设计原则。大多数工程师的本能是「清洁上下文」：移除失败记录，让模型从干净的状态重试。但这恰恰剥夺了模型的适应能力。当模型看到「我执行了动作X → 收到错误Y」这个完整序列，它在 in-context 层面会降低重复犯同类错误的概率。移除错误 = 移除证据 = 移除自适应的可能。这与「错误是常态，而非异常」的多步骤任务哲学直接呼应：隐藏失败不是整洁，而是认知失明。
