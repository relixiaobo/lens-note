---
id: note_01KNW5ZVD88Y3NBSKB7MVE148J
type: note
text: >-
  工程化规划比提示式规划更稳定，根本原因在于：提示随上下文增长而被忽略，程序控制不会。当智能体执行多步骤任务时，上下文窗口不断增长，而模型对早期指令的遵循能力会随之衰减——这是一种系统性退化，不是偶发故障。工程师将规划步骤硬编码进执行流（如：写测试→写代码→跑测试），等于用代码锁定了注意力，绕开了提示被稀释的风险。这解释了为何「提示工程」在长任务中有内在上限：它依赖模型对提示的持续关注，而这种关注本身会随上下文累积而衰竭。
role: claim
source: src_01KNW5XBX3DHDN5C276Q059G57
status: active
created_at: '2026-04-10T17:10:45.928Z'
evidence:
  - text: 由于模型能处理的上下文长度有限，并且随着上下文长度的变长，提示可能会被忽略，所以通过工程的方式完成这个过程，比纯提示的方式更稳定。
    source: src_01KNW5XBX3DHDN5C276Q059G57
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
supports:
  - note_01KNVM1WCB4153AT7H4EGPGD6G
contradicts:
  - note_01KNW7204TPBP03YAEAZV47XTH
  - note_01KNW833H3QEYYYP65F4EXQ43A
---
工程化规划比提示式规划更稳定，根本原因在于：提示随上下文增长而被忽略，程序控制不会。当智能体执行多步骤任务时，上下文窗口不断增长，而模型对早期指令的遵循能力会随之衰减——这是一种系统性退化，不是偶发故障。工程师将规划步骤硬编码进执行流（如：写测试→写代码→跑测试），等于用代码锁定了注意力，绕开了提示被稀释的风险。这解释了为何「提示工程」在长任务中有内在上限：它依赖模型对提示的持续关注，而这种关注本身会随上下文累积而衰竭。
