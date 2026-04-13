---
id: src_01KNW7TXEXN9MNCK9NCTEA8501
type: source
source_type: markdown
title: agent-skills-终极指南-入门-精通-预测
word_count: 81
raw_file: raw/src_01KNW7TXEXN9MNCK9NCTEA8501.md
ingested_at: '2026-04-10T17:43:01.341Z'
created_at: '2026-04-10T17:43:01.341Z'
status: active
---
# Agent Skills 终极指南：入门、精通、预测

Reading notes and highlights from this source.

- Skills 的核心设计原则：渐进式披露 (Progressive Disclosure)
  - 、只在需要时才加载信息到上下文窗口，而非一次性全部加载。
  - 类比：
    - L1 像是书架上的书脊——只看标题就知道要不要拿下来
    - L3 像是具体章节——用到才翻
    - L2 像是目录和前言——决定要不要深入读
  - 渐进式披露很重要：
    - 大部分技能细节在大部分时候用不到，甚至会产生干扰
    - 解决了上下文窗口有限的问题，使 Skill 可承载的内容理论上无上限
  - 渐进式披露的具体实现：三层加载
    - Level 2｜主指令（触发时加载）
      - 工作流程、最佳实践这些
      - SKILL.md 的正文内容
    - Level 3｜子资源（按需加载）
      - Claude 觉得需要才去读
      - 子文档、脚本、参考资料
    - Level 1｜元数据（始终加载，约100 tokens）
      - 所以这两个字段要写得好，不然 Agent 不知道什么时候该用
      - 就是 SKILL.md 开头的 name 和 description
      - Agent 靠这个判断"要不要激活这个技能"
  - 类比：Level 1 是"菜单"，Level 2 是"菜谱概述"，Level 3 是"详细做法"。
