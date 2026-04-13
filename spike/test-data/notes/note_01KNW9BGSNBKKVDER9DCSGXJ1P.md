---
id: note_01KNW9BGSNBKKVDER9DCSGXJ1P
type: note
text: >-
  Agent Skills represents a third architectural path that the existing notes on
  multi-agent design don't capture. The knowledge base has two poles: (1) single
  agent with all context stuffed in — which fails due to attention degradation,
  and (2) specialized agents per task — which requires building and maintaining
  a separate agent for every use case. Skills is neither: it's one universal
  agent that dynamically loads composable expertise packages. The unit of reuse
  shifts from the agent to the skill. This changes the economics fundamentally:
  instead of N agents for N task types, you get 1 agent + N skills, where skills
  compose freely. The 'don't build agents, build skills instead' title is
  exactly this: stop hardening the container, harden the knowledge instead.
role: claim
source: src_01KNW97ST9TBYZX2WYWK2N5QP9
status: active
created_at: '2026-04-10T18:09:34.005Z'
evidence:
  - text: >-
      Traditional thinking: build a custom Agent or Workflow for each task.
      Skills thinking: Universal Agent + composable Skills library. So we think
      it's time to stop rebuilding agents and start building skills instead.
    source: src_01KNW97ST9TBYZX2WYWK2N5QP9
    locator: Agent Skills 是什么 / agent architecture section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW97SR57CKTH7SKMV970FB5
  - note_01KNVKYSM32PJQ4Z8576ZP78E0
---
Agent Skills represents a third architectural path that the existing notes on multi-agent design don't capture. The knowledge base has two poles: (1) single agent with all context stuffed in — which fails due to attention degradation, and (2) specialized agents per task — which requires building and maintaining a separate agent for every use case. Skills is neither: it's one universal agent that dynamically loads composable expertise packages. The unit of reuse shifts from the agent to the skill. This changes the economics fundamentally: instead of N agents for N task types, you get 1 agent + N skills, where skills compose freely. The 'don't build agents, build skills instead' title is exactly this: stop hardening the container, harden the knowledge instead.
