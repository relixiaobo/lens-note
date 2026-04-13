---
id: note_01KNVKYSM32PJQ4Z8576ZP78E0
type: note
text: >-
  The orchestrator-worker pattern is the computational analogue of dynamic task
  allocation under uncertainty — which is the same structural challenge software
  teams face when building systems whose requirements are not fully known
  upfront. The orchestrator does not pre-specify subtasks; it discovers them.
  This is Sutton's 'capacity to discover' applied at the system architecture
  level: instead of encoding what the task is, you encode the process of
  figuring out what the task is. The pattern's power comes precisely from its
  refusal to pre-commit.
role: observation
source: src_01KNVKW56MX7V1TA16V891663R
status: active
created_at: '2026-04-10T11:55:36.951Z'
evidence:
  - text: 由于任务的不确定性，人类无法提前将任务拆解成固定子任务的集合 ... 由一个中央LLM(协调器)动态地分解任务
    source: src_01KNVKW56MX7V1TA16V891663R
  - text: 适用于复杂任务，并且由于任务的不确定性，人类无法提前将任务拆解成固定子任务的集合 ... 由一个 中央LLM (协调器) 动态地分解任务
    source: src_01KNW8PNXPSAJB5BXXC0BSYJ1A
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKVZD4J0HNN8VJVPDMKCTK
  - note_01KNVF1KEQ0WPQR8EKHK6PAK0E
supports:
  - note_01KNVKVZD4J0HNN8VJVPDMKCTK
---
The orchestrator-worker pattern is the computational analogue of dynamic task allocation under uncertainty — which is the same structural challenge software teams face when building systems whose requirements are not fully known upfront. The orchestrator does not pre-specify subtasks; it discovers them. This is Sutton's 'capacity to discover' applied at the system architecture level: instead of encoding what the task is, you encode the process of figuring out what the task is. The pattern's power comes precisely from its refusal to pre-commit.
