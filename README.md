# lens

> Structured cognition compiler for humans and agents.
> A tool that compiles information into understanding — for humans and for agents.

## In One Sentence

Lens is not a reader, not a RAG knowledge base, not a second brain. It is a **compiler for understanding** — it takes what you read, chat about, and think about, and compiles them into structured cognitive objects (Claim / Frame / Question / Programme), enabling both humans and AI agents to reason further based on this compiled understanding.

## Core Thesis

**Raw content is not the product. Processed understanding is the product.**

Information consumed through reading, chatting, and viewing is compiled into structured cognitive objects:

- **Claim** — A falsifiable assertion with Toulmin structure (evidence / warrant / qualifier)
- **Frame** — A lens for viewing the world (sees / ignores / assumptions)
- **Question** — An open inquiry question, supporting tree-like growth
- **Programme** — Lakatos research programme structure: Hard Core + Protective Belt + Open Questions

The original text is demoted to the **evidence layer**. The everyday objects of consumption are these structured objects, not the original text. See [`docs/positioning.md`](./docs/positioning.md) for details.

## Who Is It For

- **Humans**: Use these structures for learning, judgment, transfer, and decision-making — especially suited for researchers, analysts, journalists, deep writers, and heavy AI users
- **Agents**: Pull context and write back findings via CLI (`lens context / search / note`). Comes with a Claude Code Skill definition so agents can automatically install and use lens

The same body of understanding, accessed equally by both types of users.

## Intellectual Lineage

The methodological backbone is synthesized from 5 traditions: **Lakatos** (research programmes), **Reif + Miller** (hierarchical knowledge organization), **Popper** (falsification cycles), **Toulmin** (argument structure), **Bayesian** (belief updating).

Direct inspiration: [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), [Li Jigang ljg-skills](https://github.com/lijigang/ljg-skills).

See [`docs/methodology.md`](./docs/methodology.md) and [`docs/references.md`](./docs/references.md) (~120 sources) for details.

## Product Form

Lens is a **Tauri 2 desktop application** + CLI.

- **v0.1**: Tauri desktop app (Reader / Programme Dashboard / Claim Detail / Settings) + CLI
- **v0.2**: + Knowledge Maps visual layer + Contradiction detection + Chat ingest + Bayesian updating
- **v0.3**: + Browser extension + MCP server + Audio/Image
- **v1.0+**: + iOS / Android

Tech stack: **Tauri 2 + React 19 + [pi-ai](https://github.com/badlogic/pi-mono) (LLM calls) + [pi-agent-core](https://github.com/badlogic/pi-mono) (Compilation Agent runtime) + SQLite (derived cache) + Bun-compiled core**. Storage: **Markdown files = truth, SQLite = derived cache**. See [`docs/architecture.md`](./docs/architecture.md) for details.

**Privacy note**: v0.1 compilation relies on the cloud-based Anthropic API (local-first storage + cloud inference). See [`docs/positioning.md`](./docs/positioning.md) § Privacy Boundaries for details.

## Status

Design docs review complete. Ready to begin v0.1 implementation (run extraction quality spike first).

## Documentation

**New agents or developers start here**:

- [`docs/getting-started.md`](./docs/getting-started.md) — **Getting started guide (start developing with zero context)**

**Core design documents** (see each document for detailed content, not repeated here):

- [`docs/positioning.md`](./docs/positioning.md) — Product positioning, UX principles, privacy boundaries
- [`docs/architecture.md`](./docs/architecture.md) — Tech stack, component architecture
- [`docs/methodology.md`](./docs/methodology.md) — Methodological backbone, compilation lifecycle
- [`docs/schema.md`](./docs/schema.md) — Type system precise specification (source of truth for code)
- [`docs/source-pipeline.md`](./docs/source-pipeline.md) — Source ingest mechanism
- [`docs/roadmap.md`](./docs/roadmap.md) — Phased implementation plan
- [`docs/references.md`](./docs/references.md) — Reference sources

**Other**:

- [`spike/extraction-spike.ts`](./spike/extraction-spike.ts) — LLM extraction quality validation script (run before writing product code)
- [`skills/lens.claude-skill.md`](./skills/lens.claude-skill.md) — Claude Code Skill definition (agent integration entry point)

## Installation (v0.1 alpha, in development)

```bash
# CLI (agents and power users)
npm install -g lens-cli

# GUI (desktop)
brew install --cask lens        # macOS

# Agent integration (Claude Code)
cp skills/lens.claude-skill.md ~/.claude/skills/
```
