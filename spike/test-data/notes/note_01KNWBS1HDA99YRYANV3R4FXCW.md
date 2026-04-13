---
id: note_01KNWBS1HDA99YRYANV3R4FXCW
type: note
text: >-
  RL training is the only existing mechanism in this knowledge base where an
  agent *does* update procedural memory — strategy internalized into weights.
  This makes RL training the procedural-memory counterpart to RAG (semantic
  memory) and conversation history (episodic memory). The three-type taxonomy is
  now fully populated: episodic = conversation/history stores, semantic =
  RAG/knowledge retrieval, procedural = weights updated through RL/fine-tuning.
  The current frontier gap is that procedural memory updates happen offline
  (training time), while episodic and semantic updates happen online (inference
  time). Closing this gap — online procedural memory update — is arguably the
  deepest open problem in agent learning.
role: connection
source: src_01KNWBNX111SDHAPNZDEWTN8AD
status: active
created_at: '2026-04-10T18:51:54.250Z'
evidence:
  - text: 程序性记忆...类比Agent，是LLM权重和代理代码的组合...（目前还没有代理会对这个类型的记忆进行自更新）
    source: src_01KNWBNX111SDHAPNZDEWTN8AD
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
question_status: open
bridges:
  - note_01KNW833H3QEYYYP65F4EXQ43A
  - note_01KNVKYSM6V7XEJ92YQVWDET45
supports:
  - note_01KNW833H3QEYYYP65F4EXQ43A
---
RL training is the only existing mechanism in this knowledge base where an agent *does* update procedural memory — strategy internalized into weights. This makes RL training the procedural-memory counterpart to RAG (semantic memory) and conversation history (episodic memory). The three-type taxonomy is now fully populated: episodic = conversation/history stores, semantic = RAG/knowledge retrieval, procedural = weights updated through RL/fine-tuning. The current frontier gap is that procedural memory updates happen offline (training time), while episodic and semantic updates happen online (inference time). Closing this gap — online procedural memory update — is arguably the deepest open problem in agent learning.
