---
id: src_01KNXJBWM5D9SWKMF5F05NAJ3Y
type: source
source_type: web_article
title: >-
  LaCy: What Small Language Models Can and Should Learn is Not Just a Question
  of Loss
url: 'https://machinelearning.apple.com/research/lacy'
word_count: 261
raw_file: raw/src_01KNXJBWM5D9SWKMF5F05NAJ3Y.html
ingested_at: '2026-04-11T06:06:17.733Z'
created_at: '2026-04-11T06:06:17.733Z'
status: active
---
[View publication](https://arxiv.org/abs/2602.12005)

This paper was accepted at the Workshop on Memory for LLM-Based Agentic Systems at ICLR.

Language models have consistently grown to compress more world knowledge into their parameters, but the knowledge that can be pretrained into them is upper-bounded by their parameter size. Especially the capacity of Small Language Models (SLMs) is limited, leading to factually incorrect generations. This problem is often mitigated by giving the SLM access to an outside source: the ability to query a larger model, documents, or a database. Under this setting, we study the fundamental question of _which tokens an SLM can and should learn_ during pretraining, versus _which ones it should delegate_ via a <CALL> token. We find that this is not simply a question of loss: although the loss is predictive of whether a predicted token mismatches the ground-truth, some tokens are _acceptable_ in that they are truthful alternative continuations of a pretraining document, and should not trigger a <CALL> even if their loss is high. We find that a spaCy grammar parser can help augment the loss signal to decide which tokens the SLM should learn to delegate to prevent factual errors and which are safe to learn and predict even under high losses. We propose LaCy, a novel pretraining method based on this token selection philosophy. Our experiments demonstrate that LaCy models successfully learn which tokens to predict and where to delegate for help. This results in higher FactScores when generating in a cascade with a bigger model and outperforms Rho or LLM-judge trained SLMs, while being simpler and cheaper.
