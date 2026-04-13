---
id: note_01KNXJESK38P7466BYB6YHMXJG
type: note
text: >-
  The <CALL> token in LaCy is architecturally the same primitive as the agent's
  'tool call' — but instantiated at pretraining time and at the token level. The
  existing knowledge base notes that agents route to external state via tools
  and retrieval (note_01KNVKYSM6V7XEJ92YQVWDET45). What LaCy adds is: the
  routing decision itself can be *baked into the weights* during pretraining,
  not just wired into a scaffold at inference time. This is a meaningful
  distinction: it means the SLM can learn *when* it doesn't know something, not
  just *how* to call for help after the fact. The model's uncertainty becomes an
  intrinsic competence rather than an externally-detected failure.
role: connection
source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
status: active
created_at: '2026-04-11T06:07:52.909Z'
evidence:
  - text: >-
      which tokens an SLM can and should learn during pretraining, versus which
      ones it should delegate via a <CALL> token
    source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
    locator: abstract
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKYSM6V7XEJ92YQVWDET45
  - note_01KNWBS1GA2B4QC8BT3N8V4CPB
supports:
  - note_01KNVKYSM6V7XEJ92YQVWDET45
---
The <CALL> token in LaCy is architecturally the same primitive as the agent's 'tool call' — but instantiated at pretraining time and at the token level. The existing knowledge base notes that agents route to external state via tools and retrieval (note_01KNVKYSM6V7XEJ92YQVWDET45). What LaCy adds is: the routing decision itself can be *baked into the weights* during pretraining, not just wired into a scaffold at inference time. This is a meaningful distinction: it means the SLM can learn *when* it doesn't know something, not just *how* to call for help after the fact. The model's uncertainty becomes an intrinsic competence rather than an externally-detected failure.
