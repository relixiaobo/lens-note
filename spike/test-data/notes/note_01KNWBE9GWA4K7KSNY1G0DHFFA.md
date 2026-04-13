---
id: note_01KNWBE9GWA4K7KSNY1G0DHFFA
type: note
text: >-
  YAML 比 JSON 对 LLM 结构化输出更具容错性，这个工程观察揭示了一个深层逻辑：JSON
  的合法性是全有或全无的（一个未闭合的括号就让整个输出不可解析），而 YAML
  的缩进语法允许更宽松的部分解析。选择输出格式不只是关于「可读性」或「惯例」，而是关于「当模型生成过程出错时，损失是灾难性的还是可恢复的」。这是一个关于
  fail-softly vs. fail-hard 的系统设计决策，被包装成了一个格式偏好。
role: claim
source: src_01KNWBBBAS6CNMAWDPCBV6TW2N
status: active
created_at: '2026-04-10T18:46:02.011Z'
evidence:
  - text: LLM 结构化数据输出：相比 JSON 格式输出，YAML 格式 具有更高的容错率
    source: src_01KNWBBBAS6CNMAWDPCBV6TW2N
    locator: first bullet point
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW97SR3NA13KKNH3X27WY9R
---
YAML 比 JSON 对 LLM 结构化输出更具容错性，这个工程观察揭示了一个深层逻辑：JSON 的合法性是全有或全无的（一个未闭合的括号就让整个输出不可解析），而 YAML 的缩进语法允许更宽松的部分解析。选择输出格式不只是关于「可读性」或「惯例」，而是关于「当模型生成过程出错时，损失是灾难性的还是可恢复的」。这是一个关于 fail-softly vs. fail-hard 的系统设计决策，被包装成了一个格式偏好。
