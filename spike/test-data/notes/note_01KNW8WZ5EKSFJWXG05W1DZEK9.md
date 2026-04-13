---
id: note_01KNW8WZ5EKSFJWXG05W1DZEK9
type: note
text: >-
  ChatGPT Mac 客户端通过 Accessibility API 读取其他应用窗口内容这一机制，揭示了 AI
  助手「感知层」的一种新形态：不是工具调用（tool call），不是用户上传，而是操作系统级的感知授权。这条路径与
  MCP（model-context-protocol）所代表的「工具垂直集成」是两种不同的上下文来源架构。MCP
  是显式的——用户配置工具，模型按需调用；Accessibility 读取是隐式的——操作系统允许，客户端持续感知。这两种模式的组合，正在构成 AI
  客户端「环境感知能力」的基础层：一个是按需的深度访问（MCP），一个是持续的浅层感知（屏幕/窗口内容）。
role: frame
source: src_01KNW8TKYKMFXDW3E4B8B0W9QQ
status: active
created_at: '2026-04-10T18:01:37.172Z'
evidence:
  - text: |-
      <textfields>
          <textfield id="窗口文件名">
          【窗口内容】
          </textfield>
      </textfields>
    source: src_01KNW8TKYKMFXDW3E4B8B0W9QQ
    locator: textfields 结构
qualifier: tentative
voice: synthesized
scope: big_picture
structure_type: relationships
sees: AI 客户端的上下文来源作为「感知架构」，区分显式工具调用与隐式环境读取两种通道
ignores: 用户隐私边界、操作系统权限管控对这种感知能力的约束
---
ChatGPT Mac 客户端通过 Accessibility API 读取其他应用窗口内容这一机制，揭示了 AI 助手「感知层」的一种新形态：不是工具调用（tool call），不是用户上传，而是操作系统级的感知授权。这条路径与 MCP（model-context-protocol）所代表的「工具垂直集成」是两种不同的上下文来源架构。MCP 是显式的——用户配置工具，模型按需调用；Accessibility 读取是隐式的——操作系统允许，客户端持续感知。这两种模式的组合，正在构成 AI 客户端「环境感知能力」的基础层：一个是按需的深度访问（MCP），一个是持续的浅层感知（屏幕/窗口内容）。
