---
id: note_01KNWE66M164SACEV56CQVZSKT
type: note
text: >-
  错误返回的设计是隐藏的 Agent 能力乘数。传统 API 返回错误码（如 `404`、`500`），调用方（程序员）自己知道该怎么处理。但 Agent
  不同——它没有「程序员的先验知识」。如果工具返回的是一个不透明的错误码，Agent 往往只能停下来或胡乱重试。如果工具返回的是「为什么失败 +
  下一步可以做什么」，Agent 就可以自主选择恢复路径。这意味着工具的错误设计，直接决定了 Agent
  在异常情况下的自主恢复能力。善用错误返回，是把部分「错误处理智慧」从 Agent 的推理负担转移到工具设计中去。
role: claim
source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
status: active
created_at: '2026-04-10T19:34:02.607Z'
evidence:
  - text: 对于错误结果的返回，不要只返回一个错误代码，而是应该告知 Agent 清晰的错误以及后续可改进的操作
    source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
    locator: 'Section: 工具结果：优化工具返回的上下文长度和质量'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNWE66KY2S2K2S58FEE0R86E
---
错误返回的设计是隐藏的 Agent 能力乘数。传统 API 返回错误码（如 `404`、`500`），调用方（程序员）自己知道该怎么处理。但 Agent 不同——它没有「程序员的先验知识」。如果工具返回的是一个不透明的错误码，Agent 往往只能停下来或胡乱重试。如果工具返回的是「为什么失败 + 下一步可以做什么」，Agent 就可以自主选择恢复路径。这意味着工具的错误设计，直接决定了 Agent 在异常情况下的自主恢复能力。善用错误返回，是把部分「错误处理智慧」从 Agent 的推理负担转移到工具设计中去。
