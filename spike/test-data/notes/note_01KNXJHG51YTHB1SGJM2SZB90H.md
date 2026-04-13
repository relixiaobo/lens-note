---
id: note_01KNXJHG51YTHB1SGJM2SZB90H
type: note
text: >-
  The wake-word confusion prediction application is a productive example of
  converting geometry into a safety/UX engineering tool. Embedding distance
  between a target wake word and other words in the vocabulary directly predicts
  the probability that the device will mishear the wake word. This turns an
  abstract mathematical object (distance in embedding space) into an actionable
  design criterion: choose wake words that are geometrically far from common
  words in the embedding space. The theoretical framework enables this — without
  knowing that distances have a probabilistic interpretation tied to phonetic
  similarity, you couldn't confidently use distance as a confusion predictor.
  This is a case where theory directly unlocks an engineering workflow.
role: observation
source: src_01KNXJETA7A3CT07N4Q0MMRNKE
status: active
created_at: '2026-04-11T06:09:21.542Z'
evidence:
  - text: >-
      The theoretical framework also allows us to use the embeddings to predict
      the expected confusion of device wake-up words.
    source: src_01KNXJETA7A3CT07N4Q0MMRNKE
    locator: abstract
qualifier: likely
voice: synthesized
scope: detail
structure_type: causal
---
The wake-word confusion prediction application is a productive example of converting geometry into a safety/UX engineering tool. Embedding distance between a target wake word and other words in the vocabulary directly predicts the probability that the device will mishear the wake word. This turns an abstract mathematical object (distance in embedding space) into an actionable design criterion: choose wake words that are geometrically far from common words in the embedding space. The theoretical framework enables this — without knowing that distances have a probabilistic interpretation tied to phonetic similarity, you couldn't confidently use distance as a confusion predictor. This is a case where theory directly unlocks an engineering workflow.
