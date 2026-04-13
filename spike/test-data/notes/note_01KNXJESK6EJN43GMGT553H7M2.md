---
id: note_01KNXJESK6EJN43GMGT553H7M2
type: note
text: >-
  The LaCy approach reveals a hidden assumption in all standard language model
  pretraining: that every token in a document is equally worth learning. But
  tokens have vastly different epistemic statuses — some are syntactically
  determined, some are stylistically flexible, some are factual claims with a
  single correct answer, some are names or dates that require specific world
  knowledge. Treating them all identically in the loss is an architectural
  choice that has never been made explicit. LaCy makes this visible by showing
  that selective token learning — filtered by a grammar parser — materially
  improves downstream factuality. The implication is that uniform-token
  pretraining may be a fundamental inefficiency that scales can overcome
  brute-force but smaller models cannot afford.
role: claim
source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
status: active
created_at: '2026-04-11T06:07:52.909Z'
evidence:
  - text: >-
      we study the fundamental question of which tokens an SLM can and should
      learn during pretraining... we find that this is not simply a question of
      loss
    source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
    locator: abstract
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNXJESK38P7466BYB6YHMXJG
---
The LaCy approach reveals a hidden assumption in all standard language model pretraining: that every token in a document is equally worth learning. But tokens have vastly different epistemic statuses — some are syntactically determined, some are stylistically flexible, some are factual claims with a single correct answer, some are names or dates that require specific world knowledge. Treating them all identically in the loss is an architectural choice that has never been made explicit. LaCy makes this visible by showing that selective token learning — filtered by a grammar parser — materially improves downstream factuality. The implication is that uniform-token pretraining may be a fundamental inefficiency that scales can overcome brute-force but smaller models cannot afford.
