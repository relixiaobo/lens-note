---
id: src_01KNW5XBX3DHDN5C276Q059G57
type: source
source_type: markdown
title: 为智能体进行规划-译
word_count: 14
raw_file: raw/src_01KNW5XBX3DHDN5C276Q059G57.md
ingested_at: '2026-04-10T17:09:24.515Z'
created_at: '2026-04-10T17:09:24.515Z'
status: active
---
# 为智能体进行规划 [译]

Reading notes and highlights from this source.

- 很多时候，模型不能完成规划或推理任务，是因为提示中没有包含足够的上下文信息。
- 在模型的规划能力不足时，可以将部分规划责任从LLM转移到工程师身上，由工程师直接帮助LLM进行规划有助于特定领域的问题的解决，比如在编码任务中，让LLM先编写测试，然后写代码，再运行测试等。由于模型能处理的上下文长度有限，并且随着上下文长度的变长，提示可能会被忽略，所以通过工程的方式完成这个过程，比纯提示的方式更稳定。
