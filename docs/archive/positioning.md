# Lens Product Positioning

Date: 2026-04-09

This document is the positioning source of truth for the lens project. All product decisions are referenced against it.

Companion documents:
- [`getting-started.md`](./getting-started.md) — **Onboarding guide for new agents or developers** (required reading)
- [`architecture.md`](./architecture.md) — Tech stack, component architecture, process model
- [`methodology.md`](./methodology.md) — Methodological spine (5 traditions) + compilation lifecycle
- [`schema.md`](./schema.md) — Precise specification of the type system (code's source of truth)
- [`source-pipeline.md`](./source-pipeline.md) — Acquisition / extraction / incremental update mechanisms for each source type
- [`roadmap.md`](./roadmap.md) — Phased implementation plan (v0.1 → v1.0)
- [`references.md`](./references.md) — All referenced theories, research, and products (~120 independent sources)

## One-liner

Lens is an **understanding compiler** — it compiles the raw information that people read, discuss, and think about into structured Notes (universal knowledge cards linked in a Zettelkasten-inspired graph), and enables both humans and agents to reason further based on this understanding.

English version:

> **Structured cognition compiler for humans and agents.**

## What It Is Not

Explicitly opposed positioning (if someone says lens resembles any of the following, the positioning has not been communicated clearly):

- ❌ AI Reader
- ❌ Bookmark Manager
- ❌ Personal RAG
- ❌ Second Brain
- ❌ Knowledge Base
- ❌ Knowledge Graph
- ❌ Note-taking app

The core object in these products is Document / Page / Note — **the original text is the consumption object, and AI is an assistant**. Lens inverts this: **the compiled understanding is the consumption object, and the original text is evidence**.

## Four Fundamental Convictions

### 1. Raw content is not the product; processed understanding is

The value of the original text is reduced to three things:

- **Evidence** — where conclusions come from
- **Audit** — going back to the original text to verify when in doubt
- **Recompile** — re-compiling when the schema or model is upgraded

But the user **does not need to re-read the original text by default**. The default consumption objects are the compiled claims, frames, and questions. This is the fundamental divide between lens and Readwise / Reader / Obsidian / Notion.

### 2. Continuous compilation beats ad-hoc retrieval

```
Traditional RAG:
  query → ad-hoc chunk retrieval → LLM stitching → answer
  (all of this is redone for every query)

Lens:
  raw → continuously compiled into structured objects → maintained → consumed directly at query time
  (compiled once, reused many times, structure evolves continuously)
```

This is the core paradigm of Karpathy's LLM Wiki. RAG pushes the work of "understanding" to query time, redoing it every time. Lens pushes it to ingest time — done once, reused many times.

### 3. The same understanding serves both humans and agents

No need for two separate systems — a "note app for humans" and a "memory layer for agents." Claim / Frame / Question are first-class objects for both humans and LLMs:

- **Humans use them to**: learn, understand, judge, decide, transfer across contexts
- **Agents use them to**: pull context, detect conflicts, reason further, write back new conclusions

The interface (CLI) is also the same; only the output format differs: humans see natural text, agents see `--json`.

### 4. Compiled products must be traceable, auditable, and evolvable

lens does not promise "automatic correctness." What it promises is:

- **Traceable** — every epistemic decision has a history
- **Auditable** — any Claim can be traced back to the original Excerpt
- **Recompilable** — when the schema is upgraded, the entire system can be re-processed
- **Multiple perspectives coexist** — different Frames do not have to be forcibly reconciled
- **Contradictions are not silenced** — discovered contradictions are surfaced to human/agent, not auto-resolved

## V0 Type System

**v0.2 (current — Zettelkasten-native redesign)**: 3 object types — **Source, Note, Thread**. Note is a universal knowledge card with optional fields expressing cognitive roles (claim, frame, question, observation, connection, structure_note). Links are the only structure — no categories, no containers. See [`zettelkasten-redesign.md`](./zettelkasten-redesign.md) for the complete v0.2 design.

**v0.1 (historical)**: 6 object types — Source, Claim, Frame, Question, Programme, Thread. Replaced by v0.2's unified model.

The complete schema, field semantics, and incremental scenario handling for each type are in [`schema.md`](./schema.md). Only brief introductions are given below.

### Source (Provenance)

Where content came from. Not knowledge — provenance. Contains the original text and metadata (title, author, URL, source_type, word_count).

### Note (Universal Knowledge Card)

The single knowledge type. One idea per card. Required fields: `id`, `type`, `text`, `created_at`. Everything else is optional. The optional fields express cognitive roles:

```
Note = text (always present)
     + evidence[] / qualifier / voice     (makes it a claim)
     + sees / ignores / assumptions[]     (makes it a frame)
     + question_status                    (makes it a question)
     + bridges[]                          (makes it a connection)
     + role: structure_note + entries[]   (makes it an index entry)
     + scope: big_picture / detail        (Reif/Miller hierarchy)
     + structure_type                     (Miller knowledge structure)
     + supports[] / contradicts[] / refines[] / related[]  (links)
     + source                             (provenance)
```

**Role** is a soft hint (`claim | frame | question | observation | connection | structure_note`). It tells the display layer how to render, but does NOT constrain the card. A Note can have both `evidence` (claim) and `sees` (frame) simultaneously.

**Structure notes replace Programme**: A Note with `role: structure_note` and `entries[]` serves as an index entry — a sparse, post-hoc navigational aid pointing to entry-point Notes. No container membership, no auto-creation. Suggested by `lens suggest-index` after clusters form.

### Thread (Conversation)

A conversation about Notes. Not knowledge — interaction. Links to Notes via `references[]`. Notes don't know about Threads; backlinks from SQLite cache enable "which Threads discuss this Note?" queries.

### Programme Is Gone (v0.2)

The word "Programme" does not exist in v0.2. What it did is now done by:

| Programme function | v0.2 equivalent |
|---|---|
| Container for Claims | **Gone.** Notes link to each other, no container. |
| Research theme | **Structure note** (a Note with `role: structure_note` + `entries[]`). |
| `lens programme list` | `lens list notes --role structure_note` |
| `lens programme show` | `lens show <note_id>` (for a structure note) |

### ConceptAnatomy (v0.3 — Li Jigang cognitive operations)

From Li Jigang's ljg-learn. Deep concept anatomy triggered on demand via `lens run <id> anatomy`. Planned for v0.3 along with other cognitive operations (rank, roundtable, drill).

## Methodological Spine

The lens type system is not an arbitrary combination; it is a synthesis of **5 traditions from the philosophy of science / cognitive science**:

| Scale | Tradition | Contribution |
|---|---|---|
| Card model | **Luhmann** Zettelkasten | Cards + links, no categories. Structure emerges. Index sparse and post-hoc. |
| Macro structure | **Lakatos** Research Programmes | Hard Core / Protective Belt concepts reinterpreted via qualifier + scope fields |
| Detail hierarchy | **Reif + Miller** Hierarchical Knowledge Org | scope (big_picture/detail) + 9 knowledge structure types |
| Cycle dynamics | **Popper** P1→TT→EE→P2 | Problems are continuously replaced by deeper problems |
| Local structure | **Toulmin** Argumentation Model | evidence + qualifier + voice as optional fields on Note |
| Belief dynamics | **Bayesian** updating | Confidence evolves traceably with evidence |

Full discussion of supplementary traditions (Klein sensemaking, Kuhn paradigms, Strong Inference, Laudan problems-as-units, etc.) is in [`methodology.md`](./methodology.md).

**This is the fundamental difference between lens and all existing memory/KB products** — it is not a tool for organizing knowledge; it is a tool for **conducting ongoing inquiry**.

## Agent Integration: CLI + Skill

The agent integration model for lens is **CLI does the work, Skill tells agents how to install and use it**.

### Why CLI Is the Agent Protocol

1. **CLI is a universal interface** — all mainstream agents (Claude Code / Cursor / Aider / Cline / Continue.dev / pi) can run bash
2. **CLI is stable** — the contract of args / stdout / stderr / exit code has not changed in 50 years
3. **CLI is also a human interface** — `lens context "..."` is both a protocol for agents and a command for yourself
4. **CLI is composable** — `lens search ... | jq` is something agents naturally do

### Skill Handles Agent Discovery and Installation

lens ships with `skills/lens.claude-skill.md`, which users copy into their agent configuration:

- **Claude Code**: `~/.claude/skills/lens.claude-skill.md`
- **Cursor**: Add the content to `.cursor/rules`
- **Other agents**: CLAUDE.md / custom instructions

The Skill tells the agent:
1. How to check if lens is available and where to find the binary
2. What commands are available and what arguments they accept
3. When to use lens ("the user says to check their research")
4. What the output format is

**Agents use lens via CLI** — all commands support `--json` output. The Skill tells agents how to use `lens context`, `lens search`, etc.

### No MCP (v0.3 community can wrap)

MCP is a protocol supported by 5/7 mainstream agents, but CLI already covers 100% of agents. MCP is merely a ~100-line typed wrapper around the CLI. It will be added in v0.3 or when the community demands it.

### V0.2 Command List (Current)

```bash
# Explore
lens list notes [--role claim|frame|question|...] [--scope big_picture] [--since 7d]
lens list sources                              # list all sources
lens list notes --role structure_note          # browse index entries (replaces programme list)
lens show <id>                                 # show any object with full detail
lens search "<query>"                          # FTS5 full-text search
lens links <id>                                # show relationships for a note
lens context "<query>"                         # agent-ready JSON context pack

# Write
lens ingest <url|file>                         # fetch + Compilation Agent → Source + Notes + links
lens note "<text>"                             # quick observation

# Operations
lens lint                                      # health check: orphans, missing links, implicit contradictions
lens suggest-index                             # analyze link graph, propose structure notes

# Digest (temporal views)
lens digest                                    # today's new insights, growing notes, connections, tensions
lens digest week                               # this week
lens digest month                              # this month (compact)
lens digest year                               # this year (compact)

# RSS Feeds
lens feed add <url>                            # subscribe (auto-discovers RSS from website URLs)
lens feed import <file.opml>                   # import from Reeder/Feedly/Inoreader
lens feed list                                 # list subscriptions
lens feed check                                # check all feeds, compile new articles
lens feed check --dry-run                      # check without compiling
lens feed remove <id|url>                      # unsubscribe

# System
lens init                                      # first-time setup (~/.lens/)
lens status                                    # system status (object counts, cache size)
lens rebuild-index                             # rebuild SQLite cache from markdown files

# All commands support --json for agent consumption
```

### V0.3+ Additional Commands (not implemented yet)

```bash
# v0.3 — Li Jigang cognitive operations
lens run <id> anatomy                          # concept anatomy
lens run <cluster> rank                        # rank reduction
lens run <topic> roundtable                    # roundtable discussion
lens run <id> drill                            # essence drilling

# v0.3 — Additional source types
lens ingest <file.pdf>                         # PDF (via Marker)
lens ingest --chat <export>                    # ChatGPT / Claude.ai / Claude Code conversation exports
```

### Synchronous vs Asynchronous

- **Synchronous layer (sub-second)**: `search`, `show`, `context`, `note`, `list`, `links`, `status`, `digest`, `feed list`
- **Longer-running**: `ingest` (fetch + compile), `feed check` (check all feeds + compile new articles), `lint`

All commands run synchronously (blocking). Job-based async execution may be added in a future version.

## Storage Layout

Default path `~/.lens/`, or placed in an iCloud sync path at `~/Library/Mobile Documents/com~apple~CloudDocs/lens/` (lens auto-detects symlinks):

```
~/.lens/ (or iCloud sync location)
├── notes/note_01HXYZ.md       # All knowledge cards (claim, frame, question, observation, connection, structure_note)
├── sources/src_01HXYZ.md      # Provenance records
├── threads/thr_01HXYZ.md      # Conversations
├── raw/                       # Original files (HTML, etc.)
│   └── src_01HXYZ.html
├── feeds.json                 # RSS feed subscriptions
├── index.sqlite               # DERIVED CACHE (FTS5 + links table, rebuildable)
└── config.yaml
```

3 directories for objects (`notes/`, `sources/`, `threads/`). 3 ID prefixes (`note_`, `src_`, `thr_`).

**Markdown files are the source of truth**; SQLite is a derived cache (rebuildable via `lens rebuild-index`). Benefits:

- Humans can directly open, view, and edit them
- Git can diff them
- iCloud / Dropbox / Syncthing sync them directly (SQLite has data corruption risks with file-level sync; individual files do not)
- If lens is discontinued, users' data remains plain text
- Relationships are inlined in frontmatter (e.g. `evidence: [...]`, `supports: [note_id]`), no separate relations file needed

## Things Not in V0.2 (Explicitly Deferred)

Each item has a specific reason for deferral:

- ❌ **Li Jigang cognitive operations** (anatomy / rank / roundtable / drill) — v0.3. `lens run` commands
- ❌ **GUI (Tauri 2 desktop app)** — v1.0+. CLI continues to be sufficient for validation
- ❌ **Knowledge Maps visualization** — v1.0+. Requires GUI
- ❌ **Chat growing source incremental updates** — v0.3. v0.2 only supports immutable source ingest
- ❌ **Auto-check / growing source mechanism** — v0.3. v0.2 requires explicit `lens ingest` or `lens feed check`
- ❌ **PDF extraction (Marker)** — v0.3. Avoids the installation friction of Python dependencies
- ❌ **Embedding / semantic search** — v0.3. v0.2 uses FTS5 only
- ❌ **MCP server** — v0.3. CLI first needs to stabilize
- ❌ **Browser extension** — v0.3
- ⚠️ **Multi-user, collaboration** — v0 is single-machine single-user; multi-user is an entirely different product dimension
- ✅ **Multi-device sync (via iCloud)** — place `~/.lens/` at the iCloud path. lens has zero sync infrastructure
- ❌ **Batch ingest watcher** — v0 uses explicit `lens ingest`; no inbox folder monitoring
- ❌ **Automatic structure note creation** — the system only proposes (via `lens suggest-index`); humans decide

## Word Choice Is the First Architectural Decision of the Product

### Why it is called lens and not kb

- "kb" = "knowledge base" = the positioning we explicitly oppose. Naming it "kb" = admitting in the product name that you are a KB
- "kb" shoves this product into the crowded lane of Notion / Obsidian / Roam
- "kb" does not convey uniqueness

### Why it is called lens

- Directly corresponds to Li Jigang's "viewfinder" — a perspective for looking at the world
- Multiple meanings all fit: lens, viewfinder, prism (one input beam split into many facets), perspective
- Completely free of "database" connotations
- Short, memorable, and natural to type in CLI: `lens ingest`, `lens context`, `lens show`

### Why not "artifact"

- "artifact" comes from CS terms like build artifact / model artifact, importing wrong baggage (mechanical by-product, passive output)
- It says nothing — it is a placeholder umbrella term
- Claim and Frame have epistemic content (assertions about reality, perspectives on the world), not machine by-products
- Saying claim and frame directly is more specific and more human

### Why was "Programme" removed in v0.2?

- In v0.1, Programme was a Lakatos-inspired container (Hard Core + Protective Belt + Open Questions)
- In v0.2, the Zettelkasten-native redesign revealed that **containers are unnecessary** — links between Notes create implicit structure
- What Programme did is now handled by **structure notes** — Notes with `role: structure_note` and `entries[]` pointing to entry-point Notes
- Structure notes are created post-hoc (after link clusters form), not auto-created per article
- This aligns with Luhmann's Zettelkasten principle: structure is emergent, not imposed

**The word "artifact" does not appear anywhere in this document**. When an umbrella term is needed, use "Note"; preferably use the specific role name directly (claim, frame, question, etc.).

## Intellectual Sources

The complete ~120 independent references are in [`references.md`](./references.md). Key sources in brief:

### Methodological Spine (5 Traditions)

- **Imre Lakatos** — Research programme structure (Hard Core + Protective Belt)
- **Frederick Reif + Francis Miller** — Hierarchical Knowledge Organization + 9 knowledge structure types + Knowledge Maps
- **Karl Popper** — P1→TT→EE→P2 cycle + Three Worlds
- **Stephen Toulmin** — Claim + Data + Warrant + Qualifier + Rebuttal argumentation structure
- **Bayesian Epistemology** — Traceable confidence updates

### Direct Inspirations

- **[Andrej Karpathy — LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)** — The paradigm of continuous compilation over ad-hoc retrieval
- **[Li Jigang — ljg-skills + E45 Mengyan dialogue](https://github.com/lijigang/ljg-skills)** — Viewfinder, rank reduction, roundtable, concept anatomy, second-order questions, model-reads-first, feed = fate, and other cognitive operations

### Supplementary Traditions

- **Klein, Moon & Hoffman (2006)** — Data-Frame Theory of Sensemaking
- **Thomas Kuhn (1962)** — Paradigm + crisis + revolution
- **Larry Laudan (1977)** — Problems as Units
- **John Platt (1964)** — Strong Inference
- **Walton, Reed & Macagno (2008)** — Argumentation Schemes
- **W.V.O. Quine** — Web of Belief
- **Chris Argyris** — Double-Loop Learning
- **Charles Sanders Peirce** — Inference to the Best Explanation
- **Daniel Kahneman** — Adversarial Collaboration
- **Mons et al** — Nanopublications
- **Cochrane** — Systematic Review Methodology

### Biological Underpinnings

- **McClelland et al (1995)** — Complementary Learning Systems
- **Whittington et al (2020)** — Tolman-Eichenbaum Machine (demonstrating that frames are first-class neural representations of relational structure)
- **Buzsáki (2015)** — Hippocampal sharp-wave ripples (biological basis for background consolidation)
- **Kanerva (1988)** — Sparse Distributed Memory
- **Ramsauer et al (2020) + Bricken & Pehlevan (2021)** — Attention = Modern Hopfield = SDM (LLMs are already performing biological-style associative memory internally)

Complete publication information, links, and relevance to lens for each source are in [`references.md`](./references.md).

## Several Key Open Questions

Most design questions have been answered by methodology.md and v0.1 implementation. Status:

1. **Structure note granularity**: Should structure notes cover broad themes like "AI Memory Systems" or narrow ones like "mem0 vs Zep comparison"? `lens suggest-index` will analyze link density to propose candidates. **Still open.**
2. **How human feedback triggers recompilation**: How do highlight / comment / tag become compiler signals? V0 uses a simple `lens note --re` trigger. **Still open.**
3. **First LLM provider**: ✅ **Resolved** — Anthropic Claude Sonnet 4.6 via pi-ai. pi-ai provides the abstraction layer for future provider swaps.
4. **CLI binary language**: ✅ **Resolved** — TypeScript, compiled to single binary via `bun build --compile`. 63MB binary, acceptable startup time.
5. **Embedding model choice**: Deferred to v0.2. v0.1 uses FTS5 only, no embedding. **Still open for v0.2.**

## Product Form: 4 Surfaces + 1 Facade

The core of Lens is a CLI tool, but the complete consumer-facing product form has 4 layers (plus a marketing facade):

```
┌─────────────────────────────────────────────────────┐
│  lens.xyz (marketing site + docs)    ← facade        │
└─────────────────────────────────────────────────────┘
                        ↓ (install)
┌─────────────────────────────────────────────────────┐
│  lens.app (Tauri 2 desktop app)  ← core              │
│  ┌────────────────────────────────────────────┐    │
│  │  React 19 GUI                                │    │
│  │  (Note Graph / Note Detail / Structure Note │    │
│  │   Navigation / Knowledge Maps / Settings)    │    │
│  ├────────────────────────────────────────────┤    │
│  │  lens-core sidecar (Bun-compiled TS)        │    │
│  │  (Compilation Agent / Extractors / LLM)       │    │
│  ├────────────────────────────────────────────┤    │
│  │  Markdown files + index.sqlite (~/.lens/)    │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  One binary supports both GUI + CLI modes            │
│  lens (no args) → GUI                               │
│  lens ingest / context / ... → CLI                  │
└─────────────────────────────────────────────────────┘
          │            │            │
          ▼            ▼            ▼
    ┌─────────┐  ┌────────┐  ┌──────────┐
    │Browser  │  │Agent   │  │CLI direct │
    │Extension│  │Plugin  │  │use        │
    │(v0.3)   │  │(MCP,    │  │(power     │
    │         │  │ v0.3)   │  │ user +    │
    │         │  │         │  │ agents)   │
    └─────────┘  └────────┘  └──────────┘
        ↓            ↓            ↓
    web page     Claude Code   shell / script
    ingest       / Cursor etc  integration
    + highlight
```

**Detailed tech stack and component architecture** are in [`architecture.md`](./architecture.md).

### Responsibilities of Each Layer

**1. lens CLI (v0.2, current) → lens.app (Tauri 2 desktop application, v1.0+)**
- **v0.2 (current)**: CLI-only, Bun-compiled single binary (63MB). 3 types: Source, Note, Thread.
- **v1.0+ (planned)**: One binary that is both GUI and CLI. `lens` (no args) opens GUI; `lens ingest` etc. runs CLI mode
- **GUI** (v1.0+): Note graph / Note detail / Structure note navigation / Knowledge Maps / Settings
- **CLI** is for power users and agents (v0.2 complete)
- Tech stack: Bun + bun:sqlite + pi-ai + pi-agent-core + Defuddle + Turndown + feedsmith (see [`architecture.md`](./architecture.md)); Tauri 2 + React 19 added in v1.0+

**2. Browser Extension (web ingest, v0.3)**
- One-click `Compile with lens` while reading web pages
- Highlighted text → automatically creates a Note
- Underlying mechanism: calls the local lens daemon via localhost HTTP
- v0.2 uses CLI `lens ingest <url>` manually instead

**3. Knowledge Maps view** (v1.0+, integrated into lens.app)
- The visual layer contributed by Reif + Miller
- View types:
  - Note Graph (directed graph of supports/contradicts/refines/related links)
  - Scope Hierarchy (big_picture Notes with their detail supporters)
  - Cluster View (densely linked Note groups, potential structure note candidates)
- **Not a standalone "Web App"** — it is a React view inside lens.app

**4. Agent Plugin (MCP thin wrapper, v0.3)**
- An extremely thin (~100 lines) MCP shim wrapping the `lens` CLI
- Users add `lens` as an MCP server in Claude Code / Cursor
- Essentially a thin wrapper, not a standalone product
- **Key point**: In v0.2, agents can directly use `subprocess.run("lens", ...)` — MCP is just a more ergonomic wrapper

### Data Location and Sync

- **Default**: `~/.lens/`
- **Multi-device sync via iCloud Drive**: Place `~/.lens/` at `~/Library/Mobile Documents/com~apple~CloudDocs/lens/`; Apple handles e2e encrypted sync across Mac / iPad / iPhone
- **Zero sync infrastructure**: lens does not operate any cloud services, has no account system, and incurs no server costs
- **Non-Apple users**: Use Dropbox / Syncthing / Git as alternatives

### Phased Rollout

See [`roadmap.md`](./roadmap.md) for details. Summary:

| Phase | What Ships | Target Users |
|---|---|---|
| **v0.1** ✅ | CLI binary (Bun-compiled), 3 source types, RSS feeds, digest, scope hierarchy | Self + dogfooding |
| **v0.2** ✅ | Zettelkasten-native redesign: 3 types (Source, Note, Thread), links as only structure, agent as thinker | Self + dogfooding |
| **v0.3** | + Li Jigang cognitive operations + Browser extension + MCP server + Audio/Image | 20-50 beta testers |
| **v0.4** | + lens.xyz official launch | Public release |
| **v1.0+** | + iOS/Android mobile (Tauri 2 mobile) | All platforms |

**Key decisions (updated after v0.2)**:
- **v0.2 is a Zettelkasten-native redesign** — 3 types replace 6, Note is the universal card, links are the only structure
- **Programme is gone** — replaced by structure notes (Notes with `role: structure_note`)
- **Agent is a "thinker" not just "extractor"** — discovers relationships, updates existing Notes, does not target fixed output counts
- **GUI deferred further** — CLI continues to be sufficient; GUI moved to v1.0+
- **RSS feeds + digest remain essential** — they make dogfooding practical and provide a natural input pipeline
- **Li Jigang cognitive operations in v0.3** — anatomy/rank/roundtable/drill as `lens run` commands

### Forms Explicitly Not Pursued

- ❌ **Mobile app** (not in v0; v1.0+ will use Tauri 2 mobile, iOS first)
- ❌ **Cloud-hosted storage / multi-device sync service** — local-first storage is a core positioning principle
- ❌ **Electron** — too heavy: 200MB bundle, 200MB memory, 2-second startup. GUI (v0.2) uses **Tauri 2** (see [`architecture.md`](./architecture.md) § 1.1)
- ❌ **Pure Web App (SaaS)** — violates local-first storage
- ❌ **Third-party integration network** (Slack/Notion/Readwise direct connections) — feature bloat trap

### Privacy Boundary (Honest Disclosure)

**Lens is "local-first storage + cloud-powered inference," not fully local inference.**

- **v0.1**: The Compilation Agent depends on **Anthropic Claude Sonnet 4.6 API** (structured extraction). Users' source text (articles, notes) will be sent to the Anthropic API for processing. No embedding in v0.1.
- **v0.2**: Adds **Voyage AI API** (embedding) for semantic search
- **v0.3+**: Plans to add a local inference mode (Ollama + nomic-embed) as an optional privacy mode
- **Always local**: All compiled products (Notes), the index (SQLite), and copies of original text exist only on the user's local `~/.lens/`, never passing through any lens cloud service

**What this means for users**:
- If your sources contain sensitive content (private conversations, confidential research), be aware that this content will pass through Anthropic's API
- Anthropic's data usage policy (as of 2026-04): API inputs are not used for model training ([see Anthropic Usage Policy](https://www.anthropic.com/policies))
- Do not mistake "local-first" for "fully offline" — lens's local-first refers to **data storage and ownership** being local, not inference being local

## Target Users

Lens **is not for everyone**. Forcing it to be "usable by all" would dilute its real value.

### Core User Profiles

"People who continuously do serious intellectual work" — people who read a lot, think deeply, and want their accumulation to **compound** rather than evaporate:

| Group | Real Pain Point |
|---|---|
| **Independent researchers / PhD students** | Literature reviews are redone repeatedly, cannot be accumulated, and everything is lost when switching topics |
| **Deep writers / journalists / analysts** | A single in-depth topic requires digesting 50+ articles; traditional note tools cannot handle the volume |
| **AI / tech practitioners** | Reading papers + blogs + chat logs daily; various frames in conflict |
| **Investors / strategy analysts** | Building industry understanding over time |
| **Serious autodidacts** | Want to systematize self-study of complex domains |
| **Product thinkers / entrepreneurs** | Accumulating "perspectives on a domain" rather than meeting notes |

**Common traits**:
- Already using Readwise / Obsidian / Notion / twenty browser bookmarks, **but dissatisfied with all of them**
- Willing to pay for a tool that "actually works"
- **Not afraid of complexity** — already grappling with complex ideas
- Ambivalent about AI tools: want to use them but fear being replaced

**Core user base**: 1 million to 5 million people worldwide. Not 10 billion, but a **very healthy** market.

### People Explicitly Not Suited

- People who just want to jot down random notes (Apple Notes is better)
- People who want AI to automatically organize everything (this is Mem0's dead end)
- People who are unwilling to argue with their own notes (lens will throw contradictions in your face)
- People who want a product to think for them (lens will only help you think more deeply)

**This is a tool that requires investment**. The more you put in, the greater the compounding returns.

## V0.1 — ✅ COMPLETE (Historical)

v0.1 validated LLM extraction quality with 6 types (Source, Claim, Frame, Question, Programme, Thread). See [`roadmap.md`](./roadmap.md) § v0.1 for details.

## V0.2 — Current (Zettelkasten-Native Redesign) — ✅ COMPLETE

```
v0.2 = Zettelkasten-native redesign

Core principle: All knowledge is Notes. Structure emerges from links.

3 types: Source + Note + Thread
3 directories: sources/ notes/ threads/
3 ID prefixes: src_ note_ thr_

Note is the universal knowledge card:
  - Required: id, type, text, created_at
  - Optional: evidence[], qualifier, voice, sees, ignores, assumptions[],
    question_status, bridges[], entries[], supports[], contradicts[],
    refines[], related[], scope, structure_type, source, status
  - Role (soft hint): claim / frame / question / observation / connection / structure_note

Links are the only structure:
  - supports / contradicts / refines / related
  - No categories, no containers, no Programme

Agent is a "thinker" not just "extractor":
  - Explores existing knowledge before creating new Notes
  - Updates existing Notes (add evidence, strengthen, enrich)
  - Creates new Notes only for genuinely new insights
  - Discovers cross-domain connections
  - Does NOT create structure notes (post-hoc, user-initiated)

CLI commands (all support --json):
  - lens list notes [--role] [--scope] [--since]
  - lens list sources / lens list notes --role structure_note
  - lens show <id> / lens search / lens links <id> / lens context
  - lens ingest <url|file> / lens note "<text>"
  - lens lint / lens suggest-index
  - lens digest [day|week|month|year]
  - lens feed add / import / list / check / remove
  - lens init / status / rebuild-index
```

**Privacy note**: Compilation relies on the cloud-based Anthropic API. Users' original text will be sent to Anthropic for structured extraction. This is the "local-first storage + cloud-powered inference" model, not fully local inference (see "Privacy Boundary" section below).

Detailed scope is in [`roadmap.md`](./roadmap.md) § v0.2. Design document: [`zettelkasten-redesign.md`](./zettelkasten-redesign.md).

## Working Principles

### Design Principles

1. **Simplicity first**: For every addition, ask "will things break if we don't add this now?" — if the answer is not "yes," don't add it
2. **Schema evolution**: The schema will change. Reserve a `schema_version` field; the recompile mechanism must work from the start
3. **CLI contract stability**: Command names, arguments, and JSON schema should not be changed lightly once published
4. **Don't think for anyone**: Don't guess what the user/agent wants; do the minimum and wait for real usage feedback
5. **Honest naming**: When introducing any new concept, check whether its connotation conveys the correct product intent (otherwise it becomes the next "kb")
6. **Traceability over elegance**: Better to have a few extra fields than to break the provenance chain
7. **Never auto-resolve contradictions**: The system surfaces them; humans/agents decide
8. **Every design decision must be traceable to theory**: Any choice must have a basis traceable in [`references.md`](./references.md)

### UX Principles

9. **Zero required ceremony**: Users should not have to remember to perform any "maintenance action" to keep lens working properly. No `run consolidation`, `run pull`, `run sync`. These should happen implicitly at the edges of actions users are already taking.
   - **Test**: If a feature requires users to remember to periodically run a command, that feature is designed wrong — it should trigger automatically
   - **v0.1 implementation**: v0.1 has only immutable sources; users explicitly `lens ingest`; no auto-check needed yet
   - **v0.2 implementation**: auto-check (on CLI invocation + GUI timer), see Auto-check mechanism section for details

10. **Complexity stays inside**: Technical reality (ChatGPT allows edits, JSONL is append-only, LLMs occasionally output duplicates) is complex. lens's job is to **absorb this complexity** so users see a simple mental model:
    - "Things I've read, lens knows"
    - "Things I've said to AI, lens remembers"
    - "What's in lens reflects what I currently believe"
    - **Test**: If an error message / output / prompt exposes a concept the user should not need to know ("divergence detected", "head_hash mismatch", "JSONL append ordering"), that design needs rework

11. **Graceful degradation, not failure**: When things go wrong (source lost, divergence, duplicate, conflict), lens should not fail to function — it should **degrade gracefully**: show known information, annotate uncertain parts, and put things requiring user decisions into the anomaly queue
    - **Test**: When a user encounters a problem with lens, their first reaction should be "I'll deal with this when I have time," not "lens is broken, I need to fix it"

These three UX principles are equally important as the first 8 design principles — they determine what lens **feels like**, not just what it **does**.

## Auto-check Mechanism (v0.2, Not in v0.1 Scope)

> **Note**: Auto-check and growing source support have been moved from v0.1 to v0.2. v0.1 only supports explicit `lens ingest` of immutable sources. The following describes the planned design for v0.2.

### Design (v0.2)

The mechanism by which lens handles growing sources (Claude Code sessions, ChatGPT conversations, etc.) is **not** a file watcher but rather **periodic checking**:

- **CLI mode**: Auto-check runs alongside each CLI invocation (staleness threshold 5 minutes)
- **GUI mode**: The GUI has a built-in timer that checks growing source mtime changes in the background every 5 minutes. This solves the problem of auto-check not triggering when "the user mainly stays in the GUI and does not run CLI"

**Reasons for not using a file watcher**:
- chokidar / fsevents have edge cases on cross-mount-point, iCloud, and macOS
- A daemon process must stay alive; if it dies, nobody knows
- Reading JSONL concurrently with Claude Code may create race conditions
- Users have no need for "real-time" — 5-minute staleness is perfectly fine for the usage experience

See [`source-pipeline.md`](./source-pipeline.md) § Auto-check mechanism for details.

## Tips for Reviewers

If you are reviewing this document or a specific design decision in lens:

- **Type selection** (why Claim instead of fact?) → see the "Six core types" section in methodology.md
- **Type schema** (why does Claim have these fields?) → see the "Complete schema" section in methodology.md
- **Compilation flow** (why does the Compilation Agent do these steps?) → see the "Compilation lifecycle" section in methodology.md
- **Incremental ingest** (how are contradictions and duplicates handled?) → see the "6 scenarios" section in methodology.md
- **Theoretical basis** (where does this come from?) → see references.md
- **Implementation cost** (how much does one run cost?) → see the "Engineering implementation cost estimate" section in methodology.md
