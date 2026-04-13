---
id: note_01KNXJQET19MDAANGV40KN50SJ
type: note
text: >-
  SQUIRE's approach surfaces an underappreciated failure mode of chat-based AI
  tools: the 'repair problem.' When a generative model mutates more than
  intended, the user must re-prompt to undo damage. This is not merely
  inefficient — it's structurally asymmetric. Generating the bad output costs
  the model one step; repairing it may cost the user many re-prompt iterations,
  with no guarantee of convergence. SQUIRE's scoping guarantees are essentially
  a *write-protection* mechanism: they make the repair problem impossible within
  the protected regions. This reframes the design challenge from 'how do we make
  AI output better' to 'how do we make AI output failures bounded and
  recoverable.' The latter question is arguably more tractable and more
  important for production tools.
role: claim
source: src_01KNXJMZSZ76GWGCWRSAXBHVSR
status: active
created_at: '2026-04-11T06:12:36.790Z'
evidence:
  - text: >-
      the model may respond unpredictably, requiring the developer to re-prompt
      through trial-and-error to repair any undesired changes.
    source: src_01KNXJMZSZ76GWGCWRSAXBHVSR
    locator: abstract
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
SQUIRE's approach surfaces an underappreciated failure mode of chat-based AI tools: the 'repair problem.' When a generative model mutates more than intended, the user must re-prompt to undo damage. This is not merely inefficient — it's structurally asymmetric. Generating the bad output costs the model one step; repairing it may cost the user many re-prompt iterations, with no guarantee of convergence. SQUIRE's scoping guarantees are essentially a *write-protection* mechanism: they make the repair problem impossible within the protected regions. This reframes the design challenge from 'how do we make AI output better' to 'how do we make AI output failures bounded and recoverable.' The latter question is arguably more tractable and more important for production tools.
