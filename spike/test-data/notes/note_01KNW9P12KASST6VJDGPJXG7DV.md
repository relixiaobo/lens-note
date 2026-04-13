---
id: note_01KNW9P12KASST6VJDGPJXG7DV
type: note
text: >-
  The article lists three reasons to use scripts inside Skills — saves tokens,
  more efficient, more reliable — but only the third is genuinely new relative
  to existing knowledge. The knowledge base already captures that scripts keep
  code out of context (note_01KNW91S46AX9467M6D94WQN2J) and save LLM roundtrips
  (note_01KNW97SR13VPXQCD5JWGKZGQD). The reliability argument is the missing
  piece: LLMs are probabilistic; code is deterministic. For tasks with a correct
  answer (sorting, arithmetic, structured transformation), using LLM generation
  introduces unnecessary variance — the model might produce a subtly wrong sort
  or rounding error. A script cannot hallucinate. This makes the code-vs-LLM
  choice not just an efficiency question but a correctness question: wherever a
  task has an objectively verifiable answer, code is the epistemically
  appropriate tool.
role: claim
source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
status: active
created_at: '2026-04-10T18:15:18.355Z'
evidence:
  - text: 可靠性：代码是确定性的，LLM 不是
    source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
    locator: Skills 中 Scripts 的作用 / 具体好处
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW91S46AX9467M6D94WQN2J
  - note_01KNW97SR13VPXQCD5JWGKZGQD
supports:
  - note_01KNW91S46AX9467M6D94WQN2J
---
The article lists three reasons to use scripts inside Skills — saves tokens, more efficient, more reliable — but only the third is genuinely new relative to existing knowledge. The knowledge base already captures that scripts keep code out of context (note_01KNW91S46AX9467M6D94WQN2J) and save LLM roundtrips (note_01KNW97SR13VPXQCD5JWGKZGQD). The reliability argument is the missing piece: LLMs are probabilistic; code is deterministic. For tasks with a correct answer (sorting, arithmetic, structured transformation), using LLM generation introduces unnecessary variance — the model might produce a subtly wrong sort or rounding error. A script cannot hallucinate. This makes the code-vs-LLM choice not just an efficiency question but a correctness question: wherever a task has an objectively verifiable answer, code is the epistemically appropriate tool.
