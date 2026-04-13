---
id: src_01KNWBNX111SDHAPNZDEWTN8AD
type: source
source_type: markdown
title: memory-for-agents
word_count: 60
raw_file: raw/src_01KNWBNX111SDHAPNZDEWTN8AD.md
ingested_at: '2026-04-10T18:50:11.361Z'
created_at: '2026-04-10T18:50:11.361Z'
status: active
---
# Memory for agents

Reading notes and highlights from this source.

- 人类记忆的类型 以及 与大模型记忆设计的类比
  - 情景记忆（Episodic Memory）：对特定过去事件的回忆，包含时间、地点、情感等具体细节
    - 例子：你的大学毕业典礼、第一次约会的场景、去年生日派对的细节、特定假期旅行的记忆
    - 类比Agent，是Agent过去的行为序列，包含与用户交互的所有信息以及自己执行的所有信息，非常适合指导Agent根据用户的偏好，"正确"地做事。
  - 语义记忆（Semantic Memory）：长期的知识储备，由信息片段组成
    - 例子：例如在学校学到的事实、概念的含义以及它们之间的关系
    - 类比Agent，关于世界的事实的数据库，存储结构化的事实和知识，主要应用于对该信息的检索并添加到提示词中，以影响Agent的回应
  - 程序性记忆（Procedural Memory）：大脑的核心指令集，通常是自动化的，不需要有意识地回忆
    - 例子：骑自行车的技能、系鞋带的动作、打字的能力、游泳的技巧
    - 类比Agent，是LLM权重和代理代码的组合，从根本上决定了Agent的工作方式。（目前还没有代理会对这个类型的记忆进行自更新）
- 没有一种记忆方案能够完美适用于所有AI应用，应用程序的记忆机制设计必须与其独特的业务逻辑相适应。
- 更新 Agent 记忆的两种方式
  - 热更新（in the hot path）：在做出响应之前会明确决定记住哪些事实（通常通过工具调用），ChatGPT 采用的方法。
    - 在输出任何响应之前，处理记忆逻辑会带来一些额外的延迟
    - 将记忆逻辑与代理逻辑混合在一起，可能会让代理的注意力分散
  - 后台更新（in the background）：在对话期间或之后，通过后台进程运行以更新记忆
    - 需要额外的逻辑，来确定何时启动后台进程
    - 记忆不会立即更新，也就无法立即投入使用
