---
id: note_01KNW4MTJEXRZWG6TP8JH4QM4X
type: note
text: >-
  Claude Code's two-phase harness — Initializer + Coding agent — is a temporal
  decomposition pattern: it decomposes work across time (sessions) rather than
  across space (parallel workers). The Initializer runs once to scaffold the
  project state; subsequent Coding agents each run one session and perform one
  increment. This is structurally different from orchestrator-worker, which
  decomposes tasks across concurrent agents at a single point in time. Temporal
  decomposition has a distinct requirement: session-end state must be
  machine-readable enough for a cold-start agent to resume without ambiguity.
role: observation
source: src_01KNW4F43SMNR987F8PWBT7X1C
status: active
created_at: '2026-04-10T16:47:16.038Z'
evidence:
  - text: >-
      Claude Code 使用了两阶段 Harness: Initializer (初始化) + Coding (迭代和收尾) ... coding
      agent: 后面每一次 session，只做增量迭代 + 干净收尾
    source: src_01KNW4F43SMNR987F8PWBT7X1C
  - text: >-
      Claude Code 使用了两阶段 Harness: Initializer (初始化) + Coding (迭代和收尾)，让 agent
      按优秀工程师节奏的工作
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: First major bullet
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKYSM32PJQ4Z8576ZP78E0
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
---
Claude Code's two-phase harness — Initializer + Coding agent — is a temporal decomposition pattern: it decomposes work across time (sessions) rather than across space (parallel workers). The Initializer runs once to scaffold the project state; subsequent Coding agents each run one session and perform one increment. This is structurally different from orchestrator-worker, which decomposes tasks across concurrent agents at a single point in time. Temporal decomposition has a distinct requirement: session-end state must be machine-readable enough for a cold-start agent to resume without ambiguity.
