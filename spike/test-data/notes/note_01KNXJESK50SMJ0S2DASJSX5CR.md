---
id: note_01KNXJESK50SMJ0S2DASJSX5CR
type: note
text: >-
  LaCy is, at bottom, a solution to the 'unknown unknowns' problem in small
  model deployment. Factual hallucination in SLMs is not just about missing
  knowledge — it's about missing *metacognition* about that missing knowledge. A
  model that confidently predicts a wrong token is epistemically worse than one
  that knows to pause and ask. LaCy trains the metacognitive layer (when to call
  for help) as a first-class pretraining objective, not as a post-hoc patch.
  This reframes the hallucination problem: the target is not just 'fill in the
  right answer' but 'correctly classify tokens by epistemic status.'
role: frame
source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
status: active
created_at: '2026-04-11T06:07:52.909Z'
evidence:
  - text: >-
      LaCy models successfully learn which tokens to predict and where to
      delegate for help. This results in higher FactScores when generating in a
      cascade with a bigger model
    source: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
    locator: abstract
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
sees: >-
  Hallucination as a metacognitive failure — the model doesn't know what it
  doesn't know — not merely a content gap
ignores: >-
  Cases where the model is systematically confident in the wrong direction
  (confident wrong beliefs vs. uncertain correct beliefs)
---
LaCy is, at bottom, a solution to the 'unknown unknowns' problem in small model deployment. Factual hallucination in SLMs is not just about missing knowledge — it's about missing *metacognition* about that missing knowledge. A model that confidently predicts a wrong token is epistemically worse than one that knows to pause and ask. LaCy trains the metacognitive layer (when to call for help) as a first-class pretraining objective, not as a post-hoc patch. This reframes the hallucination problem: the target is not just 'fill in the right answer' but 'correctly classify tokens by epistemic status.'
