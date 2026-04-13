---
id: note_01KNW89DC6GRF2MYBHV7X74M37
type: note
text: >-
  「Mask，不要 Remove」是工具管理的架构原则，根基是上下文一致性。动态从上下文中移除工具定义会产生两个破坏性后果：一是历史
  action/observation 记录中引用了已消失的工具 schema，模型会产生困惑或幻觉；二是工具定义位于上下文前部（紧邻 system
  prompt），改动会使此后所有的 KV 缓存失效。Logit masking 解决了这两个问题：工具定义保持稳定（缓存不失效），被禁用的工具 token
  概率被直接压为 0（模型选不到）。这是「稳定上下文 + 解码层控制」的组合拳，比「动态上下文 + 模型自主选择」更可靠。
role: claim
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: >-
      模型困惑：历史 action/observation 引用了已被移除的工具 → schema 违规或幻觉；破坏 KV
      缓存：工具定义在序列化后位于上下文前部（紧跟 system prompt）→ 改动会使后续所有缓存失效
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: Mask Don''t Remove: 不要动态加载工具'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW4D0S7WEFJTNYYEZCF1T9W
---
「Mask，不要 Remove」是工具管理的架构原则，根基是上下文一致性。动态从上下文中移除工具定义会产生两个破坏性后果：一是历史 action/observation 记录中引用了已消失的工具 schema，模型会产生困惑或幻觉；二是工具定义位于上下文前部（紧邻 system prompt），改动会使此后所有的 KV 缓存失效。Logit masking 解决了这两个问题：工具定义保持稳定（缓存不失效），被禁用的工具 token 概率被直接压为 0（模型选不到）。这是「稳定上下文 + 解码层控制」的组合拳，比「动态上下文 + 模型自主选择」更可靠。
