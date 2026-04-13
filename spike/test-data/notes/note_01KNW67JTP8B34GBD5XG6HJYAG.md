---
id: note_01KNW67JTP8B34GBD5XG6HJYAG
type: note
text: >-
  Canvas's approach — multiple specialized prompt-generation functions
  (generateAskPrompt, generateEditPrompt, generateCommentPrompt,
  generateCreateTextdocPrompt) each assembling different prompt templates for
  the same underlying model — is engineering-level routing applied before the
  LLM call. This is the 'engineering-controlled planning' approach from an
  existing note, but applied at the product interaction layer rather than the
  agent execution layer. The parallel is exact: instead of letting the model
  decide how to interpret a document interaction, the application hard-routes to
  the appropriate prompt template based on user action. The model receives a
  pre-disambiguated task, not an open-ended request.
role: connection
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: >-
      generateAskPrompt / generateEditPrompt / generateCommentPrompt /
      generateCreateTextdocPrompt [four distinct prompt-building functions]
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: Overall structure of the article
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
supports:
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
---
Canvas's approach — multiple specialized prompt-generation functions (generateAskPrompt, generateEditPrompt, generateCommentPrompt, generateCreateTextdocPrompt) each assembling different prompt templates for the same underlying model — is engineering-level routing applied before the LLM call. This is the 'engineering-controlled planning' approach from an existing note, but applied at the product interaction layer rather than the agent execution layer. The parallel is exact: instead of letting the model decide how to interpret a document interaction, the application hard-routes to the appropriate prompt template based on user action. The model receives a pre-disambiguated task, not an open-ended request.
