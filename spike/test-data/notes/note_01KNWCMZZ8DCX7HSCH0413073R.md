---
id: note_01KNWCMZZ8DCX7HSCH0413073R
type: note
text: >-
  Prompt
  消融法是「提示随上下文增长而被忽略」这一系统性退化的一个适应性对策（note_01KNW5ZVD88Y3NBSKB7MVE148J）。如果注意力是稀缺且随
  context 增长而衰减的，那么 prompt 越精简，每个 token 分得的注意力权重就越高。消融压缩的目标不只是「节省
  token」，更是「提升每个保留 token 的信噪比」。这意味着一个简洁的 50-token prompt 在长对话中可能比 200-token 的同义
  prompt 表现更稳定——因为前者在不断增长的 context 中的相对权重更大。
role: connection
source: src_01KNWCJKVBC80DEFRBM9YHAEQT
status: active
created_at: '2026-04-10T19:07:10.159Z'
evidence:
  - text: 可以通过尝试重复（删除 --> 测试 --> 影响 --> 丢弃/补回）的方式，发现prompt中的核心词，可以大幅压缩废话
    source: src_01KNWCJKVBC80DEFRBM9YHAEQT
    locator: src_01KNWCJKVBC80DEFRBM9YHAEQT body
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
  - note_01KNWCGCKBNK5NXE1P4WBRDX54
supports:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
---
Prompt 消融法是「提示随上下文增长而被忽略」这一系统性退化的一个适应性对策（note_01KNW5ZVD88Y3NBSKB7MVE148J）。如果注意力是稀缺且随 context 增长而衰减的，那么 prompt 越精简，每个 token 分得的注意力权重就越高。消融压缩的目标不只是「节省 token」，更是「提升每个保留 token 的信噪比」。这意味着一个简洁的 50-token prompt 在长对话中可能比 200-token 的同义 prompt 表现更稳定——因为前者在不断增长的 context 中的相对权重更大。
