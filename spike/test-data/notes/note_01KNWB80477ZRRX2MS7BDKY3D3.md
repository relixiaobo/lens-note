---
id: note_01KNWB80477ZRRX2MS7BDKY3D3
type: note
text: >-
  The meta-prompt exposes a gap in the existing KB's open question
  (note_01KNW9427Q31BVY0H16NDDDXSJ) about the division of labor between
  instructions, context, and code. The meta-prompt answers part of this: its own
  template — Steps / Output Format / Examples / Notes — suggests a *layered*
  decomposition where instructions handle *what to do* (Steps), format handles
  *how output should look* (Output Format), constants handle *what to know*
  (Examples, rubrics), and edge-cases get a dedicated section (Notes). This is
  not a binary choice between instruction and code; it is a multi-section
  architecture where different communicative functions occupy dedicated zones.
  The practical implication: prompt quality degrades when these zones bleed into
  each other — when format constraints are buried in step descriptions, or when
  edge cases are scattered through examples rather than called out explicitly.
role: connection
source: src_01KNWB5189GPFMY5DVC42190H8
status: active
created_at: '2026-04-10T18:42:35.756Z'
evidence:
  - text: >-
      # Steps [optional] ... # Output Format ... # Examples [optional] ... #
      Notes [optional]
    source: src_01KNWB5189GPFMY5DVC42190H8
    locator: Final structure template
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW9427Q31BVY0H16NDDDXSJ
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
supports:
  - note_01KNW9427Q31BVY0H16NDDDXSJ
---
The meta-prompt exposes a gap in the existing KB's open question (note_01KNW9427Q31BVY0H16NDDDXSJ) about the division of labor between instructions, context, and code. The meta-prompt answers part of this: its own template — Steps / Output Format / Examples / Notes — suggests a *layered* decomposition where instructions handle *what to do* (Steps), format handles *how output should look* (Output Format), constants handle *what to know* (Examples, rubrics), and edge-cases get a dedicated section (Notes). This is not a binary choice between instruction and code; it is a multi-section architecture where different communicative functions occupy dedicated zones. The practical implication: prompt quality degrades when these zones bleed into each other — when format constraints are buried in step descriptions, or when edge cases are scattered through examples rather than called out explicitly.
