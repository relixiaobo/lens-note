---
id: note_01KNXJMZCBYDF0SVTCVV7PF9D9
type: note
text: >-
  The A2A protocol note (note_01KNW6TDBRJN2NBW79NX2HNBNE) observed that if A2A
  formalizes inter-agent messaging, it would be the protocol layer that makes
  context isolation *engineerable* rather than ad hoc. GAAT completes a
  different missing layer: A2A is the communication protocol between agents, but
  GAAT's Governance Telemetry Schema (GTS) extending OpenTelemetry is the
  *governance semantic layer* that sits above A2A. You need both: A2A to define
  *how agents talk to each other*, and GTS to define *what governance-relevant
  attributes must be captured in those conversations*. The multi-agent stack is
  thus: A2A (communication) → GTS/OpenTelemetry (governance observation) → OPA
  (policy evaluation) → GEB (enforcement). Each layer was missing or ad hoc
  before.
role: connection
source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
status: active
created_at: '2026-04-11T06:11:15.434Z'
evidence:
  - text: >-
      a Governance Telemetry Schema (GTS) extending OpenTelemetry with
      governance attributes; a real-time policy violation detection engine using
      OPA-compatible declarative rules
    source: src_01KNXJHGGB9M3J6JS8S1GCX6ZS
    locator: 'Abstract, GAAT components (1) and (2)'
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: relationships
bridges:
  - note_01KNW6TDBRJN2NBW79NX2HNBNE
  - note_01KNW6TDBJ2Y19BTHGV8P23WY4
---
The A2A protocol note (note_01KNW6TDBRJN2NBW79NX2HNBNE) observed that if A2A formalizes inter-agent messaging, it would be the protocol layer that makes context isolation *engineerable* rather than ad hoc. GAAT completes a different missing layer: A2A is the communication protocol between agents, but GAAT's Governance Telemetry Schema (GTS) extending OpenTelemetry is the *governance semantic layer* that sits above A2A. You need both: A2A to define *how agents talk to each other*, and GTS to define *what governance-relevant attributes must be captured in those conversations*. The multi-agent stack is thus: A2A (communication) → GTS/OpenTelemetry (governance observation) → OPA (policy evaluation) → GEB (enforcement). Each layer was missing or ad hoc before.
