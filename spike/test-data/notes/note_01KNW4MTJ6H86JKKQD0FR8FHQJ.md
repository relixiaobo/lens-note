---
id: note_01KNW4MTJ6H86JKKQD0FR8FHQJ
type: note
text: >-
  The long-running agent problem is fundamentally a project handover problem,
  not a memory problem. Context compression addresses the symptom (token limits)
  but not the root cause: each new session starts without structured
  understanding of what was done and what the next step is. The right analogy is
  not 'the agent forgot' but 'a new engineer joined the project with no
  onboarding docs.' Solving this requires engineering the handover, not
  stretching the memory.
role: claim
source: src_01KNW4F43SMNR987F8PWBT7X1C
status: active
created_at: '2026-04-10T16:47:16.038Z'
evidence:
  - text: >-
      多轮 Agent 看起来像是记忆不够用（上下文会爆），但更深层的问题是项目交接不清楚 ... 设计长时 Agent
      的关键，不是先去想怎么塞更多内容进上下文，而是：如何让下一轮接手的人能迅速看懂当前项目状态
    source: src_01KNW4F43SMNR987F8PWBT7X1C
  - text: 多轮 Agent 看起来像是「记忆不够用」（上下文会爆），但更深层的问题是「项目交接不清楚」
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: Second major bullet
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
The long-running agent problem is fundamentally a project handover problem, not a memory problem. Context compression addresses the symptom (token limits) but not the root cause: each new session starts without structured understanding of what was done and what the next step is. The right analogy is not 'the agent forgot' but 'a new engineer joined the project with no onboarding docs.' Solving this requires engineering the handover, not stretching the memory.
