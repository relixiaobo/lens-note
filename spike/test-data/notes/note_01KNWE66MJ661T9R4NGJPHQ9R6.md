---
id: note_01KNWE66MJ661T9R4NGJPHQ9R6
type: note
text: >-
  工具命名中的前缀/后缀分组（`asana_search`, `jira_search` 或 `asana_projects_search`,
  `asana_users_search`）是一个低成本的认知导航机制。当 Agent 面对大量工具时，相似前缀在 token
  层面创造了「相邻性」——相关工具在 schema 中物理相邻，自然语言的模式匹配也更容易激活正确工具。这是把人类软件工程中的「命名空间」思维移植到
  Agent 工具管理中。它不解决工具过多的根本问题（见
  `note_01KNW4D0S7WEFJTNYYEZCF1T9W`），但在必须提供多个工具的情况下，降低了 Agent 选择错误工具的概率。
role: observation
source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
status: active
created_at: '2026-04-10T19:34:02.607Z'
evidence:
  - text: >-
      将相关工具分组到相同的 前缀 或者 后缀 下，有利于 Agent 区分众多相同功能工具的界限，按照服务（service）分组，比如
      asana_search, jira_search
    source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
    locator: 'Section: 工具命名'
qualifier: presumably
voice: synthesized
scope: detail
structure_type: argument
supports:
  - note_01KNW4D0S7WEFJTNYYEZCF1T9W
---
工具命名中的前缀/后缀分组（`asana_search`, `jira_search` 或 `asana_projects_search`, `asana_users_search`）是一个低成本的认知导航机制。当 Agent 面对大量工具时，相似前缀在 token 层面创造了「相邻性」——相关工具在 schema 中物理相邻，自然语言的模式匹配也更容易激活正确工具。这是把人类软件工程中的「命名空间」思维移植到 Agent 工具管理中。它不解决工具过多的根本问题（见 `note_01KNW4D0S7WEFJTNYYEZCF1T9W`），但在必须提供多个工具的情况下，降低了 Agent 选择错误工具的概率。
