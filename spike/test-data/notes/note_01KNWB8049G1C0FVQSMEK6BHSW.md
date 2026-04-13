---
id: note_01KNWB8049G1C0FVQSMEK6BHSW
type: note
text: >-
  The meta-prompt's bias toward JSON for structured outputs — 'For tasks
  outputting well-defined or structured data (classification, JSON, etc.) bias
  toward outputting a JSON' — combined with 'JSON should never be wrapped in
  code blocks unless explicitly requested' reveals a two-level output-format
  philosophy: (1) structure the semantics (prefer JSON for structured data), (2)
  do not wrap structure in presentation markup (no code fences). This is a
  separation of semantic encoding from display rendering. Code fences are a
  rendering instruction for markdown readers; JSON is a semantic structure.
  Conflating them — wrapping JSON in fences — serves only the human reading the
  raw output, not the downstream parser consuming it. The rule protects
  machine-consumption of output against human-display conventions. This is the
  same principle behind note_01KNW97SR3NA13KKNH3X27WY9R's constrained decoding
  argument: both are insisting that structured output must be *structurally
  pure*, not presentation-contaminated.
role: connection
source: src_01KNWB5189GPFMY5DVC42190H8
status: active
created_at: '2026-04-10T18:42:35.756Z'
evidence:
  - text: >-
      For tasks outputting well-defined or structured data (classification,
      JSON, etc.) bias toward outputting a JSON. JSON should never be wrapped in
      code blocks (``) unless explicitly requested.
    source: src_01KNWB5189GPFMY5DVC42190H8
    locator: Output Format bullet
qualifier: likely
voice: synthesized
scope: detail
structure_type: argument
bridges:
  - note_01KNW97SR3NA13KKNH3X27WY9R
supports:
  - note_01KNW97SR3NA13KKNH3X27WY9R
---
The meta-prompt's bias toward JSON for structured outputs — 'For tasks outputting well-defined or structured data (classification, JSON, etc.) bias toward outputting a JSON' — combined with 'JSON should never be wrapped in code blocks unless explicitly requested' reveals a two-level output-format philosophy: (1) structure the semantics (prefer JSON for structured data), (2) do not wrap structure in presentation markup (no code fences). This is a separation of semantic encoding from display rendering. Code fences are a rendering instruction for markdown readers; JSON is a semantic structure. Conflating them — wrapping JSON in fences — serves only the human reading the raw output, not the downstream parser consuming it. The rule protects machine-consumption of output against human-display conventions. This is the same principle behind note_01KNW97SR3NA13KKNH3X27WY9R's constrained decoding argument: both are insisting that structured output must be *structurally pure*, not presentation-contaminated.
