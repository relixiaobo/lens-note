---
id: note_01KNW91S46AX9467M6D94WQN2J
type: note
text: >-
  scripts/ in a Skill does something architecturally distinctive: the *code
  itself never enters context* — only its execution output does. This inverts
  the common agent pattern where tool code/schema occupies context budget. A
  script is a pure compute black box from the model's perspective: it declares
  nothing about its internals, yet delivers structured results. This is a more
  radical form of context isolation than lazy loading — it's not 'defer loading
  the definition'; it's 'the definition is permanently off-limits.' This
  suggests a design principle: for deterministic multi-step operations, code
  execution is strictly cheaper than code-in-context, because the model doesn't
  need to understand how — only what came out.
role: claim
source: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
status: active
created_at: '2026-04-10T18:04:14.841Z'
evidence:
  - text: >-
      scripts/: 可执行脚本，使用 scripts/ 处理 复杂的多步骤操作、数据转换、API
      交互，或任何需要精确逻辑且用代码表达比自然语言更好的任务，代码不加载到上下文，只有结果进入
    source: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
    locator: scripts/ description bullet
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
scripts/ in a Skill does something architecturally distinctive: the *code itself never enters context* — only its execution output does. This inverts the common agent pattern where tool code/schema occupies context budget. A script is a pure compute black box from the model's perspective: it declares nothing about its internals, yet delivers structured results. This is a more radical form of context isolation than lazy loading — it's not 'defer loading the definition'; it's 'the definition is permanently off-limits.' This suggests a design principle: for deterministic multi-step operations, code execution is strictly cheaper than code-in-context, because the model doesn't need to understand how — only what came out.
