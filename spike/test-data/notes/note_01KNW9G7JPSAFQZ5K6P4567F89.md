---
id: note_01KNW9G7JPSAFQZ5K6P4567F89
type: note
text: >-
  The read-only constraint on feature_list.json test steps — agents may only
  update the passes boolean, not rewrite the test description — is the
  harness-level implementation of the principle that tests are the only
  machine-verifiable explicit contract between human intent and agent execution
  (note_01KNW64WGJ6VDE4BRB7Q5RPK46). The harness enforces this not through model
  instruction alone, but through schema: the field is architecturally
  write-protected. This bridges the conceptual framing (tests as agent
  communication protocol) with the concrete enforcement mechanism (write-locked
  schema fields). An agent that could rewrite test steps could unilaterally
  redefine done — exactly the misalignment that schema constraints prevent.
role: connection
source: src_01KNW9BGWTDXSKVFSKAC4927DK
status: active
created_at: '2026-04-10T18:12:08.383Z'
evidence:
  - text: Agent 只被允许更新是否通过的字段，不能随便删改测试内容
    source: src_01KNW9BGWTDXSKVFSKAC4927DK
    locator: 'Initializer agent sub-bullets, feature_list.json section'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: relationships
bridges:
  - note_01KNW4MTJM58XVP58XG9J05YVW
  - note_01KNW64WGJ6VDE4BRB7Q5RPK46
---
The read-only constraint on feature_list.json test steps — agents may only update the passes boolean, not rewrite the test description — is the harness-level implementation of the principle that tests are the only machine-verifiable explicit contract between human intent and agent execution (note_01KNW64WGJ6VDE4BRB7Q5RPK46). The harness enforces this not through model instruction alone, but through schema: the field is architecturally write-protected. This bridges the conceptual framing (tests as agent communication protocol) with the concrete enforcement mechanism (write-locked schema fields). An agent that could rewrite test steps could unilaterally redefine done — exactly the misalignment that schema constraints prevent.
