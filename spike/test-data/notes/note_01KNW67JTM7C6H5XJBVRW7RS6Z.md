---
id: note_01KNW67JTM7C6H5XJBVRW7RS6Z
type: note
text: >-
  Canvas's prompt templates follow a consistent two-section structure: `#
  Context` (what the document/selection is) + `# Instructions` (what to do).
  This mirrors the distinction between information injection and behavioral
  specification in any system prompt. What's interesting is that the context
  section is fully programmatically assembled from structured state (textdocId,
  selectedText, surroundingContext), while the instructions section contains
  fixed imperative language plus a few interpolated variables. This pattern —
  dynamic context, fixed behavior — is likely the right architectural default
  for product-grade AI features: it lets the model adapt to arbitrary user
  content while keeping the behavioral contract stable and auditable.
role: observation
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: |-
      # Context
      ${generateContext(textdocId, selectedText, surroundingContext)}

      # Instructions
      The user would like you to...
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: generateAskPrompt section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: description
---
Canvas's prompt templates follow a consistent two-section structure: `# Context` (what the document/selection is) + `# Instructions` (what to do). This mirrors the distinction between information injection and behavioral specification in any system prompt. What's interesting is that the context section is fully programmatically assembled from structured state (textdocId, selectedText, surroundingContext), while the instructions section contains fixed imperative language plus a few interpolated variables. This pattern — dynamic context, fixed behavior — is likely the right architectural default for product-grade AI features: it lets the model adapt to arbitrary user content while keeping the behavioral contract stable and auditable.
