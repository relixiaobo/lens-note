# Lens Product Evolution Log

This document records the thinking journey — not just what we decided, but why, what we tried, what failed, and how our understanding evolved.

---

## Phase 1: Initial Design (v0.1)

### Starting Point

lens started as a "structured cognition compiler" — an LLM that reads articles and extracts Claims, Frames, and Questions into a structured knowledge base.

**6 types**: Source, Claim, Frame, Question, Programme, Thread.

The mental model was a **classification machine**: article goes in, structured objects come out, neatly filed into Programmes (thematic containers).

### What We Learned

- **Extraction quality was good enough** — Claude could reliably extract Toulmin-style claims with evidence and qualifiers.
- **Programme proliferation was a problem** — 7 articles produced 7 Programmes. Each article got its own container. No cross-article connections emerged.
- **6 types were over-engineered** — the rigid Claim/Frame/Question distinction forced artificial classification. Many insights didn't fit neatly into one type.
- **The Agent was an extractor, not a thinker** — it mined articles for facts rather than connecting new ideas to existing knowledge.

---

## Phase 2: Zettelkasten Redesign (v0.2)

### The Key Question

"Or would Luhmann do it differently?"

This question triggered a fundamental rethink. We studied Luhmann's actual method and found that most Zettelkasten tools miss the critical details:

1. **Cards are independent thoughts, not extracts** — Luhmann reformulated ideas in his own words
2. **Structure emerges from links, not categories** — no folders, no tags, no containers
3. **The index is sparse and post-hoc** — entry points created after clusters form, not before
4. **Every link has a reason** — linking is cheap in digital tools, which produces noise

### Decisions

- **3 types replace 6**: Source, Note, Thread (Thread later removed; now 3 types: Source, Note, Task).
- **Programme is gone**: Structure is emergent from links between notes.
- **Links are the only structure**: `supports`, `contradicts`, `refines`, `related` — each with a `reason`.
- **Agent redesigned as "thinker"**: Reads → explores existing knowledge → thinks about connections → creates linked Notes. Not a mechanical extractor.
- **7 frontmatter fields**: `id`, `type`, `title`, `source`, `links[]`, `created_at`, `updated_at`. Everything else (evidence, confidence, scope, perspective) goes in body as free-form markdown.

### Validation

Tested with real articles. Results:
- -42% objects (fewer, higher quality Notes)
- +350% relationship discovery (Agent found connections between articles)
- Agent performed 14-21 queries per article, deeply reading existing Notes before creating new ones

---

## Phase 3: Tana Import Experiment (v0.2.1)

### Context

User had a Tana export (36,750 docs, 9.3MB). Question: how to import existing knowledge into lens?

### Key Insight 1: Agent Should Classify, Not User

Initial plan: build a structured Tana importer that maps Tana types → lens types.

Realization: **structured import is an anti-pattern.** It bypasses the Agent's thinking. The Agent should process user's notes the same way it processes articles — read, think, link.

This led to the **Placement Agent** — a new Agent mode where user notes are "placed" into the knowledge graph with connections, rather than mechanically imported.

### Key Insight 2: Two Agent Modes

| Mode | Input | Agent's Job |
|------|-------|-------------|
| Compile | Article (someone else's content) | Read → think → produce new Notes |
| Place | User notes (user's own thoughts) | Find where each note belongs → link to existing |

Same Agent, different system prompt. The core reasoning (explore existing knowledge → decide relationship) is identical.

### Key Insight 3: Cold Start Problem

Experiment results:

| Experiment | KB State | Result |
|------------|----------|--------|
| Source (Bitter Lesson) | Some notes | OK — 8 notes, 2 supports |
| Highlights (AI-related) | Rich in AI | Best — 5 supports found |
| Highlights (misc topics) | Empty for these topics | Failed — Agent searched forever, never submitted |

When the knowledge base has no related content, the Agent doesn't know what to do. It's designed to find connections, but when there are none, it freezes.

**Root cause**: The Agent's prompt assumed existing knowledge always exists. Fix: Placement prompt explicitly states "most notes will be new — that's fine."

### Technical Discovery: pi-ai Bug

During testing, discovered that `@mariozechner/pi-ai` 0.66.1 sends a `fine-grained-tool-streaming-2025-05-14` beta header to Anthropic API. This beta changes the streaming format for tool calls, causing `JSON Parse error` when tool call arguments contain multi-byte UTF-8 characters (Chinese text).

**Root cause investigation path**: Initially suspected Bun's streaming → Anthropic SDK → max_tokens limit. Proved through systematic elimination:
- Direct API call (non-streaming) → works
- Raw fetch streaming in Bun → works
- Anthropic SDK streaming (without beta header) → works
- Anthropic SDK streaming (with beta header) → fails

**Workaround**: Use `streamAnthropic()` with a custom Anthropic client that doesn't include the beta header.

**Decision**: Replace pi-ai and pi-agent-core entirely with koma (our own agent framework). Reason: third-party dependency instability. The bug was specific, but debugging it consumed significant time, and the dependency chain (pi-agent-core → pi-ai → @anthropic-ai/sdk) adds risk at each layer.

---

## Phase 4: Product Vision Rethink (v0.3 Planning)

### Trigger

The Tana import experiment raised a deeper question: if users dump mixed content (articles + notes + code + files), who classifies it?

**Answer: the Agent. Not the user.**

This triggered a cascade of product rethinks.

### Insight 1: Thread Is the Primary Interface

> **Historical note (2026-04-13):** Thread was later removed as a separate type. Conversations are now stored as Sources with `source_type: "conversation"`. The insight below is preserved for historical context.

Original view: Thread is a lightweight conversation record, an appendage to Notes.

New view: **Thread is the workspace where user and Agent collaborate.** All knowledge enters lens through Threads. Notes are crystallized from Thread conversations.

Implication: "lens note" and "lens ingest" are CLI shortcuts. The canonical flow is: user puts stuff in a Thread → Agent processes it.

### Insight 2: Single Input Surface

Users don't pre-classify input. They drag in a mix of files, paste text, drop URLs. The Agent must:
1. Detect format (URL? file? text? mixed?)
2. Classify (article? user notes? code project? conversation?)
3. Route to appropriate processing (compile / place)
4. Execute and crystallize Notes

**One input → Agent figures it out → Knowledge.**

### Insight 3: lens Reads, the World Writes

What can lens compile? Not just articles — anything readable:
- Articles, books, PDFs, podcasts (text content)
- Code projects, GitHub repos (structural content)
- Conversations, tweets, highlights (social content)
- Screenshots, diagrams (visual content, via OCR/vision)

The difference between these is **how they're read** (linear vs. exploratory vs. structured extraction), not **how they're thought about**. The thinking process (compare to existing knowledge → create linked Notes) is always the same.

**Implication**: Adding a new input type = adding reader tools to the Agent. Zero changes to the knowledge model or thinking process.

### Insight 4: No Output, No Value

Critical self-critique: lens compiles knowledge IN but never synthesizes it OUT.

User researches a topic for months → 300 Notes with rich links. Then needs to:
- Write a report → lens can't help
- Make a recommendation → lens can't help
- Brief a colleague → lens can't help

**Missing piece: Synthesis.** The Agent needs to be able to read the knowledge graph and produce coherent output (summaries, analyses, briefings).

But: lens should NOT produce final artifacts (PPT, code, formatted reports). That's other tools' job.

**lens's boundary is at Context** — structured understanding that other agents/tools consume:

```
Input → Compile → Knowledge Graph ↔ Converse → Context → External tools → Final artifacts
```

### Insight 5: Three Agent Modes

| Mode | What | When |
|------|------|------|
| **Compile** | Process new input → create Notes + links | New content arrives |
| **Converse** | User asks/corrects/explores → synthesize, update | User interacts with knowledge |
| **Curate** | Merge, evolve, prune, find missing links | Periodic maintenance |

Current lens only has Compile. Converse and Curate are the missing two legs.

### Insight 6: Note Lifecycle

Notes aren't frozen at creation. They have a lifecycle:

```
create → accumulate evidence → merge with similar → evolve → supersede
```

Current lens only does create and partial accumulation (duplicate → add evidence). Missing: merge, evolve, supersede.

### Insight 7: lens Is the Shared Cognitive Layer

lens isn't a standalone product. It's **the knowledge layer that all agents share.**

- A coding agent (Claude Code / koma) can query lens for relevant knowledge while working
- A writing agent can pull structured evidence from lens for drafting
- A research agent can check lens before searching externally

`lens context` is not just a CLI command — it's the **API contract** between lens and every other agent.

### Revised Design Principles

| Principle | Before | After |
|-----------|--------|-------|
| LLM for display | Never use LLM for display | **Storage/single Note: no LLM. Synthesis/output: LLM required.** |
| Compilation | One-shot at ingest time | **Continuous: create → accumulate → merge → evolve → supersede** |
| Thread | Appendage to Notes | **Primary interface for human-knowledge interaction** *(Thread later removed; conversations stored as Sources with `source_type: "conversation"`. Task type added for human-agent collaboration.)* |
| Agent | One-time compiler | **Knowledge steward: compile + converse + curate** |
| Input | Separate commands per type | **Single surface, Agent classifies and routes** |
| Output | Not lens's job | **lens provides Context; final artifacts are other tools' job** |

### Self-Critique: Remaining Problems

1. **Source-oriented vs concept-oriented**: Ingest flow is source-oriented (one article → N notes). Knowledge graph should become concept-oriented over time. The duplicate/supports mechanism helps but isn't enough.
2. **No feedback loop**: Agent doesn't learn from user corrections. Each compilation is independent.
3. **Over-compilation**: Not everything needs full Agent processing. Simple capture (a quote, a thought) should be friction-free.
4. **Knowledge only grows**: No pruning, no merge, no supersede mechanism implemented.
5. **Query is too primitive**: `search` returns note lists. Users need synthesized answers about their knowledge.

---

## Current Status (2026-04-11)

### What Exists
- v0.2 CLI fully working (compile + place modes)
- 756 Notes, 174 Sources in knowledge base (Tana data + RSS)
- koma agent framework design complete, implementation in progress

---

## Phase 5: Infrastructure Pivot (v0.3)

### The Key Question

"Can Claude Code use lens without needing a separate API key?"

This triggered the deepest architectural change: **lens should not contain any LLM logic at all.**

### The Insight

The calling agent (Claude Code, Cursor, etc.) IS the LLM. lens duplicating that is:
- Wasteful (double API cost)
- Fragile (pi-ai streaming bugs with Chinese characters)
- Friction-creating (user needs a separate API key)

### The Decision

**lens becomes pure infrastructure — like Git for knowledge.**

- Git stores code. lens stores knowledge.
- Git doesn't write code. lens doesn't think.
- Any IDE/agent uses Git. Any agent uses lens.

### What Changed

Removed:
- `compilation-agent.ts`, `process-output.ts` (all LLM logic)
- `converse.ts`, `curate.ts` (LLM-powered commands)
- Dependencies: pi-agent-core, pi-ai, @anthropic-ai/sdk, typebox (-164 packages)

Added:
- `lens write` — unified write API (stdin JSON, routes by type field)
- `lens fetch` — web extraction without LLM

Simplified:
- `lens ingest` → alias for `lens fetch --save`
- `lens note` → alias for `lens write` with type:note
- `lens feed check` → reports new articles, no auto-compile

### The New Model

```
Agent reads skill file → learns 5 commands → uses lens as storage
```

5 agent-facing commands: `search`, `show`, `write`, `fetch`, `status`.

The skill file (`skills/SKILL.md`) teaches agents the workflows:
- Compile: fetch → search → think → write
- Curate: status → show orphans → search related → write links
- Answer: search → show → synthesize

Intelligence moved from code (compilation-agent.ts) to documentation (skill file). Any agent that reads the skill knows how to use lens.

### What We Learned

- **LLM logic in a CLI tool is an anti-pattern.** The calling agent already is an LLM.
- **A skill file IS application logic.** The prompts we had in TypeScript code work just as well as markdown instructions.
- **Infrastructure outlasts applications.** Git survived every IDE. lens should survive every agent.
- **Fewer dependencies = more reliable.** 164 packages removed. Zero streaming bugs. Zero API key issues.

### State at v0.4.0

- 756 Notes, 174 Sources
- 0 LLM dependencies
- 5 core commands for agents
- Skill file for Claude Code / Cursor / any agent
- Graph health: 5.6% orphans, 92% cross-source links
