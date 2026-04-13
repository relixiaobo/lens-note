---
id: note_01KNW4D0S97P9MBK524Z8Z0QAK
type: note
text: >-
  Manus's claim that context isolation — not task decomposition — is the primary
  purpose of multi-agent architectures contradicts the existing note that
  multi-agent works mainly by spending more tokens. Both can be simultaneously
  true, but they point in opposite directions for design. The token-spend view
  implies more agents = more compute = better results. The isolation view
  implies more agents = more coordination overhead + more context bleed =
  potentially worse results if isolation isn't carefully maintained. This
  tension is unresolved and the 'isolation as primary goal' framing is the
  sharper engineering guide.
role: connection
source: src_01KNW48T2SDFREKNV0RQAHH0ZG
status: active
created_at: '2026-04-10T16:43:00.258Z'
evidence:
  - text: >-
      Multi-agent不是为了模拟人类团队，是为了：隔离context - 每个sub-agent有干净的工作空间. The primary
      goal of sub-agents in Manus is to isolate context.
    source: src_01KNW48T2SDFREKNV0RQAHH0ZG
    locator: 'Section: Manus的观点：Sub-Agent 的目的是隔离 context'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNVM1WBT33XX9WC3SM3K733T
  - note_01KNVKYSM32PJQ4Z8576ZP78E0
contradicts:
  - note_01KNVM1WBT33XX9WC3SM3K733T
---
Manus's claim that context isolation — not task decomposition — is the primary purpose of multi-agent architectures contradicts the existing note that multi-agent works mainly by spending more tokens. Both can be simultaneously true, but they point in opposite directions for design. The token-spend view implies more agents = more compute = better results. The isolation view implies more agents = more coordination overhead + more context bleed = potentially worse results if isolation isn't carefully maintained. This tension is unresolved and the 'isolation as primary goal' framing is the sharper engineering guide.
