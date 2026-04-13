---
id: note_01KNW8PNVD7AWR7P5T79SXG74P
type: note
text: >-
  「线上数据自动抽样生成评测集」是对「测试集是设计工件」命题的一个重要补丁：不是否定设计的重要性，而是用生产流量作为设计的输入源。现有知识（note_01KNW5GTRF66HF2HYKXNNKE2E7）强调测试集应基于对失败空间的理解而被刻意设计，但那个框架没有解决「如何动态更新测试集以反映真实分布变化」的问题。RAG
  系统的这个实践提供了一条路径：以 CI 触发评估 + 从线上流量自动采样 =
  让测试集随产品演化，而不是一次性设计后固化。这是评估基础设施的一个重要工程化结论。
role: connection
source: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
status: active
created_at: '2026-04-10T17:58:11.044Z'
evidence:
  - text: 构建大量的评测集，并且根据线上的数据自动抽样生成评测集；RAG 核心模块改动后，会有 CI 自动运行整个评测框架，并生成数据埋点和报表
    source: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
    locator: src_01KNW8KCKXCD1H8AHFPC6X1TZ8 Evaluation Framework
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW5GTRF66HF2HYKXNNKE2E7
  - note_01KNVM1WC678Z421AA8GR88WMH
supports:
  - note_01KNW5GTRF66HF2HYKXNNKE2E7
---
「线上数据自动抽样生成评测集」是对「测试集是设计工件」命题的一个重要补丁：不是否定设计的重要性，而是用生产流量作为设计的输入源。现有知识（note_01KNW5GTRF66HF2HYKXNNKE2E7）强调测试集应基于对失败空间的理解而被刻意设计，但那个框架没有解决「如何动态更新测试集以反映真实分布变化」的问题。RAG 系统的这个实践提供了一条路径：以 CI 触发评估 + 从线上流量自动采样 = 让测试集随产品演化，而不是一次性设计后固化。这是评估基础设施的一个重要工程化结论。
