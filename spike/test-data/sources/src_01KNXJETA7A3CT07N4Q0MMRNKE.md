---
id: src_01KNXJETA7A3CT07N4Q0MMRNKE
type: source
source_type: web_article
title: A Theoretical Framework for Acoustic Neighbor Embeddings
url: 'https://machinelearning.apple.com/research/neighbor'
word_count: 198
raw_file: raw/src_01KNXJETA7A3CT07N4Q0MMRNKE.html
ingested_at: '2026-04-11T06:07:53.671Z'
created_at: '2026-04-11T06:07:53.671Z'
status: active
---
This paper provides a theoretical framework for interpreting acoustic neighbor embeddings, which are representations of the phonetic content of variable-width audio or text in a fixed-dimensional embedding space. A probabilistic interpretation of the distances between embeddings is proposed, based on a general quantitative definition of phonetic similarity between words. This provides us a framework for understanding and applying the embeddings in a principled manner. Theoretical and empirical evidence to support an approximation of uniform cluster-wise isotropy are shown, which allows us to reduce the distances to simple Euclidean distances. Four experiments that validate the framework and demonstrate how it can be applied to diverse problems are described. Nearest-neighbor search between audio and text embeddings can give isolated word classification accuracy that is identical to that of finite state transducers (FSTs) for vocabularies as large as 500k. Embedding distances give accuracy with 0.5% point difference compared to phone edit distances in out-of-vocabulary word recovery, as well as producing clustering hierarchies identical to those derived from human listening experiments in English dialect clustering. The theoretical framework also allows us to use the embeddings to predict the expected confusion of device wake-up words. All source code and pretrained models are provided.
