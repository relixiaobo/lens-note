---
id: note_01KNW8PNV4RK4SZXDTQRB4EJMH
type: note
text: >-
  RAG 评估中的「引文召回率 vs. 引文精度」双轴框架，是信息检索中 Precision/Recall 的生成侧镜像。传统 IR 的
  recall/precision 衡量的是「检索到了什么」；而 RAG 的 citation recall/precision
  衡量的是「生成内容是否被引文充分支持」。两者结构同形，但层次不同：前者在检索层，后者在生成层。这意味着一个 RAG
  系统可能在检索层做得很好（召回了正确文档），却在生成层失败（生成的内容未引用那些文档，或引用了不支持的文档）。将两者都纳入评估，才能定位质量问题发生在哪一层。
role: claim
source: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
status: active
created_at: '2026-04-10T17:58:11.044Z'
evidence:
  - text: >-
      高引用召回率（high citation recall），即所有的生成内容都有引用（外部知识）充分支持；高引用精度（high citation
      precision），即每个引用是否真的支持生成的内容
    source: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
    locator: src_01KNW8KCKXCD1H8AHFPC6X1TZ8 理想的 RAG 系统应该是
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNWB8049G1C0FVQSMEK6BHSW
---
RAG 评估中的「引文召回率 vs. 引文精度」双轴框架，是信息检索中 Precision/Recall 的生成侧镜像。传统 IR 的 recall/precision 衡量的是「检索到了什么」；而 RAG 的 citation recall/precision 衡量的是「生成内容是否被引文充分支持」。两者结构同形，但层次不同：前者在检索层，后者在生成层。这意味着一个 RAG 系统可能在检索层做得很好（召回了正确文档），却在生成层失败（生成的内容未引用那些文档，或引用了不支持的文档）。将两者都纳入评估，才能定位质量问题发生在哪一层。
