---
id: note_01KNW89DBND94XHNN7WGCKTG4Q
type: note
text: >-
  Few-shot 陷阱（上下文历史变成隐式行为示范）与 U-shaped attention
  bias（长上下文中早期目标被忽略）是同一个长上下文失效问题的两个方向：前者是模型被最近的局部模式「过度吸引」，后者是模型对早期的全局目标「关注不足」。两者都会导致
  Agent 在长任务中偏离最优行为，但病因相反——过拟合于近期模式 vs. 遗忘远期目标。这意味着「保持 Agent
  在长任务中的注意力」是一个双头问题：既要防止被近期历史锁定，又要防止丢失早期目标。
role: connection
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: >-
      LLM在长上下文或复杂任务中容易偏离主题、忘记早期目标（U-shaped attention
      bias）……上下文中的出现多次类似的执行（Few-shot），也可能让AI对其行为进行模型，陷入重复的行为模式
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: 如何让Agent在超长上下文的任务中保持注意力'
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: relationships
bridges:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
supports:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
---
Few-shot 陷阱（上下文历史变成隐式行为示范）与 U-shaped attention bias（长上下文中早期目标被忽略）是同一个长上下文失效问题的两个方向：前者是模型被最近的局部模式「过度吸引」，后者是模型对早期的全局目标「关注不足」。两者都会导致 Agent 在长任务中偏离最优行为，但病因相反——过拟合于近期模式 vs. 遗忘远期目标。这意味着「保持 Agent 在长任务中的注意力」是一个双头问题：既要防止被近期历史锁定，又要防止丢失早期目标。
