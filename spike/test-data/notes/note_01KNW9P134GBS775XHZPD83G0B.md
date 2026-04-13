---
id: note_01KNW9P134GBS775XHZPD83G0B
type: note
text: >-
  「让 Claude 自己改进 Skill」 is an architectural inversion worth naming: it makes the
  agent not just a consumer of skills but a contributor to its own skill
  library. The evaluator-optimizer loop (note_01KNVKYSM2JJ2MEDSNVRD85505)
  captures the idea of LLM-as-critic within a single task. This is different:
  Claude is being asked to operate *across* tasks — summarizing what worked and
  what failed, then updating the persistent skill definition for future runs.
  The unit of improvement is not the output of one task but the standing
  capability of the system. This creates a feedback loop at a higher level of
  abstraction: not 'get this task right' but 'become better at this class of
  tasks.' The risk is symmetric: a well-functioning self-improvement loop
  compounds gains; a misaligned one compounds errors into the skill base itself.
role: claim
source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
status: active
created_at: '2026-04-10T18:15:18.355Z'
evidence:
  - text: '让 Claude 自己改进 Skill: 跑完任务后让 Claude 总结：什么方法有效、哪里出错了。然后更新 Skill。'
    source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
    locator: Skills 设计的最佳实践 / 让 Claude 自己改进 Skill
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKYSM2JJ2MEDSNVRD85505
---
「让 Claude 自己改进 Skill」 is an architectural inversion worth naming: it makes the agent not just a consumer of skills but a contributor to its own skill library. The evaluator-optimizer loop (note_01KNVKYSM2JJ2MEDSNVRD85505) captures the idea of LLM-as-critic within a single task. This is different: Claude is being asked to operate *across* tasks — summarizing what worked and what failed, then updating the persistent skill definition for future runs. The unit of improvement is not the output of one task but the standing capability of the system. This creates a feedback loop at a higher level of abstraction: not 'get this task right' but 'become better at this class of tasks.' The risk is symmetric: a well-functioning self-improvement loop compounds gains; a misaligned one compounds errors into the skill base itself.
