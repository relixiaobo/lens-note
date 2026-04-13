---
id: note_01KNW9SF93S3G2HTSS7T2PE52F
type: note
text: >-
  The canmore system prompt says twice: 'Lean towards NOT using canmore' and
  'lean towards NOT triggering create_textdoc as it can be surprising for
  users.' This is a tool with built-in self-suppression as a design principle —
  the tool's own instructions discourage its use unless clearly warranted. The
  stated reason is that 'Creating content with canmore can be unsettling for
  users as it changes the UI.' This frames UI mode-switching as a harm to be
  minimized, not a neutral capability. The implication is profound: for
  UI-invasive capabilities, the correct default is restraint, and the prompt
  itself must encode that restraint. You cannot rely on the model to be
  conservative by default — it must be explicitly instructed to prefer inaction.
role: claim
source: src_01KNW9P1576R56AAAVAZSS5JAK
status: active
created_at: '2026-04-10T18:17:11.203Z'
evidence:
  - text: >-
      Lean towards NOT using `canmore` if the content can be effectively
      presented in the conversation. Creating content with `canmore` can be
      unsettling for users as it changes the UI.
    source: src_01KNW9P1576R56AAAVAZSS5JAK
    locator: How to use canmore — opening paragraph
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW67JTMZN31XF031JD5J1FP
  - note_01KNW67JTFYPCVF3H6T2J1TKKP
---
The canmore system prompt says twice: 'Lean towards NOT using canmore' and 'lean towards NOT triggering create_textdoc as it can be surprising for users.' This is a tool with built-in self-suppression as a design principle — the tool's own instructions discourage its use unless clearly warranted. The stated reason is that 'Creating content with canmore can be unsettling for users as it changes the UI.' This frames UI mode-switching as a harm to be minimized, not a neutral capability. The implication is profound: for UI-invasive capabilities, the correct default is restraint, and the prompt itself must encode that restraint. You cannot rely on the model to be conservative by default — it must be explicitly instructed to prefer inaction.
