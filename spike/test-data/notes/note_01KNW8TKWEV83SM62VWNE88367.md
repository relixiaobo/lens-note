---
id: note_01KNW8TKWEV83SM62VWNE88367
type: note
text: >-
  提示链（Prompt Chaining）的核心逻辑是：每次 LLM
  调用的任务复杂度与其准确性之间存在负相关。把复杂任务拆分成固定子步骤，本质上是在管理「单次推理的认知负载」——而不只是在管理任务的总量。这与上下文污染和
  few-shot
  陷阱的机制不同：那些是关于上下文历史的问题，而这是关于单步任务范围的问题。换言之，提示链是一种「每步任务边界管理」策略：通过缩窄每次调用的作用域，让每个
  LLM 调用在更窄的分布上操作，从而提升输出质量。这提示了一个设计原则：当你发现某个步骤出错时，先诊断这一步的任务范围是否太宽，而不是只考虑提示词措辞。
role: claim
source: src_01KNW8PNXPSAJB5BXXC0BSYJ1A
status: active
created_at: '2026-04-10T18:00:20.087Z'
evidence:
  - text: 目标是让每个LLM调用变成简单直接的任务，以提高准确性
    source: src_01KNW8PNXPSAJB5BXXC0BSYJ1A
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
  - note_01KNW89DBKJ57Q53NP9ZY03EQ6
---
提示链（Prompt Chaining）的核心逻辑是：每次 LLM 调用的任务复杂度与其准确性之间存在负相关。把复杂任务拆分成固定子步骤，本质上是在管理「单次推理的认知负载」——而不只是在管理任务的总量。这与上下文污染和 few-shot 陷阱的机制不同：那些是关于上下文历史的问题，而这是关于单步任务范围的问题。换言之，提示链是一种「每步任务边界管理」策略：通过缩窄每次调用的作用域，让每个 LLM 调用在更窄的分布上操作，从而提升输出质量。这提示了一个设计原则：当你发现某个步骤出错时，先诊断这一步的任务范围是否太宽，而不是只考虑提示词措辞。
