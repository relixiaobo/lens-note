---
id: note_01KNWE66MFDZGHPCMK450QFMFX
type: note
text: >-
  工具的「不添加」和「添加」同等重要。这篇文章明确指出：设计工具集时，「选择不添加什么工具」与「选择添加什么工具」是对称的决策。这个洞察与
  `note_01KNW4D0S7WEFJTNYYEZCF1T9W`（Manus 架构解决「更多工具=更笨的 Agent」）形成了互补：Manus
  的解法是架构层面的（分层，把多余工具隔离到 bash 层），而本文的解法是设计层面的（从一开始就不暴露冗余工具）。两者针对同一问题的不同阶段：Manus
  的方案是「可以有很多工具，但架构上管理它们的可见性」；本文的方案是「从任务出发，只给 Agent 它真正需要的工具」。前者是架构缓解，后者是源头控制。
role: connection
source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
status: active
created_at: '2026-04-10T19:34:02.607Z'
evidence:
  - text: 过多的工具会分散 Agent 的注意力，设计工具是既要选择添加什么工具，也要选择不添加什么工具
    source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
    locator: 'Section: 为 Agent 选择合适的工具'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW4D0S7WEFJTNYYEZCF1T9W
supports:
  - note_01KNW4D0S7WEFJTNYYEZCF1T9W
---
工具的「不添加」和「添加」同等重要。这篇文章明确指出：设计工具集时，「选择不添加什么工具」与「选择添加什么工具」是对称的决策。这个洞察与 `note_01KNW4D0S7WEFJTNYYEZCF1T9W`（Manus 架构解决「更多工具=更笨的 Agent」）形成了互补：Manus 的解法是架构层面的（分层，把多余工具隔离到 bash 层），而本文的解法是设计层面的（从一开始就不暴露冗余工具）。两者针对同一问题的不同阶段：Manus 的方案是「可以有很多工具，但架构上管理它们的可见性」；本文的方案是「从任务出发，只给 Agent 它真正需要的工具」。前者是架构缓解，后者是源头控制。
