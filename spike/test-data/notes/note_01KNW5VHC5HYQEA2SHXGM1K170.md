---
id: note_01KNW5VHC5HYQEA2SHXGM1K170
type: note
text: >-
  SFT-then-RL as a training pipeline is a concrete answer to the bootstrapping
  problem that the Bitter Lesson's 'meta-methods' framing explicitly ignores.
  The meta-methods note acknowledges the gap: 'cases where the discovery process
  itself needs bootstrapping with structured priors.' SFT-before-RL fills
  exactly this gap — it uses human demonstrations not as a knowledge ceiling,
  but as an initialization surface to make RL exploration tractable. The
  distinction is critical: SFT-as-ceiling encodes what humans know;
  SFT-as-warm-start enables the model to transcend what humans know by providing
  a non-random starting policy that accelerates RL convergence. Human knowledge
  here is a scaffold that gets removed, not a constraint that stays.
role: connection
source: src_01KNW5R6M1VHHPJWZY8N5ZRK7A
status: active
created_at: '2026-04-10T17:08:24.581Z'
evidence:
  - text: 先用一些已知的好的搜索示例来对模型进行初步训练。相当于预热或者是新手指南，让模型不是从完全随机的策略开始学习，可以加速后续强化学习的收敛速度
    source: src_01KNW5R6M1VHHPJWZY8N5ZRK7A
    locator: src_01KNW5R6M1VHHPJWZY8N5ZRK7A
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKVZD4J0HNN8VJVPDMKCTK
  - note_01KNVKVZD9NR2266PAZBESGHMT
supports:
  - note_01KNVKVZD4J0HNN8VJVPDMKCTK
---
SFT-then-RL as a training pipeline is a concrete answer to the bootstrapping problem that the Bitter Lesson's 'meta-methods' framing explicitly ignores. The meta-methods note acknowledges the gap: 'cases where the discovery process itself needs bootstrapping with structured priors.' SFT-before-RL fills exactly this gap — it uses human demonstrations not as a knowledge ceiling, but as an initialization surface to make RL exploration tractable. The distinction is critical: SFT-as-ceiling encodes what humans know; SFT-as-warm-start enables the model to transcend what humans know by providing a non-random starting policy that accelerates RL convergence. Human knowledge here is a scaffold that gets removed, not a constraint that stays.
