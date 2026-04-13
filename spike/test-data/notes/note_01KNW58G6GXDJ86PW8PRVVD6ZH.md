---
id: note_01KNW58G6GXDJ86PW8PRVVD6ZH
type: note
text: >-
  The non-streaming Agent's mid-task interruption problem reveals a deeper
  architectural issue: Agent state is not designed to be interruptible. Once an
  agent has planned and partially executed a task, injecting a new user message
  means either (a) aborting and restarting — wasteful, or (b) attempting to
  integrate the new input mid-execution — dangerous. This is structurally
  identical to the challenge of hot-patching running software: you can't safely
  modify a process in flight. The UX constraint (no mid-task messages) is
  actually a symptom of missing agent architecture primitives — specifically,
  checkpointing and graceful task preemption.
role: observation
source: src_01KNW55PY0P56BRNVS84ENXD2Q
status: active
created_at: '2026-04-10T16:58:00.760Z'
evidence:
  - text: 在Agent完成上一个任务之前，很难接受用户发送新的消息（因为Agent可能已经规划并执行了部分过程，接受一条新的消息意味着中断和重新开始）
    source: src_01KNW55PY0P56BRNVS84ENXD2Q
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
sees: >-
  Mid-task interruption as an architectural missing primitive, not merely a UX
  constraint
ignores: >-
  Agents that explicitly support pause-and-resume workflows (e.g.,
  human-in-the-loop checkpoints)
---
The non-streaming Agent's mid-task interruption problem reveals a deeper architectural issue: Agent state is not designed to be interruptible. Once an agent has planned and partially executed a task, injecting a new user message means either (a) aborting and restarting — wasteful, or (b) attempting to integrate the new input mid-execution — dangerous. This is structurally identical to the challenge of hot-patching running software: you can't safely modify a process in flight. The UX constraint (no mid-task messages) is actually a symptom of missing agent architecture primitives — specifically, checkpointing and graceful task preemption.
