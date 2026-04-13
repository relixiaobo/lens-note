---
id: note_01KNW89DCCGK6ZC395MB0T3K09
type: note
text: >-
  文件系统作为「可恢复的上下文压缩」，解决了一个关键的不对称性：网页内容可以从上下文中移除（只保留
  URL），因为它可以被重新获取；文档内容可以省略（只保留路径），因为沙盒中仍有原件。这与现有 note_01KNW4D0SMXMTMPFMRHKPYTYEN
  描述的 URL 指针缓存权衡是同一机制，但视角不同：前者强调「cache
  的轮次延迟」，这里强调的是「信息的可恢复性是压缩的前提」。上下文能安全压缩的条件不是「信息不重要」，而是「信息有外部可信来源可以重建」。这是一个更深层的设计原则。
role: observation
source: src_01KNW85MDTKKEQ4S948D7562RW
status: active
created_at: '2026-04-10T17:50:56.362Z'
evidence:
  - text: >-
      只要保留URL，网页内容就可以从上下文中移除；如果沙盒中仍然保留文档路径，则可以省略文档内容。这使得Manus能够缩短上下文长度，而不会永久丢失信息。
    source: src_01KNW85MDTKKEQ4S948D7562RW
    locator: 'Section: 使用文件系统作为上下文，对上下文进行可恢复的压缩'
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNW4D0SMXMTMPFMRHKPYTYEN
---
文件系统作为「可恢复的上下文压缩」，解决了一个关键的不对称性：网页内容可以从上下文中移除（只保留 URL），因为它可以被重新获取；文档内容可以省略（只保留路径），因为沙盒中仍有原件。这与现有 note_01KNW4D0SMXMTMPFMRHKPYTYEN 描述的 URL 指针缓存权衡是同一机制，但视角不同：前者强调「cache 的轮次延迟」，这里强调的是「信息的可恢复性是压缩的前提」。上下文能安全压缩的条件不是「信息不重要」，而是「信息有外部可信来源可以重建」。这是一个更深层的设计原则。
