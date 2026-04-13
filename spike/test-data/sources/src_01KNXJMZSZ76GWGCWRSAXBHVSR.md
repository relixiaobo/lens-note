---
id: src_01KNXJMZSZ76GWGCWRSAXBHVSR
type: source
source_type: web_article
title: 'SQUIRE: Interactive UI Authoring via Slot QUery Intermediate REpresentations'
url: 'https://machinelearning.apple.com/research/squire'
word_count: 253
raw_file: raw/src_01KNXJMZSZ76GWGCWRSAXBHVSR.html
ingested_at: '2026-04-11T06:11:15.903Z'
created_at: '2026-04-11T06:11:15.903Z'
status: active
---
[View publication](https://dl.acm.org/doi/10.1145/3746059.3747672)

Frontend developers create UI prototypes to evaluate alternatives, which is a time-consuming process of repeated iteration and refinement. Generative AI code assistants enable rapid prototyping simply by prompting through a chat interface rather than writing code. However, while this interaction gives developers flexibility since they can write any prompt they wish, it makes it challenging to control what is generated. First, natural language on its own can be ambiguous, making it difficult for developers to precisely communicate their intentions. Second, the model may respond unpredictably, requiring the developer to re-prompt through trial-and-error to repair any undesired changes. To address these weaknesses, we introduce Squire, a system designed for guided prototype exploration and refinement. In Squire, the developer incrementally builds a UI component tree by pointing and clicking on different alternatives suggested by the system. Additional affordances let the developer refine the appearance of the targeted UI. All interactions are explicitly scoped, with guarantees on what portions of the UI will and will not be mutated. The system is supported by a novel intermediate representation called SquireIR with language support for controlled exploration and refinement. Through a user study where 11 frontend developers used Squire to implement mobile web prototypes, we find that developers effectively explore and iterate on different UI alternatives with high levels of perceived control. Developers additionally scored Squire positively for usability and general satisfaction. Our findings suggest the strong potential for code generation to be controlled in rapid UI prototyping tools by combining chat with explicitly scoped affordances.
