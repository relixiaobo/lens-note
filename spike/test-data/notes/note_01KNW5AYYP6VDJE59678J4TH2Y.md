---
id: note_01KNW5AYYP6VDJE59678J4TH2Y
type: note
text: >-
  Background agent correction (step-level rollback and replay) is structurally
  different from chat's conversational repair. Chat correction is additive — you
  say 'no, I meant X' and the conversation continues forward. Background agent
  correction is surgical and reversible — you rewind to the specific step where
  the error occurred and re-execute from there. This distinction matters: chat's
  repair is cheaper but lossy (earlier context drifts), while background
  rollback is costlier but precise. The article's framing that background agents
  'allow error correction' implicitly adds a third repair paradigm beyond
  conversational and re-prompt.
role: observation
source: src_01KNW58G8NYQQB0T57XZR4TVDD
status: active
created_at: '2026-04-10T16:59:21.419Z'
evidence:
  - text: 允许纠错：允许用户回到特定步骤进行修正，包括直接修改错误操作、指导智能体改正，或是调整初始条件重新运行
    source: src_01KNW58G8NYQQB0T57XZR4TVDD
    locator: 建立起人类对 Agent 的信任 section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW58G6MM253MS92MTHWEX58
  - note_01KNW58G6BJ6Y0Y1H9ZK9W1PY1
supports:
  - note_01KNW58G6MM253MS92MTHWEX58
---
Background agent correction (step-level rollback and replay) is structurally different from chat's conversational repair. Chat correction is additive — you say 'no, I meant X' and the conversation continues forward. Background agent correction is surgical and reversible — you rewind to the specific step where the error occurred and re-execute from there. This distinction matters: chat's repair is cheaper but lossy (earlier context drifts), while background rollback is costlier but precise. The article's framing that background agents 'allow error correction' implicitly adds a third repair paradigm beyond conversational and re-prompt.
