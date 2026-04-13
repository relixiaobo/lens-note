---
id: note_01KNW7XVSMQSVMP1QF30PCWNX8
type: note
text: >-
  Progressive disclosure applied to agent skills makes explicit what Manus left
  implicit: Level 1 metadata (name + description, ~100 tokens) is a routing
  signal, not just a teaser. The agent reads the metadata of all skills on every
  turn and uses that to decide which skill to load. This means the quality of L1
  metadata determines skill activation accuracy — a poorly written description
  field is not a documentation problem, it is a routing failure. The analogy to
  search: L1 is the inverted index, L2 is the document.
role: claim
source: src_01KNW7TXEXN9MNCK9NCTEA8501
status: active
created_at: '2026-04-10T17:44:37.940Z'
evidence:
  - text: >-
      Level 1 元数据（始终加载，约100 tokens）。所以这两个字段要写得好，不然 Agent 不知道什么时候该用。Agent
      靠这个判断要不要激活这个技能。
    source: src_01KNW7TXEXN9MNCK9NCTEA8501
    locator: 'Section: Level 1 元数据'
  - text: '关注 name 和 description: 这两个字段决定 Claude 会不会触发你的 Skill。写不好等于白写。'
    source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
    locator: Skills 设计的最佳实践 / 关注 name 和 description
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW4D0S283M907YMGX8Q52NW
---
Progressive disclosure applied to agent skills makes explicit what Manus left implicit: Level 1 metadata (name + description, ~100 tokens) is a routing signal, not just a teaser. The agent reads the metadata of all skills on every turn and uses that to decide which skill to load. This means the quality of L1 metadata determines skill activation accuracy — a poorly written description field is not a documentation problem, it is a routing failure. The analogy to search: L1 is the inverted index, L2 is the document.
