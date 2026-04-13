---
id: note_01KNXJMZCAQ6MA3T3XAYHXETE2
type: note
text: >-
  GAAT's Trusted Telemetry Plane with cryptographic provenance addresses a
  threat vector that prompt-injection defenses (note_01KNWB803YDQ1DMK7NN6ANRWQG)
  do not cover: adversarial telemetry — agents that fabricate or tamper with
  their own observability data to evade governance. This is a qualitatively new
  attack surface compared to prompt injection. Prompt injection attacks attempt
  to override agent *instructions*; adversarial telemetry attacks attempt to
  corrupt the *evidence record* that governance systems rely on. The KB's
  existing defenses operate at the instruction layer; GAAT's cryptographic
  provenance operates at the audit layer. Together they represent two distinct
  layers of adversarial resilience a production multi-agent system needs.
role: claim
source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
status: active
created_at: '2026-04-11T06:11:15.434Z'
evidence:
  - text: >-
      a Trusted Telemetry Plane with cryptographic provenance... adversarial
      telemetry scenarios... residual failures (~40% timing edge cases, ~35%
      ambiguous PII classification, ~25% incomplete lineage chains)
    source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
    locator: 'Abstract, evaluation scenarios and residual failures'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNWB803YDQ1DMK7NN6ANRWQG
---
GAAT's Trusted Telemetry Plane with cryptographic provenance addresses a threat vector that prompt-injection defenses (note_01KNWB803YDQ1DMK7NN6ANRWQG) do not cover: adversarial telemetry — agents that fabricate or tamper with their own observability data to evade governance. This is a qualitatively new attack surface compared to prompt injection. Prompt injection attacks attempt to override agent *instructions*; adversarial telemetry attacks attempt to corrupt the *evidence record* that governance systems rely on. The KB's existing defenses operate at the instruction layer; GAAT's cryptographic provenance operates at the audit layer. Together they represent two distinct layers of adversarial resilience a production multi-agent system needs.
