---
id: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
type: source
source_type: web_article
title: >-
  Governance-Aware Agent Telemetry for Closed-Loop Enforcement in Multi-Agent AI
  Systems
url: 'https://machinelearning.apple.com/research/governance-aware-agent-telemetry'
word_count: 258
raw_file: raw/src_01KNXJHGGB9M3J6JS8S1GCX6ZS.html
ingested_at: '2026-04-11T06:09:21.931Z'
created_at: '2026-04-11T06:09:21.931Z'
status: active
---
[View publication](https://arxiv.org/abs/2604.05119)

Enterprise multi-agent AI systems produce thousands of inter-agent interactions per hour, yet existing observability tools capture these dependencies without enforcing anything. OpenTelemetry and Langfuse collect telemetry but treat governance as a downstream analytics concern, not a real-time enforcement target. The result is an “observe-but-do-not-act” gap where policy violations are detected only after damage is done. We present Governance-Aware Agent Telemetry (GAAT), a reference architecture that closes the loop between telemetry collection and automated policy enforcement for multi-agent systems. GAAT introduces (1) a Governance Telemetry Schema (GTS) extending OpenTelemetry with governance attributes; (2) a real-time policy violation detection engine using OPA-compatible declarative rules under sub-200 ms latency; (3) a Governance Enforcement Bus (GEB) with graduated interventions; and (4) a Trusted Telemetry Plane with cryptographic provenance. We evaluated GAAT against four baseline systems across data residency, bias detection, authorization compliance, and adversarial telemetry scenarios. On a live five-agent e-commerce system, GAAT achieved 98.3% Violation Prevention Rate (VPR, ±0.7%) on 5,000 synthetic injection flows across 10 independent runs, with 8.4 ms median detection latency and 127 ms median end-to-end enforcement latency. On 12,000 empirical production-realistic traces, GAAT achieved 99.7% VPR; residual failures (∼40% timing edge cases, ∼35% ambiguous PII classification, ∼25% incomplete lineage chains). Statistical validation confirmed significance with 95% bootstrap confidence intervals \[97.1%, 99.2%\] (p < 0.001 vs all baselines). GAAT outperformed NeMo Guardrails-style agent-boundary enforcement by 19.5 percentage points (78.8% VPR vs 98.3%). We also provide formal property specifications for escalation termination, conflict resolution determinism, and bounded false quarantine—each with explicit assumptions—validated through 10,000 Monte Carlo simulations.
