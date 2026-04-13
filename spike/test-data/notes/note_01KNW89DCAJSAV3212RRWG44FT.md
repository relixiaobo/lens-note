---
id: note_01KNW89DCAJSAV3212RRWG44FT
type: note
text: >-
  Planner sub-agent 是对「目标重述」方案的一次精确的效率重构。Manus 早期方案是把全局计划不断「复述」到上下文末尾（并维护
  todo.md），这样做确实对抗了 U-shaped attention 偏差——但代价是约 30%
  的操作变成了维护上下文结构本身的开销，而非真正推进任务。Planner sub-agent 的解法是：将规划能力从主 Agent
  上下文中剥离，只在需要时注入结构化 Plan 对象。这不只是优化——它是对「上下文管理」和「任务执行」职责分离的架构升级，与 Manus 用
  sub-agent 做「上下文隔离」的核心思路一脉相承。
role: connection
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: >-
      早期方案的问题：约30%的操作用于更新todo列表，token浪费严重。新方案：使用专门的 Planner
      sub-agent，仅在需要时注入上下文，而非每轮都消耗token
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: 如何让Agent在超长上下文的任务中保持注意力'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
supports:
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
---
Planner sub-agent 是对「目标重述」方案的一次精确的效率重构。Manus 早期方案是把全局计划不断「复述」到上下文末尾（并维护 todo.md），这样做确实对抗了 U-shaped attention 偏差——但代价是约 30% 的操作变成了维护上下文结构本身的开销，而非真正推进任务。Planner sub-agent 的解法是：将规划能力从主 Agent 上下文中剥离，只在需要时注入结构化 Plan 对象。这不只是优化——它是对「上下文管理」和「任务执行」职责分离的架构升级，与 Manus 用 sub-agent 做「上下文隔离」的核心思路一脉相承。
