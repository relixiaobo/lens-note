---
id: note_01KNW5VHCTE4XJHEGE77YANHKF
type: note
text: >-
  The simulated internet environment in this RL training setup shifts the locus
  of human knowledge injection from model weights to the environment itself.
  Instead of encoding search knowledge into the model (hand-crafted rules or SFT
  ceiling), the designers encode the structure of the task into the environment
  — what a web page looks like, what constitutes a valid action, what counts as
  a correct answer. The model learns freely within that environment. This means
  the Bitter Lesson's warning about human-knowledge ceilings applies to
  environment design just as much as to model training — a badly designed
  simulator constrains what search strategies are discoverable, regardless of
  how capable the RL algorithm is. The environment is the new site of the
  knowledge bottleneck.
role: observation
source: src_01KNW5R6M1VHHPJWZY8N5ZRK7A
status: active
created_at: '2026-04-10T17:08:24.581Z'
evidence:
  - text: 创建一个网络模拟器（一个受控的、简化的、但又能反映真实网络某些特征的虚拟环境），有网页、链接、搜索框等，允许模型可以在里面进行搜索
    source: src_01KNW5R6M1VHHPJWZY8N5ZRK7A
    locator: src_01KNW5R6M1VHHPJWZY8N5ZRK7A
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
sees: >-
  Environment design as a hidden site of human-knowledge injection in RL-trained
  agents
ignores: >-
  Whether sim-to-real transfer (from simplified simulator to actual web)
  preserves the learned search strategies, or whether simplifications in the
  simulator create a policy that fails in the wild
bridges:
  - note_01KNVKVZCNS5PAPJXR8DM78WQ6
  - note_01KNVKVZD4J0HNN8VJVPDMKCTK
---
The simulated internet environment in this RL training setup shifts the locus of human knowledge injection from model weights to the environment itself. Instead of encoding search knowledge into the model (hand-crafted rules or SFT ceiling), the designers encode the structure of the task into the environment — what a web page looks like, what constitutes a valid action, what counts as a correct answer. The model learns freely within that environment. This means the Bitter Lesson's warning about human-knowledge ceilings applies to environment design just as much as to model training — a badly designed simulator constrains what search strategies are discoverable, regardless of how capable the RL algorithm is. The environment is the new site of the knowledge bottleneck.
