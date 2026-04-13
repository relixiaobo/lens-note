---
id: note_01KNW91S3TDE1K3322C4ACG9D1
type: note
text: >-
  The Skill directory structure implicitly defines a type system for context
  residency: scripts/ (execution results only → context), assets/ (path
  references only → never in context), references/ (text content → loaded into
  context on demand). This is more precise than the generic 'lazy loading' frame
  already in the knowledge base. The directory layout is not organizational
  convenience — it is a declarative policy about *how* each artifact class
  interacts with the model's attention budget. Three different relationship
  modes to context, encoded in folder names.
role: claim
source: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
status: active
created_at: '2026-04-10T18:04:14.841Z'
evidence:
  - text: |-
      scripts/: 代码不加载到上下文，只有结果进入
      assets/: 仅通过路径引用的文件，不加载到上下文
      references/: 通过读取工具加载到 Claude 上下文中的文本内容
    source: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
    locator: 'bullet points describing scripts/, assets/, references/'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: taxonomy
supports:
  - note_01KNW7XVT6RR3HW2XRWMAHKG7Y
---
The Skill directory structure implicitly defines a type system for context residency: scripts/ (execution results only → context), assets/ (path references only → never in context), references/ (text content → loaded into context on demand). This is more precise than the generic 'lazy loading' frame already in the knowledge base. The directory layout is not organizational convenience — it is a declarative policy about *how* each artifact class interacts with the model's attention budget. Three different relationship modes to context, encoded in folder names.
