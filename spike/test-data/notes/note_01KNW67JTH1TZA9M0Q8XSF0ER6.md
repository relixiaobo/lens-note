---
id: note_01KNW67JTH1TZA9M0Q8XSF0ER6
type: note
text: >-
  Canvas's surgical-edit vs. full-rewrite tradeoff — encoded directly in the
  prompt instructions as a conditional on `selectionDescription` and
  `textdocType` — is essentially a context-modification strategy hardwired into
  prompt templates. The "NEVER rewrite the entire document; ALWAYS edit ONLY the
  selected text" instruction tries to constrain the model to precision edits.
  But the fallback ("if markdown lists or tables, fully rewrite") acknowledges
  that structural content resists surgical editing. This mirrors the known
  challenge in context engineering: you can isolate context spatially, but
  certain content types (structured data, lists) have inter-element dependencies
  that make surgical modification unreliable. The regex pattern approach is the
  engineering response to a model that cannot reliably do minimal diffs by
  nature.
role: observation
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: >-
      For the update pattern, create a regex which exactly matches the
      ${selectionDescription}. NEVER rewrite the entire document. Instead,
      ALWAYS edit ONLY the ${selectionDescription}. The only exception to this
      rule is if the ${selectionDescription} includes markdown lists or tables.
      In that case, fully rewrite the document using ".*" as the regex update
      pattern.
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: generateUpdateInstructions section
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: causal
supports:
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
---
Canvas's surgical-edit vs. full-rewrite tradeoff — encoded directly in the prompt instructions as a conditional on `selectionDescription` and `textdocType` — is essentially a context-modification strategy hardwired into prompt templates. The "NEVER rewrite the entire document; ALWAYS edit ONLY the selected text" instruction tries to constrain the model to precision edits. But the fallback ("if markdown lists or tables, fully rewrite") acknowledges that structural content resists surgical editing. This mirrors the known challenge in context engineering: you can isolate context spatially, but certain content types (structured data, lists) have inter-element dependencies that make surgical modification unreliable. The regex pattern approach is the engineering response to a model that cannot reliably do minimal diffs by nature.
