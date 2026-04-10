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
| **Excerpt** | A passage extracted from a Source | ✅ | `excerpts/exc_XXX.md` |
| **Claim** | A falsifiable assertion (Toulmin structure) | ✅ | `claims/clm_XXX.md` |
| **Frame** | A "lens for viewing the world" | ✅ | `frames/frm_XXX.md` |
| **Question** | An open inquiry question (tree-structured) | ✅ | `questions/q_XXX.md` |
| **Anomaly** | Contradiction / counterexample | 📋 v0.2 | `anomalies/anm_XXX.md` |
| **ConceptAnatomy** | 8-layer concept dissection | 📋 v0.2 | `concept_anatomies/ca_XXX.md` |

### 4.2 Methodological spines (5 traditions)

lens's design isn't arbitrary — it's a synthesis of 5 academic traditions:

1. **Lakatos Research Programmes**: Programme = Hard Core + Protective Belt + Open Questions + Anomalies
2. **Reif + Miller Hierarchical Knowledge Organization**: 5 elaboration dimensions + 9 knowledge structure types
3. **Popper Falsification Cycle**: P1 → TT → EE → P2 (problems are replaced by deeper problems)
4. **Toulmin Argumentation**: Claim = Statement + Evidence + Warrant + Qualifier + Rebuttal
5. **Bayesian**: confidence is a 0-1 numeric value with update history

**These 5 weren't picked randomly** — each is responsible for a different scale. See `methodology.md` for details.

### 4.3 Compilation lifecycle

In v0.1, compilation is performed by a **Compilation Agent** — a short-lived agent (powered by pi-agent-core) that is spawned for each document ingest. The agent autonomously reads the source, explores existing knowledge in the vault, and extracts structured objects. It uses pi's built-in tools (read, grep, ls, bash) — no custom tools. The agent outputs structured JSON; lens-core then processes the output (ULID generation, schema validation, file writing, cache update).

The following steps describe the conceptual phases of compilation. They are not a rigid sequential pipeline; instead, they happen as part of the agent's autonomous exploration:

```
Step 0:  Source creation                                    ✅ v0.1
Step 1:  Excerpt segmentation                              ✅ v0.1
Step 2:  Programme attribution                             ✅ v0.1
Step 3:  Claim extraction (Toulmin core fields)            ✅ v0.1
Step 4:  Frame extraction                                  ✅ v0.1
Step 5:  Question extraction                               ✅ v0.1
Step 6:  Knowledge structure type identification (Miller 9 types) 📋 depends on spike results
Step 7:  Elaboration positioning (Reif 5 dimensions)       📋 depends on spike results
Step 8:  Dedup + Orphan auto-recovery                      📋 v0.2
Step 9:  Conflict detection (Anomaly)                      📋 v0.2
Step 10: Bayesian update                                   📋 v0.2
Step 11: Boundary detection                                📋 v0.2
Step 12: Programme health check                            📋 v0.2
```

**Note**: Whether Step 6-7 (Miller structure_type / Reif elaboration) will be implemented in v0.1 depends on the test results from `spike/extraction-spike.ts`. If the LLM classification consistency is insufficient, these fields will be downgraded to optional or deferred to v0.2.

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
├── docs/                 # All design documents (you are here)
├── spike/               # Pre-validation scripts (extraction-spike.ts)
├── skills/              # Agent skill definitions (lens.claude-skill.md)
├── packages/
│   ├── lens-core/       # Bun-compiled TS sidecar (core engine + CLI)
│   ├── lens-ui/         # React 19 + Tauri frontend
│   └── lens-tauri/      # Rust shell (thin IPC layer)
├── tests/
└── scripts/
```

**Key points**:
- **`lens-core`** carries 90% of the business logic (Compilation Agent / extractors / LLM calls)
- **`lens-ui`** carries the UI views
- **`lens-tauri`** writes minimal Rust (only IPC glue)

### 5.2 Dependencies between the three packages

```
lens-ui  ─┐
          ├─→ (IPC via Tauri) ─→ lens-tauri ─→ (sidecar spawn) ─→ lens-core
lens-ui  ─┘
           └─ (can also call lens-core's mock interface directly for UI-only dev)

lens-core runs independently:
  - As a CLI binary: `lens ingest <url>`
  - As a sidecar subprocess: lens-tauri launches it
```

**Key design**: lens-core **does not depend on** Tauri. It is an **independently publishable CLI tool**.

### 5.3 Key file locations (quick reference)

If you want to do X, where to start reading:

| Task | Start here | Then read |
|---|---|---|
| Add a new source type | `packages/lens-core/src/sources/` | `source-pipeline.md` |
| Modify the Claim schema | `packages/lens-core/src/core/types.ts` | `schema.md` |
| Modify the Compilation Agent | `packages/lens-core/src/core/compiler/` | `methodology.md` |
| Add a CLI command | `packages/lens-core/src/cli/commands/` | existing commands |
| Add a React view | `packages/lens-ui/src/views/` | `architecture.md` § UI |
| Modify IPC interfaces | `packages/lens-tauri/src/commands.rs` | Tauri docs |
| Modify LLM prompts | `packages/lens-core/src/core/llm/` | `methodology.md` |
| Modify LLM provider | `packages/lens-core/src/core/llm/` | `architecture.md` §1.9 (pi-ai) |
| Modify SQLite cache schema | `packages/lens-core/src/core/storage.ts` | `schema.md` |
| Modify file storage format | `packages/lens-core/src/core/storage.ts` | `schema.md` §0.4-0.5 |

---

## 6. Environment setup

### 6.1 Prerequisites

**Required**:

- **Node.js** 20+ (or Bun 1.1+)
- **pnpm** 9+
- **Rust** 1.77+ (rustup recommended)
- **Anthropic API key** (`ANTHROPIC_API_KEY` environment variable)

**Only needed for v0.2**:
- Python 3.11+ + `pip install marker-pdf` (PDF extraction, v0.2)

**macOS specific**:
- **Xcode Command Line Tools** (`xcode-select --install`)

**Linux specific**:
- Tauri requires some system libs: `libwebkit2gtk-4.1-dev libssl-dev ...` (see [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/))

### 6.2 Clone + Install

```bash
git clone https://github.com/relixiaobo/lens.git
cd lens
pnpm install
```

### 6.3 Environment variables

Create `~/.lens/config.yaml` (or `lens init` will create it):

```yaml
providers:
  llm:
    default: anthropic
    anthropic:
      api_key: sk-ant-***
      model: claude-sonnet-4-6
  
  embedding:
    default: voyage
    voyage:
      api_key: pa-***
      model: voyage-3-large

auto_check:
  enabled: true
  staleness_threshold: "5m"
  sources:
    claude_code: true

sources:
  snapshot_retention:
    keep_first: true
    keep_recent: 30
```

### 6.4 Running Dev Mode

```bash
# Start full Tauri dev environment (Rust + React HMR + sidecar watch)
pnpm dev

# Run lens-core CLI only (without starting GUI)
cd packages/lens-core
pnpm dev  # TypeScript watch mode
./dist/lens ingest https://example.com  # Run

# Run lens-ui only (mock data mode)
cd packages/lens-ui
pnpm dev  # Vite dev server on localhost:5199
```

### 6.5 Common commands

```bash
# Development
pnpm dev                  # Start full Tauri dev environment
pnpm typecheck           # Typecheck all packages
pnpm test                # Run all tests
pnpm lint                # ESLint + Biome

# Build
pnpm build:sidecar       # Compile lens-core to binary
pnpm build:ui            # Compile React frontend
pnpm build:app           # Compile Tauri app (macOS DMG)

# Data debugging
lens show <id>           # View any object
lens status              # View status
```

---

## 7. Pre-coding checklist

Before you start modifying code, **here is a checklist meant to be followed**:

### 7.1 Understand the scope

- [ ] Which package am I modifying? `lens-core` / `lens-ui` / `lens-tauri`
- [ ] Which phase does my change belong to? v0.1 / v0.2 / v0.3 (check `roadmap.md`)
- [ ] If it's not in the current phase, confirm with the maintainer
- [ ] Does my change involve the schema? If so, modify `schema.md` first

### 7.2 Reading order

If you're modifying:

- **Source extractor** → Read `source-pipeline.md` + look at existing extractors in `packages/lens-core/src/sources/`
- **Compilation Agent** → Read `methodology.md` § Compilation Lifecycle + look at `packages/lens-core/src/core/compiler/`
- **Claim / Frame schema** → Read `schema.md` § 2.3 and § 2.4 + `packages/lens-core/src/core/types.ts`
- **UI views** → Read `architecture.md` § 2.5 + neighboring views in `packages/lens-ui/src/views/`
- **IPC** → Read `architecture.md` § 2.2 + Tauri docs

### 7.3 Decision checks

- [ ] Does my change comply with the 11 design + UX principles? (see `positioning.md`)
- [ ] Does my change violate "never lose data"?
- [ ] Does my change introduce a new "action the user must remember"? If so, redesign
- [ ] Does my change expose technical details to the user? If so, redesign

### 7.4 Implementation

- [ ] Write unit tests
- [ ] Local `pnpm typecheck` + `pnpm test` all pass
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

### Q4: Why build a client in v0.1? Can't we get CLI working first and then do the UI?

**A**: Users need to be able to "see" what's inside lens. A lens without UI is "writing into a black hole." This violates UX Principle 2 (complexity stays inside). See `architecture.md` § 0.1.

### Q5: A ChatGPT export is a zip containing 143 conversations — how do we store them?

**A**: **One Source per conversation**, `external_id = "chatgpt:conversation:{uuid}"`. On the next import, use `external_id` for dedup + incremental merge. See `source-pipeline.md` § 2.5.

### Q6: A Claim is supported by a certain turn in a ChatGPT conversation, and the user later edits that turn — what happens to the Claim?

**A**: **replace_if_diverged + orphan auto-recovery**: The old version is kept as a history snapshot; the new version is recompiled; if all evidence for the old claim disappears, its status changes to `orphaned`; the dedup pipeline attempts auto-recovery (merging the orphan's history into the new claim). See `source-pipeline.md` § 3.3 and § 3.4.

### Q7: How do I modify LLM prompts? How do I test after modifying them?

**A**: Prompts are in `packages/lens-core/src/core/llm/prompts/`. Each prompt file corresponds to one step of the compilation lifecycle. After modifying a prompt, run fixture-based regression tests (`tests/fixtures/` has real paper / conversation samples). **Don't commit prompt changes without running tests**.

### Q8: How do I add a new CLI command?

**A**:
1. Check `positioning.md` § V0 Command List to confirm the command name follows naming conventions
2. Add a new file in `packages/lens-core/src/cli/commands/`
3. Register it in `packages/lens-core/src/cli/main.ts`
4. Add tests
5. Update the command list in `positioning.md`

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

**Phase**: Design docs review complete + preparing to begin v0.1 implementation

**Completed**:
- ✅ All design docs (positioning / methodology / schema / source-pipeline / architecture / roadmap)
- ✅ References (~120 cited sources)
- ✅ Tech stack decision (Tauri 2 + React 19 + pi-ai + pi-agent-core + SQLite + Bun sidecar)
- ✅ Documentation review: fixed contradictions, reduced v0.1 scope, added privacy statement, added schema validation plan
- ✅ Compilation Agent architecture: compilation uses a short-lived agent (pi-agent-core) per document instead of a fixed step pipeline

**v0.1 scope redefined** (after 2026-04-09 review):
- v0.1 scope reduced from 7 phases / 30+ tasks to **4 phases / ~18 tasks**
- Removed features (chat growing source / Bayesian / conflict detection / PDF / auto-check) moved to v0.2
- Added **Phase 0: LLM Extraction Quality Spike** to validate extraction quality before writing production code
- Added **LLM extraction quality exit criteria**

**Next steps**:
1. Run `spike/extraction-spike.ts` to validate LLM extraction quality
2. Adjust schema based on spike results (which fields to keep/downgrade/remove)
3. Proceed according to the Phase 1-4 task list in `roadmap.md` § v0.1

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
