---
id: note_01KNW67JTMZN31XF031JD5J1FP
type: note
text: >-
  The `generateCommentPrompt` includes an unusual negative instruction: "Do not
  respond to the user's question directly, just leave comments." This is a
  behavioral suppression constraint — it tells the model what NOT to do. This is
  notable because it acknowledges the model's natural inclination to respond
  conversationally, and preemptively overrides it. This is a specific case of a
  broader pattern: when product UX requires the model to stay in a non-default
  mode (tool-only, comment-only, silent rewrite), the system prompt must
  explicitly suppress the conversational default. The cost of not suppressing is
  mode bleed — the model slips back into chat.
role: observation
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: 'Do not respond to the user''s question directly, just leave comments.'
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: generateCommentPrompt section
qualifier: likely
voice: synthesized
scope: detail
structure_type: argument
---
The `generateCommentPrompt` includes an unusual negative instruction: "Do not respond to the user's question directly, just leave comments." This is a behavioral suppression constraint — it tells the model what NOT to do. This is notable because it acknowledges the model's natural inclination to respond conversationally, and preemptively overrides it. This is a specific case of a broader pattern: when product UX requires the model to stay in a non-default mode (tool-only, comment-only, silent rewrite), the system prompt must explicitly suppress the conversational default. The cost of not suppressing is mode bleed — the model slips back into chat.
