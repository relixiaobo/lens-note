---
id: note_01KNW5XBV94ES91FPCAZ0XHQBJ
type: note
text: >-
  If tool `description` (model-facing) and `display_description` (human-facing)
  diverge in practice, this creates a new alignment risk: the human sees a
  reassuring label while the model is guided by a different, potentially more
  permissive specification. The split field solves the legibility problem but
  opens a verification gap — you now need to audit two descriptions per tool,
  and their consistency becomes a new attack surface (or neglect surface).
  'Simple to add' does not mean 'simple to govern.'
role: observation
source: src_01KNW5VHEXPM70CZ8DRTT4QE92
status: active
created_at: '2026-04-10T17:09:24.438Z'
evidence:
  - text: 这个简单，给 tool 加个 display_description 的 parameter 即可
    source: src_01KNW5VHEXPM70CZ8DRTT4QE92
    locator: Title / full content of source
qualifier: tentative
voice: synthesized
scope: detail
structure_type: argument
question_status: open
---
If tool `description` (model-facing) and `display_description` (human-facing) diverge in practice, this creates a new alignment risk: the human sees a reassuring label while the model is guided by a different, potentially more permissive specification. The split field solves the legibility problem but opens a verification gap — you now need to audit two descriptions per tool, and their consistency becomes a new attack surface (or neglect surface). 'Simple to add' does not mean 'simple to govern.'
