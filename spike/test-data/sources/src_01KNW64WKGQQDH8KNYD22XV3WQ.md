---
id: src_01KNW64WKGQQDH8KNYD22XV3WQ
type: source
source_type: markdown
title: 用-ai-反向代码案例-揭秘-openai-canvas-如何根据用户操作拼接生成-prompt
word_count: 413
raw_file: raw/src_01KNW64WKGQQDH8KNYD22XV3WQ.md
ingested_at: '2026-04-10T17:13:30.992Z'
created_at: '2026-04-10T17:13:30.992Z'
status: active
---
# 用 AI 反向代码案例：揭秘 OpenAI Canvas 如何根据用户操作拼接生成 Prompt

Reading notes and highlights from this source.

- Canvas 选择文本之后如何组织并发送给模型
  - generateAskPrompt
    - # Context
${generateContext(textdocId, selectedText, surroundingContext)}

# Instructions
The user would like you to perform one of the following actions:

- Update the ${selectionDescription} via the \`update_textdoc\` tool.
${additionalInstructions(textdocType, selectionDescription)}

- Explain the selected text via chat, or answer a general question about the selected text (no tool call required).

- Comment on the ${selectionDescription} with feedback via the \`comment_textdoc\` tool. This should only be used if the user very explicitly asks for feedback, critique, or comments.

Based on the user's request, choose the appropriate action.
  - generateCreateTextdocPrompt
    - # Context
${describeSelectionInContext(textdocId, selectedText, surroundingContext)}

# Instructions
The user would like you to create a new textdoc.
  - describeSelectionInContext
    - else
      - Selected Text
The user has selected this text in "${textdocId}" in particular:
${selectedText}

Surrounding Context
Here is the surrounding context:
${surroundingContext.allSurrounding}
    - !selectedText || !surroundingContext
      - The user is referring to the entire text of "${textdocId}".
    - surroundingContext.allSurrounding === selectedText
      - Selected Text
The user has selected this text in "${textdocId}" in particular:
${selectedText}
  - generateEditPrompt
    - # Context
The user requests that you directly edit the document.

${describeSelectionInContext(textdocId, selectedText, surroundingContext)}

# Instructions
Use the \`update_textdoc\` tool to make this edit. ${updateInstructions}
  - additionalInstructions
    - else
      - If you choose to update the ${selectionDescription}, you MUST fully rewrite the entire document by using "." as the update regex pattern. When you do so, ONLY modify the ${selectionDescription} and rewrite other sections exactly as is, except for parts that must change based on this update.
    - textdocType === TextdocType.DOCUMENT && selectionDescription === 'entire document'
      - If you choose to update the ${selectionDescription}, you MUST fully rewrite the ${selectionDescription} by using "." as the update regex pattern.
  - generateCommentPrompt
    - # Context
The user requests that you add comments about some text.

${describeSelectionInContext(textdocId, selectedText, surroundingContext)}

# Instructions
Do not respond to the user's question directly, just leave comments.
  - generateUpdateInstructions
    - textdocType === TextdocType.DOCUMENT
      - For the update pattern, create a regex which exactly matches the ${selectionDescription}. Edit just this string in order to fulfill the user's request. NEVER rewrite the entire document. Instead, ALWAYS edit ONLY the ${selectionDescription}. The only exception to this rule is if the ${selectionDescription} includes markdown lists or tables. In that case, fully rewrite the document using ".*" as the regex update pattern.
  - generateContext
    - The user is requesting that you directly edit the document.

${describeSelectionInContext(textdocId, selectedText, surroundingContext)}
