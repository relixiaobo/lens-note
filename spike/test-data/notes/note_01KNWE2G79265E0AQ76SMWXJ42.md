---
id: note_01KNWE2G79265E0AQ76SMWXJ42
type: note
text: >-
  Ng's 'Reflection' pattern — the same LLM inspects and critiques its own
  output, then revises — is mechanistically distinct from the KB's
  evaluator-optimizer workflow, even though both create a feedback loop.
  Evaluator-optimizer involves *two separate LLM calls* where a dedicated critic
  LLM evaluates a generator LLM's output; the roles are architecturally
  separated. Reflection collapses both roles into one: the same model switches
  stance from producer to critic within a single workflow. This distinction
  matters because: (1) Reflection is cheaper (one model, no coordination
  overhead), (2) but it may be less reliable — the model that generated a flawed
  output carries the same systematic biases into its self-critique. The
  evaluator-optimizer separation exists precisely to gain independence from the
  generator's biases. The trade-off is cost/reliability: Reflection is cheap but
  epistemically incestuous; evaluator-optimizer is expensive but epistemically
  independent.
role: claim
source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
status: active
created_at: '2026-04-10T19:32:01.367Z'
evidence:
  - text: >-
      反思（Reflection）：通过让语言模型（LM）自我检查和反馈来改进生成的代码或内容。例如，生成代码后，提示LM检查代码的正确性、效率和结构，并根据反馈进行改进。
    source: src_01KNWDZ94DJX7D4HRW1HHBQVPJ
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
sees: >-
  The difference between self-critique (same model) and external evaluation
  (different model) as a reliability/cost trade-off
ignores: >-
  Whether well-calibrated models might actually self-critique more reliably than
  a separate evaluator
bridges:
  - note_01KNVKYSM2JJ2MEDSNVRD85505
---
Ng's 'Reflection' pattern — the same LLM inspects and critiques its own output, then revises — is mechanistically distinct from the KB's evaluator-optimizer workflow, even though both create a feedback loop. Evaluator-optimizer involves *two separate LLM calls* where a dedicated critic LLM evaluates a generator LLM's output; the roles are architecturally separated. Reflection collapses both roles into one: the same model switches stance from producer to critic within a single workflow. This distinction matters because: (1) Reflection is cheaper (one model, no coordination overhead), (2) but it may be less reliable — the model that generated a flawed output carries the same systematic biases into its self-critique. The evaluator-optimizer separation exists precisely to gain independence from the generator's biases. The trade-off is cost/reliability: Reflection is cheap but epistemically incestuous; evaluator-optimizer is expensive but epistemically independent.
