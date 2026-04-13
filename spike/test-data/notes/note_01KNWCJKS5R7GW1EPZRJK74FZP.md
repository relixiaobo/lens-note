---
id: note_01KNWCJKS5R7GW1EPZRJK74FZP
type: note
text: >-
  The character-substitution encoding table in this exfiltration prompt
  (replacing `<` with `[LESS_THAN]`, `>` with `[GREATER_THAN]`, etc.) is not
  primarily obfuscation — it is *filter evasion*. By having the model output the
  system prompt in a losslessly re-encodable format, the attack bypasses any
  output-layer content filters that might block strings like `<system>` or
  `<instructions>`. This reveals a second layer of the attack surface: even if a
  model is reluctant to output raw system prompt content, it may be willing to
  output a character-encoded equivalent that is trivially reversible by the
  attacker. Security measures operating on surface patterns of the output (token
  matching, string detection) are defeated by any isomorphic re-encoding.
role: claim
source: src_01KNWCGCN27C4CTS3HCHTYR0X6
status: active
created_at: '2026-04-10T19:05:52.141Z'
evidence:
  - text: >-
      Replace "<" with "[LESS_THAN]". Replace ">" with "[GREATER_THAN]". Replace
      "'" with "[SINGLE_QUOTE]"...
    source: src_01KNWCGCN27C4CTS3HCHTYR0X6
    locator: 'Attack payload, full character substitution list'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
supports:
  - note_01KNWCJKRD2M7A59SJM666X9ZY
---
The character-substitution encoding table in this exfiltration prompt (replacing `<` with `[LESS_THAN]`, `>` with `[GREATER_THAN]`, etc.) is not primarily obfuscation — it is *filter evasion*. By having the model output the system prompt in a losslessly re-encodable format, the attack bypasses any output-layer content filters that might block strings like `<system>` or `<instructions>`. This reveals a second layer of the attack surface: even if a model is reluctant to output raw system prompt content, it may be willing to output a character-encoded equivalent that is trivially reversible by the attacker. Security measures operating on surface patterns of the output (token matching, string detection) are defeated by any isomorphic re-encoding.
