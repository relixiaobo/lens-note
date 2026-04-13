---
id: note_01KNWCMZYFK7551P1CH34A9571
type: note
text: >-
  Prompt压缩的正确方法是「消融实验」（ablation）：逐个删除元素 → 测试输出 → 评估影响 → 决定丢弃或补回。这与
  note_01KNWB8046SEBR75TE0N4FJ4XC 的「Chesterton's Fence」原则构成有趣的张力：那个原则说不要轻易修改复杂
  prompt
  的结构，因为结构可能编码了不可见的隐性知识。但消融法恰恰是对「你不了解的那道围栏」的经验性调查方式——它不是盲目删除，而是通过删除来*实证发现*哪些部分是「承重墙」。消融法将
  Chesterton's Fence 的悖论转化成了一个可操作的实验程序：先拆，看会不会塌，不塌就是废墙。
role: connection
source: src_01KNWCJKVBC80DEFRBM9YHAEQT
status: active
created_at: '2026-04-10T19:07:10.159Z'
evidence:
  - text: 可以通过尝试重复（删除 --> 测试 --> 影响 --> 丢弃/补回）的方式，发现prompt中的核心词，可以大幅压缩废话
    source: src_01KNWCJKVBC80DEFRBM9YHAEQT
    locator: src_01KNWCJKVBC80DEFRBM9YHAEQT body
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNWB8046SEBR75TE0N4FJ4XC
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
supports:
  - note_01KNWB8046SEBR75TE0N4FJ4XC
---
Prompt压缩的正确方法是「消融实验」（ablation）：逐个删除元素 → 测试输出 → 评估影响 → 决定丢弃或补回。这与 note_01KNWB8046SEBR75TE0N4FJ4XC 的「Chesterton's Fence」原则构成有趣的张力：那个原则说不要轻易修改复杂 prompt 的结构，因为结构可能编码了不可见的隐性知识。但消融法恰恰是对「你不了解的那道围栏」的经验性调查方式——它不是盲目删除，而是通过删除来*实证发现*哪些部分是「承重墙」。消融法将 Chesterton's Fence 的悖论转化成了一个可操作的实验程序：先拆，看会不会塌，不塌就是废墙。
