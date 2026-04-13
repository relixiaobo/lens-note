---
id: src_01KNW85MDTKKEQ4S948D7562RW
type: source
source_type: markdown
title: ai代理的上下文工程-构建manus的经验教训
word_count: 322
raw_file: raw/src_01KNW85MDTKKEQ4S948D7562RW.md
ingested_at: '2026-04-10T17:48:52.538Z'
created_at: '2026-04-10T17:48:52.538Z'
status: active
---
# AI代理的上下文工程：构建Manus的经验教训

Reading notes and highlights from this source.

- 缓存命中的前提：相同的 token 前缀
  - 前缀完全匹配，单个 token 的差异也会使从该 token 开始的所有缓存失效
  - 动态部分，只追加，不修改
    - 不修改已有的 action 或 observation
    - 序列化必须确定性：JSON 键顺序在很多语言/库中不稳定，会静默破坏缓存
  - 静态部分，保持稳定：包括system prompt 和 tool schema，不添加动态内容（如精确到秒的时间戳）
- Agent 在多次执行重复的任务后，容易陷入 Few-shot 陷阱，导致机械重复过去的行为模式
  - LLM 是优秀的模仿者。当上下文中充满相似的"行动→观察"记录时，模型会陷入"节奏感"，机械重复过去的行为模式——即使这已经不是最优选择。
  - 上下文中的出现多次类似的执行或者操作（Few-shot），也可能让AI对其行为进行模型，陷入重复的行为模式，即使这不是最优选择。
  - 解决方案：引入结构化的多样性（未明确说明）
  - 具体例子（来自原文）：用 Manus 审阅 20 份简历时，Agent 容易陷入重复的行为模式，因为它看到的都是类似的操作记录。这会导致漂移、过度泛化，甚至幻觉。
- in-context learning: 把错误留在上下文中
  - 例子：API 调用超时
    - 保留错误的做法
      - User: 查一下北京今天的天气
Assistant: [调用 weather_api("Beijing")]
System: Error: requests.exceptions.Timeout
        Connection to api.weather.com timed out after 30s
        Retry 1/3 failed...
        Retry 2/3 failed...
Assistant: 天气 API 连续超时了。我可以：
          1. 尝试备用数据源
          2. 搜索网页获取天气信息
          您希望我怎么做？
    - 清理错误的做法
      - User: 查一下北京今天的天气
Assistant: [调用 weather_api("Beijing")]
System: [重试3次后放弃，返回空]
Assistant: 暂时无法获取天气信息。
  - 在多步任务中，失败不是异常，而是常态的一部分。隐藏失败 = 移除学习机会。
  - 反直觉的部分：大多数人的本能是「打扫干净」——移除错误输出、重试时给模型一个「干净」的上下文。但移除错误，恰恰剥夺了模型的学习信号。
    - "Error recovery is one of the clearest indicators of true agentic behavior."
    - "Erasing failure removes evidence. And without evidence, the model can't adapt."
  - 当模型看到自己执行了某个动作并失败了——以及由此产生的报错信息——它会在「内部」调整自己的行为倾向，降低重复犯错的概率。
- Agent 的运作：在接收用户输入后，代理通过一系列工具使用链来完成任务。在每次迭代中，模型根据当前上下文从预定义的动作空间中选择一个动作。然后在环境中执行该动作（例如，Manus的虚拟机沙盒）以产生观察结果。动作和观察结果被附加到上下文中，形成下一次迭代的输入。这个循环持续进行，直到任务完成。
- Mask Don't Remove: 不要动态加载工具
  - 解决方案：Logit Masking
    - 工具定义保留在上下文中，但在解码时屏蔽不想让模型选的 token
    - 工具命名设计配合
      - 统一前缀让 masking 更容易实施：
        - shell_exec, shell_read
        - browser_click, browser_navigate, browser_scroll
        - file_read, file_write
      - 只需 mask 前缀 token，不用逐个枚举工具名
    - 机制原理
      - 被 mask 的 token 概率变为 0，模型选不到
      - 原始 logits:  [browser → 3.2, shell → 2.8, file → 2.5, ...]
                     ↓ 把禁止的设为 -∞
Masked logits: [browser → -∞, shell → 2.8, file → 2.5, ...]
                     ↓ softmax  
概率:          [browser → 0, shell → 0.52, file → 0.48, ...]
  - 为什么不建议动态加载工具？
    - 模型困惑：历史 action/observation 引用了已被移除的工具 → schema 违规或幻觉
    - 破坏 KV 缓存：工具定义在序列化后位于上下文前部（紧跟 system prompt）→ 改动会使后续所有缓存失效
  - 两种实现方式
    - logit_bias（自托管场景）
      - 能力：任意组合的允许/禁止
      - 适用：vLLM、TGI 等自托管框架
      - Manus 实际采用的方案
    - Response prefill（API 调用场景）
      - 能力：强制选某一类工具
      - 三种模式：
        - Auto：prefill <|im_start|>assistant → 模型自己决定是否调用
        - Specified：prefill 到 {"name": "browser_ → 只能选 browser_* 工具
        - Required：prefill 到 <tool_call> → 必须调用，但不限哪个
      - 适用：大多数厂商 API 都支持
      - 局限：适合"强制选某类"，不适合"禁止某类而允许其他所有"
- 如何让Agent在超长上下文的任务中保持注意力？
  - Manus 的早期方案：
    - 通过不断重写，将全局计划"复述"到上下文末尾
    - 创建 `todo.md` 文件，随任务进展逐步更新、勾选完成项
    - 把目标推入模型的近期注意力范围，减少目标不一致
  - 问题：LLM在长上下文或复杂任务中容易偏离主题、忘记早期目标（U-shaped attention bias）
  - Manus 的演进方案
    - 早期方案的问题：约30%的操作用于更新todo列表，token浪费严重
    - 新方案：使用专门的 Planner sub-agent
      - 仅在需要时注入上下文，而非每轮都消耗token
      - 返回结构化 Plan 对象
- 使用文件系统作为上下文，对上下文进行可恢复的压缩
  - 例如，只要保留URL，网页内容就可以从上下文中移除；如果沙盒中仍然保留文档路径，则可以省略文档内容。这使得Manus能够缩短上下文长度，而不会永久丢失信息。
