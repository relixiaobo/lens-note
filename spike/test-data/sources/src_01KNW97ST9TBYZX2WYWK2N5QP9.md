---
id: src_01KNW97ST9TBYZX2WYWK2N5QP9
type: source
source_type: markdown
title: don-t-build-agents-build-skills-instead-barry-zhang-mahesh-m
word_count: 439
raw_file: raw/src_01KNW97ST9TBYZX2WYWK2N5QP9.md
ingested_at: '2026-04-10T18:07:32.169Z'
created_at: '2026-04-10T18:07:32.169Z'
status: active
---
# Don't Build Agents, Build Skills Instead – Barry Zhang & Mahesh Murag, Anthropic

Reading notes and highlights from this source.

- Agent Skills 是什么
  - 解决的问题
    - 直觉思路：直接将所有的技能说明和工具全部塞到一个通用agent的上下文中。（因为上下文的限制以及注意力的问题，无法做到）
    - 传统思路是：为每个任务定制一个 Agent or Workflow
    - "Is it going to be Mahesh, the 300 IQ mathematical genius, or is it Barry, an experienced tax professional? I would pick Barry every time. I don't want Mahesh to figure out the 2025 tax code from first principles."
    - 来自 Anthropic 的 Barry Zhang 和 Mahesh Murag 演讲（演讲者本人就叫 Mahesh）：
    - Skills 思路是：通用 Agent + 可组合技能库（Skills）
    - 之前用 AI 做重复任务时，每次都要重新解释上下文，这不就是在反复"培训"同一个聪明但没经验的新人吗？
  - 把专业知识打包成的文件夹，包含指令、脚本、参考资料，让 Agent 按需加载
- Agent 架构：[Agent Loop: Model + Runtime] + [MCP] + [Skill]
  - Runtime Environment (文件系统 + 代码执行)
  - Agent Loop (管理上下文和token)
  - MCP Servers (外部连接和数据) + Skills (领域专业知识)
- Agents today are a lot like Mahesh. They're brilliant, but they lack expertise. They come in cold. They can do amazing things when you really put in the effort and give proper guidance, but they're often missing the important context up front. They can't really absorb your expertise super well, and they don't learn over time. That's why we created Agent Skills.
- Skills are organized collections of files that package composable procedural knowledge for agents. In other words, they're folders. This simplicity is deliberate. We want something that anyone—human or agent—can create and use, as long as they have a computer.
- Traditional tools have pretty obvious problems. Some tools have poorly written instructions and are pretty ambiguous, and when the model is struggling, it can't really make a change to the tool.
- Code solves some of these issues. It's self-documenting. It is modifiable and can live in the file system until it's really needed and used.
- At this point, skills can contain a lot of information, and we want to protect the context window so that we can fit in hundreds of skills and make them truly composable. That's why skills are progressively disclosed.
- We're also seeing that this ecosystem of skills is complementing the existing ecosystem of MCP (Model Context Protocol) servers that was built up over the course of this year. Developers are using and building skills that orchestrate workflows of multiple MCP tools stitched together to do more complex things with external data and connectivity. In these cases, MCP is providing the connection to the outside world, while skills are providing the expertise.
- Our goal is that Claude on day 30 of working with you is going to be a lot better than Claude on day one.
- So we think it's time to stop rebuilding agents and start building skills instead.
