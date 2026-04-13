---
id: note_01KNW67JTFYPCVF3H6T2J1TKKP
type: note
text: >-
  Canvas's prompt architecture reveals that UI gestures (select text → click
  'edit') are a form of pre-classification that shrinks the model's action
  space. `generateEditPrompt` doesn't ask the model what to do — it issues a
  direct command (`update_textdoc` tool, MUST). `generateAskPrompt` leaves the
  action open. The UI interaction itself is doing intent disambiguation before
  the model sees anything. This is a rarely articulated principle: a
  well-designed UI reduces model ambiguity by resolving intent upstream, making
  the model's job more tractable. The 'ask vs edit' distinction is not
  model-level reasoning — it's user gesture baked into template selection at the
  application layer.
role: claim
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: |-
      # Instructions
      Use the `update_textdoc` tool to make this edit. ${updateInstructions}
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: generateEditPrompt section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
Canvas's prompt architecture reveals that UI gestures (select text → click 'edit') are a form of pre-classification that shrinks the model's action space. `generateEditPrompt` doesn't ask the model what to do — it issues a direct command (`update_textdoc` tool, MUST). `generateAskPrompt` leaves the action open. The UI interaction itself is doing intent disambiguation before the model sees anything. This is a rarely articulated principle: a well-designed UI reduces model ambiguity by resolving intent upstream, making the model's job more tractable. The 'ask vs edit' distinction is not model-level reasoning — it's user gesture baked into template selection at the application layer.
