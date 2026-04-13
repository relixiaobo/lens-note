---
id: note_01KNW67JSYJDTQRK9G9PEE5986
type: note
text: >-
  Canvas's `generateAskPrompt` exposes a design choice that sits between routing
  and orchestration: the model is given a bounded menu of three possible actions
  (update, explain, comment) and asked to choose. This is routing — but the
  routing decision is delegated to the model at inference time, not
  pre-classified by code. This is structurally different from the routing
  pattern in standard agent workflows, where a classifier routes to a
  specialized subagent. Here, one generalist model receives the routing question
  and the execution task in the same prompt. The implication: when the action
  space is small and the classifier is the same model doing the work, collapsing
  routing + execution into one call is cheaper and likely sufficient.
role: observation
source: src_01KNW64WKGQQDH8KNYD22XV3WQ
status: active
created_at: '2026-04-10T17:14:59.261Z'
evidence:
  - text: >-
      Based on the user's request, choose the appropriate action. [followed by 3
      bullet options: update via tool, explain via chat, comment via tool]
    source: src_01KNW64WKGQQDH8KNYD22XV3WQ
    locator: generateAskPrompt section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
  - note_01KNVKYSKR2XJJNGSWTB35HQEM
supports:
  - note_01KNVKYSM1ZETGZ4SEZQDYFWD1
---
Canvas's `generateAskPrompt` exposes a design choice that sits between routing and orchestration: the model is given a bounded menu of three possible actions (update, explain, comment) and asked to choose. This is routing — but the routing decision is delegated to the model at inference time, not pre-classified by code. This is structurally different from the routing pattern in standard agent workflows, where a classifier routes to a specialized subagent. Here, one generalist model receives the routing question and the execution task in the same prompt. The implication: when the action space is small and the classifier is the same model doing the work, collapsing routing + execution into one call is cheaper and likely sufficient.
