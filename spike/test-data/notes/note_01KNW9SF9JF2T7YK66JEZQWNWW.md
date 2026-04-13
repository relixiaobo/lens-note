---
id: note_01KNW9SF9JF2T7YK66JEZQWNWW
type: note
text: >-
  Code documents (code/*) ALWAYS get full rewrites; prose documents (document)
  default to full rewrites but allow targeted edits for isolated changes. This
  asymmetry — which exists in both the system prompt and was noted in the
  application code (note_01KNW67JTH1TZA9M0Q8XSF0ER6) — encodes a theory of
  document dependency structure. Code has dense global dependencies: renaming a
  variable, changing a function signature, or restructuring control flow ripples
  across the entire file. Prose has local dependencies: a paragraph can
  typically be changed without touching the others. The rewrite policy is
  therefore a proxy for dependency density, not document type per se. A prose
  document that is actually highly cross-referential (e.g., a legal contract)
  would be better treated as 'code' under this logic.
role: observation
source: src_01KNW9P1576R56AAAVAZSS5JAK
status: active
created_at: '2026-04-10T18:17:11.203Z'
evidence:
  - text: >-
      For documents of type "code/*", i.e. code documents, ALWAYS rewrite the
      document using ".*". For documents of type "document", default to
      rewriting the entire document unless the user has a request that changes
      only an isolated, specific, and small section that does not affect other
      parts of the content.
    source: src_01KNW9P1576R56AAAVAZSS5JAK
    locator: How to use update_textdoc
qualifier: likely
voice: synthesized
scope: detail
structure_type: argument
supports:
  - note_01KNW67JTH1TZA9M0Q8XSF0ER6
---
Code documents (code/*) ALWAYS get full rewrites; prose documents (document) default to full rewrites but allow targeted edits for isolated changes. This asymmetry — which exists in both the system prompt and was noted in the application code (note_01KNW67JTH1TZA9M0Q8XSF0ER6) — encodes a theory of document dependency structure. Code has dense global dependencies: renaming a variable, changing a function signature, or restructuring control flow ripples across the entire file. Prose has local dependencies: a paragraph can typically be changed without touching the others. The rewrite policy is therefore a proxy for dependency density, not document type per se. A prose document that is actually highly cross-referential (e.g., a legal contract) would be better treated as 'code' under this logic.
