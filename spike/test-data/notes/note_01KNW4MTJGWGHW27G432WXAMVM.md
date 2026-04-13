---
id: note_01KNW4MTJGWGHW27G432WXAMVM
type: note
text: >-
  Context compression and structured session handover address different failure
  modes that look identical from the outside — both appear as 'the agent does
  not know what happened earlier.' Compression preserves information density
  within a session; handover structures organize workflow across sessions.
  Conflating them leads to over-engineering the wrong solution: more context
  length or better summarization will not fix an agent that starts a new session
  without knowing which features are done, which are in-progress, and what the
  testing protocol is.
role: observation
source: src_01KNW4F43SMNR987F8PWBT7X1C
status: active
created_at: '2026-04-10T16:47:16.038Z'
evidence:
  - text: Claude Code 会有上下文压缩来解决这个问题，但是只能缓解 token 限制，不能保证项目结构化推进。压缩侧重保留信息，而不是组织工作流
    source: src_01KNW4F43SMNR987F8PWBT7X1C
  - text: Claude Code 会有上下文压缩来解决这个问题，但是只能缓解 token 限制，不能保证项目结构化推进。压缩侧重保留信息，而不是组织工作流
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: 'Fourth major bullet, Claude Code problems section'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW4D0SGR459720TMMHG2SAY
---
Context compression and structured session handover address different failure modes that look identical from the outside — both appear as 'the agent does not know what happened earlier.' Compression preserves information density within a session; handover structures organize workflow across sessions. Conflating them leads to over-engineering the wrong solution: more context length or better summarization will not fix an agent that starts a new session without knowing which features are done, which are in-progress, and what the testing protocol is.
