---
id: note_01KNW7B01WJ001Q4QASV5H8CNA
type: note
text: >-
  The existing note on token consumption (99% internal/inter-agent, 1% human)
  collapses two structurally distinct communication directions into one
  category. This new framing disaggregates them: AI↔tool (vertical, MCP-style)
  vs. AI↔AI (horizontal, A2A-style). The distinction matters economically:
  tool-call overhead is proportional to *how many tool invocations* an agent
  makes per task; inter-agent overhead is proportional to *how many agents are
  coordinating*. As agentic tasks grow more complex, both scale up independently
  — meaning the token budget problem has two separate drivers that compound each
  other, not one unified 'non-human communication' bucket.
role: connection
source: src_01KNW790CWR2QWZJX6KGQFDV8F
status: active
created_at: '2026-04-10T17:34:19.688Z'
evidence:
  - text: AI最大token消耗可能并不是与人类交流，而是 AI与工具之间的交流 以及 AI与AI之间的交流
    source: src_01KNW790CWR2QWZJX6KGQFDV8F
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
bridges:
  - note_01KNW6TDBRJN2NBW79NX2HNBNE
  - note_01KNW4SB5H5T2ZHQR74BFAF040
supports:
  - note_01KNW4SB5H5T2ZHQR74BFAF040
---
The existing note on token consumption (99% internal/inter-agent, 1% human) collapses two structurally distinct communication directions into one category. This new framing disaggregates them: AI↔tool (vertical, MCP-style) vs. AI↔AI (horizontal, A2A-style). The distinction matters economically: tool-call overhead is proportional to *how many tool invocations* an agent makes per task; inter-agent overhead is proportional to *how many agents are coordinating*. As agentic tasks grow more complex, both scale up independently — meaning the token budget problem has two separate drivers that compound each other, not one unified 'non-human communication' bucket.
