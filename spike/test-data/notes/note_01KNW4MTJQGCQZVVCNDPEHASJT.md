---
id: note_01KNW4MTJQGCQZVVCNDPEHASJT
type: note
text: >-
  Claude Code's harness reveals a hidden assumption in the orchestrator-worker
  pattern: that each discovered subtask fits inside a single context window. The
  orchestrator's celebrated refusal to pre-commit discovers subtasks at runtime
  — but even discovered subtasks can overflow the effective context window. The
  pattern's elegance at decomposition level does not guarantee tractability at
  execution level. Long-running agents need second-order decomposition: not just
  how to split the task, but what to do when a split piece is still too big.
role: observation
source: src_01KNW4F43SMNR987F8PWBT7X1C
status: active
created_at: '2026-04-10T16:47:16.038Z'
evidence:
  - text: >-
      Anthropic 的架构还有一个隐含的乐观假设：它假设 Initializer 拆解出的每一个子任务（Feature），都能在一个 Context
      Window 内顺利完成闭环。
    source: src_01KNW4F43SMNR987F8PWBT7X1C
  - text: >-
      Anthropic 的架构还有一个隐含的乐观假设：它假设 Initializer 拆解出的每一个子任务（Feature），都能在一个 Context
      Window 内顺利完成闭环。
    source: src_01KNW8F2TNMF4R79WN4RD0XX9R
    locator: Title / Main note body
  - text: >-
      Anthropic 的架构还有一个隐含的乐观假设：它假设 Initializer 拆解出的每一个子任务（Feature），都能在一个 Context
      Window 内顺利完成闭环。
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: Third major bullet
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNVKYSM32PJQ4Z8576ZP78E0
---
Claude Code's harness reveals a hidden assumption in the orchestrator-worker pattern: that each discovered subtask fits inside a single context window. The orchestrator's celebrated refusal to pre-commit discovers subtasks at runtime — but even discovered subtasks can overflow the effective context window. The pattern's elegance at decomposition level does not guarantee tractability at execution level. Long-running agents need second-order decomposition: not just how to split the task, but what to do when a split piece is still too big.
