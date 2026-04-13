---
id: note_01KNWCJKSDP4035FPEJNX7Y40D
type: note
text: >-
  There is an open question about the right defense: if system prompt
  confidentiality cannot be enforced in-prompt, the options seem to be: (A)
  architectural separation — never feed the system prompt through the same token
  stream as user input (not how current Transformer inference works); (B)
  inference-layer suppression — RLHF/logit-level training to refuse context
  repetition requests (fragile, arms race); (C) accepting leakability and
  treating system prompts as 'security through obscurity' (the current de facto
  state); or (D) prompt-agnostic product design — building products that
  function correctly even when the system prompt is fully public
  (defense-in-depth through not relying on prompt secrecy). Option D may be the
  most pragmatically sound: if your product's competitive advantage evaporates
  when the system prompt is leaked, you have a moat problem, not a security
  problem.
role: question
source: src_01KNWCGCN27C4CTS3HCHTYR0X6
status: active
created_at: '2026-04-10T19:05:52.141Z'
evidence:
  - text: 'Leaking LLM System Prompts via Prompt Injection (e.g., V0, Cursor, Claude)'
    source: src_01KNWCGCN27C4CTS3HCHTYR0X6
    locator: Title/heading
qualifier: tentative
voice: synthesized
scope: big_picture
structure_type: argument
assumptions:
  - >-
    Current LLM inference architectures are unified (no hardware separation
    between system and user context)
  - >-
    Behavioral training-based refusal is susceptible to creative reframing
    attacks
question_status: open
supports:
  - note_01KNWCJKRD2M7A59SJM666X9ZY
---
There is an open question about the right defense: if system prompt confidentiality cannot be enforced in-prompt, the options seem to be: (A) architectural separation — never feed the system prompt through the same token stream as user input (not how current Transformer inference works); (B) inference-layer suppression — RLHF/logit-level training to refuse context repetition requests (fragile, arms race); (C) accepting leakability and treating system prompts as 'security through obscurity' (the current de facto state); or (D) prompt-agnostic product design — building products that function correctly even when the system prompt is fully public (defense-in-depth through not relying on prompt secrecy). Option D may be the most pragmatically sound: if your product's competitive advantage evaporates when the system prompt is leaked, you have a moat problem, not a security problem.
