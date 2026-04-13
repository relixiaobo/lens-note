---
id: note_01KNW6WT60XRZPWT2FNCKVGGCJ
type: note
text: >-
  As context windows grow (1M+ tokens), the isolation-based argument for
  multi-agent weakens for many tasks — a single agent that could previously only
  handle a chapter can now handle the whole book. This suggests multi-agent
  architecture has an inverse relationship with context window size: its
  necessity as a *size workaround* shrinks as models improve. What remains is
  multi-agent's value for *genuine parallelism* (independent tasks that don't
  need to share state) and *irreducible isolation* (tasks where contamination is
  a semantic problem, not just a size problem). The question 'is multi-agent
  always necessary?' thus has a temporal answer: less necessary over time for
  most tasks, but permanently necessary for a subset of structurally independent
  or contamination-sensitive workloads.
role: claim
source: src_01KNW6TDDHA1EWC7EREWSRE8JS
status: active
created_at: '2026-04-10T17:26:34.927Z'
evidence:
  - text: 什么时候该用多智能体是不是一定要用多智能体
    source: src_01KNW6TDDHA1EWC7EREWSRE8JS
    locator: title
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
  - note_01KNVM1WBT33XX9WC3SM3K733T
  - note_01KNW4MTJEXRZWG6TP8JH4QM4X
---
As context windows grow (1M+ tokens), the isolation-based argument for multi-agent weakens for many tasks — a single agent that could previously only handle a chapter can now handle the whole book. This suggests multi-agent architecture has an inverse relationship with context window size: its necessity as a *size workaround* shrinks as models improve. What remains is multi-agent's value for *genuine parallelism* (independent tasks that don't need to share state) and *irreducible isolation* (tasks where contamination is a semantic problem, not just a size problem). The question 'is multi-agent always necessary?' thus has a temporal answer: less necessary over time for most tasks, but permanently necessary for a subset of structurally independent or contamination-sensitive workloads.
