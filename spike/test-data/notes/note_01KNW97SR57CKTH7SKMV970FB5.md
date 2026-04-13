---
id: note_01KNW97SR57CKTH7SKMV970FB5
type: note
text: >-
  The 'role-based multi-agent decomposition is anthropomorphism' critique cuts
  deeper than it first appears. When we design agents as 'Manager Agent +
  Designer Agent + Coder Agent + Reviewer Agent,' we are importing human
  cognitive constraints — the fact that individual humans cannot hold all roles
  simultaneously — into a system that has no such constraints. An LLM doesn't
  need a separate 'reviewer' agent because it lacks the attention to review
  while coding; it needs a separate agent only when reviewing would *pollute the
  coding context*. Role-based decomposition is a category error: it treats LLM
  architectural constraints (context window) as if they were human cognitive
  constraints (divided attention), and so imports the wrong solution. The right
  decomposition criterion is always: 'would co-locating these tasks in one
  context produce attention interference?' — not 'would one human do both
  tasks?'
role: claim
source: src_01KNW942AFYZ1TAZVA0YGYA9KE
status: active
created_at: '2026-04-10T18:07:32.077Z'
evidence:
  - text: |-
      按人类组织架构来分：Manager Agent + Designer Agent + Coder Agent + Reviewer Agent
      这是拟人化思维。人类这样分工是因为认知局限，LLM不一定需要。
      然后让它们「开会」、「讨论」、「协作」。
    source: src_01KNW942AFYZ1TAZVA0YGYA9KE
    locator: 'Section: 设计Multi-Agent时的常见误区'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
---
The 'role-based multi-agent decomposition is anthropomorphism' critique cuts deeper than it first appears. When we design agents as 'Manager Agent + Designer Agent + Coder Agent + Reviewer Agent,' we are importing human cognitive constraints — the fact that individual humans cannot hold all roles simultaneously — into a system that has no such constraints. An LLM doesn't need a separate 'reviewer' agent because it lacks the attention to review while coding; it needs a separate agent only when reviewing would *pollute the coding context*. Role-based decomposition is a category error: it treats LLM architectural constraints (context window) as if they were human cognitive constraints (divided attention), and so imports the wrong solution. The right decomposition criterion is always: 'would co-locating these tasks in one context produce attention interference?' — not 'would one human do both tasks?'
