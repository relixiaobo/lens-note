---
id: note_01KP13EER609KGRDMVFV0TQPKP
type: note
text: >-
  LLM logic embedded in a CLI tool is an anti-pattern. The calling agent IS the
  LLM. Duplicating it inside the tool creates API key friction, streaming bugs,
  and unnecessary cost. Correct architecture: tool provides storage and query,
  skill file provides thinking instructions, agent provides intelligence.
status: active
created_at: '2026-04-12T15:02:30.918Z'
role: claim
qualifier: certain
voice: synthesized
scope: big_picture
---
LLM logic embedded in a CLI tool is an anti-pattern. The calling agent IS the LLM. Duplicating it inside the tool creates API key friction, streaming bugs, and unnecessary cost. Correct architecture: tool provides storage and query, skill file provides thinking instructions, agent provides intelligence.
