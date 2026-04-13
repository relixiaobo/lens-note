---
id: src_01KNW942AFYZ1TAZVA0YGYA9KE
type: source
source_type: markdown
title: context-engineering-in-manus
word_count: 416
raw_file: raw/src_01KNW942AFYZ1TAZVA0YGYA9KE.md
ingested_at: '2026-04-10T18:05:29.808Z'
created_at: '2026-04-10T18:05:29.808Z'
status: active
---
# Context Engineering in Manus

Reading notes and highlights from this source.

- Agent 怎么知道 沙箱 里有什么工具？
  - Manus的做法：mcp-cli
    - 传统MCP绑定
      - 每个工具一份完整schema：
        - {
  "name": "mcp_weather_get",
  "description": "获取指定城市的天气信息",
  "parameters": { "city": { "type": "string" } }
}
    - Manus的方式
      - 把MCP工具包装成CLI程序，通过bash调用：
        - mcp-cli weather get --city "Beijing"
    - 模型怎么知道有哪些 mcp-cli 可用？
      - 按需查用法，mcp-cli weather --help
      - 运行时发现，mcp-cli --list
      - 简单清单：提示词列出工具名（无schema）
  - Claude Skills的做法
    - 提示词只放目录清单
    - 需要时用文件读取工具查看详细文档
    - 技能文档存文件系统：/mnt/skills/<技能名>/SKILL.md
  - 设计原则：渐进式披露（Progressive Disclosure）
    - 渐进式：告诉模型"有什么"，需要时再查"怎么用"
    - 传统：把所有工具的完整文档放进提示词（背下来）
  - 工具定义不在 tool calling schema 里，AI怎么知道有什么工具可用？
- 上下文隔离 (Context Isolation): Multi-Agent的本质
  - Manus: Agent 和 Sub- Agent 通信机制
    - 具体实现：
      - Sub-agent用 submit_results 工具返回结果
      - 用constrained decoding确保输出符合schema
      - Planner定义sub-agent的输出schema
    - 原则（借鉴Go语言并发模型））：不要让agent共享同一个context"开会"，而是通过结构化的输出传递信息。
      - "Share memory by communicating, don't communicate by sharing memory."
  - Multi-agent不是为了模拟人类团队，是为了：隔离context - 每个sub-agent有干净的工作空间
    - 避免污染 - 不相关的信息不要混在一起
    - 结构化通信 - 用schema传递结果，不是"对话"
  - Manus的观点：Sub-Agent 的目的是隔离 context
    - 为什么要隔离？
      - 共享context → 不必要的长context开销
      - 共享context → context pollution (上下文污染)
    - "The primary goal of sub-agents in Manus is to isolate context."
  - 两种任务分配模式
    - 复杂任务：共享context
      - Planner → 指令 + 完整context → Sub-agent → 结果 → Planner
        - Sub-agent仍有自己的工具和指令，但能看到planner的context
        - 当sub-agent需要访问planner也在用的文件时
    - 简单任务：只传指令
      - Planner → 指令 → Sub-agent → 结果 → Planner
        - Planner只需要输出结果，不需要过程
        - Sub-agent有独立的context window
  - 反直觉
    - 共享context方便协作 VS 共享context = 上下文污染
    - Agent越多越强 VS Agent多了context污染更严重
    - Agent应该像人类团队一样协作 VS LLM不需要拟人化分工
  - Manus的 multi-agent 结构
    - 不是按"角色"分，而是按"职责"分：
      - Planner：决定做什么
      - Knowledge Manager：管理持久化
      - Executor：执行任务
    - Planner（规划器）
├── Knowledge Manager（知识管理器）
│   └── 决定什么该存到文件系统
└── Executor（执行器）
└── 执行planner分配的具体任务
  - 设计 Multi-Agent 时的常见误区
    - 按人类组织架构来分：Manager Agent + Designer Agent + Coder Agent + Reviewer Agent
    - 这是拟人化思维。人类这样分工是因为认知局限，LLM不一定需要。
    - 然后让它们"开会"、"讨论"、"协作"。
- 上下文的渐进压缩：工具调用参数以及输出结果
  - 解决的问题：工具返回结果很大，多次调用后context爆炸
  - Manus的策略：三级递进，能用前面的就不用后面的
    - Compaction（压缩）：旧结果用引用替换
      - context里只留：weather_data → /tmp/weather.json
      - 完整结果存到 /tmp/weather.json
      - 需要时用 cat 或 jq 读回来。
    - Summarization（摘要）：当压缩还不够时，用LLM总结历史轨迹
      - 即使做摘要，manus 也会保留最近几轮的原始结果
      - 触发条件
        - 不是"几轮之后"，而是context达到阈值
    - Raw（原始）：新结果、最近结果保持完整，最近的结果指导下一步决策，压缩了会影响判断。
- 上下文卸载(Context Offloading)
  - 为什么需要上下文卸载？
    - 塞太多信息会导致模型"注意力分散"
    - 上下文窗口有限且昂贵（每个token都计费）
  - 大模型的上下文窗口就像工作台，东西堆太多就放不下了，并且也很难寻找。上下文卸载就是把暂时不用的东西分门别类放到抽屉（文件系统）里，需要时再拿出来。
  - 卸载到哪里？（可恢复压缩）
    - 键值存储
    - 向量存储
    - 文件系统（最常用）
    - 数据库
- 上下文精简 (Context Reduction)：Manus 中的工具调用有"完整"和"紧凑"两种表示形式。
  - 例如，只要保留URL，网页内容就可以从上下文中移除；如果沙盒中仍然保留文档路径，则可以省略文档内容。这使得Manus能够缩短上下文长度，而不会永久丢失信息。
  - 跨轮次的message中，所有的工具结果都是紧缩版本，不会在下一轮直接命中缓存，但可以在下下轮或者后续命中缓存
- Manus的分层工具架构: 如何卸载工具定义？
  - 给AI绑定100个工具，每个工具的说明都要放提示词里，太浪费token了。而且工具多了AI容易选错。
  - 更多工具可能让 Agent 变笨。随着操作空间增长，模型更可能选择次优操作或走低效路径。
  - Manus 提供了另一种分层设计的思路，巧妙地解决了这个问题：
    - Level 1 -原子工具层（约20个核心工具）
      - 例如：`file_write`, `browser_navigate`, `bash`, `search`
      - 直接通过function calling暴露给LLM，工具schema会序列化进上下文
      - 特点：稳定、数量少、对 KV-cache 友好
    - Level 3 - 代码/包层
      - 当任务涉及循环、条件、多步依赖时，让agent写脚本一次执行，而非多次LLM往返
      - Layer 3省的不直接是token，是LLM往返次数。
    - Level 2 -沙箱CLI工具层
      - 不给grep、ffmpeg、curl单独建工具，而是让LLM通过bash去调用，工具定义不占上下文，无限扩展能力
      - MCP工具也走这条路：mcp-cli <command>
      - 不需要专门的 "convert_video" 工具，而是bash: ffmpeg -i input.mp4 -vf scale=320:240 output.gif
      - 不需要专门的 "search_in_file" 工具，而是 bash: grep -r "error" ./logs/
- 上下文卸载(Context Offloading)
  - 当然，我们可以将大量工具集绑定到大语言模型上，并提供如何使用所有这些工具的详细说明。但是，工具描述会占用宝贵的token，而且过多的工具（往往存在重叠或模糊不清的情况）可能会导致模型混淆。
  - 我观察到的一个趋势是，智能体使用一小组通用工具来访问计算机。例如，仅凭一个 Bash 工具和几个访问文件系统的工具，智能体就能执行各种各样的操作！
  - 与其让函数调用层变得臃肿，Manus 将大部分操作卸载到沙箱层。Manus 可以使用其 Bash 工具直接在沙箱中执行许多实用程序，而 MCP 工具则通过命令行界面暴露出来，代理也可以使用 Bash 工具来执行这些工具。
  - 由于 Manus 可以访问文件系统,它还能够转移上下文(例如工具结果)。如上所述,这对于减少上下文至关重要;工具结果被转移到文件系统以生成精简版本,并用于从智能体的上下文窗口中清除过时的标记。与 Claude Code 类似,Manus 使用基本工具(例如 glob 和 grep)来搜索文件系统,而无需进行索引(例如向量存储)。
  - Manus将此视为一个分层的动作空间，包含函数/工具调用及其虚拟计算机沙盒。Peak提到Manus使用一小组（<20个）原子函数；其中包括Bash工具、文件系统管理工具和代码执行工具等。
