# Getting Started with Lens (for new agents / developers)

Date: 2026-04-09

This document is specifically prepared for **agents or developers encountering the lens codebase for the first time**. If you've been assigned a task in lens without any background information, **read this first**. It will tell you:

1. What lens is and what problem it solves
2. How to navigate the documentation network
3. How the code is organized
4. How to get it running
5. How to contribute

**Expected time**: 30-45 minutes to read this + another 1-2 core documents, then you can start writing code.

---

## 1. What is lens (60-second version)

> **lens = Structured cognition compiler for humans and agents.**

**Compile** the content you read, discuss, and think about into structured Notes — universal knowledge cards linked in a Zettelkasten-inspired knowledge graph — so that **both humans and AI agents can continue reasoning based on this compiled understanding**.

**One-line comparison**:

- **Obsidian / Logseq**: Let you **manually** organize your notes
- **Mem0 / Letta**: Provide **automatic but low-quality** memory extraction for AI
- **lens**: Make **high-quality, traceable, linked understanding** the shared substrate for humans and agents

**Core thesis**: **Raw content is not the product. Processed understanding is the product.** All knowledge is Notes. Structure emerges from links.

**Detailed explanation**: Read [`positioning.md`](./positioning.md).

---

## 2. Why it exists (3-minute version)

As a heavy AI user (someone who spends 3-5 hours daily conversing with Claude Code, ChatGPT, Cursor), you probably have these pain points:

1. **Repeatedly researching the same question**: The insight you discussed with ChatGPT last week is completely unknown to Claude Code today
2. **Notes don't compound**: 3000 notes in Obsidian, but you never go back to read them
3. **AI systems are siloed**: ChatGPT's memory / Claude's memory / Cursor memories don't communicate with each other
4. **Auto-extracted memory is low quality**: Mem0's production audit found that **97.8% of automatically extracted memories are garbage**

lens's hypothesis is: the root cause of these problems is not a **storage problem** but a **compilation problem** — what users / AI need is not the original text, but **processed understanding**.

**Core metaphor** (borrowed from Andrej Karpathy's LLM Wiki gist):

> Code is written for humans to read; machines can't understand it. A **compiler** translates code into instructions machines can execute. **Compilation happens when the code is written, not every time it runs.**
>
> Today's AI and note-taking tools treat information like a language without a compiler. Every time you query, you have to piece together answers from raw documents on the fly.
>
> What lens does is **knowledge compilation**: compile once, reuse many times.

---

## 3. Documentation network map

lens's documentation falls into two categories, **you should read them in order**:

### Core (required reading, in order)

1. **`README.md`** — 10-second overview
2. **`docs/positioning.md`** — What the product is, who the users are, UX principles (15 min)
3. **This document** (`docs/getting-started.md`) — The one you're reading now (10 min)
4. **`docs/zettelkasten-redesign.md`** — v0.2 design document: the complete Zettelkasten-native model (20 min)
5. **`docs/architecture.md`** — Tech stack / component architecture / process model (20 min)
6. **`docs/schema.md`** — Precise schema for data types, **source of truth for the code** (30 min)

### Reference (consult as needed)

- **`docs/methodology.md`** — 5 methodological spines (Lakatos / Reif+Miller / Popper / Toulmin / Bayes) + compilation lifecycle. **Theoretical background, must-read before modifying any compile step**
- **`docs/source-pipeline.md`** — Acquisition / extraction / incremental update mechanisms for each source type (web/PDF/chat). **Must-read before working on ingest-related tasks**
- **`docs/roadmap.md`** — Phased plan from v0.1 to v1.0. **Check which phase a feature belongs to before working on it**
- **`docs/references.md`** — ~120 cited sources. **Consult when someone questions a design decision**

### Context (deep background)

- **`docs/launch-post-draft.md`** — Product launch copy draft, shows the "why" that lens wants to convey to users

### Priority between documents

If there are **conflicts** between documents, the following order determines which one wins:

```
zettelkasten-redesign.md wins  everything (v0.2 design source of truth)
schema.md 	wins 	methodology.md    # schema is executable constraint, methodology is conceptual
architecture.md wins 	roadmap.md       # architecture determines tech stack
positioning.md 	wins 	everything        # positioning is source of truth
```

If you find a conflict: **stop, raise it**, don't make assumptions on your own.

---

## 4. Core concepts cheat sheet

### 4.1 Core types (v0.2 — Zettelkasten-native)

lens organizes everything around 3 types. This is a major simplification from v0.1's 6 types:

| Type | What it is | ID Prefix | File path |
|---|---|---|---|
| **Source** | Provenance record (where content came from, not knowledge) | `src_` | `sources/src_XXX.md` |
| **Note** | Universal knowledge card (one idea per card, with optional cognitive fields) | `note_` | `notes/note_XXX.md` |
| **Thread** | A conversation about Notes (interaction, not knowledge) | `thr_` | `threads/thr_XXX.md` |

**Note** is the universal card with optional fields that express cognitive roles:

| Role (soft hint) | Key optional fields | What it represents |
|---|---|---|
| `claim` | evidence[], qualifier, voice | A substantiated assertion |
| `frame` | sees, ignores, assumptions[] | A perspective / lens |
| `question` | question_status | An open inquiry |
| `observation` | (minimal, no extra fields) | A bare thought |
| `connection` | bridges[] | A cross-domain link |
| `structure_note` | entries[] | An index entry (replaces Programme) |

**Key v0.2 principles**:
- Role is a soft hint, not rigid classification. A Note can have both `evidence` (claim) and `sees` (frame) simultaneously.
- Links are the only structure: `supports[]`, `contradicts[]`, `refines[]`, `related[]`. No categories, no containers.
- Notes grow over time: new evidence strengthens them, new sources enrich them, qualifiers update.
- The agent is a "thinker" not just an "extractor" — it discovers relationships to existing knowledge.

**Migration from v0.1**: Claim -> Note (role: claim), Frame -> Note (role: frame), Question -> Note (role: question), Programme -> Note (role: structure_note). See `zettelkasten-redesign.md` section 9 for details.

### 4.2 Methodological spines (multiple traditions)

lens's design is a synthesis of multiple academic traditions:

1. **Luhmann Zettelkasten**: Cards independent, no categories, links as primary structure, index sparse and post-hoc
2. **Reif + Miller Hierarchical Knowledge Organization**: scope (big_picture/detail) + 9 knowledge structure types
3. **Toulmin Argumentation**: evidence + qualifier + voice as optional fields on Note
4. **Karpathy LLM Wiki**: Compile at ingest time, not at query time
5. **Li Jigang**: Cognitive operations (anatomy/rank/roundtable/drill) as `lens run` commands (v0.3)

See `methodology.md` for details.

### 4.3 Compilation lifecycle (v0.2)

In v0.2, the Compilation Agent is a **thinker**, not just an extractor. When ingesting a new source, it:

1. Reads the source document
2. Explores existing knowledge (`lens search`, `lens list`, `lens links`)
3. For each key idea:
   - Searches for similar existing Notes
   - If found: decides whether to **UPDATE** (add evidence, strengthen, enrich) or **CREATE** (contradiction, new angle)
   - If not found: **CREATE** new Note
4. Discovers cross-domain connections and creates Connection notes
5. Does NOT create structure notes (those are post-hoc, user-initiated)

The number of new Notes is a RESULT of what's genuinely new. An article about a well-covered topic might create 1 new Note but UPDATE 5 existing ones. See `zettelkasten-redesign.md` sections 5.2-5.4 for details.

### 4.4 Two categories of Sources

**Immutable** (one-time, fixed content):
- web_article / markdown / plain_text / manual_note — **v0.1+ supported**
- pdf_paper — **v0.3** (depends on Marker Python installation)

**Growing** (living, may continue to grow) — **v0.3+**:
- chat_conversation (ChatGPT / Claude.ai / Claude Code session)
- Has 3 special fields: `external_id`, `growth_state`, `content_fingerprint`
- Incrementally updated via auto-check mechanism

See `source-pipeline.md` for details.

### 4.5 Key design principles (11 total)

8 design principles + 3 UX principles. The 3 most important UX principles:

9. **Zero required ceremony**: Users don't have to remember to "run maintenance commands"
10. **Complexity stays inside**: Technical details are not exposed to users
11. **Graceful degradation**: When errors occur, degrade gracefully instead of crashing

See `positioning.md` § Working Principles for all 11.

---

## 5. Code organization

### 5.1 Monorepo structure

```
lens/
├── CLAUDE.md             # Project context for agents (source of truth for current state)
├── docs/                 # All design documents (you are here)
├── spike/               # Pre-validation scripts (extraction-spike.ts)
├── skills/              # Agent skill definitions (lens.claude-skill.md)
├── packages/
│   └── lens-core/       # Bun-compiled TS CLI (core engine + all business logic)
│       └── src/
│           ├── main.ts           # CLI entry point
│           ├── cli/              # Command handlers (commands.ts, ingest.ts, digest.ts, feed.ts, etc.)
│           ├── core/             # Storage + types (types.ts, storage.ts, paths.ts)
│           ├── agent/            # Compilation Agent (compilation-agent.ts, process-output.ts)
│           ├── sources/          # Content extraction (web.ts, file.ts)
│           └── feeds/            # RSS (feed-store.ts, feed-checker.ts)
├── dist/lens             # Compiled binary (63MB)
└── scripts/
```

**Key points**:
- **Only `lens-core` exists** — all business logic lives here
- lens-core compiles to a standalone CLI binary via `bun build --compile`

### 5.2 Current architecture (v0.2 — CLI only)

```
lens-core (single Bun-compiled binary, 63MB)
├── CLI entry point (src/main.ts)
├── Compilation Agent (pi-agent-core + pi-ai)
│   Reads source → explores existing knowledge → creates/updates Notes + links
├── Storage (File-as-Truth + SQLite derived cache)
│   Markdown files = truth, bun:sqlite FTS5 = search cache
│   3 directories: notes/ sources/ threads/
├── RSS feeds (feedsmith, OPML import, autodiscovery)
└── Web extraction (Defuddle + Turndown → markdown)
```

### 5.3 Key file locations (quick reference)

If you want to do X, where to start reading:

| Task | Start here | Then read |
|---|---|---|
| Add a new source type | `packages/lens-core/src/sources/` | `source-pipeline.md` |
| Modify the Note schema | `packages/lens-core/src/core/types.ts` | `schema.md` |
| Modify the Compilation Agent | `packages/lens-core/src/agent/` | `zettelkasten-redesign.md` |
| Add a CLI command | `packages/lens-core/src/cli/` | existing commands (e.g. `digest.ts`, `feed.ts`) |
| Modify RSS feed handling | `packages/lens-core/src/feeds/` | `feed-store.ts`, `feed-checker.ts` |
| Modify web extraction | `packages/lens-core/src/sources/web.ts` | Defuddle + Turndown docs |
| Modify SQLite cache schema | `packages/lens-core/src/core/storage.ts` | `schema.md` |
| Modify file storage format | `packages/lens-core/src/core/storage.ts` | `schema.md` |

---

## 6. Environment setup

### 6.1 Prerequisites

**Required**:

- **Bun** 1.1+ (runtime + compiler)
- **pnpm** 9+ (monorepo workspace manager)
- **Anthropic API key** (configured via `lens init` or `~/.lens/config.yaml`)

### 6.2 Clone + Install

```bash
git clone https://github.com/relixiaobo/lens.git
cd lens
pnpm install
```

### 6.3 Configuration

Run `lens init` to create `~/.lens/config.yaml`, or create it manually:

```yaml
providers:
  llm:
    default: anthropic
    anthropic:
      api_key: sk-ant-***
      model: claude-sonnet-4-6
```

### 6.4 Running Dev Mode

```bash
# Run lens-core CLI in dev mode (no compilation needed)
bun run packages/lens-core/src/main.ts <command>

# Examples:
bun run packages/lens-core/src/main.ts init
bun run packages/lens-core/src/main.ts ingest https://example.com
bun run packages/lens-core/src/main.ts search "hopfield"
bun run packages/lens-core/src/main.ts digest
bun run packages/lens-core/src/main.ts feed list
```

### 6.5 Common commands

```bash
# Development
pnpm install                                                    # Install dependencies
bun run packages/lens-core/src/main.ts <cmd>                   # Run CLI in dev mode
npx tsc --noEmit --project packages/lens-core/tsconfig.json    # Type check

# Build
bun build --compile packages/lens-core/src/main.ts --outfile dist/lens  # Compile to binary (63MB)

# Using the compiled binary
./dist/lens ingest <url>                        # Ingest a web article
./dist/lens feed check                          # Check all RSS feeds
./dist/lens digest                              # Today's new insights
./dist/lens list notes --role structure_note    # List structure notes (replaces programme list)
./dist/lens list notes --role claim             # List claim notes
./dist/lens context "<query>"                   # Agent-ready context pack
./dist/lens show <id>                           # View any object
./dist/lens links <id>                          # Show relationships for a note
./dist/lens status                              # System status
./dist/lens lint                                # Health check: orphans, missing links
```

---

## 7. Pre-coding checklist

Before you start modifying code, **here is a checklist meant to be followed**:

### 7.1 Understand the scope

- [ ] Which package am I modifying? `lens-core` (only package)
- [ ] Which phase does my change belong to? v0.2 (current) / v0.3 / v1.0 (check `roadmap.md`)
- [ ] If it's not in the current phase, confirm with the maintainer
- [ ] Does my change involve the schema? If so, modify `schema.md` first

### 7.2 Reading order

If you're modifying:

- **Source extractor** -> Read `source-pipeline.md` + look at existing extractors in `packages/lens-core/src/sources/`
- **Compilation Agent** -> Read `zettelkasten-redesign.md` sections 5.1-5.5 + `packages/lens-core/src/agent/`
- **Note schema** -> Read `schema.md` + `zettelkasten-redesign.md` section 2.2 + `packages/lens-core/src/core/types.ts`
- **RSS feeds** -> Look at `packages/lens-core/src/feeds/` (feed-store.ts, feed-checker.ts)

### 7.3 Decision checks

- [ ] Does my change comply with the 11 design + UX principles? (see `positioning.md`)
- [ ] Does my change violate "never lose data"?
- [ ] Does my change introduce a new "action the user must remember"? If so, redesign
- [ ] Does my change expose technical details to the user? If so, redesign

### 7.4 Implementation

- [ ] Write unit tests
- [ ] Local `npx tsc --noEmit --project packages/lens-core/tsconfig.json` passes with zero errors
- [ ] Manual dogfood (real data, not mock)
- [ ] Update related documentation

### 7.5 Submission

- [ ] Change involves schema -> update `schema.md` accordingly
- [ ] Change involves architecture -> update `architecture.md` accordingly
- [ ] Change involves user flow -> update `positioning.md` or `source-pipeline.md` accordingly
- [ ] Commit message briefly references the task and design rationale

---

## 8. Common confusions Q&A

### Q1: Where did Programme go?

**A**: Programme was removed in v0.2. Its functions are now handled by **structure notes** — Notes with `role: structure_note` and an `entries[]` field pointing to entry-point Notes. Use `lens list notes --role structure_note` instead of `lens programme list`. See `zettelkasten-redesign.md` section 8.

### Q2: Why only 3 types instead of 6?

**A**: The v0.2 Zettelkasten-native redesign unified Claim, Frame, Question, and Programme into a single **Note** type with optional fields. Role is a soft hint, not a rigid classification. This means a Note can have both claim fields (evidence) and frame fields (sees/ignores) simultaneously. Structure emerges from links, not from type categories.

### Q3: Why not use a file watcher (chokidar) to monitor Claude Code sessions?

**A**: fsevents is unreliable on iCloud / cross-mount points + daemon processes are complex + 5-minute staleness is sufficient for UX. Switched to **auto-check on CLI invocation** pattern instead. See `source-pipeline.md` section 1.

### Q4: A ChatGPT export is a zip containing 143 conversations — how do we store them?

**A**: **One Source per conversation**, `external_id = "chatgpt:conversation:{uuid}"`. On the next import, use `external_id` for dedup + incremental merge. See `source-pipeline.md` section 2.5.

### Q5: How do I modify LLM prompts? How do I test after modifying them?

**A**: Prompts are in `packages/lens-core/src/core/llm/prompts/`. Each prompt file corresponds to one step of the compilation lifecycle. After modifying a prompt, run fixture-based regression tests (`tests/fixtures/` has real paper / conversation samples). **Don't commit prompt changes without running tests**.

### Q6: How do I add a new CLI command?

**A**:
1. Check `positioning.md` command list to confirm the command name follows naming conventions
2. Add a new file in `packages/lens-core/src/cli/` (e.g. `digest.ts`, `feed.ts`)
3. Register it in `packages/lens-core/src/cli/commands.ts`
4. Add tests
5. Update the command list in `CLAUDE.md` and relevant docs

### Q7: I found existing code that's inconsistent with the documentation — what do I do?

**A**: **Stop, raise it**. Don't assume which one is correct. If it's a small typo you can fix it directly, but if it's a semantic conflict you **must discuss with the maintainer** — it could be outdated docs, or it could be incorrect code.

### Q8: Can I modify schema.md?

**A**: Yes, but **be cautious**. schema.md is the source of truth for the code; modifying it may require migration. Process:
1. First write a design note explaining why
2. Modify `schema.md`
3. Modify the implementation
4. If existing data is affected, write a migration
5. Run the full test suite

---

## 9. Current project status (2026-04-09)

**Phase**: v0.2 COMPLETE — Zettelkasten-native redesign implemented

**v0.1 completed** (6 commits, TypeScript zero errors):
- All design docs (positioning / methodology / schema / source-pipeline / architecture / roadmap)
- Extraction quality spike validated
- Full CLI implementation with 6 types (Source, Claim, Frame, Question, Programme, Thread)
- Compilation Agent (pi-agent-core + pi-ai with Claude Sonnet 4.6)
- File-as-Truth storage + bun:sqlite FTS5 derived cache
- Web extraction (Defuddle + Turndown)
- RSS feed pipeline (feedsmith + OPML import + autodiscovery)
- Digest command (temporal views: day/week/month/year)
- Scope-based hierarchy (big_picture/detail) on Claims
- Bun-compiled single binary (63MB)
- All commands support `--json` for agent consumption

**v0.2 completed** (Zettelkasten-native redesign):
- Unified type system: 3 types (Source, Note, Thread) replacing 6
- Note as universal knowledge card with optional cognitive fields
- Role as soft hint (claim / frame / question / observation / connection / structure_note)
- Links as only structure (supports / contradicts / refines / related)
- Programme replaced by structure notes (Notes with role: structure_note)
- Agent redesigned as "thinker" — discovers relationships, updates existing Notes
- Storage simplified: `notes/` `sources/` `threads/` (3 directories)
- ID prefixes simplified: `note_` `src_` `thr_` (3 prefixes)
- CLI updated: `lens list notes --role <role>`, `lens links <id>`, `lens lint`
- No `programme` command — replaced by `lens list notes --role structure_note`

**Tech stack (as built)**:

| Technology | Purpose |
|---|---|
| **Bun** | Runtime + compile to single binary (`bun build --compile`) |
| **bun:sqlite** | Built-in SQLite binding. FTS5 search + links table. Derived cache. |
| **pi-ai** | Unified LLM API (20+ providers). Uses Anthropic Claude Sonnet 4.6. |
| **pi-agent-core** | Agent runtime. Each ingest spawns a Compilation Agent. |
| **Defuddle + linkedom** | Web article extraction (clean HTML) |
| **Turndown** | HTML to Markdown conversion |
| **feedsmith** | RSS/Atom/RDF/JSON Feed parsing + OPML import |
| **gray-matter** | YAML frontmatter parsing for markdown files |
| **ulid** | Time-sortable unique ID generation |
| **zod** | Runtime schema validation |
| **pnpm** | Monorepo workspace manager |

**Next steps (v0.3)**:
1. Li Jigang cognitive operations (`lens run <id> anatomy/rank/roundtable/drill`)
2. Browser extension (Chrome / Firefox)
3. MCP server (thin wrapper around CLI)
4. Audio/Image source types

---

## 10. What you should do next

### If you're working on a specific development task

1. Find which phase your task is in within `roadmap.md`
2. Read `zettelkasten-redesign.md` for the v0.2 model
3. Look at existing code in the corresponding package
4. Follow the checklist in section 7 and get started

### If you're doing a system review

1. Finish reading `README.md` + `positioning.md` + this document
2. Read `zettelkasten-redesign.md` (v0.2 design) + `schema.md` (data)
3. Read `architecture.md` (technical) + `source-pipeline.md` (ingest)
4. Scan `roadmap.md` to confirm scope

### If you're taking over the entire project

Read all the documents listed under "review," then:

5. Read `references.md` to understand design origins
6. Read `launch-post-draft.md` to understand the story intended for users
7. Discuss open questions with the previous maintainer (each document has them at the end)

---

## 11. Reference document quick lookup table

| I want to know... | Read this |
|---|---|
| What lens is | [`positioning.md`](./positioning.md) |
| The v0.2 Zettelkasten-native model | [`zettelkasten-redesign.md`](./zettelkasten-redesign.md) |
| Why it's designed this way | [`methodology.md`](./methodology.md) |
| What the data looks like | [`schema.md`](./schema.md) |
| How to ingest a source | [`source-pipeline.md`](./source-pipeline.md) |
| What tech stack is used | [`architecture.md`](./architecture.md) |
| What to do next | [`roadmap.md`](./roadmap.md) |
| Theoretical basis | [`references.md`](./references.md) |
| How to get started | **This document** |

**Welcome aboard.** If you find anything unclear or outdated in this document, **fix it directly** — this document will evolve with the project.
