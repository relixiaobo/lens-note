---
id: note_01KNWCMZZ65N5YA21AKYNJSM1T
type: note
text: >-
  Prompt 消融法（删除→测试→评估→决策）本质上是把机器学习中的「消融研究」（ablation study）移植到提示词工程中。ML
  消融研究通过逐步移除模型组件来测量每个组件的贡献；prompt
  消融同理，把提示词的每个元素视为「假说中的功能组件」，通过去除来测量其实际效力。这种方法论迁移揭示一个更深的原则：**有效性应由实验决定，而非直觉**。「这句话听起来很重要」不是保留它的理由；「删掉它之后输出变差了」才是。提示词工程与科学实验的关键共同点：你的直觉关于「哪些部分重要」系统性地不可靠。
role: claim
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
supports:
  - note_01KNWCMZYFK7551P1CH34A9571
---
Prompt 消融法（删除→测试→评估→决策）本质上是把机器学习中的「消融研究」（ablation study）移植到提示词工程中。ML 消融研究通过逐步移除模型组件来测量每个组件的贡献；prompt 消融同理，把提示词的每个元素视为「假说中的功能组件」，通过去除来测量其实际效力。这种方法论迁移揭示一个更深的原则：**有效性应由实验决定，而非直觉**。「这句话听起来很重要」不是保留它的理由；「删掉它之后输出变差了」才是。提示词工程与科学实验的关键共同点：你的直觉关于「哪些部分重要」系统性地不可靠。
