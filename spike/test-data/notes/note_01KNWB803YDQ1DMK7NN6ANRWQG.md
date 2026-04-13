---
id: note_01KNWB803YDQ1DMK7NN6ANRWQG
type: note
text: >-
  The meta-prompt encodes a specific security principle: include constants
  (guides, rubrics, examples) directly in the prompt because they are 'not
  susceptible to prompt injection.' This is a precise claim: constants embedded
  in a system prompt cannot be overridden by adversarial user input in the way
  that dynamic variables can. The underlying logic is that prompt injection
  attacks exploit the model's inability to distinguish 'legitimate instruction
  from the system' from 'instruction injected via user input' — but hard-coded
  content in the system prompt sits at a higher trust level by virtue of
  position, not by virtue of being flagged. This connects to the KB's
  observation about logit masking (note_01KNW89DC6GRF2MYBHV7X74M37): both are
  strategies for enforcing behavioral invariants against runtime adversarial
  inputs, one at the decoding layer, one at the prompt-position layer.
role: claim
source: src_01KNWB5189GPFMY5DVC42190H8
status: active
created_at: '2026-04-10T18:42:35.756Z'
evidence:
  - text: >-
      Constants: DO include constants in the prompt, as they are not susceptible
      to prompt injection. Such as guides, rubrics, and examples.
    source: src_01KNWB5189GPFMY5DVC42190H8
    locator: Constants bullet
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW89DC6GRF2MYBHV7X74M37
contradicts:
  - note_01KNWCJKRD2M7A59SJM666X9ZY
  - note_01KNWCJKS9V9VW5P987SHA5YMZ
---
The meta-prompt encodes a specific security principle: include constants (guides, rubrics, examples) directly in the prompt because they are 'not susceptible to prompt injection.' This is a precise claim: constants embedded in a system prompt cannot be overridden by adversarial user input in the way that dynamic variables can. The underlying logic is that prompt injection attacks exploit the model's inability to distinguish 'legitimate instruction from the system' from 'instruction injected via user input' — but hard-coded content in the system prompt sits at a higher trust level by virtue of position, not by virtue of being flagged. This connects to the KB's observation about logit masking (note_01KNW89DC6GRF2MYBHV7X74M37): both are strategies for enforcing behavioral invariants against runtime adversarial inputs, one at the decoding layer, one at the prompt-position layer.
