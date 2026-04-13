---
id: note_01KNWDZ91TMHXVMYBD6NMX81G5
type: note
text: >-
  「了解」维度（为模型注入领域背景）与 「固定行为指令 +
  动态环境内容」的上下文设计范式（note_01KNW8WZ53T9MNPTYAK76YF69C）是同一个模式在两个粒度上的表达：前者是产品战略层——应用作为模型的「眼睛和耳朵」，持续向模型注入领域感知；后者是技术实现层——XML
  payload 里的 `<window>`
  字段是这种领域感知的具体载体。两者都揭示同一个架构原理：模型的「智能」是固定的，真正让它在特定领域「变聪明」的，是它能感知到的实时上下文。应用在这里扮演的角色，本质上是「感知代理」（perceptual
  proxy）——将人类世界的某个切面数字化后递交给模型。
role: connection
source: src_01KNWDVEHSGR56ZRHWKME0VKES
status: active
created_at: '2026-04-10T19:30:15.682Z'
evidence:
  - text: 应用程序成为模型在你所在领域的「眼睛和耳朵」，使其能够比通用文本训练更权威地回答问题。
    source: src_01KNWDVEHSGR56ZRHWKME0VKES
    locator: 了解维度说明
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: relationships
bridges:
  - note_01KNW8WZ53T9MNPTYAK76YF69C
  - note_01KNW8WZ4NRBE6129JQF9GX805
supports:
  - note_01KNW8WZ53T9MNPTYAK76YF69C
---
「了解」维度（为模型注入领域背景）与 「固定行为指令 + 动态环境内容」的上下文设计范式（note_01KNW8WZ53T9MNPTYAK76YF69C）是同一个模式在两个粒度上的表达：前者是产品战略层——应用作为模型的「眼睛和耳朵」，持续向模型注入领域感知；后者是技术实现层——XML payload 里的 `<window>` 字段是这种领域感知的具体载体。两者都揭示同一个架构原理：模型的「智能」是固定的，真正让它在特定领域「变聪明」的，是它能感知到的实时上下文。应用在这里扮演的角色，本质上是「感知代理」（perceptual proxy）——将人类世界的某个切面数字化后递交给模型。
