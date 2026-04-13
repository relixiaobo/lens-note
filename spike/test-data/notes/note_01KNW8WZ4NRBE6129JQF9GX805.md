---
id: note_01KNW8WZ4NRBE6129JQF9GX805
type: note
text: >-
  ChatGPT Mac 客户端通过 macOS Accessibility API 读取活跃窗口的文本字段内容，并用 XML
  结构包装后注入上下文。这是一种「环境感知上下文注入」（ambient context injection）——不需要用户主动粘贴或上传内容，AI
  就能「看到」用户正在做什么。这与 Canvas 的上下文注入（note_01KNW67JTM7C6H5XJBVRW7RS6Z）有根本差异：Canvas
  的上下文由用户的显式操作触发（选中文本），而 Mac 客户端的上下文是被动读取的，用户可能并未意识到它已被送入模型。这标志着 AI
  上下文获取方式从「用户主动提供」到「系统被动捕获」的架构转变。
role: claim
source: src_01KNW8TKYKMFXDW3E4B8B0W9QQ
status: active
created_at: '2026-04-10T18:01:37.172Z'
evidence:
  - text: >-
      <windows>

      <instructions>

      You are being provided with textfield content from windows the user has
      asked you to focus on.

      </instructions>

      <window>
          <title>Visual Studio Code</title>
          <app_name>Code</app_name>
          <textfields>
    source: src_01KNW8TKYKMFXDW3E4B8B0W9QQ
    locator: ChatGPT Mac App的窗口内容如何传给模型 section
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: description
---
ChatGPT Mac 客户端通过 macOS Accessibility API 读取活跃窗口的文本字段内容，并用 XML 结构包装后注入上下文。这是一种「环境感知上下文注入」（ambient context injection）——不需要用户主动粘贴或上传内容，AI 就能「看到」用户正在做什么。这与 Canvas 的上下文注入（note_01KNW67JTM7C6H5XJBVRW7RS6Z）有根本差异：Canvas 的上下文由用户的显式操作触发（选中文本），而 Mac 客户端的上下文是被动读取的，用户可能并未意识到它已被送入模型。这标志着 AI 上下文获取方式从「用户主动提供」到「系统被动捕获」的架构转变。
