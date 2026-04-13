---
id: src_01KNVKYWQDSM4MNH0P9J97Q9JT
type: source
source_type: markdown
title: tana-exp-highlights-ai
word_count: 289
raw_file: raw/src_01KNVKYWQDSM4MNH0P9J97Q9JT.md
ingested_at: '2026-04-10T11:55:40.141Z'
created_at: '2026-04-10T11:55:40.141Z'
status: active
---
# Personal Notes: AI and Agent Design

The following are independent notes and observations from the user. Each is a separate thought.

1. 评估是你的“知识产权”。 一位专家曾说：“评估就是你们的‘知识产权’。”在 AI 应用的潜在空间中，谁能更快地通过评估找到最优解，谁就能在竞争中脱颖而出。

2. 首先，电子表格用户体验是支持批量处理工作负载的超级直观且用户友好的方式。每个单元格都可以变成一个独立的智能体，去研究特定的任务。这种批处理方式允许用户同时扩展并与多个智能体交互。  这种 UX 还有其他优势。电子表格格式是非常常见的用户界面，大多数用户都很熟悉，因此它可以轻松融入现有的工作流程中。

3. 现阶段的大模型有哪些局限性，这些局限性哪些是可以通过模型迭代得到解决的，哪些是不能的。

4. A2A 是 Google 推出的一个开放通信协议，旨在让 AI 代理（Agent）之间可以互相沟通、协作、派发任务，并同步结果。  它解决的核心问题是：   “多个智能体如何像一个团队一样配合工作？”

5. 既然 Prompt 的本质是一种对 LLM 的控制指令，那么我们可以不必局限于传统自然语言描述的方式写 Prompt，还可以借助伪代码（pseudocode）来精准的控制 LLM 的输出结果和定义其执行逻辑。

6. Once intelligence reaches a threshold, multi-agent systems become a vital way to scale performance.

7. That almost all these AI browsers have no business model. Because they traded being Chromium-based with being Chromium-based AND having a financial dependency on AI providers for all the API calls they’re making to power these apps. Because, in the same way, they were not making a browser before, they’re not making the AI part of the AI tools now either. And what is stopping Google from integrating into Chrome the same AI capabilities all these companies want to build in their fancy browsers?

8. The "think" tool is for Claude, once it starts generating a response, to add a step to stop and think about whether it has all the information it needs to move forward. This is particularly helpful when performing long chains of tool calls or in long multi-step conversations with the user.

9. Our goal is to increase the surface area over which agents can be effective in solving a wide range of tasks by using tools to pursue a variety of successful strategies.

10. 但到了 2024 年，AI 在应用中的实践如果只能确定一件事，那就是绝大部分 AI 不是一个产品，只是一个功能。

11. 模型能够容纳的最大窗口和有效工作窗口是两个概念，并且不同的任务的有效窗口大小可能是非常不一致的。

12. Multi-agent systems work mainly because they help spend enough tokens to solve the problem.

13. 如果 workflow 不确定但 context 确定，也就是输入清晰但走法多样，Agent 就要去自主规划路径，例如市场分析报告生成、个性化推荐等，大多数 End-to-End RL Agent 都擅长做这类任务，因为它们在训练阶段就习得了大量的路径规划和解题思路。

14. 高级工程师可以利用AI工具提高编码速度，但应将节省的时间用于提高代码质量而非增加功能数量。

15. 这么做有多重好处：  •   信任（Trust）：能够直接观察 Claude 的思考过程，更容易理解并检验它的答案，也可能帮助用户获得更好的结果。      •   对齐（Alignment）：在我们之前的一些 对齐科学（Alignment Science）研究 中，通过模型内部思考和对外回答的矛盾，可以发现模型是否出现了诸如故意欺骗等令人担忧的行为。      •   趣味（Interest）：看着 Claude 进行思考常常令人着迷。一些有数学或物理背景的研究人员指出，Claude 的思考过程与他们自己思考复杂问题时的思路令人惊讶地相似，往往会从多个角度出发，不断反复检验结果。

