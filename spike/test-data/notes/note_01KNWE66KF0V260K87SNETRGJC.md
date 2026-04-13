---
id: note_01KNWE66KF0V260K87SNETRGJC
type: note
text: >-
  工具的粒度应该与任务的粒度对齐，而非与 API 的粒度对齐。这篇文章给出了一个清晰的例子：提供 `schedule_event` 而非
  `list_users + list_events + create_event`；提供 `get_customer_context` 而非
  `get_customer_by_id + list_transactions +
  list_notes`。这揭示了一个设计原则的错位：传统软件工程习惯「原子性 API + 调用方组合」，但 Agent 工具设计需要「任务粒度 API +
  内部组合」。原因在于：Agent 的上下文是有限资源，每一个中间步骤的工具调用都会占用上下文，并引入不确定性。工具应该在内部处理组合逻辑，只向 Agent
  暴露语义完整的操作，而非将组合的责任转嫁给 Agent 的推理链。
role: claim
source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
status: active
created_at: '2026-04-10T19:34:02.607Z'
evidence:
  - text: >-
      工具是可以将功能（workflow）整合起来的，允许在后台处理多个独立操作，比如实现查找和安排日程的工具，提供 schedule_event
      ，而不是 list_users + list_events + create_event
    source: src_01KNWE2G9J7G4F63Q9P4GWGF1J
    locator: 'Section: 为 Agent 选择合适的工具'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
工具的粒度应该与任务的粒度对齐，而非与 API 的粒度对齐。这篇文章给出了一个清晰的例子：提供 `schedule_event` 而非 `list_users + list_events + create_event`；提供 `get_customer_context` 而非 `get_customer_by_id + list_transactions + list_notes`。这揭示了一个设计原则的错位：传统软件工程习惯「原子性 API + 调用方组合」，但 Agent 工具设计需要「任务粒度 API + 内部组合」。原因在于：Agent 的上下文是有限资源，每一个中间步骤的工具调用都会占用上下文，并引入不确定性。工具应该在内部处理组合逻辑，只向 Agent 暴露语义完整的操作，而非将组合的责任转嫁给 Agent 的推理链。
