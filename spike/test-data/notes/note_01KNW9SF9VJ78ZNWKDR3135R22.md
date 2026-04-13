---
id: note_01KNW9SF9VJ78ZNWKDR3135R22
type: note
text: >-
  The canmore system prompt's treatment of `comment_textdoc` reveals a design
  space that is missing from most discussions of AI writing assistants: the
  *suggestion mode* that is neither 'apply the change' nor 'discuss in chat.'
  Comment mode produces output that is spatially co-located with the document
  but not part of it — visible to the user, actionable if accepted, discardable
  if rejected. This is architecturally equivalent to code review annotations or
  tracked changes in Word. The prompt explicitly says to use comment mode 'if
  the user asks for suggestions or advice' and to NOT use it 'if the user asks
  or implies that they would like the document to be directly updated.' This
  three-way fork (update / comment / chat) maps onto three levels of user agency
  over AI output: (1) AI executes, (2) AI proposes + user decides, (3) AI
  advises + user acts. Most AI product discussions collapse this to a binary (do
  it / don't do it).
role: observation
source: src_01KNW9P1576R56AAAVAZSS5JAK
status: active
created_at: '2026-04-10T18:17:11.203Z'
evidence:
  - text: >-
      Adds comments to the current text document by applying a set of comments
      that are not part of the document content. Use this function to add
      comments for the user to review and revise if they choose.
    source: src_01KNW9P1576R56AAAVAZSS5JAK
    locator: comment_textdoc function definition
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: description
bridges:
  - note_01KNW67JTMZN31XF031JD5J1FP
  - note_01KNW67JSYJDTQRK9G9PEE5986
---
The canmore system prompt's treatment of `comment_textdoc` reveals a design space that is missing from most discussions of AI writing assistants: the *suggestion mode* that is neither 'apply the change' nor 'discuss in chat.' Comment mode produces output that is spatially co-located with the document but not part of it — visible to the user, actionable if accepted, discardable if rejected. This is architecturally equivalent to code review annotations or tracked changes in Word. The prompt explicitly says to use comment mode 'if the user asks for suggestions or advice' and to NOT use it 'if the user asks or implies that they would like the document to be directly updated.' This three-way fork (update / comment / chat) maps onto three levels of user agency over AI output: (1) AI executes, (2) AI proposes + user decides, (3) AI advises + user acts. Most AI product discussions collapse this to a binary (do it / don't do it).
