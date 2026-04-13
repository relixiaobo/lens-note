---
id: note_01KNVM1WCB4153AT7H4EGPGD6G
type: note
text: >-
  The distinction between *maximum* context window and *effective* context
  window is a hidden model limitation that doesn't get resolved by simply
  increasing context length. Different tasks have radically different effective
  windows — a summary task might degrade with too much context
  (lost-in-the-middle), while a multi-hop reasoning task needs dense context.
  This means 'longer context = better' is a false heuristic: the parameter that
  matters is whether the task's actual context demand fits within the model's
  effective (not maximum) working window for that task type.
role: observation
source: src_01KNVKYWQDSM4MNH0P9J97Q9JT
status: active
created_at: '2026-04-10T11:57:18.074Z'
evidence:
  - text: 模型能够容纳的最大窗口和有效工作窗口是两个概念，并且不同的任务的有效窗口大小可能是非常不一致的。
    source: src_01KNVKYWQDSM4MNH0P9J97Q9JT
    locator: note 11
  - text: 大模型的上下文窗口是有限的，并且超出「有效工作窗口」的长度后，回答的准确率会直线下降，目前产品上的一个挑战就是让两者达到平衡的可接受状态。
    source: src_01KNW7GK86KXMMH7T2PMC7RG6D
    locator: bullet 3
qualifier: presumably
voice: synthesized
scope: detail
structure_type: description
---
The distinction between *maximum* context window and *effective* context window is a hidden model limitation that doesn't get resolved by simply increasing context length. Different tasks have radically different effective windows — a summary task might degrade with too much context (lost-in-the-middle), while a multi-hop reasoning task needs dense context. This means 'longer context = better' is a false heuristic: the parameter that matters is whether the task's actual context demand fits within the model's effective (not maximum) working window for that task type.
