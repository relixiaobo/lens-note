---
id: note_01KNW89DBKJ57Q53NP9ZY03EQ6
type: note
text: >-
  Few-shot 陷阱是 Agent 行为退化的一种特定形式：当上下文充满同类「行动→观察」记录时，LLM
  会将其视为隐式示范，把模仿这些模式当成「正确做法」——即使这已不再是最优选择。这与 LLM
  的核心能力（模式匹配与续写）产生了结构性冲突：同质化的上下文历史既是执行记录，又是无意中构造的 few-shot
  prompt。长重复任务（如审阅20份简历）会触发这个陷阱，使 Agent
  陷入机械重复而非自适应推理。这提示了一个未被充分认识的上下文毒化来源：不是「噪音」，而是过于一致的「信号」。
role: claim
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: LLM 是优秀的模仿者。当上下文中充满相似的「行动→观察」记录时，模型会陷入「节奏感」，机械重复过去的行为模式——即使这已经不是最优选择。
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: Agent 在多次执行重复的任务后，容易陷入 Few-shot 陷阱'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
---
Few-shot 陷阱是 Agent 行为退化的一种特定形式：当上下文充满同类「行动→观察」记录时，LLM 会将其视为隐式示范，把模仿这些模式当成「正确做法」——即使这已不再是最优选择。这与 LLM 的核心能力（模式匹配与续写）产生了结构性冲突：同质化的上下文历史既是执行记录，又是无意中构造的 few-shot prompt。长重复任务（如审阅20份简历）会触发这个陷阱，使 Agent 陷入机械重复而非自适应推理。这提示了一个未被充分认识的上下文毒化来源：不是「噪音」，而是过于一致的「信号」。
