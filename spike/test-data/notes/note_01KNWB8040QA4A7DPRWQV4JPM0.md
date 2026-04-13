---
id: note_01KNWB8040QA4A7DPRWQV4JPM0
type: note
text: >-
  The meta-prompt's insistence on reasoning-before-conclusions — and its
  explicit instruction to *reverse* example order if the user provides examples
  with conclusions first — is a rare case of prompt design actively overriding
  the user's demonstrated cognitive style. Most prompt design principles are
  additive (add context, add examples, add format specs). This one is
  subtractive-corrective: it says the user is *wrong about the ordering* and the
  prompt generator should fix it silently. The justification is implicit but
  clear: models learn from examples by pattern-matching, so if examples show
  conclusions first, the model will conclude first. This is a structural
  argument about few-shot learning mechanics, not a style preference. It
  connects to note_01KNVM1WCEMNPX3Y3EXP1FTSE0's point about reasoning
  transparency — if reasoning must precede conclusion in generated outputs, the
  same principle applies to the training signal provided by examples.
role: connection
source: src_01KNWB5189GPFMY5DVC42190H8
status: active
created_at: '2026-04-10T18:42:35.756Z'
evidence:
  - text: >-
      Reasoning Before Conclusions: Encourage reasoning steps before any
      conclusions are reached. ATTENTION! If the user provides examples where
      the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES
      WITH CONCLUSIONS!
    source: src_01KNWB5189GPFMY5DVC42190H8
    locator: Reasoning Before Conclusions bullet
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVM1WCEMNPX3Y3EXP1FTSE0
supports:
  - note_01KNVM1WCEMNPX3Y3EXP1FTSE0
---
The meta-prompt's insistence on reasoning-before-conclusions — and its explicit instruction to *reverse* example order if the user provides examples with conclusions first — is a rare case of prompt design actively overriding the user's demonstrated cognitive style. Most prompt design principles are additive (add context, add examples, add format specs). This one is subtractive-corrective: it says the user is *wrong about the ordering* and the prompt generator should fix it silently. The justification is implicit but clear: models learn from examples by pattern-matching, so if examples show conclusions first, the model will conclude first. This is a structural argument about few-shot learning mechanics, not a style preference. It connects to note_01KNVM1WCEMNPX3Y3EXP1FTSE0's point about reasoning transparency — if reasoning must precede conclusion in generated outputs, the same principle applies to the training signal provided by examples.
