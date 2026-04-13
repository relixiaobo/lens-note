---
id: src_01KNW9BGWTDXSKVFSKAC4927DK
type: source
source_type: markdown
title: effective-harnesses-for-long-running-agents
word_count: 258
raw_file: raw/src_01KNW9BGWTDXSKVFSKAC4927DK.md
ingested_at: '2026-04-10T18:09:34.106Z'
created_at: '2026-04-10T18:09:34.106Z'
status: active
---
# Effective harnesses for long-running agents

Reading notes and highlights from this source.

- Claude Code 使用了两阶段 Harness: Initializer (初始化) + Coding (迭代和收尾)，让 agent 按"优秀工程师节奏"的工作（"让项目交接清楚"、"一次只专注一个任务"）
  - initializer agent: 在首次运行时，负责搭好脚手架和工作环境
    - claude-progress.txt、feature_list.json、git commit，相当于给每一轮 Agent 准备了一个**“接手说明书”**，降低“猜”的成分
    - init.sh：一键启动 dev server、自检和修复环境问题
    - 初始化 git 仓库 + 初始 commit
    - feature_list.json : 用 JSON 列出所有功能要求
      - {
  "category": "functional",
  "description": "New chat button creates a fresh conversation",
  "steps": [
    "Navigate to main interface",
    "Click the 'New Chat' button",
    "Verify a new conversation is created",
    "Check that chat area shows welcome state",
    "Verify conversation appears in sidebar"
  ],
  "passes": false
}
      - 每轮结束时，Agent 写一小段
        - 这个功能是什么；
        - 当前是否已经通过（true/false）。
        - 如何从用户视角一步步测试；
      - Agent 只被允许更新“是否通过”的字段，不能随便删改测试内容
    - claude-progress.txt：记录每轮 agent 做了什么
      - 本轮做了什么；
      - 有没有遗留问题
      - 改了哪些文件；
  - coding agent: 后面每一次 session，只做增量迭代 + 干净收尾
    - 先“读环境”：看 pwd、git log、claude-progress.txt、feature_list.json。
    - 再选择一个 feature （最高优先级、未完成），只做这一件事，并保证：
      - 代码可运行、可测试、状态“干净”
      - 在 feature_list.json 中只修改相应的 passes 字段
        - 必须自测，确认端到端通过后才能把 passes 设为 true（明确让 Agent 使用 浏览器自动化工具（比如 Puppeteer MCP server），像人类用户一样测试）
      - 写清楚自己改了什么（git commit + progress 文件更新）
        - 用 git 管理，方便回退
        - 在 text 文件中做结构化 summary，让下一轮 Agent 一眼看懂
- 多轮 Agent 看起来像是"记忆不够用"（上下文会爆），但更深层的问题是"项目交接不清楚"
  - 每个 session 开始时，都像换了一位全新工程师接手：不知道最新状态；不知道上一个人做了什么 / 留下了什么坑；测试方法也不统一
  - Agent倾向于试图一次性完成所有东西（One-shot 倾向），容易导致上下文爆掉，导致某个功能只实现了部分（不完整，不可运行），并且由于上下文爆掉，没有进度的记录和说明，后续代理不得不猜测发生了什么，花费大量时间使其可以重新运行
  - Agent容易较早宣布胜利，实际功能远没完成，也导致记忆的错乱，以为自己做完了。
  - 结果是：一轮轮的 Agent 在猜测前因后果、救火、修环境，真正推进功能的时间反而不多
  - Claude Code 会有上下文压缩来解决这个问题，但是只能缓解 token 限制，不能保证项目结构化推进。压缩内容不一定清晰，后续 Agent 很难从中恢复完整的任务结构和上下文。
  - 所以，设计长时 Agent 的关键，不是先去想“怎么塞更多内容进上下文”，而是：如何让“下一轮接手的人”能迅速看懂当前项目状态，并在此基础上安全地前进一小步？
- Anthropic 的架构还有一个隐含的乐观假设：它假设 Initializer 拆解出的每一个子任务（Feature），都能在一个 Context Window 内顺利完成闭环。
  - coding agent 选择的 feature 还是会有可能在执行时将上下文挤爆，作者提出的解决办法是执行子任务时做上下文窗口监控，在执行过程中，如果发现 Context 占用达到安全阈值（比如 130K token（这是我体感出来的有效工作上线）），无论当前子任务是否完成，都强制触发一次“存档中断”：让 AI 把当前残缺的代码进度写入进度文档（注明：In Progress）。主动结束当前对话。新开对话读取进度，继续收尾，或者继续将这个子任务进行拆解。
- 如何让一个需要跑很久的编码 Agent，在多轮对话 / 多个上下文窗口之间保持稳定进展，而不是每轮都像换了个新人
  - Claude Code 的问题
    - Agent倾向于试图一次性完成所有东西（One-shot 倾向）
      - 后续代理不得不猜测发生了什么，花费大量时间使其可以重新运行
      - 容易导致上下文爆掉，导致某个功能只实现了部分（不完整，不可运行），并且由于上下文爆掉，进度没记录
    - Agent容易较早宣布胜利，实际功能远没完成
  - 之前 Claude Code 会有上下文压缩来解决这个问题，但是只能缓解 token 限制，不能保证项目结构化推进。
    - 压缩侧重“保留信息”，而不是“组织工作流”
    - 压缩内容不一定清晰，后续 Agent 很难从中恢复完整的任务结构和上下文
  - 长时运行 Agent 的难点在于：每个 session 都像换了一位新工程师、没有记忆，只能看当前上下文。
