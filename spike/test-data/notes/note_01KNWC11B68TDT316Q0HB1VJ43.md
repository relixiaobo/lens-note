---
id: note_01KNWC11B68TDT316Q0HB1VJ43
type: note
text: >-
  「文档即规则」这个设计范式，是对 agent skills 架构（L1/L2/L3
  渐进加载）的「去工程化」版本：技术方案需要开发者设计目录结构、metadata、触发机制；而 Notion Agent 的方案是让普通用户直接编辑一个
  system prompt 文档，Agent
  自动加载。两者都在解决「持久化行为规范」的问题，但面向不同的受众。这个对比揭示了一个更深的设计张力：越工程化（L1/L2/L3
  结构），越高效但越不可及；越文档化（直接写 system prompt），越可及但越难以规模化。「文档即规则」可能是 skills
  架构的「人门级实现」——它牺牲了 token 效率，换取了零门槛的可编辑性。
role: connection
source: src_01KNWBWZAE6QMHK7SZWHENYFVY
status: active
created_at: '2026-04-10T18:56:16.203Z'
evidence:
  - text: >-
      文档即规则，笔记不再只是静态的记录，而是可以作为被自动加载、随时可改、立即生效的 system
      prompt，成为被执行的规则、可以被复用和验证的经验。
    source: src_01KNWBWZAE6QMHK7SZWHENYFVY
    locator: 文档即规则 section
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW7XVT38DPG0HX1X9M6EYPW
  - note_01KNW9BGT9RKD6W6KQK5VGKRE0
---
「文档即规则」这个设计范式，是对 agent skills 架构（L1/L2/L3 渐进加载）的「去工程化」版本：技术方案需要开发者设计目录结构、metadata、触发机制；而 Notion Agent 的方案是让普通用户直接编辑一个 system prompt 文档，Agent 自动加载。两者都在解决「持久化行为规范」的问题，但面向不同的受众。这个对比揭示了一个更深的设计张力：越工程化（L1/L2/L3 结构），越高效但越不可及；越文档化（直接写 system prompt），越可及但越难以规模化。「文档即规则」可能是 skills 架构的「人门级实现」——它牺牲了 token 效率，换取了零门槛的可编辑性。
