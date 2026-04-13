---
id: note_01KNW97SR13VPXQCD5JWGKZGQD
type: note
text: >-
  Level 3 of Manus's tool hierarchy (agent writes and executes a script) saves
  LLM roundtrips, not tokens directly. This is a distinct optimization axis from
  L1 and L2. L1 (atomic tools in schema) and L2 (bash-routed CLI tools) both
  optimize *context cost* — how much schema content occupies the context window.
  L3 optimizes *inference cost* — how many separate LLM calls are needed. When a
  task involves a loop, conditional, or multi-step dependency, each step would
  otherwise require a full LLM roundtrip. A script batches them into one. This
  means the three levels target three different cost drivers simultaneously:
  context size (L1 stability + L2 offloading), capability breadth (L2 shell
  access), and inference call count (L3 scripting).
role: claim
source: src_01KNW942AFYZ1TAZVA0YGYA9KE
status: active
created_at: '2026-04-10T18:07:32.077Z'
evidence:
  - text: >-
      Level 3 - 代码/包层：当任务涉及循环、条件、多步依赖时，让agent写脚本一次执行，而非多次LLM往返。Layer
      3省的不直接是token，是LLM往返次数。
    source: src_01KNW942AFYZ1TAZVA0YGYA9KE
    locator: 'Section: Manus的分层工具架构'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW4D0S7WEFJTNYYEZCF1T9W
  - note_01KNW5ZVD88Y3NBSKB7MVE148J
supports:
  - note_01KNW4D0S7WEFJTNYYEZCF1T9W
---
Level 3 of Manus's tool hierarchy (agent writes and executes a script) saves LLM roundtrips, not tokens directly. This is a distinct optimization axis from L1 and L2. L1 (atomic tools in schema) and L2 (bash-routed CLI tools) both optimize *context cost* — how much schema content occupies the context window. L3 optimizes *inference cost* — how many separate LLM calls are needed. When a task involves a loop, conditional, or multi-step dependency, each step would otherwise require a full LLM roundtrip. A script batches them into one. This means the three levels target three different cost drivers simultaneously: context size (L1 stability + L2 offloading), capability breadth (L2 shell access), and inference call count (L3 scripting).
