---
id: src_01KNWD7SNBTM2Y04BVADD862XA
type: source
source_type: markdown
title: the-think-tool-enabling-claude-to-stop-and-think-in-complex-
word_count: 30
raw_file: raw/src_01KNWD7SNBTM2Y04BVADD862XA.md
ingested_at: '2026-04-10T19:17:26.315Z'
created_at: '2026-04-10T19:17:26.315Z'
status: active
---
# The "think" tool: Enabling Claude to stop and think in complex tool use situations

Reading notes and highlights from this source.

- think tool: 允许在响应的过程中暂停，并进行结构化思考，以解决复杂任务
  - 思考工具：在响应的过程中，允许模型插入额外的思考步骤，类似"临时笔记本"，用于处理新获得的外部信息（如，工具调用结果），并调整策略，适用于需要连续工具调用、分析工具输出和顺序决策的复杂任务
  - 推理模型：在响应之前，处理已有信息（如，用户query），系统性地规划整体回答策略，适用于非顺序性任务，如编码问题、数学推理、逻辑分析
