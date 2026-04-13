---
id: src_01KNW4Y4YPJ8SHH3BWTEGCYAAF
type: source
source_type: markdown
title: 软件开发的矛盾-已经从-写代码费时费力-转换成了-海量高质量代码-跑得通-且有一点小问题-但很难-review-和修改
word_count: 160
raw_file: raw/src_01KNW4Y4YPJ8SHH3BWTEGCYAAF.md
ingested_at: '2026-04-10T16:52:21.590Z'
created_at: '2026-04-10T16:52:21.590Z'
status: active
---
# 软件开发的矛盾，已经从 “写代码费时费力” 转换成了“海量高质量代码，跑得通 且有一点小问题，但很难 review 和修改”

Reading notes and highlights from this source.

- 人机异步协作的可能形态
  - 任务/Issue系统（Linear形态）: 人&Agent互相创建/流转任务
  - 报告系统（周报形态）: Agent主动汇报
  - 监控仪表盘（Grafana形态）: 观察Agent运行状态
  - 我的判断:任务系统是核心，其他是补充
  - 知识库（Notion形态）: 人机共享的知识沉淀
  - 审批队列（Workflow形态）: 人类确认Agent决策
  - 共享文档（Docs形态）: 共同编辑产出物
- Agent 和 人类 协作的两种模式
  - 同步协作
    - 形态：Chat
    - 特点：实时、人类驱动、一问一答
  - 异步协作
    - 形态：任务系统
    - 特点：非实时、双向驱动、可并行
- Results 是唯一需要评估的主体
  - 作为 PM 是没有能力 review 代码的，但是可以 Verify 功能
  - 即使是 Coder，面对AI生成的大量的代码，可能也无法 review 所有的代码
  - 未来的程序员不是主编，而是写 Test Case 的 QA 和定义目标的产品经理。
  - 这意味着：
    - 人类定义预期结果
    - Agent负责实现
    - 验证只看结果，不看实现方式
  - 验证的不是代码、不是过程，而是"结果是否达到预期"。
- 下一代开发工具的核心转变
  - 传统思路：帮助人类更快地 "Review 代码"
  - Agent时代：建立一套自动化 "Verify 结果" 的机制（机器为主，人类为辅）
  - 核心模式：Agent自主循环 + 人类异步参与 + 共享协作界面
  - 验证来源：
    - Solo开发者越来越多地"trust the vibe"，依赖测试来发现问题
    - Addy Osmani: "AI正在把代码审查从逐行把关转变为更高层次的质量控制"
- 界面是为人类准备的，Agent需要的只是上下文
  - Agent不需要UI，直接通过API/协议工作
  - 人类需要界面来：
    - 回复Agent的问题
    - 调整优先级和方向
    - 提出新任务/需求
    - 观察Agent在做什么
  - 启示: 协作系统的设计应该以人类的认知为中心
- 我觉得下一代 IDE (或许就不是 IDE 形态)，应该是一个更好的促进人和 agent 的协作的形态，如何让人类 review 海量代码，并且有信心的去交付 Agent 的产出，这个形态肯定不是 CLI。
- IDE 是给“写代码”的人准备的。Agent 时代的交互核心绝不是帮助人类更快地 “Review 代码”，而是建立一套自动化 “Verify 结果” 的机制。如果你还在试图逐行 Review AI 生成的海量代码，那说明你的工作流还在石器时代。未来的程序员不是主编，而是写 Test Case 的 QA 和定义目标的产品经理。
