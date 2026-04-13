---
id: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
type: source
source_type: markdown
title: building-an-efficient-rag-system-part-2
word_count: 107
raw_file: raw/src_01KNW8KCKXCD1H8AHFPC6X1TZ8.md
ingested_at: '2026-04-10T17:56:23.293Z'
created_at: '2026-04-10T17:56:23.293Z'
status: active
---
# Building an Efficient RAG System: Part 2

Reading notes and highlights from this source.

- 如何评估 RAG 系统？
  - 谁来评估？
    - human evaluation
    - Evaluation Framework
      - 1. 基于 llama 2 训练一个评测模型（验证召回率和引文精度）
      - 2. 构建大量的评测集，并且根据线上的数据自动抽样生成评测集
      - 3. RAG 核心模块改动后，会有 CI 自动运行整个评测框架，并生成数据埋点和报表
  - 理想的 RAG 系统应该是：
    - 高引用召回率（high citation recall），即所有的生成内容都有引用（外部知识）充分支持
    - 高引用精度（high citation precision），即每个引用是否真的支持生成的内容
  - 论文对 4 个主流的 Generative Search Engine 进行了评估：
    - YouChat
    - Perplexity
    - NeevaAI（已经被 Snowflake 收购）
    - Bing Chat
  - 一个值得信赖的 Generative Search Engine 的先决条件就是：可验证性（verifiability）。
  - 评测集：每次 RAG 优化了之后就可以重新跑一遍评测集，来确定相关指标的变化，这样就可以宏观上来判断整个 RAG 系统是在变好还是在变差了。评测集 评测集的选定应该与 RAG 对应的场景所吻合。
  - 采用了 4 个指标来进行评估：
    - 4. citation precision，引文精度，引文中支持生成内容的比例
    - 1. fluency，流畅性，生成的文本是否流畅连贯
    - 3. citation recall，引文召回率，所生成的内容完全得到引文支持的比例
    - 2. perceived utility，实用性，生成的内容是否有用
