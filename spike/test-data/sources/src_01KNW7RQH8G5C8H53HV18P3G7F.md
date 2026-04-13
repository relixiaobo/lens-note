---
id: src_01KNW7RQH8G5C8H53HV18P3G7F
type: source
source_type: markdown
title: agent-有两个变量-一个是控制任务走向的-workflow-工作流-一个是控制内容生成的-context-上下文
word_count: 46
raw_file: raw/src_01KNW7RQH8G5C8H53HV18P3G7F.md
ingested_at: '2026-04-10T17:41:49.736Z'
created_at: '2026-04-10T17:41:49.736Z'
status: active
---
# Agent 有两个变量，一个是控制任务走向的 workflow 工作流，一个是控制内容生成的 context 上下文。

Reading notes and highlights from this source.

- Workflow 解决"确定性"问题，Agent 解决"不确定性"问题
  - workflow 不确定 & context 确定：输入固定、但实现路径多样，比如深度研究、个性化推荐
  - workflow 确定 & context 确定：流程固定、输入固定，很容易被自动化，不需要 AI，比如发票处理、表单填写
  - workflow 确定 & context 不确定：流程固定、输入多变，需要 AI 理解输入并转换成合法参数填入到 Workflow，比如客服问答、合同解析
  - workflow 不确定 & context 不确定：流程多样、输入多变，比如创新方案设计、跨部门信息收集，需要搭配专门工具的通用Agent
