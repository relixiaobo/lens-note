---
id: note_01KNWE2G7E6TXHQNZ3AF94NKE4
type: note
text: >-
  Ng's note that Tool Use was first developed in computer vision — because early
  LLMs couldn't process images — reveals something interesting about the general
  trajectory of agentic capabilities: many architectural patterns originate as
  *workarounds for model limitations*, then persist and become design principles
  even as those limitations are resolved. Tool use began as a way to give
  text-only LLMs access to visual information. Now, with multimodal models, this
  original necessity has dissolved — yet tool use has expanded and generalized
  into a core agentic design principle. This parallels how multi-agent
  architectures were initially driven by context window limits (a limitation now
  largely addressed by 1M+ token windows), yet multi-agent has persisted as a
  design principle for other reasons. The lesson: design patterns that originate
  as compensations for model limits tend to transcend those limits and become
  permanent structural choices — because the *architectural abstraction* proves
  valuable beyond the original limitation it was solving.
role: observation
source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
status: active
created_at: '2026-04-10T19:32:01.367Z'
evidence:
  - text: >-
      利用工具（Tool
      Use）：使用语言模型结合各种工具来扩展其功能，例如进行网页搜索、生成和运行代码等。这种方法最早在计算机视觉领域得到应用，因为早期的语言模型无法处理图像。
    source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
sees: >-
  Agentic design patterns as originating in limitation-compensation but
  persisting as intrinsic structural value
ignores: >-
  Whether some patterns truly are only compensations and will be abandoned once
  the underlying model limitation resolves
bridges:
  - note_01KNW6WT60XRZPWT2FNCKVGGCJ
  - note_01KNVKYSKR2XJJNGSWTB35HQEM
---
Ng's note that Tool Use was first developed in computer vision — because early LLMs couldn't process images — reveals something interesting about the general trajectory of agentic capabilities: many architectural patterns originate as *workarounds for model limitations*, then persist and become design principles even as those limitations are resolved. Tool use began as a way to give text-only LLMs access to visual information. Now, with multimodal models, this original necessity has dissolved — yet tool use has expanded and generalized into a core agentic design principle. This parallels how multi-agent architectures were initially driven by context window limits (a limitation now largely addressed by 1M+ token windows), yet multi-agent has persisted as a design principle for other reasons. The lesson: design patterns that originate as compensations for model limits tend to transcend those limits and become permanent structural choices — because the *architectural abstraction* proves valuable beyond the original limitation it was solving.
