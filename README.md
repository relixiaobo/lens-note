# lens

> Structured cognition compiler for humans and agents.
> A tool that compiles information into understanding — for humans and for agents.

## In One Sentence

Lens is not a reader, not a RAG knowledge base, not a second brain. It is a **compiler for understanding** — it takes what you read, chat about, and think about, and compiles them into structured Notes (claims, frames, questions, observations, connections), linked together in a Zettelkasten-inspired knowledge graph. Both humans and AI agents reason further based on this compiled understanding.

## Core Thesis

**Raw content is not the product. Processed understanding is the product.**

**All knowledge is Notes. Structure emerges from links.**

Information consumed through reading, chatting, and viewing is compiled into a unified knowledge card type:

- **Note** — A universal knowledge card (one idea per card) with optional cognitive fields:
  - **Claim fields**: evidence, qualifier, voice (makes it a substantiated assertion)
  - **Frame fields**: sees, ignores, assumptions (makes it a perspective)
  - **Question field**: question_status (makes it an open inquiry)
  - **Connection fields**: bridges (links cross-domain ideas)
  - **Structure note**: role: structure_note + entries (replaces Programme as navigational index)
- **Source** — Provenance record (where content came from, not knowledge itself)
- **Thread** — A conversation about Notes (interaction, not knowledge)

Role is a soft hint (`claim | frame | question | observation | connection | structure_note`), not a rigid classification. A Note can combine fields from multiple roles. Links (supports, contradicts, refines, related) are the only structure — no categories, no containers.

The original text is demoted to the **evidence layer**. See [`docs/positioning.md`](./docs/positioning.md) for details.

## Who Is It For

- **Humans**: Use these structures for learning, judgment, transfer, and decision-making — especially suited for researchers, analysts, journalists, deep writers, and heavy AI users
- **Agents**: Pull context and write back findings via CLI (`lens context / search / note`). Comes with a Claude Code Skill definition so agents can automatically install and use lens

The same body of understanding, accessed equally by both types of users.

## Intellectual Lineage

The methodological backbone is synthesized from multiple traditions: **Luhmann** (Zettelkasten: cards + links, no categories), **Toulmin** (argument structure: evidence + qualifier), **Reif + Miller** (hierarchical knowledge organization: scope + structure types), **Karpathy** (compile at ingest time, not at query time), **Li Jigang** (cognitive operations: anatomy, rank, roundtable).

Direct inspiration: [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), [Li Jigang ljg-skills](https://github.com/lijigang/ljg-skills).

See [`docs/methodology.md`](./docs/methodology.md) and [`docs/references.md`](./docs/references.md) (~120 sources) for details.

## Product Form

Lens is a **CLI tool** (Bun-compiled single binary).

- **v0.1**: CLI-only. 6 types (Source, Claim, Frame, Question, Programme, Thread). Validated LLM extraction quality.
- **v0.2**: Zettelkasten-native redesign. 3 types (Source, Note, Thread). Notes as universal cards with links as only structure. Agent becomes "thinker" not just "extractor" — discovers relationships and updates existing Notes.
- **v0.3**: + Li Jigang cognitive operations (anatomy, rank, roundtable, drill) + Browser extension + MCP server
- **v1.0+**: + GUI (Tauri 2 desktop app) + iOS / Android

Tech stack: **Bun + [pi-ai](https://github.com/badlogic/pi-mono) (LLM calls) + [pi-agent-core](https://github.com/badlogic/pi-mono) (Compilation Agent runtime) + SQLite (derived cache)**. Storage: **Markdown files = truth, SQLite = derived cache**. See [`docs/architecture.md`](./docs/architecture.md) for details.

**Privacy note**: Compilation relies on the cloud-based Anthropic API (local-first storage + cloud inference). See [`docs/positioning.md`](./docs/positioning.md) § Privacy Boundaries for details.

## Status

v0.2 implementation complete. Zettelkasten-native redesign: 3 types (Source, Note, Thread), links as only structure, agent as thinker.

## Documentation

**New agents or developers start here**:

- [`docs/getting-started.md`](./docs/getting-started.md) — **Getting started guide (start developing with zero context)**

**Core design documents** (see each document for detailed content, not repeated here):

- [`docs/positioning.md`](./docs/positioning.md) — Product positioning, UX principles, privacy boundaries
- [`docs/zettelkasten-redesign.md`](./docs/zettelkasten-redesign.md) — **v0.2 design document: the complete Zettelkasten-native model**
- [`docs/architecture.md`](./docs/architecture.md) — Tech stack, component architecture
- [`docs/methodology.md`](./docs/methodology.md) — Methodological backbone, compilation lifecycle
- [`docs/schema.md`](./docs/schema.md) — Type system precise specification (source of truth for code)
- [`docs/source-pipeline.md`](./docs/source-pipeline.md) — Source ingest mechanism
- [`docs/roadmap.md`](./docs/roadmap.md) — Phased implementation plan
- [`docs/references.md`](./docs/references.md) — Reference sources

**Other**:

- [`spike/extraction-spike.ts`](./spike/extraction-spike.ts) — LLM extraction quality validation script (run before writing product code)
- [`skills/lens.claude-skill.md`](./skills/lens.claude-skill.md) — Claude Code Skill definition (agent integration entry point)

## Installation (v0.2 alpha, in development)

```bash
# CLI (agents and power users)
npm install -g lens-cli

# Agent integration (Claude Code)
cp skills/lens.claude-skill.md ~/.claude/skills/
```
