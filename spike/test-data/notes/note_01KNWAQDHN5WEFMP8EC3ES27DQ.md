---
id: note_01KNWAQDHN5WEFMP8EC3ES27DQ
type: note
text: >-
  The observation that multi-agent is poorly suited for programming — where all
  agents must share the same context and there are many inter-agent dependencies
  — gives a concrete, domain-level instantiation of the abstract isolation
  criterion. The existing knowledge base says 'use multi-agent when tasks are
  independent; don't when they contaminate each other.' This article names
  coding as a canonical anti-case: code is a globally shared artifact where
  every sub-task's output affects every other's input. It's the structural
  opposite of research, where sub-tasks (search different angles, analyze
  different sources) can be genuinely isolated. The research/coding axis is a
  practical heuristic: tasks with high artifact-coupling → single agent; tasks
  with low artifact-coupling → multi-agent candidates.
role: claim
source: src_01KNWAN527ENGP17D721BVSAQ5
status: active
created_at: '2026-04-10T18:33:32.469Z'
evidence:
  - text: 多智能体不适合需要所有代理共享相同上下文或涉及代理之间存在许多依赖关系的领域，比如编程
    source: src_01KNWAN527ENGP17D721BVSAQ5
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW6WT5T9AHEBZKFZR8Q8Z10
  - note_01KNW4D0S97P9MBK524Z8Z0QAK
  - note_01KNW6WT60XRZPWT2FNCKVGGCJ
supports:
  - note_01KNW6WT5T9AHEBZKFZR8Q8Z10
---
The observation that multi-agent is poorly suited for programming — where all agents must share the same context and there are many inter-agent dependencies — gives a concrete, domain-level instantiation of the abstract isolation criterion. The existing knowledge base says 'use multi-agent when tasks are independent; don't when they contaminate each other.' This article names coding as a canonical anti-case: code is a globally shared artifact where every sub-task's output affects every other's input. It's the structural opposite of research, where sub-tasks (search different angles, analyze different sources) can be genuinely isolated. The research/coding axis is a practical heuristic: tasks with high artifact-coupling → single agent; tasks with low artifact-coupling → multi-agent candidates.
