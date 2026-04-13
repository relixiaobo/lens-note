---
id: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
type: source
source_type: markdown
title: claude-agent-skills-a-first-principles-deep-dive
word_count: 82
raw_file: raw/src_01KNW8Z9C7Y72AHDJZPDCKCTCJ.md
ingested_at: '2026-04-10T18:02:53.191Z'
created_at: '2026-04-10T18:02:53.191Z'
status: active
---
# Claude Agent Skills: A First Principles Deep Dive

Reading notes and highlights from this source.

- Skills 的文件夹结构
  - scripts/: 可执行脚本，使用 scripts/ 处理 复杂的多步骤操作、数据转换、API 交互，或任何需要精确逻辑且用代码表达比自然语言更好的任务，代码不加载到上下文，只有结果进入
  - assets/: 相关静态资源，包括HTML 模板、CSS 文件、图像、配置模板或字体等，仅通过路径引用的文件，不加载到上下文
  - my-skill/
├── SKILL.md          # 唯一必需的文件
├── scripts/          # 可执行脚本（可选）
├── references/       # 参考文档（可选）
└── assets/           # 静态资源（可选）
  - skill.md : 元数据 + 核心指令
    - ---
name: pdf-processing          # Claude 用这个识别
description: 提取PDF文本...    # Claude 用这个判断是否触发
---

# 正文：具体指令
...
  - references/: 特定场景的相关文档，包括文本内容：Markdown 文件、JSON 模式、配置模板，以及 Claude 完成任务所需的任何文档（可以防止 skill.md 过于庞大），通过读取工具加载到 Claude 上下文中的文本内容
