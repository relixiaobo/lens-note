---
id: note_01KNW4MTJM58XVP58XG9J05YVW
type: note
text: >-
  The structured external state in Claude Code's harness (feature_list.json with
  pass/fail per feature, claude-progress.txt with per-session summaries, git
  commits) is session-boundary contract engineering: it defines what must be
  true at the end of every session for the next session to proceed safely. The
  read-only constraint on feature test descriptions — agents may only update the
  passes field — prevents the agent from silently redefining what done means.
  The schema enforces behavioral integrity across sequential agents.
role: observation
source: src_01KNW4F43SMNR987F8PWBT7X1C
status: active
created_at: '2026-04-10T16:47:16.038Z'
evidence:
  - text: 'Agent 只被允许更新是否通过的字段，不能随便删改测试内容 ... feature_list.json : 用 JSON 列出所有功能要求'
    source: src_01KNW4F43SMNR987F8PWBT7X1C
  - text: Agent 只被允许更新是否通过的字段，不能随便删改测试内容
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: 'Initializer agent sub-bullets, feature_list.json section'
qualifier: likely
voice: synthesized
scope: detail
structure_type: argument
---
The structured external state in Claude Code's harness (feature_list.json with pass/fail per feature, claude-progress.txt with per-session summaries, git commits) is session-boundary contract engineering: it defines what must be true at the end of every session for the next session to proceed safely. The read-only constraint on feature test descriptions — agents may only update the passes field — prevents the agent from silently redefining what done means. The schema enforces behavioral integrity across sequential agents.
