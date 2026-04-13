---
id: note_01KNW9SF9T11CSH4241T09JCYW
type: note
text: >-
  Reading the canmore system prompt alongside the previously reverse-engineered
  Canvas application code (src_01KNW64WKGQQDH8KNYD22XV3WQ) reveals a complete
  two-layer behavioral architecture. Layer 1 (application code): decides *which*
  prompt template the model receives, based on user gestures — ask vs. edit vs.
  comment vs. create. Layer 2 (system prompt / tool instructions): governs *how
  the model uses the tool*, independent of which prompt template it received.
  The application code constrains action space; the system prompt governs
  within-action-space behavior. These two layers are orthogonal: you can change
  one without changing the other. The KB's existing notes about Canvas were all
  observing Layer 1 mechanics. This source reveals Layer 2 — the tool's own
  behavioral constitution. This two-layer separation is a general pattern worth
  naming: *routing layer* (selects the behavioral mode) + *behavioral
  constitution* (governs conduct within each mode).
role: claim
source: src_01KNW9P1576R56AAAVAZSS5JAK
status: active
created_at: '2026-04-10T18:17:11.203Z'
evidence:
  - text: >-
      # The `canmore` tool creates and updates text documents that render to the
      user on a space next to the conversation (referred to as the "canvas").
    source: src_01KNW9P1576R56AAAVAZSS5JAK
    locator: System prompt opening — the complete canmore namespace definition
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: description
bridges:
  - note_01KNW67JTP8B34GBD5XG6HJYAG
  - note_01KNW67JTM7C6H5XJBVRW7RS6Z
  - note_01KNW67JTFYPCVF3H6T2J1TKKP
---
Reading the canmore system prompt alongside the previously reverse-engineered Canvas application code (src_01KNW64WKGQQDH8KNYD22XV3WQ) reveals a complete two-layer behavioral architecture. Layer 1 (application code): decides *which* prompt template the model receives, based on user gestures — ask vs. edit vs. comment vs. create. Layer 2 (system prompt / tool instructions): governs *how the model uses the tool*, independent of which prompt template it received. The application code constrains action space; the system prompt governs within-action-space behavior. These two layers are orthogonal: you can change one without changing the other. The KB's existing notes about Canvas were all observing Layer 1 mechanics. This source reveals Layer 2 — the tool's own behavioral constitution. This two-layer separation is a general pattern worth naming: *routing layer* (selects the behavioral mode) + *behavioral constitution* (governs conduct within each mode).
