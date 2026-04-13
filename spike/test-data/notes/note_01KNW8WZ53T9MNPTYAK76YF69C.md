---
id: note_01KNW8WZ53T9MNPTYAK76YF69C
type: note
text: >-
  ChatGPT Mac 客户端的 XML payload 结构与 Canvas 的 prompt
  模板结构高度同构（note_01KNW67JTM7C6H5XJBVRW7RS6Z）：两者都遵循「固定行为指令 + 动态环境内容」的两段式设计。Canvas
  是 `# Instructions` + `# Context`；Mac 客户端是 `<instructions>` +
  `<window>`。区别在于内容来源：Canvas 的动态部分来自用户在文档内的操作状态，Mac
  客户端的动态部分来自操作系统级的窗口状态。这个结构上的收敛意味着「固定行为 + 动态感知」可能是 AI
  产品上下文设计的通用范式，适用范围从文档编辑器一直延伸到整个操作系统。
role: connection
source: src_01KNW8TKYKMFXDW3E4B8B0W9QQ
status: active
created_at: '2026-04-10T18:01:37.172Z'
evidence:
  - text: >-
      <instructions>

      You are being provided with textfield content from windows the user has
      asked you to focus on.

      </instructions>

      <window>
          <title>Visual Studio Code</title>
          <app_name>Code</app_name>
    source: src_01KNW8TKYKMFXDW3E4B8B0W9QQ
    locator: 窗口内容XML结构
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: relationships
bridges:
  - note_01KNW67JTM7C6H5XJBVRW7RS6Z
supports:
  - note_01KNW67JTM7C6H5XJBVRW7RS6Z
---
ChatGPT Mac 客户端的 XML payload 结构与 Canvas 的 prompt 模板结构高度同构（note_01KNW67JTM7C6H5XJBVRW7RS6Z）：两者都遵循「固定行为指令 + 动态环境内容」的两段式设计。Canvas 是 `# Instructions` + `# Context`；Mac 客户端是 `<instructions>` + `<window>`。区别在于内容来源：Canvas 的动态部分来自用户在文档内的操作状态，Mac 客户端的动态部分来自操作系统级的窗口状态。这个结构上的收敛意味着「固定行为 + 动态感知」可能是 AI 产品上下文设计的通用范式，适用范围从文档编辑器一直延伸到整个操作系统。
