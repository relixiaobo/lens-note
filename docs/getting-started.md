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

**Compile** the content you read, discuss, and think about into structured cognitive objects (Claim / Frame / Question / Programme), so that **both humans and AI agents can continue reasoning based on this compiled understanding**.

**One-line comparison**:

- **Obsidian / Logseq**: Let you **manually** organize your notes
- **Mem0 / Letta**: Provide **automatic but low-quality** memory extraction for AI
- **lens**: Make **high-quality, traceable, typed understanding** the shared substrate for humans and agents

**Core thesis**: **Raw content is not the product. Processed understanding is the product.**

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
4. **`docs/architecture.md`** — Tech stack / component architecture / process model (20 min)
5. **`docs/schema.md`** — Precise schema for data types, **source of truth for the code** (30 min)

### Reference (consult as needed)

- **`docs/methodology.md`** — 5 methodological spines (Lakatos / Reif+Miller / Popper / Toulmin / Bayes) + 12-step compilation lifecycle. **Theoretical background, must-read before modifying any compile step**
- **`docs/source-pipeline.md`** — Acquisition / extraction / incremental update mechanisms for each source type (web/PDF/chat). **Must-read before working on ingest-related tasks**
- **`docs/roadmap.md`** — Phased plan from v0.1 to v1.0. **Check which phase a feature belongs to before working on it**
- **`docs/references.md`** — ~120 cited sources. **Consult when someone questions a design decision**

### Context (deep background)

- **`docs/launch-post-draft.md`** — Product launch copy draft, shows the "why" that lens wants to convey to users

### Priority between documents

If there are **conflicts** between documents, the following order determines which one wins:

```
schema.md 	wins 	methodology.md    # schema is executable constraint, methodology is conceptual
architecture.md wins 	roadmap.md       # architecture determines tech stack
positioning.md 	wins 	everything        # positioning is source of truth
```

If you find a conflict: **stop, raise it**, don't make assumptions on your own.

---

## 4. Core concepts cheat sheet

### 4.1 Core types

lens organizes everything around the following core types (v0.1 supported marked ✅, v0.2 marked 📋):

| Type | What it is | v0.1? | File path |
|---|---|---|---|
| **Programme** | Research programme / a complete unit of exploration | ✅ | `programmes/pgm_XXX.md` |
| **Source** | Raw material (article/markdown/note) | ✅ | `sources/src_XXX.md` |
| **Claim** | A falsifiable assertion (Toulmin structure, evidence inline) | ✅ | `claims/clm_XXX.md` |
| **Frame** | A "lens for viewing the world" | ✅ | `frames/frm_XXX.md` |
| **Question** | An open inquiry question | ✅ | `questions/q_XXX.md` |
| **Thread** | A conversational thread with references | ✅ | `threads/thr_XXX.md` |
| **Anomaly** | Contradiction / counterexample | 📋 v0.2 | `anomalies/anm_XXX.md` |
| **ConceptAnatomy** | 8-layer concept dissection | 📋 v0.2 | `concept_anatomies/ca_XXX.md` |

**Note**: Excerpt was removed as a separate type in v0.1 — evidence is stored **inline** in Claims. The Source file retains the full original text.

### 4.2 Methodological spines (5 traditions)

lens's design isn't arbitrary — it's a synthesis of 5 academic traditions:

1. **Lakatos Research Programmes**: Programme = Hard Core + Protective Belt + Open Questions + Anomalies
2. **Reif + Miller Hierarchical Knowledge Organization**: 5 elaboration dimensions + 9 knowledge structure types
3. **Popper Falsification Cycle**: P1 → TT → EE → P2 (problems are replaced by deeper problems)
4. **Toulmin Argumentation**: Claim = Statement + Evidence + Warrant + Qualifier + Rebuttal
5. **Bayesian**: confidence is a 0-1 numeric value with update history

**These 5 weren't picked randomly** — each is responsible for a different scale. See `methodology.md` for details.

### 4.3 Compilation lifecycle

In v0.1, compilation is performed by a **Compilation Agent** — a short-lived agent (powered by pi-agent-core + pi-ai with Claude Sonnet 4.6) that is spawned for each document ingest. The agent autonomously reads the source, explores existing knowledge in the vault, and extracts structured objects. It uses pi's built-in tools (read, grep, ls, bash) — no custom tools. The agent outputs structured JSON; lens-core then processes the output (ULID generation, zod schema validation, markdown file writing, SQLite cache update).

The following steps describe the conceptual phases of compilation. They are not a rigid sequential pipeline; instead, they happen as part of the agent's autonomous exploration:

```
Step 0:  Source creation                                    ✅ v0.1 COMPLETE
Step 1:  Evidence extraction (inline in Claims)            ✅ v0.1 COMPLETE
Step 2:  Programme attribution                             ✅ v0.1 COMPLETE
Step 3:  Claim extraction (Toulmin core + scope)           ✅ v0.1 COMPLETE
Step 4:  Frame extraction                                  ✅ v0.1 COMPLETE
Step 5:  Question extraction                               ✅ v0.1 COMPLETE
Step 6:  Knowledge structure type identification (Miller)  📋 v0.2 (optional in v0.1 schema)
Step 7:  Elaboration positioning (Reif 5 dimensions)       📋 v0.2 (optional in v0.1 schema)
Step 8:  Dedup + Orphan auto-recovery                      📋 v0.2
Step 9:  Conflict detection (Anomaly)                      📋 v0.2
Step 10: Bayesian update                                   📋 v0.2
Step 11: Boundary detection                                📋 v0.2
Step 12: Programme health check                            📋 v0.2
```

**v0.1 result**: Steps 0-5 are fully implemented and tested. The `scope` field (`big_picture` / `detail`) was added to Claims based on Reif/Miller + Minto Pyramid research, driving 2-level Programme display. Miller structure_type and Reif elaboration dimensions are optional fields in the schema, deferred to v0.2 for full implementation.

See `methodology.md` § Compilation Lifecycle for details.

### 4.4 Two categories of Sources

**Immutable** (one-time, fixed content):
- web_article / markdown / plain_text / manual_note — **v0.1 supported**
- pdf_paper — **v0.2** (depends on Marker Python installation)

**Growing** (living, may continue to grow) — **all v0.2**:
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
- **Only `lens-core` exists** in v0.1 — all business logic lives here
- **`lens-ui`** (React 19 + Tauri frontend) and **`lens-tauri`** (Rust IPC shell) are planned for v0.2
- lens-core compiles to a standalone CLI binary via `bun build --compile`

### 5.2 Current architecture (v0.1 — CLI only)

```
lens-core (single Bun-compiled binary, 63MB)
├── CLI entry point (src/main.ts)
├── Compilation Agent (pi-agent-core + pi-ai)
│   Reads source → explores existing knowledge → extracts Claims/Frames/Questions
├── Storage (File-as-Truth + SQLite derived cache)
│   Markdown files = truth, bun:sqlite FTS5 = search cache
├── RSS feeds (feedsmith, OPML import, autodiscovery)
└── Web extraction (Defuddle + Turndown → markdown)
```

**Key design**: lens-core is an **independently usable CLI tool**. GUI (Tauri + React) planned for v0.2.

### 5.3 Key file locations (quick reference)

If you want to do X, where to start reading:

| Task | Start here | Then read |
|---|---|---|
| Add a new source type | `packages/lens-core/src/sources/` | `source-pipeline.md` |
| Modify the Claim schema | `packages/lens-core/src/core/types.ts` | `schema.md` |
| Modify the Compilation Agent | `packages/lens-core/src/agent/` | `methodology.md` |
| Add a CLI command | `packages/lens-core/src/cli/` | existing commands (e.g. `digest.ts`, `feed.ts`) |
| Modify RSS feed handling | `packages/lens-core/src/feeds/` | `feed-store.ts`, `feed-checker.ts` |
| Modify web extraction | `packages/lens-core/src/sources/web.ts` | Defuddle + Turndown docs |
| Modify SQLite cache schema | `packages/lens-core/src/core/storage.ts` | `schema.md` |
| Modify file storage format | `packages/lens-core/src/core/storage.ts` | `schema.md` §0.4-0.5 |
| Add a React view (v0.2) | `packages/lens-ui/src/views/` (not yet created) | `architecture.md` § UI |
| Modify IPC interfaces (v0.2) | `packages/lens-tauri/src/commands.rs` (not yet created) | Tauri docs |

---

## 6. Environment setup

### 6.1 Prerequisites

**Required**:

- **Bun** 1.1+ (runtime + compiler)
- **pnpm** 9+ (monorepo workspace manager)
- **Anthropic API key** (configured via `lens init` or `~/.lens/config.yaml`)

**Only needed for v0.2**:
- **Node.js** 20+ (if not using Bun)
- **Rust** 1.77+ (for Tauri GUI, v0.2)
- Python 3.11+ + `pip install marker-pdf` (PDF extraction, v0.2)
- Xcode Command Line Tools (macOS, for Tauri v0.2)

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

**v0.1 only requires the Anthropic API key**. Embedding (Voyage AI), auto-check, and snapshot retention settings are v0.2 features.

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
./dist/lens ingest <url>         # Ingest a web article
./dist/lens feed check           # Check all RSS feeds
./dist/lens digest               # Today's new insights
./dist/lens programme list       # List all Programmes
./dist/lens context "<query>"    # Agent-ready context pack
./dist/lens show <id>            # View any object
./dist/lens status               # System status
```

---

## 7. Pre-coding checklist

Before you start modifying code, **here is a checklist meant to be followed**:

### 7.1 Understand the scope

- [ ] Which package am I modifying? `lens-core` (only package in v0.1) / `lens-ui` (v0.2) / `lens-tauri` (v0.2)
- [ ] Which phase does my change belong to? v0.1 / v0.2 / v0.3 (check `roadmap.md`)
- [ ] If it's not in the current phase, confirm with the maintainer
- [ ] Does my change involve the schema? If so, modify `schema.md` first

### 7.2 Reading order

If you're modifying:

- **Source extractor** → Read `source-pipeline.md` + look at existing extractors in `packages/lens-core/src/sources/`
- **Compilation Agent** → Read `methodology.md` § Compilation Lifecycle + look at `packages/lens-core/src/agent/`
- **Claim / Frame schema** → Read `schema.md` § 2.3 and § 2.4 + `packages/lens-core/src/core/types.ts`
- **RSS feeds** → Look at `packages/lens-core/src/feeds/` (feed-store.ts, feed-checker.ts)
- **UI views (v0.2)** → Read `architecture.md` § 2.5 + `packages/lens-ui/src/views/` (not yet created)
- **IPC (v0.2)** → Read `architecture.md` § 2.2 + Tauri docs

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

- [ ] Change involves schema → update `schema.md` accordingly
- [ ] Change involves architecture → update `architecture.md` accordingly
- [ ] Change involves user flow → update `positioning.md` or `source-pipeline.md` accordingly
- [ ] Commit message briefly references the task and design rationale

---

## 8. Common confusions Q&A

### Q1: Why not just use Electron?

**A**: Tauri 2 is clearly superior to Electron in **memory, bundle size, startup speed, and security**. See `architecture.md` § 1.1.

### Q2: Why are CLI and GUI the same binary?

**A**: Power users need CLI, regular users need GUI, but maintaining two codebases is 2x the work. Launch `lens` without arguments for GUI, with arguments for CLI; both share the same `lens-core` sidecar. See `architecture.md` § 2.3.

### Q3: Why not use a file watcher (chokidar) to monitor Claude Code sessions?

**A**: fsevents is unreliable on iCloud / cross-mount points + daemon processes are complex + 5-minute staleness is sufficient for UX. Switched to **auto-check on CLI invocation** pattern instead. See `source-pipeline.md` § 1.

### Q4: Why is v0.1 CLI-only? Wasn't a GUI planned?

**A**: The original plan was to build a Tauri GUI in v0.1, but during implementation it became clear that **CLI was sufficient to validate the core hypothesis** (LLM extraction quality). Building the GUI would have delayed validation significantly. The CLI with `--json` output already serves agents, and commands like `lens show`, `lens programme show`, and `lens digest` provide adequate visibility for humans. GUI is planned for v0.2.

### Q5: A ChatGPT export is a zip containing 143 conversations — how do we store them?

**A**: **One Source per conversation**, `external_id = "chatgpt:conversation:{uuid}"`. On the next import, use `external_id` for dedup + incremental merge. See `source-pipeline.md` § 2.5.

### Q6: A Claim is supported by a certain turn in a ChatGPT conversation, and the user later edits that turn — what happens to the Claim?

**A**: **replace_if_diverged + orphan auto-recovery**: The old version is kept as a history snapshot; the new version is recompiled; if all evidence for the old claim disappears, its status changes to `orphaned`; the dedup pipeline attempts auto-recovery (merging the orphan's history into the new claim). See `source-pipeline.md` § 3.3 and § 3.4.

### Q7: How do I modify LLM prompts? How do I test after modifying them?

**A**: Prompts are in `packages/lens-core/src/core/llm/prompts/`. Each prompt file corresponds to one step of the compilation lifecycle. After modifying a prompt, run fixture-based regression tests (`tests/fixtures/` has real paper / conversation samples). **Don't commit prompt changes without running tests**.

### Q8: How do I add a new CLI command?

**A**:
1. Check `positioning.md` § V0 Command List to confirm the command name follows naming conventions
2. Add a new file in `packages/lens-core/src/cli/` (e.g. `digest.ts`, `feed.ts`)
3. Register it in `packages/lens-core/src/cli/commands.ts`
4. Add tests
5. Update the command list in `positioning.md` and `CLAUDE.md`

### Q9: I found existing code that's inconsistent with the documentation — what do I do?

**A**: **Stop, raise it**. Don't assume which one is correct. If it's a small typo you can fix it directly, but if it's a semantic conflict you **must discuss with the maintainer** — it could be outdated docs, or it could be incorrect code.

### Q10: Can I modify schema.md?

**A**: Yes, but **be cautious**. schema.md is the source of truth for the code; modifying it may require migration. Process:
1. First write a design note explaining why
2. Modify `schema.md`
3. Modify the implementation
4. If existing data is affected, write a migration
5. Run the full test suite

---

## 9. Current project status (2026-04-09)

**Phase**: v0.1 COMPLETE — CLI implementation done, preparing for v0.2

**v0.1 completed** (6 commits, TypeScript zero errors):
- ✅ All design docs (positioning / methodology / schema / source-pipeline / architecture / roadmap)
- ✅ Extraction quality spike validated
- ✅ Full CLI implementation: ingest, show, search, context, programme, note, status, rebuild-index
- ✅ Compilation Agent (pi-agent-core + pi-ai with Claude Sonnet 4.6)
- ✅ File-as-Truth storage + bun:sqlite FTS5 derived cache
- ✅ Web extraction (Defuddle + Turndown)
- ✅ RSS feed pipeline (feedsmith + OPML import + autodiscovery)
- ✅ Digest command (temporal views: day/week/month/year)
- ✅ Scope-based hierarchy (big_picture/detail) on Claims
- ✅ Bun-compiled single binary (63MB)
- ✅ All commands support `--json` for agent consumption

**Tech stack (as built)**:

| Technology | Purpose |
|---|---|
| **Bun** | Runtime + compile to single binary (`bun build --compile`) |
| **bun:sqlite** | Built-in SQLite binding. FTS5 search + links table. Derived cache. |
| **pi-ai** | Unified LLM API (20+ providers). v0.1 uses Anthropic Claude Sonnet 4.6. |
| **pi-agent-core** | Agent runtime. Each ingest spawns a Compilation Agent. |
| **Defuddle + linkedom** | Web article extraction (clean HTML) |
| **Turndown** | HTML to Markdown conversion |
| **feedsmith** | RSS/Atom/RDF/JSON Feed parsing + OPML import |
| **gray-matter** | YAML frontmatter parsing for markdown files |
| **ulid** | Time-sortable unique ID generation |
| **zod** | Runtime schema validation |
| **pnpm** | Monorepo workspace manager |

**What changed from the original plan**:
- GUI (Tauri 2 desktop app) deferred to v0.2 — CLI was sufficient to validate the core hypothesis
- Excerpt removed as a separate type — evidence stored inline in Claims
- Thread type added for conversational flows
- RSS feeds, digest, and scope-based hierarchy added as natural extensions of the core loop

**Next steps (v0.2)**:
1. Build Tauri 2 GUI (lens-ui + lens-tauri packages)
2. Add growing source support (chat conversations, auto-check)
3. Add embedding + semantic search
4. Add Knowledge Maps visualization

---

## 10. What you should do next

### If you're working on a specific development task

1. Find which phase your task is in within `roadmap.md`
2. Read the relevant domain doc (schema / source-pipeline / methodology)
3. Look at existing code in the corresponding package
4. Follow the checklist in § 7 and get started

### If you're doing a system review

1. Finish reading `README.md` + `positioning.md` + this document
2. Read `methodology.md` (theory) + `schema.md` (data)
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
| Why it's designed this way | [`methodology.md`](./methodology.md) |
| What the data looks like | [`schema.md`](./schema.md) |
| How to ingest a source | [`source-pipeline.md`](./source-pipeline.md) |
| What tech stack is used | [`architecture.md`](./architecture.md) |
| What to do next | [`roadmap.md`](./roadmap.md) |
| Theoretical basis | [`references.md`](./references.md) |
| How to get started | **This document** |

**Welcome aboard.** If you find anything unclear or outdated in this document, **fix it directly** — this document will evolve with the project.
