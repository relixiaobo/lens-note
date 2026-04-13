---
id: note_01KNW5XBTQ0ZA4X3WCZDHB01DZ
type: note
text: >-
  Tool `description` fields currently serve two audiences with incompatible
  needs: the LLM (which needs precise, technical language to decide when and how
  to invoke the tool) and the human (who needs a legible, jargon-free summary to
  understand what the agent is doing). A `display_description` parameter
  resolves this by splitting the signal. This is an instance of a general
  principle: any interface field that simultaneously addresses a
  machine-reasoning audience and a human-oversight audience will inevitably
  degrade both. The split is not cosmetic — it is structurally necessary.
role: claim
source: src_01KNW5VHEXPM70CZ8DRTT4QE92
status: active
created_at: '2026-04-10T17:09:24.438Z'
evidence:
  - text: 这个简单，给 tool 加个 display_description 的 parameter 即可
    source: src_01KNW5VHEXPM70CZ8DRTT4QE92
    locator: Title / full content of source
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW532DKVEX112H995HZ7HKA
  - note_01KNW4D0S283M907YMGX8Q52NW
supports:
  - note_01KNW532DKVEX112H995HZ7HKA
---
Tool `description` fields currently serve two audiences with incompatible needs: the LLM (which needs precise, technical language to decide when and how to invoke the tool) and the human (who needs a legible, jargon-free summary to understand what the agent is doing). A `display_description` parameter resolves this by splitting the signal. This is an instance of a general principle: any interface field that simultaneously addresses a machine-reasoning audience and a human-oversight audience will inevitably degrade both. The split is not cosmetic — it is structurally necessary.
