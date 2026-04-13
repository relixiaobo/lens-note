---
id: note_01KNW67JTRMBCWZVCRGR0VSDMR
type: note
text: >-
  Canvas's context construction (`describeSelectionInContext`) handles edge
  cases gracefully: no selection → 'the user is referring to the entire text';
  selection equals surrounding context → treat as full selection; otherwise →
  show both selected text and surrounding context. This is defensive context
  design — the prompt template degrades gracefully to less specific context when
  precise selection data isn't available, rather than failing or hallucinating
  context. It's a form of context fallback logic that mirrors how engineers
  handle null states: prefer specific, accept general, never omit. The
  implication for AI product engineering: context injection functions need
  explicit fallback paths, because user input is inherently incomplete.
role: observation
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: >-
      !selectedText || !surroundingContext → 'The user is referring to the
      entire text of "${textdocId}".'
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: describeSelectionInContext section
qualifier: likely
voice: synthesized
scope: detail
structure_type: process
supports:
  - note_01KNW67JTH1TZA9M0Q8XSF0ER6
---
Canvas's context construction (`describeSelectionInContext`) handles edge cases gracefully: no selection → 'the user is referring to the entire text'; selection equals surrounding context → treat as full selection; otherwise → show both selected text and surrounding context. This is defensive context design — the prompt template degrades gracefully to less specific context when precise selection data isn't available, rather than failing or hallucinating context. It's a form of context fallback logic that mirrors how engineers handle null states: prefer specific, accept general, never omit. The implication for AI product engineering: context injection functions need explicit fallback paths, because user input is inherently incomplete.
