# Theoretical Foundations

lens is not an arbitrary design. Every major decision traces back to a theory about how knowledge works.

## Core: Luhmann's Zettelkasten

Niklas Luhmann (1927–1998) was a German sociologist who published 70 books and 400+ papers using a paper-based system of 90,000 index cards. His method was not about filing — it was about **communicating with the slip-box**.

What lens takes from Luhmann:
- **One idea per card.** Not "notes about article X", but a standalone thought.
- **Links are the only structure.** No folders, no categories. Structure emerges from connections.
- **The index is sparse and post-hoc.** Entry points are created after clusters form, not before.
- **Reformulate in your own words.** Copying is storage. Reformulation is understanding.
- **Walk the graph.** The most valuable insights come from following links you didn't expect.

## Compilation: Karpathy's LLM Wiki

Andrej Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) paradigm: **continuous compilation beats ad-hoc retrieval.** Don't store documents and retrieve them later — compile them into structured, linked knowledge as they arrive.

What lens takes from Karpathy:
- **lens stores compiled knowledge, not raw documents.** Sources are provenance; Notes are the compiled output.
- **Compilation is continuous.** New information updates existing notes, not just creates new ones.
- **Graph "lint"** — periodic curation to maintain quality, like linting code.

## Viewfinders: Li Jigang

Li Jigang's insight: **collecting viewfinders beats accumulating facts.** The most valuable knowledge is not "what happened" but "a way of seeing" — a perspective that reveals some things and hides others.

What lens takes from Li Jigang:
- **The Collision Method produces perspectives, not summaries.** When you collide a new article with existing knowledge, the output should be a new way of seeing, not a restatement.
- **Quality over quantity.** Zero new notes is an acceptable compilation result if nothing genuinely new emerges.

## The Collision Method

Our synthesis of Luhmann, Karpathy, and Li Jigang:

```
Spark → Collide → Crystallize
```

- **Spark**: A thought arrives (article, conversation, observation).
- **Collide**: Carry the thought into the knowledge graph. Search, follow links, wander. Watch what happens when the new meets the existing.
- **Crystallize**: Write what emerged from the collision — the new understanding that neither the spark nor the existing knowledge had alone.

Four deepening moves when collision is too shallow:
- **Break apart** — The concept is too big. Split it, look at it from different angles.
- **Drill down** — Keep asking "why is this true?" until you reach something solid.
- **Reduce** — Find the 2-3 truly independent axes. Everything else is a combination.
- **Debate** — Let both sides speak. The tension IS the insight.

## Argumentation: Toulmin

Stephen Toulmin's argumentation model (1958): every claim has data, warrant, qualifier, and potential rebuttal. This shaped lens's approach to confidence and evidence — not as rigid fields, but as natural elements in the body of a note.

What lens takes from Toulmin:
- **Claims should state their confidence.** "Certain", "likely", "tentative" — in prose, not metadata.
- **Evidence grounds claims.** Blockquotes in the body, citing sources.
- **Contradictions are first-class.** The `contradicts` link type exists because Toulmin showed that rebuttals are as important as warrants.

## Falsification: Popper & Lakatos

Karl Popper's falsification principle and Imre Lakatos's research programmes: knowledge advances not by accumulating confirmations but by **surviving challenges**.

What lens takes from Popper & Lakatos:
- **`contradicts` links are the most valuable.** Tension between notes is where growth happens.
- **Don't smooth over disagreements.** A note that contradicts another note should stay in tension.
- **Knowledge evolves.** Old notes get superseded, not deleted. The evolution itself is informative.

## Hierarchical Knowledge: Reif & Miller

Frederick Reif (MIT Press 2010) on hierarchical knowledge organization, and Francis Miller (2018) on multi-level content: the same piece of knowledge can be viewed at different levels of detail.

What lens takes from Reif & Miller:
- **Big-picture and detail notes coexist.** `supports` links connect detail to principle.
- **The body handles depth.** Title is the headline; body elaborates at whatever depth is needed.

## Knowledge Conversion: Nonaka's SECI

Ikujiro Nonaka's SECI model (1995): knowledge converts between tacit and explicit forms through four processes — Socialization, Externalization, Combination, Internalization.

What lens takes from Nonaka:
- **lens is strongest at Combination** — connecting explicit knowledge to create new explicit knowledge. That's the Collision Method.
- **Externalization happens at capture** — writing down tacit knowledge as notes.
- **Internalization is the reader's job** — lens stores, the agent (or human) internalizes.

## How These Theories Guide Decisions

**"Should I read this article?"** (feed check → compile decision)
- Luhmann: Does it have collision potential with existing notes?
- Karpathy: Can it be compiled into something, or is it just storage?
- Li Jigang: Could it change how I see something?
- Popper: Does it challenge or confirm existing understanding?

**"How do I write this note?"**
- Luhmann: One idea, reformulated in your own words, linked to what it collided with.
- Toulmin: State confidence, ground with evidence, acknowledge rebuttals.
- Reif/Miller: Choose the right level — headline title, elaboration in body.

**"When do I link two notes?"**
- Luhmann: Only when you can articulate WHY they're connected (hence `reason`).
- Popper: `contradicts` links are more valuable than `supports`.
- Karpathy: Link during compilation, not as a post-hoc cleanup.
