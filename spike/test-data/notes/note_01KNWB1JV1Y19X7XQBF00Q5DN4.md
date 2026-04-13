---
id: note_01KNWB1JV1Y19X7XQBF00Q5DN4
type: note
text: >-
  Chat交互的单线程性不只是「无法并行执行任务」的问题（已在note_01KNW5AYYTAAGD1CRF28CKE353中指出），还有一个更隐蔽的代价：任何偏题都是上下文污染。一旦用户在闲聊中偏离核心目标，整个对话上下文就被污染，难以清晰回归主线。这与代码中的「全局状态污染」同构——单一可变状态空间里，每一次写入都影响所有后续读取。这解释了为什么长对话中「迷失感」如此普遍：不是用户记性差，而是Chat的架构不支持「局部状态隔离」。
role: connection
source: src_01KNWAX2K6NKK483EVNZKANY0G
status: active
created_at: '2026-04-10T18:39:05.542Z'
evidence:
  - text: 对话式的交互是单线程的，难以在不干扰主线的情况下处理分支或并行任务……用户容易在闲聊中偏离原本的目标，忘记了最初想要解决的核心问题
    source: src_01KNWAX2K6NKK483EVNZKANY0G
    locator: Chat交互的劣势 section
qualifier: likely
voice: synthesized
scope: detail
structure_type: argument
supports:
  - note_01KNW5AYYTAAGD1CRF28CKE353
---
Chat交互的单线程性不只是「无法并行执行任务」的问题（已在note_01KNW5AYYTAAGD1CRF28CKE353中指出），还有一个更隐蔽的代价：任何偏题都是上下文污染。一旦用户在闲聊中偏离核心目标，整个对话上下文就被污染，难以清晰回归主线。这与代码中的「全局状态污染」同构——单一可变状态空间里，每一次写入都影响所有后续读取。这解释了为什么长对话中「迷失感」如此普遍：不是用户记性差，而是Chat的架构不支持「局部状态隔离」。
