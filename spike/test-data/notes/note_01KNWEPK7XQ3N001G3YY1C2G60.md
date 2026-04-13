---
id: note_01KNWEPK7XQ3N001G3YY1C2G60
type: note
text: >-
  LinkedIn 处理 LLM 输出解析问题的三层策略：1) 使用容错率更高的 YAML 而非 JSON；2) 日志记录常见 YAML
  错误，优化解析器以兼容不规范输出；3) 若仍无法解析，则将错误信息反馈给 LLM 修复，并持续优化提示词提升修复成功率。
role: observation
source: src_01KNWEHN7BKDHBXB80X107CBT6
status: active
created_at: '2026-04-10T19:42:59.805Z'
evidence:
  - text: >-
      LinkedIn 的做法是：1). 使用 YAML 格式而不是 JSON，相对来说容错率更高 2). 用日志记录常见的 YAML 错误，优化自己的
      YAML 解析器 3). 如果还是无法解析则将错误信息交给 LLM 修复，并且不断优化提示词，提升 LLM 修复的成功率
    source: src_01KNWEHN7BKDHBXB80X107CBT6
    locator: 'src_01KNWEHN7BKDHBXB80X107CBT6, note 8'
qualifier: certain
voice: restated
scope: detail
supports:
  - note_01KNWBE9H9RKYBQR9M6J45NTFE
---
LinkedIn 处理 LLM 输出解析问题的三层策略：1) 使用容错率更高的 YAML 而非 JSON；2) 日志记录常见 YAML 错误，优化解析器以兼容不规范输出；3) 若仍无法解析，则将错误信息反馈给 LLM 修复，并持续优化提示词提升修复成功率。
