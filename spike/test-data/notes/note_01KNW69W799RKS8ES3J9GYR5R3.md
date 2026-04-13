---
id: note_01KNW69W799RKS8ES3J9GYR5R3
type: note
text: >-
  Model Router 将路由的目标从「专用 Agent 或 Prompt
  模板」升级为「不同的基础模型」，这是一个在现有知识库中尚未捕捉的架构层级。现有笔记讨论的路由，要么是 Canvas 那种代码层把用户操作硬路由到不同
  Prompt 模板，要么是标准 Agent 工作流中把任务路由给专用子
  Agent——两者路由的都是「行为」。而模型路由器路由的是「计算资源」本身：根据意图分类器的输出，将廉价查询导向轻量级模型，将复杂推理导向高端模型。这是成本-能力匹配问题，而非任务分解问题。两者在结构上相似（都有分类器+专用处理器），但在设计目标上截然不同：前者的路由轴是「任务类型→最优工具」，后者的路由轴是「任务复杂度→最优算力」。混淆这两种路由会导致误用：用模型路由解决能力差异问题，或用
  Agent 路由解决成本优化问题。
role: connection
source: src_01KNW67JWGN78T9RG747X8TG4E
status: active
created_at: '2026-04-10T17:16:14.441Z'
evidence:
  - text: 模型路由（Model Router）：通过意图分类器预测用户意图，使用不同的模型来响应不同类型的查询。
    source: src_01KNW67JWGN78T9RG747X8TG4E
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
  - note_01KNW67JSYJDTQRK9G9PEE5986
  - note_01KNW67JTP8B34GBD5XG6HJYAG
---
Model Router 将路由的目标从「专用 Agent 或 Prompt 模板」升级为「不同的基础模型」，这是一个在现有知识库中尚未捕捉的架构层级。现有笔记讨论的路由，要么是 Canvas 那种代码层把用户操作硬路由到不同 Prompt 模板，要么是标准 Agent 工作流中把任务路由给专用子 Agent——两者路由的都是「行为」。而模型路由器路由的是「计算资源」本身：根据意图分类器的输出，将廉价查询导向轻量级模型，将复杂推理导向高端模型。这是成本-能力匹配问题，而非任务分解问题。两者在结构上相似（都有分类器+专用处理器），但在设计目标上截然不同：前者的路由轴是「任务类型→最优工具」，后者的路由轴是「任务复杂度→最优算力」。混淆这两种路由会导致误用：用模型路由解决能力差异问题，或用 Agent 路由解决成本优化问题。
