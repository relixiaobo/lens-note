---
id: note_01KP13EER7BZXCXQWBPP3S1XB3
type: note
text: >-
  FTS5 with unicode61 tokenizer cannot search CJK text because it treats entire
  Chinese sentences as single tokens. Simplest fix: detect CJK in query, fall
  back to SQL LIKE with stop-word splitting. At fewer than 1000 notes, LIKE scan
  takes under 5ms. No embedding or special tokenizer needed.
status: active
created_at: '2026-04-12T15:02:30.919Z'
role: claim
qualifier: certain
voice: synthesized
scope: detail
---
FTS5 with unicode61 tokenizer cannot search CJK text because it treats entire Chinese sentences as single tokens. Simplest fix: detect CJK in query, fall back to SQL LIKE with stop-word splitting. At fewer than 1000 notes, LIKE scan takes under 5ms. No embedding or special tokenizer needed.
