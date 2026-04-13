---
id: note_01KNW58G6JDDM498J4BV9TNEFQ
type: note
text: >-
  Streaming Chat is structurally incompatible with long-running agentic tasks,
  not just practically. Streaming assumes the model is producing tokens in a
  continuous session the user is actively watching. Long-running tasks (hours,
  days) break this assumption — the user is not watching, the connection may
  drop, the IM platform may not support persistent streams. This means streaming
  chat and ambient/background agent execution represent two fundamentally
  different execution contracts, and conflating them (e.g., trying to show a
  'live stream' of a 24-hour agent job) would be both technically fragile and UX
  incoherent.
role: claim
source: src_01KNW55PY0P56BRNVS84ENXD2Q
status: active
created_at: '2026-04-10T16:58:00.760Z'
evidence:
  - text: 聊天通常需要人类触发以及持续参与，无法独立完成需要较长时间运行的任务；现有的IM工具一般都没有支持流式聊天，接入会有一定的困难
    source: src_01KNW55PY0P56BRNVS84ENXD2Q
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW55PVTPAR5BZEGN4R3J2V0
---
Streaming Chat is structurally incompatible with long-running agentic tasks, not just practically. Streaming assumes the model is producing tokens in a continuous session the user is actively watching. Long-running tasks (hours, days) break this assumption — the user is not watching, the connection may drop, the IM platform may not support persistent streams. This means streaming chat and ambient/background agent execution represent two fundamentally different execution contracts, and conflating them (e.g., trying to show a 'live stream' of a 24-hour agent job) would be both technically fragile and UX incoherent.
