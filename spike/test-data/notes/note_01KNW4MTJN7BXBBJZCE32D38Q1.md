---
id: note_01KNW4MTJN7BXBBJZCE32D38Q1
type: note
text: >-
  The context threshold interrupt pattern — forcibly ending a session and
  writing an in-progress checkpoint when context usage crosses a threshold
  (~130K tokens) — treats the context window as a budget to be respected, not a
  container to be filled. It requires agents to write a partial-progress record
  before terminating so the next session can resume rather than restart. This is
  the session-handover analogue of Manus's threshold-based compaction trigger —
  both use a size threshold rather than a round or time threshold as the circuit
  breaker.
role: observation
source: src_01KNW4F43SMNR987F8PWBT7X1C
status: active
created_at: '2026-04-10T16:47:16.038Z'
evidence:
  - text: >-
      如果发现 Context 占用达到安全阈值（比如 130K token），无论当前子任务是否完成，都强制触发一次存档中断：让 AI
      把当前残缺的代码进度写入进度文档（注明：In Progress）。主动结束当前对话
    source: src_01KNW4F43SMNR987F8PWBT7X1C
  - text: >-
      如果发现 Context 占用达到安全阈值（比如 130K token），无论当前子任务是否完成，都强制触发一次存档中断：让 AI
      把当前残缺的代码进度写入进度文档（注明：In Progress）
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: 'Third major bullet, context threshold section'
qualifier: likely
voice: synthesized
scope: detail
structure_type: process
bridges:
  - note_01KNW4D0SGR459720TMMHG2SAY
supports:
  - note_01KNVM1WCB4153AT7H4EGPGD6G
---
The context threshold interrupt pattern — forcibly ending a session and writing an in-progress checkpoint when context usage crosses a threshold (~130K tokens) — treats the context window as a budget to be respected, not a container to be filled. It requires agents to write a partial-progress record before terminating so the next session can resume rather than restart. This is the session-handover analogue of Manus's threshold-based compaction trigger — both use a size threshold rather than a round or time threshold as the circuit breaker.
