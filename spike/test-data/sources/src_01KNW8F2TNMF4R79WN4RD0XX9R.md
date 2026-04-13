---
id: src_01KNW8F2TNMF4R79WN4RD0XX9R
type: source
source_type: markdown
title: anthropic-的架构还有一个隐含的乐观假设-它假设-initializer-拆解出的每一个子任务-feature-
word_count: 28
raw_file: raw/src_01KNW8F2TNMF4R79WN4RD0XX9R.md
ingested_at: '2026-04-10T17:54:02.197Z'
created_at: '2026-04-10T17:54:02.197Z'
status: active
---
# Anthropic 的架构还有一个隐含的乐观假设：它假设 Initializer 拆解出的每一个子任务（Feature），都能在一个 Context Window 内顺利完成闭环。

Reading notes and highlights from this source.

- coding agent 选择的 feature 还是会有可能在执行时将上下文挤爆，作者提出的解决办法是执行子任务时做上下文窗口监控，在执行过程中，如果发现 Context 占用达到安全阈值（比如 130K token（这是我体感出来的有效工作上线）），无论当前子任务是否完成，都强制触发一次“存档中断”：让 AI 把当前残缺的代码进度写入进度文档（注明：In Progress）。主动结束当前对话。新开对话读取进度，继续收尾，或者继续将这个子任务进行拆解。
