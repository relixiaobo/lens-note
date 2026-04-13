---
id: note_01KNW64WGJ6VDE4BRB7Q5RPK46
type: note
text: >-
  测试不只是验证机制，它是人类意图与 Agent 执行之间的唯一显式合约。Agent
  无法读懂注释里的意图、无法理解代码审查中的隐性期望，它只能基于可机器验证的明确断言来运作。这意味着：测试覆盖不足的代码库，对 Agent
  来说是「盲区」——Agent 会在这些无约束的区域做出人类无法预期的决策。代码库的「Agent
  友好性」，本质上等于「显式合约的密度」。这把测试从一种工程纪律提升为一种 Agent 通信协议。
role: claim
source: src_01KNW61CNTMDQA9TS1H8ZVPRDR
status: active
created_at: '2026-04-10T17:13:30.898Z'
evidence:
  - text: Agent 只能基于显式「合约」（测试）运作，代码库需要在测试覆盖、文档一致性、设计模式一致性上做好准备
    source: src_01KNW61CNTMDQA9TS1H8ZVPRDR
    locator: 要点速览 — Agent 合约
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW532DHR4YMEKH6TZHBEABC
---
测试不只是验证机制，它是人类意图与 Agent 执行之间的唯一显式合约。Agent 无法读懂注释里的意图、无法理解代码审查中的隐性期望，它只能基于可机器验证的明确断言来运作。这意味着：测试覆盖不足的代码库，对 Agent 来说是「盲区」——Agent 会在这些无约束的区域做出人类无法预期的决策。代码库的「Agent 友好性」，本质上等于「显式合约的密度」。这把测试从一种工程纪律提升为一种 Agent 通信协议。
