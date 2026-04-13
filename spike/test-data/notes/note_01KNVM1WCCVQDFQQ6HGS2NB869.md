---
id: note_01KNVM1WCCVQDFQQ6HGS2NB869
type: note
text: >-
  Pseudocode as a prompt language is an interesting edge case for the Bitter
  Lesson question about human-knowledge injection. Pseudocode imposes control
  flow structure (conditionals, loops, function calls) on LLM execution — this
  looks like human-knowledge injection (encoding how to decompose the task). But
  it could also be seen as 'letting the model's general code-understanding
  capability generalize to prompt control' — which would be computation, not
  knowledge. The question: is pseudocode prompting closer to hand-crafted rules
  (a ceiling), or is it exploiting a general capability the model already has (a
  scalable floor)?
role: question
source: src_01KNVKYWQDSM4MNH0P9J97Q9JT
status: active
created_at: '2026-04-10T11:57:18.074Z'
evidence:
  - text: 可以借助伪代码（pseudocode）来精准的控制 LLM 的输出结果和定义其执行逻辑。
    source: src_01KNVKYWQDSM4MNH0P9J97Q9JT
    locator: note 5
  - text: 使用 伪代码 使 Prompt 更加清晰和准确
    source: src_01KNWCDQW1B46789EQPQ20SREW
    locator: highlight
qualifier: tentative
voice: synthesized
scope: detail
structure_type: argument
question_status: open
supports:
  - note_01KNVKYSKR2XJJNGSWTB35HQEM
---
Pseudocode as a prompt language is an interesting edge case for the Bitter Lesson question about human-knowledge injection. Pseudocode imposes control flow structure (conditionals, loops, function calls) on LLM execution — this looks like human-knowledge injection (encoding how to decompose the task). But it could also be seen as 'letting the model's general code-understanding capability generalize to prompt control' — which would be computation, not knowledge. The question: is pseudocode prompting closer to hand-crafted rules (a ceiling), or is it exploiting a general capability the model already has (a scalable floor)?
