---
id: note_01KNXJMZBADH4454HHAR61EFAZ
type: note
text: >-
  The 'observe-but-do-not-act' gap identified in GAAT is a structural failure
  mode that emerges specifically when multi-agent systems scale. A single-agent
  system can be governed at the prompt layer — logit masking, hard-coded
  constants, position-based trust — because there is one locus of behavior. But
  in a multi-agent system producing thousands of inter-agent interactions per
  hour, policy enforcement at the agent boundary becomes insufficient:
  violations happen in the space *between* agents, across chains of delegation.
  This is a new category of governance problem that prompt-level and
  agent-boundary defenses (like NeMo Guardrails) cannot fully address, and it
  explains why NeMo-style enforcement achieved only 78.8% VPR vs GAAT's 98.3%.
role: claim
source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
status: active
created_at: '2026-04-11T06:11:15.434Z'
evidence:
  - text: >-
      OpenTelemetry and Langfuse collect telemetry but treat governance as a
      downstream analytics concern, not a real-time enforcement target. The
      result is an 'observe-but-do-not-act' gap where policy violations are
      detected only after damage is done.
    source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
    locator: 'Abstract, paragraph 1'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: causal
sees: >-
  Policy violations in multi-agent systems as occurring in inter-agent space,
  not only within individual agents
ignores: >-
  Whether all governance gaps are inter-agent or whether some are intra-agent
  and still need boundary enforcement
---
The 'observe-but-do-not-act' gap identified in GAAT is a structural failure mode that emerges specifically when multi-agent systems scale. A single-agent system can be governed at the prompt layer — logit masking, hard-coded constants, position-based trust — because there is one locus of behavior. But in a multi-agent system producing thousands of inter-agent interactions per hour, policy enforcement at the agent boundary becomes insufficient: violations happen in the space *between* agents, across chains of delegation. This is a new category of governance problem that prompt-level and agent-boundary defenses (like NeMo Guardrails) cannot fully address, and it explains why NeMo-style enforcement achieved only 78.8% VPR vs GAAT's 98.3%.
