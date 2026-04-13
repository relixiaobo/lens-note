---
id: note_01KNWE66M3K1XDMS0DJRHCZ6RC
type: note
text: >-
  工具返回值中使用自然语言而非技术标识符，本质上是在为 Agent 的下游推理降低语义转换成本。`Send From: @jane.doe
  (u12345678)` 比单纯的 `u12345678` 更有价值，因为 Agent 可以直接在自然语言推理中引用「jane.doe」而无需先查表。这与
  `note_01KNW5XBV4TB6X4K105TSVGVXN` 讨论的 `display_description`
  问题是同一个「双受众」问题的不同侧面：那个笔记讨论的是工具*描述*同时面向模型和人类，这里讨论的是工具*返回值*同时需要对 Agent
  可读（自然语言推理友好）和对下游工具可用（保留技术标识符）。解法是相同的：两者都保留，自然语言在前，技术标识符在括号内。
role: connection
source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
status: active
created_at: '2026-04-10T19:34:02.607Z'
evidence:
  - text: >-
      有时候，Agent 必须要处理技术标识符，用于下游工具的调用，可以使用自然语言+技术标识符结合的方式返回，比如 Send From:
      @jane.doe (u12345678)
    source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
    locator: 'Section: 工具结果：让工具返回有意义的上下文结果'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW5XBV4TB6X4K105TSVGVXN
supports:
  - note_01KNW5XBV4TB6X4K105TSVGVXN
---
工具返回值中使用自然语言而非技术标识符，本质上是在为 Agent 的下游推理降低语义转换成本。`Send From: @jane.doe (u12345678)` 比单纯的 `u12345678` 更有价值，因为 Agent 可以直接在自然语言推理中引用「jane.doe」而无需先查表。这与 `note_01KNW5XBV4TB6X4K105TSVGVXN` 讨论的 `display_description` 问题是同一个「双受众」问题的不同侧面：那个笔记讨论的是工具*描述*同时面向模型和人类，这里讨论的是工具*返回值*同时需要对 Agent 可读（自然语言推理友好）和对下游工具可用（保留技术标识符）。解法是相同的：两者都保留，自然语言在前，技术标识符在括号内。
