---
id: src_01KNWAN527ENGP17D721BVSAQ5
type: source
source_type: markdown
title: how-we-built-our-multi-agent-research-system
word_count: 36
raw_file: raw/src_01KNWAN527ENGP17D721BVSAQ5.md
ingested_at: '2026-04-10T18:32:18.248Z'
created_at: '2026-04-10T18:32:18.248Z'
status: active
---
# How we built our multi-agent research system

Reading notes and highlights from this source.

- 多智能体的好处：在单Agent达到某个能力上限，难以完成某类复杂任务时，多Agent可能是一条可行的突破上限的解决方案。类比人类的的能力情况，一个人的能力或者智力是有限的，但是如果经过很好地合作，就可以用群体的能力或智力，突破这个上限。
- 多智能体的架构：Lead-Agent 和 多个 Sub-Agent
- 多智能体不适合需要所有代理共享相同上下文或涉及代理之间存在许多依赖关系的领域，比如编程
- 在使用 search 工具时，agent 通常倾向于构建 非常详细、具体的 query，这样可能搜索结果很少，为了克服这种倾向，可以建议 agent 从 简短、宽泛的 query 开始，评估可用的内容，然后逐渐缩小搜索范围
