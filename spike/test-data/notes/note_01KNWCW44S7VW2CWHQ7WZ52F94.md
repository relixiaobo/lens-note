---
id: note_01KNWCW44S7VW2CWHQ7WZ52F94
type: note
text: >-
  如果「所有输出都是幻觉」这个框架是正确的，那么「脚本比 LLM
  更可靠，因为脚本不会幻觉」（note_01KNW9P12KASST6VJDGPJXG7DV）这个工程判断的底层逻辑就更清晰了：与其说脚本「不幻觉」，不如说脚本的「采样分布」被完全钉死在确定性输出——它的幻觉概率是零，因为它根本不采样。LLM
  工程中把任务下沉到代码的核心理由，因此不是「避免幻觉」（幻觉不可避免），而是「在需要零方差的任务上，用确定性替换概率性」。这是对
  note_01KNW9P12KASST6VJDGPJXG7DV
  的认识论重新表述：它的工程建议是对的，但背后的理由比「脚本不幻觉」更深——是「某类任务的可接受输出空间只有一个点，概率机制无法被约束到这个点」。
role: connection
source: src_01KNWCRAJW51HY5PX1B4S38RMS
status: active
created_at: '2026-04-10T19:11:03.807Z'
evidence:
  - text: 「幻觉」并不是大模型的缺陷，而是核心特性，大模型的一切行为可能都是幻觉，而我们只是在其中发现了一些有用的部分。
    source: src_01KNWCRAJW51HY5PX1B4S38RMS
    locator: sole bullet point
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW9P12KASST6VJDGPJXG7DV
supports:
  - note_01KNW9P12KASST6VJDGPJXG7DV
---
如果「所有输出都是幻觉」这个框架是正确的，那么「脚本比 LLM 更可靠，因为脚本不会幻觉」（note_01KNW9P12KASST6VJDGPJXG7DV）这个工程判断的底层逻辑就更清晰了：与其说脚本「不幻觉」，不如说脚本的「采样分布」被完全钉死在确定性输出——它的幻觉概率是零，因为它根本不采样。LLM 工程中把任务下沉到代码的核心理由，因此不是「避免幻觉」（幻觉不可避免），而是「在需要零方差的任务上，用确定性替换概率性」。这是对 note_01KNW9P12KASST6VJDGPJXG7DV 的认识论重新表述：它的工程建议是对的，但背后的理由比「脚本不幻觉」更深——是「某类任务的可接受输出空间只有一个点，概率机制无法被约束到这个点」。
