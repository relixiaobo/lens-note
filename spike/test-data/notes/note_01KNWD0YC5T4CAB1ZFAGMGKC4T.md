---
id: note_01KNWD0YC5T4CAB1ZFAGMGKC4T
type: note
text: >-
  这条笔记的措辞将「探索空间」（exploration space）与「计算资源」（compute）并列，这是一个值得辨析的区分。Bitter Lesson
  的经典表述通常强调算力（compute），但探索空间是另一个独立维度：它指的是假设空间的广度——系统被允许尝试多少种策略、覆盖多少种状态。一个计算资源丰富但探索空间被严格约束的系统（比如只允许在手工设计的行为库中搜索），仍然会受到人类知识注入的天花板约束。真正意义上的「规模胜出」需要两者同时：足够的算力来搜索，以及足够宽广的空间来搜索。这对
  agent 设计有直接含义：限制 agent 的行动空间（action space）是一种隐性的知识注入，即使模型本身是无约束的。
role: claim
source: src_01KNWCYFR0D5T360BYJ1AN78H1
status: active
created_at: '2026-04-10T19:13:41.749Z'
evidence:
  - text: 为其提供足够的计算资源和探索空间
    source: src_01KNWCYFR0D5T360BYJ1AN78H1
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
assumptions:
  - 探索空间（hypothesis/action space）与计算资源是可以独立变化的两个维度
  - 限制 action space 在功能上等价于知识注入
supports:
  - note_01KNVKVZCNS5PAPJXR8DM78WQ6
---
这条笔记的措辞将「探索空间」（exploration space）与「计算资源」（compute）并列，这是一个值得辨析的区分。Bitter Lesson 的经典表述通常强调算力（compute），但探索空间是另一个独立维度：它指的是假设空间的广度——系统被允许尝试多少种策略、覆盖多少种状态。一个计算资源丰富但探索空间被严格约束的系统（比如只允许在手工设计的行为库中搜索），仍然会受到人类知识注入的天花板约束。真正意义上的「规模胜出」需要两者同时：足够的算力来搜索，以及足够宽广的空间来搜索。这对 agent 设计有直接含义：限制 agent 的行动空间（action space）是一种隐性的知识注入，即使模型本身是无约束的。
