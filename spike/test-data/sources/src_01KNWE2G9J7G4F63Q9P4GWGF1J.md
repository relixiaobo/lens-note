---
id: src_01KNWE2G9J7G4F63Q9P4GWGF1J
type: source
source_type: markdown
title: writing-effective-tools-for-agents-with-agents
word_count: 131
raw_file: raw/src_01KNWE2G9J7G4F63Q9P4GWGF1J.md
ingested_at: '2026-04-10T19:32:01.458Z'
created_at: '2026-04-10T19:32:01.458Z'
status: active
---
# Writing effective tools for agents — with agents

Reading notes and highlights from this source.

- 什么是工具？通过提供工具，提高 Agent 有效解决各种任务的作用范围
- Agent 工具的设计原则
  - 工具结果：优化工具返回的上下文长度和质量
    - 可以使用一些手段，优化工具返回的上下文长度，比如 实施分页、范围选择、过滤或截断的组合，并设置合理的默认长度值
      - 对于截断，建议不要直接返回截断后的结果，而是告知模型数据已经截断，比如结果是一个10000行的表格，最好就是去前面几行的数据作为参照，再告知模型一些基本的信息，比如一共多少行，以及无法返回全部数据，后续 Agent 可以使用什么方法获取到某些具体行等等
    - 对于错误结果的返回，不要只返回一个错误代码，而是应该告知 Agent 清晰的错误以及后续可改进的操作
  - 工具命名：将相关工具分组到相同的 前缀 或者 后缀 下，有利于 Agent 区分众多相同功能工具的界限
    - 按照服务（service）分组，比如 asana_search, jira_search
    - 按照资源（source）分组，比如 asana_projects_search, asana_users_search
  - 为 Agent 选择合适的工具
    - 过多的工具会分散 Agent 的注意力，设计工具是既要选择添加什么工具，也要选择不添加什么工具
    - 不要将程序中的所有 API 直接简单封装成工具，而是围绕 Agent 的特性以及具体任务为其搭配工具（每个工具都应有清晰、独立的目的）
      - 工具是可以将功能（workflow）整合起来的，允许在后台处理多个独立操作，比如
        - 实现查找和安排日程的工具，提供 schedule_event ，而不是 list_users +list_events +  create_event
      - Agent上下文空间有限
        - 查找联系人 的任务，传统程序可以从一个完整的联系人列表中查找到具体的联系人，但是对于 Agent 就不能直接提供所有的联系人列表，让其自己去寻找（暴力搜索），而是最好让其通过工具直接找到某个联系人，提供 search_contacts 工具，而不是 list_contacts 工具
        - 获取客户信息的工具，考虑实现 get_customer_context ，而不是 get_customer_by_id, list_transactions, list_notes ，一次性返回汇总客户相关信息，而不是所有的详细列表
        - 读取日志的工具，考虑实现 search_logs ，而不是 read_logs ，只返回相关日志行和一些周围的上下文
  - 工具结果：让工具返回有意义的上下文结果，而不是隐晦的技术标识符，Agent 跟人类一样，在处理自然语言名称、术语或标识符时也往往更加成功
    - 有时候，Agent 必须要处理技术标识符，用于下游工具的调用，可以使用自然语言+技术标识符结合的方式返回，比如 Send From: @jane.doe (u12345678)
    - 比如，使用 name, image_url, and file_type ，而不是 uuid, 256px_image_url, mime_type
  - 工具描述：优化工具的描述以及参数
    - 参数：参数的命名应该清晰，比如使用 user_id 而不是 user 的参数
    - 工具描述：把Agent当成是团队的新成员，请思考如何Agent描述你的工具，潜在的上下文也应该明确说明，比如专用查询格式、小众术语的定义、底层资源之间的关系等
