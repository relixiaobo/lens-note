---
id: note_01KNWBE9H9RKYBQR9M6J45NTFE
type: note
text: >-
  YAML 的高容错率与约束解码（constrained
  decoding）是对同一个问题的两种不同层次的解法：前者在格式层接受「不完美的结构化输出」，后者在解码层「机械性地防止不合规输出」。有趣的是，YAML
  策略接受模型的不完美并在后处理中修复，而约束解码则完全规避了模型犯错的可能性。两者都有效——但 YAML
  的容错策略是软件工程语境中的「防御性解析」，约束解码是系统架构语境中的「防御性生成」。这两种思路代表了对 LLM 输出可靠性问题的不同哲学：接受不完美
  vs. 消灭不完美。
role: connection
source: src_01KNWBBBAS6CNMAWDPCBV6TW2N
status: active
created_at: '2026-04-10T18:46:02.011Z'
evidence:
  - text: 相比 JSON 格式输出，YAML 格式 具有更高的容错率
    source: src_01KNWBBBAS6CNMAWDPCBV6TW2N
    locator: first bullet point
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW97SR3NA13KKNH3X27WY9R
---
YAML 的高容错率与约束解码（constrained decoding）是对同一个问题的两种不同层次的解法：前者在格式层接受「不完美的结构化输出」，后者在解码层「机械性地防止不合规输出」。有趣的是，YAML 策略接受模型的不完美并在后处理中修复，而约束解码则完全规避了模型犯错的可能性。两者都有效——但 YAML 的容错策略是软件工程语境中的「防御性解析」，约束解码是系统架构语境中的「防御性生成」。这两种思路代表了对 LLM 输出可靠性问题的不同哲学：接受不完美 vs. 消灭不完美。
