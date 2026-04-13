---
id: note_01KNWE2G6QN2H07A4GGK4K0YX9
type: note
text: >-
  Andrew Ng's four agentic design patterns (Reflection, Planning, Tool Use,
  Multi-Agent) and Anthropic's five workflow patterns (Prompt Chaining,
  Orchestrator-Worker, Routing, Parallelization, Evaluator-Optimizer) are two
  different taxonomies of the same design space — but they slice it along
  different axes. Anthropic's taxonomy is organized by *control flow structure*:
  how tasks are decomposed and routed between components. Ng's taxonomy is
  organized by *cognitive capability*: what kind of reasoning the agent gains
  (self-critique, lookahead, augmentation, coordination). Neither taxonomy is
  complete or wrong; they are complementary lenses. The practical implication:
  when designing an agent system, you need to reason about both axes
  simultaneously — the control architecture AND the cognitive capabilities each
  component requires. A practitioner who only knows one taxonomy will
  systematically miss design options that the other makes visible.
role: claim
source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
status: active
created_at: '2026-04-10T19:32:01.367Z'
evidence:
  - text: >-
      Agent 工作流程的四种主要设计模式：反思（Reflection）、规划（Planning）、利用工具（Tool
      Use）、多智能体协作（Multi-Agent Collaboration）
    source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: taxonomy
sees: >-
  Agent design space as having two orthogonal axes: control-flow structure and
  cognitive capability type
ignores: >-
  Whether these two taxonomies converge as models improve, or remain permanently
  complementary
bridges:
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
  - note_01KNVKYSKR2XJJNGSWTB35HQEM
---
Andrew Ng's four agentic design patterns (Reflection, Planning, Tool Use, Multi-Agent) and Anthropic's five workflow patterns (Prompt Chaining, Orchestrator-Worker, Routing, Parallelization, Evaluator-Optimizer) are two different taxonomies of the same design space — but they slice it along different axes. Anthropic's taxonomy is organized by *control flow structure*: how tasks are decomposed and routed between components. Ng's taxonomy is organized by *cognitive capability*: what kind of reasoning the agent gains (self-critique, lookahead, augmentation, coordination). Neither taxonomy is complete or wrong; they are complementary lenses. The practical implication: when designing an agent system, you need to reason about both axes simultaneously — the control architecture AND the cognitive capabilities each component requires. A practitioner who only knows one taxonomy will systematically miss design options that the other makes visible.
