---
id: note_01KNW89DC9P6AQD3SCZ49JQRD5
type: note
text: >-
  JSON 键顺序不确定性是一个静默的 KV 缓存杀手——这个细节比它看起来更危险。KV 缓存命中的前提是 token 前缀完全匹配，单个 token
  的差异即可使从该位置开始的全部缓存失效。在多种语言/库中，序列化 JSON 的键顺序并不稳定，这意味着每次序列化可能产生不同的 token
  序列，从而悄无声息地破坏所有缓存。这个问题不会报错，不会产生功能故障，只会让推理成本悄悄飙升。工程实践要求：所有上下文序列化必须是确定性的——键排序、字段顺序都要显式锁定。
role: observation
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: 序列化必须确定性：JSON 键顺序在很多语言/库中不稳定，会静默破坏缓存
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: 缓存命中的前提：相同的 token 前缀'
qualifier: certain
voice: synthesized
scope: detail
structure_type: causal
related:
  - id: note_01KNW89DBKJ57Q53NP9ZY03EQ6
    note: >-
      Both describe how context details can cause unexpected performance
      degradation in LLM systems.
---
JSON 键顺序不确定性是一个静默的 KV 缓存杀手——这个细节比它看起来更危险。KV 缓存命中的前提是 token 前缀完全匹配，单个 token 的差异即可使从该位置开始的全部缓存失效。在多种语言/库中，序列化 JSON 的键顺序并不稳定，这意味着每次序列化可能产生不同的 token 序列，从而悄无声息地破坏所有缓存。这个问题不会报错，不会产生功能故障，只会让推理成本悄悄飙升。工程实践要求：所有上下文序列化必须是确定性的——键排序、字段顺序都要显式锁定。
