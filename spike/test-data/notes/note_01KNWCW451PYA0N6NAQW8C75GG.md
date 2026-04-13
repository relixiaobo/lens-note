---
id: note_01KNWCW451PYA0N6NAQW8C75GG
type: note
text: >-
  「大模型一切行为都是幻觉」这个命题，若成立，则从根本上动摇了任何以「消除幻觉」为目标的工程路线图。RAG、引文验证、事实核查层——这些方法的设计前提是：存在一类「真实」输出和一类「幻觉」输出，工程手段可以让模型更频繁地走向前者。但如果两者机制上无差异，那这些手段实际上做的是：通过约束上下文（RAG）或后验过滤（引文验证），在采样结果中选择「人类可以验证为有用」的子集。换言之，RAG
  不是让模型「更真实」，而是让模型的采样分布向「可验证子集」倾斜。这与 note_01KNW8PNVV2CC7YNPRK8Y4EW1V 描述的 RAG
  评估张力形成新的汇聚：那个笔记说评估框架强制解耦「表面质量」与「知识真实性」；这里的洞察是：这两个维度之间的张力，来自于「真实性」这个概念本身对 LLM
  是错配的范畴。
role: observation
source: src_01KNWCRAJW51HY5PX1B4S38RMS
status: active
created_at: '2026-04-10T19:11:03.807Z'
evidence:
  - text: 大模型的一切行为可能都是幻觉，而我们只是在其中发现了一些有用的部分。
    source: src_01KNWCRAJW51HY5PX1B4S38RMS
    locator: sole bullet point
qualifier: tentative
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW8PNVV2CC7YNPRK8Y4EW1V
---
「大模型一切行为都是幻觉」这个命题，若成立，则从根本上动摇了任何以「消除幻觉」为目标的工程路线图。RAG、引文验证、事实核查层——这些方法的设计前提是：存在一类「真实」输出和一类「幻觉」输出，工程手段可以让模型更频繁地走向前者。但如果两者机制上无差异，那这些手段实际上做的是：通过约束上下文（RAG）或后验过滤（引文验证），在采样结果中选择「人类可以验证为有用」的子集。换言之，RAG 不是让模型「更真实」，而是让模型的采样分布向「可验证子集」倾斜。这与 note_01KNW8PNVV2CC7YNPRK8Y4EW1V 描述的 RAG 评估张力形成新的汇聚：那个笔记说评估框架强制解耦「表面质量」与「知识真实性」；这里的洞察是：这两个维度之间的张力，来自于「真实性」这个概念本身对 LLM 是错配的范畴。
