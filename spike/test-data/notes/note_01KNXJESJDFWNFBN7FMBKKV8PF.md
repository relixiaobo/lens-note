---
id: note_01KNXJESJDFWNFBN7FMBKKV8PF
type: note
text: >-
  LaCy exposes a fundamental flaw in using training loss as a proxy for 'what a
  model should learn': high loss can mean either (a) the model is genuinely
  ignorant of a fact, or (b) the model is choosing one valid continuation among
  many. These are epistemically opposite situations — one calls for delegation,
  the other for confident prediction — yet they produce identical loss signals.
  This is a case where the metric (cross-entropy loss) conflates two distinct
  failure modes, and conflating them makes the metric unfit as a training
  signal.
role: claim
source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
status: active
created_at: '2026-04-11T06:07:52.909Z'
evidence:
  - text: >-
      some tokens are acceptable in that they are truthful alternative
      continuations of a pretraining document, and should not trigger a <CALL>
      even if their loss is high
    source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
    locator: abstract
qualifier: certain
voice: synthesized
scope: big_picture
structure_type: argument
---
LaCy exposes a fundamental flaw in using training loss as a proxy for 'what a model should learn': high loss can mean either (a) the model is genuinely ignorant of a fact, or (b) the model is choosing one valid continuation among many. These are epistemically opposite situations — one calls for delegation, the other for confident prediction — yet they produce identical loss signals. This is a case where the metric (cross-entropy loss) conflates two distinct failure modes, and conflating them makes the metric unfit as a training signal.
