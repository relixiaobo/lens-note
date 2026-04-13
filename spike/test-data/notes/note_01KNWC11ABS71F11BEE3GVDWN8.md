---
id: note_01KNWC11ABS71F11BEE3GVDWN8
type: note
text: >-
  「对话即训练」打开了一个绕过「程序性记忆冻结」问题的旁路：通过让 Agent 直接修改 system prompt 文档，用户的反馈可以立刻改变 Agent
  未来的行为——不需要重新训练权重，不需要
  fine-tuning，只需要编辑一个文本文件。这实际上是把「程序性记忆」从模型权重降格到了文档层：行为规则写在可编辑的文档里，反馈驱动文档更新，更新立刻生效。这个机制的代价是：它依赖用户（或
  Agent）主动维护文档的准确性，而权重层的程序性记忆一旦通过训练内化，就不需要外部维护。但它的优势也在于此：文档可读、可审计、可回滚，而权重更新是不透明的黑箱。「文档层的程序性记忆」和「权重层的程序性记忆」是可读性与自动化之间的真实
  tradeoff。
role: claim
source: src_01KNWBWZAE6QMHK7SZWHENYFVY
status: active
created_at: '2026-04-10T18:56:16.203Z'
evidence:
  - text: >-
      对话即训练：Agent可以主动修改文档的内容，也就是你可以随时对Agent执行结果进行反馈，他会根据你的反馈去修改 system prompt
      文档中的内容，下次再执行就会按照新的标准执行。（更新Agent的行为就变得极其简单，自迭代）
    source: src_01KNWBWZAE6QMHK7SZWHENYFVY
    locator: 对话即训练 section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNWBS1GA2B4QC8BT3N8V4CPB
  - note_01KNWBS1HDA99YRYANV3R4FXCW
contradicts:
  - note_01KNWBS1GA2B4QC8BT3N8V4CPB
---
「对话即训练」打开了一个绕过「程序性记忆冻结」问题的旁路：通过让 Agent 直接修改 system prompt 文档，用户的反馈可以立刻改变 Agent 未来的行为——不需要重新训练权重，不需要 fine-tuning，只需要编辑一个文本文件。这实际上是把「程序性记忆」从模型权重降格到了文档层：行为规则写在可编辑的文档里，反馈驱动文档更新，更新立刻生效。这个机制的代价是：它依赖用户（或 Agent）主动维护文档的准确性，而权重层的程序性记忆一旦通过训练内化，就不需要外部维护。但它的优势也在于此：文档可读、可审计、可回滚，而权重更新是不透明的黑箱。「文档层的程序性记忆」和「权重层的程序性记忆」是可读性与自动化之间的真实 tradeoff。
