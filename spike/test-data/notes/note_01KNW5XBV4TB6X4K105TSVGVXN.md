---
id: note_01KNW5XBV4TB6X4K105TSVGVXN
type: note
text: >-
  The `display_description` idea reveals a subtle tension in the current
  function-calling API convention: tool schemas are designed as model-facing
  contracts, yet they are frequently surfaced verbatim in user-facing agent UIs
  as 'what the agent is doing.' The fix (a separate human-facing field) is
  simple only once you see that tool definitions have always been secretly
  dual-use artifacts — part model prompt, part audit log for humans. The fact
  that this is presented as a trivial add ('这个简单') suggests it is a patch, not a
  redesign — the underlying dual-audience problem is structural and will recur
  elsewhere in agent schemas.
role: observation
source: src_01KNW5VHEXPM70CZ8DRTT4QE92
status: active
created_at: '2026-04-10T17:09:24.438Z'
evidence:
  - text: 这个简单，给 tool 加个 display_description 的 parameter 即可
    source: src_01KNW5VHEXPM70CZ8DRTT4QE92
    locator: Title / full content of source
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
---
The `display_description` idea reveals a subtle tension in the current function-calling API convention: tool schemas are designed as model-facing contracts, yet they are frequently surfaced verbatim in user-facing agent UIs as 'what the agent is doing.' The fix (a separate human-facing field) is simple only once you see that tool definitions have always been secretly dual-use artifacts — part model prompt, part audit log for humans. The fact that this is presented as a trivial add ('这个简单') suggests it is a patch, not a redesign — the underlying dual-audience problem is structural and will recur elsewhere in agent schemas.
