---
id: note_01KNW4D0S8C6J6XX6FJEGW5R0E
type: note
text: >-
  The Go concurrency maxim — 'don't communicate by sharing memory, share memory
  by communicating' — maps directly onto multi-agent context design. The
  conventional instinct is to give agents a shared context window. Manus inverts
  this: agents communicate only via structured schema-constrained outputs,
  keeping their working memory isolated. The key recognition is that LLM
  attention is a scarce, pollutable resource. Context pollution is the LLM
  equivalent of a race condition — irrelevant tokens compete for attention and
  degrade signal quality.
role: observation
source: src_01KNW48T2SDFREKNV0RQAHH0ZG
status: active
created_at: '2026-04-10T16:43:00.258Z'
evidence:
  - text: >-
      原则（借鉴Go语言并发模型）：不要让agent共享同一个context开会，而是通过结构化的输出传递信息。Share memory by
      communicating, don't communicate by sharing memory.
    source: src_01KNW48T2SDFREKNV0RQAHH0ZG
    locator: 'Section: 上下文隔离, Manus Agent通信机制'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
The Go concurrency maxim — 'don't communicate by sharing memory, share memory by communicating' — maps directly onto multi-agent context design. The conventional instinct is to give agents a shared context window. Manus inverts this: agents communicate only via structured schema-constrained outputs, keeping their working memory isolated. The key recognition is that LLM attention is a scarce, pollutable resource. Context pollution is the LLM equivalent of a race condition — irrelevant tokens compete for attention and degrade signal quality.
