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

Lens is an **understanding compiler** — it compiles the raw information that people read, discuss, and think about into structured cognitive objects such as Claims, Frames, Questions, and more, organizes them into Programmes (research programmes), and enables both humans and agents to reason further based on this understanding.

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

**v0.1 (as built)**: 6 object types — Source, Claim, Frame, Question, Programme, Thread. Evidence is stored inline in Claims (no separate Excerpt type). ConceptAnatomy and Anomaly are deferred to v0.2.

**Full V0 vision**: 5 content types (Claim / Frame / Question / ConceptAnatomy / Anomaly) + 1 meta-structure (Programme) + Source + Thread.

The complete schema, field semantics, and incremental scenario handling for each type are in [`methodology.md`](./methodology.md). Only brief introductions are given below.

### Programme (Meta-structure / Container)

A complete unit of cognitive inquiry, drawing on Lakatos's research programme structure:

```
Programme
├── Hard Core          ← Unshakable core Frames
├── Protective Belt    ← Revisable Claims + auxiliary Frames
├── Open Questions     ← Current open question tree
├── Anomalies          ← Unresolved counterexamples
└── Concept Anatomies  ← Concept anatomies within this programme
```

All content types belong to at least one Programme. Using lens is not "managing a bunch of notes" — it is "maintaining several Programmes, each with its own core and periphery."

### Excerpt (substrate) — Simplified in v0.1

Raw evidence fragments — the ground truth for all other types. In the original design, Excerpt was a separate type. **In v0.1, evidence is stored inline in Claims** (as an `evidence[]` array), and the Source file retains the full original text. This simplification reduced complexity without losing traceability.

### Claim (Full Toulmin structure + Miller structure types + Reif elaboration)

Extracted falsifiable assertions. The biggest difference from all existing products: **not flat fact + tag, but full Toulmin structure + knowledge structure type + elaboration dimensions**:

```
Claim = statement + evidence (Excerpts) + warrant (Frame)
      + backing + qualifier + rebuttals
      + voice: extracted | restated | synthesized
      + confidence (Bayesian history)
      + contradicts / supports / refines relationships
      + structure_type: one of 9 knowledge structures (Miller)
      + elaboration: position across 5 dimensions (Reif)
      + is_boundary: whether it spans multiple Programmes
```

`warrant: FrameId` truly binds Frame and Claim — a Claim is not a floating fact; it is **a fact under a particular Frame**. Change the Frame, and the same Data does not yield the same Claim.

`structure_type` specifies the **structural pattern** this Claim uses to express itself (causal / timeline / taxonomy / argument / ...), and `elaboration` specifies its position on the **detail hierarchy** — these two fields allow the same Claim to be precisely located by structure or by level.

### Frame (Viewfinder)

A perspective for looking at the world — the origin of the product name.

```
Frame = name + sees + ignores + assumptions
      + useful_when + failure_modes
      + held_by (who holds it) + exemplar_claims
      + robustness (independent sources + supporting claim count)
```

Why Frame is not a special case of Entity: Frame is "a perspective for looking at the world"; Entity is "the thing being looked at." A company can be viewed through many Frames — an economics frame sees P/E ratio, an engineering frame sees technical debt. Frame and Entity do not overlap.

### Question (IBIS + Strong Inference enhanced)

Open inquiry questions. The true center of Lens — Claims and Frames revolve around Questions.

```
Question = text + parent_question + sub_questions
         + alternative_hypotheses (mutually exclusive candidate claims)
         + discriminating_evidence (criteria for differentiation)
         + status: open | tentative_answer | resolved | superseded
```

Supports the natural growth of second-order / third-order question trees (drawing on Li Jigang's idea of "a master question continuously generating good sub-questions").

### ConceptAnatomy (8-layer Concept Anatomy)

From Li Jigang's ljg-learn. Deep concept anatomy triggered on demand, across 8 dimensions:

```
layers:
  history     (evolutionary history)
  dialectic   (opposites)
  phenomena   (real-world manifestations)
  language    (etymology and semantics)
  form        (structural form)
  existence   (ontological status)
  aesthetics  (poetic dimension)
  meta        (meta-reflection)
```

**This is lens's most distinctive differentiator** — no other product does this.

## Methodological Spine

The lens type system is not an arbitrary combination; it is a synthesis of **5 traditions from the philosophy of science / cognitive science**:

| Scale | Tradition | Contribution |
|---|---|---|
| Macro structure | **Lakatos** Research Programmes | Programme = Hard Core + Belt + Questions + Anomalies |
| Detail hierarchy | **Reif + Miller** Hierarchical Knowledge Org | 5 elaboration dimensions + 9 knowledge structure types + Knowledge Maps |
| Cycle dynamics | **Popper** P1→TT→EE→P2 | Problems are continuously replaced by deeper problems |
| Local structure | **Toulmin** Argumentation Model | Claim = statement + data + warrant + qualifier + rebuttal |
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

### V0.1 Command List (As Built)

```bash
# Core
lens init                                      # first-time setup (~/.lens/)
lens ingest <url|file>                         # fetch + Compilation Agent → Claims/Frames/Questions
lens note "<text>"                             # quick note
lens show <id>                                 # show any object (source: contributions, claim: evidence)
lens search "<query>"                          # FTS5 full-text search
lens context "<query>"                         # agent-ready JSON context pack
lens context "<query>" --scope big_picture     # overview only (3-5 core Claims)

# Programmes
lens programme list                            # list all Programmes with member counts
lens programme show <id>                       # 2-level display: Overview + Details (use --full)

# Digest (temporal views)
lens digest                                    # today's new insights, tensions, perspectives
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

# Maintenance
lens status                                    # system status (object counts, cache size)
lens rebuild-index                             # rebuild SQLite cache from markdown files

# All commands support --json for agent consumption
```

### V0.2+ Additional Commands (not implemented in v0.1)

```bash
# v0.2
lens ingest <file.pdf>                         # PDF (via Marker)
lens ingest --chat <export>                    # ChatGPT / Claude.ai / Claude Code conversation exports
lens run <source_id> concept-anatomy <concept> # 8-layer concept anatomy
lens programme split <id> --into <n1> <n2>     # split
lens programme merge <id1> <id2>               # merge
lens programme health <id>                     # Lakatos health diagnosis
lens contradictions list / show / resolve      # contradiction management
lens pull                                      # manually trigger auto-check
```

### Synchronous vs Asynchronous

- **Synchronous layer (sub-second)**: `search`, `show`, `context`, `note`, `status`, `digest`, `programme list/show`, `feed list`
- **Longer-running**: `ingest` (fetch + compile), `feed check` (check all feeds + compile new articles)

In v0.1, all commands run synchronously (blocking). Job-based async execution may be added in v0.2.

## Storage Layout

Default path `~/.lens/`, or placed in an iCloud sync path at `~/Library/Mobile Documents/com~apple~CloudDocs/lens/` (lens auto-detects symlinks):

```
~/.lens/ (or iCloud sync location)
├── sources/src_01HXYZ.md      # Every object = type/id.md
├── claims/clm_01HXYZ.md      # Frontmatter (≤20 lines) + body, evidence inline
├── frames/frm_01HXYZ.md
├── questions/q_01HXYZ.md
├── programmes/pgm_01HXYZ.md  # Minimal: title + description (members reverse-queried)
├── threads/thr_01HXYZ.md
├── raw/                       # Original files (HTML, etc.)
│   └── src_01HXYZ.html
├── feeds.json                 # RSS feed subscriptions
├── index.sqlite               # DERIVED CACHE (FTS5 + links table, rebuildable)
└── config.yaml
```

**Markdown files are the source of truth**; SQLite is a derived cache (rebuildable via `lens rebuild-index`). Benefits:

- Humans can directly open, view, and edit them
- Git can diff them
- iCloud / Dropbox / Syncthing sync them directly (SQLite has data corruption risks with file-level sync; individual files do not)
- If lens is discontinued, users' data remains plain text
- Relationships are inlined in frontmatter (e.g. `evidence: [...]`, `programme: pgm_id`), no separate relations file needed

## Things Not in V0.1 (Explicitly Deferred)

Each item has a specific reason for deferral:

- ❌ **GUI (Tauri 2 desktop app)** — v0.2. v0.1 validated the core loop with CLI only
- ❌ **Li Jigang's remaining operations** (roundtable / rank / paper-river / writes) — v0.1 only does extract. The rest are v0.2+
- ❌ **ConceptAnatomy (8-layer concept anatomy)** — v0.2. v0.1 first validates base Claim/Frame/Question extraction quality
- ❌ **Programme split / merge** — v0.2. v0.1 only supports create / add-to-belt
- ❌ **Knowledge Maps visualization** — v0.2. v0.1 uses CLI views to validate the core loop
- ❌ **Chat growing source incremental updates** — v0.2. v0.1 only supports immutable source ingest
- ❌ **Auto-check / growing source mechanism** — v0.2. v0.1 requires explicit `lens ingest` or `lens feed check`
- ❌ **Bayesian confidence numerical updates** — v0.2. v0.1 uses four levels (`certain / likely / presumably / tentative`), assigned by the LLM in one pass
- ❌ **Contradiction detection (Anomaly detection)** — v0.2. v0.1 first ensures single-source extraction quality
- ❌ **PDF extraction (Marker)** — v0.2. v0.1 avoids the installation friction of Python dependencies
- ❌ **Embedding / semantic search** — v0.2. v0.1 uses FTS5 only
- ⚠️ **Multi-user, collaboration** — v0 is single-machine single-user; multi-user is an entirely different product dimension
- ✅ **Multi-device sync (via iCloud)** — place `~/.lens/` at the iCloud path. lens has zero sync infrastructure
- ❌ **MCP server** — v0.3. CLI first needs to stabilize
- ❌ **Browser extension** — v0.3
- ❌ **Batch ingest watcher** — v0 uses explicit `lens ingest`; no inbox folder monitoring
- ❌ **Causal Model / Script / Analogy / Generator types** — LLM-unfriendly, v1+
- ❌ **Lineage (paper provenance tracing)** — requires web search infrastructure, v1+
- ❌ **Automatic Programme creation** — the system only proposes; humans decide
- ❌ **Automatic Hard Core modification** — the system only warns; humans decide
- ❌ **Automatic Anomaly resolution** — never automatic; must be an explicit decision by human or agent

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

### Why "Programme" instead of "topic" / "project"

- "Programme" comes directly from Lakatos's Methodology of Scientific Research Programmes
- "topic" implies content classification (passive); "Programme" implies ongoing inquiry (active)
- "project" implies deadlines and deliverables; Programme is **open-ended cognitive exploration**
- Using academic terminology is meant to **align with seriousness** — this is not "organizing notes"; it is "conducting research"

**The word "artifact" does not appear anywhere in this document**. When an umbrella term is needed, use "structure"; preferably use the specific type name directly.

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

1. **Programme naming granularity**: Should users create broad Programmes like "AI Memory Systems" or narrow ones like "mem0 vs Zep comparison"? V0 does not enforce a choice; this will be decided by observing usage. **Still open.**
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
│  │  (Reader / Programme / Knowledge Maps /     │    │
│  │   Anomaly Queue / Settings)                  │    │
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

**1. lens CLI (v0.1, complete) → lens.app (Tauri 2 desktop application, v0.2)**
- **v0.1 (current)**: CLI-only, Bun-compiled single binary (63MB)
- **v0.2 (planned)**: One binary that is both GUI and CLI. `lens` (no args) opens GUI; `lens ingest` etc. runs CLI mode
- **GUI** (v0.2): Reader / Programme Dashboard / Claim Detail / Settings; Knowledge Maps / Anomaly Queue
- **CLI** is for power users and agents (v0.1 complete)
- Tech stack: Bun + bun:sqlite + pi-ai + pi-agent-core + Defuddle + Turndown + feedsmith (see [`architecture.md`](./architecture.md)); Tauri 2 + React 19 added in v0.2

**2. Browser Extension (web ingest, v0.3)**
- One-click `Compile with lens` while reading web pages
- Highlighted text → automatically creates Excerpt
- Underlying mechanism: calls the local lens daemon via localhost HTTP
- v0.1 / v0.2 uses CLI `lens ingest <url>` manually instead

**3. Knowledge Maps view** (v0.2, integrated into lens.app)
- The visual layer contributed by Reif + Miller
- View types:
  - Programme Map (radial layout of Hard Core + Belt + Questions + Anomalies)
  - Claim Graph (directed graph of Toulmin supports/contradicts)
  - Frame Landscape (multi-viewfinder comparison of sees/ignores/assumptions)
  - Question Tree (master question → second-order → third-order hierarchical expansion)
- **Not a standalone "Web App"** — it is a React view inside lens.app, alongside Reader / Programme Dashboard etc.

**4. Agent Plugin (MCP thin wrapper, v0.3)**
- An extremely thin (~100 lines) MCP shim wrapping the `lens` CLI
- Users add `lens` as an MCP server in Claude Code / Cursor
- Essentially a thin wrapper, not a standalone product
- **Key point**: In v0.1 / v0.2, agents can directly use `subprocess.run("lens", ...)` — MCP is just a more ergonomic wrapper

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
| **v0.2** | + Tauri desktop app (GUI) + Knowledge Maps + Growing sources + ConceptAnatomy + Multi-LLM | 20-50 beta testers |
| **v0.3** | + Browser extension + MCP server + Audio/Image support | 100-500 users |
| **v0.4** | + lens.xyz official launch | Public release |
| **v1.0+** | + iOS/Android mobile (Tauri 2 mobile) | All platforms |

**Key decisions (updated after v0.1)**:
- **v0.1 ended up CLI-only** — GUI was deferred to v0.2 after realizing CLI was sufficient to validate the core hypothesis
- **RSS feeds + digest emerged as essential** — they made dogfooding practical and provided a natural input pipeline
- **Scope-based hierarchy was a key discovery** — big_picture/detail Claims dramatically improved readability
- **Knowledge Maps in v0.2** — v0.1 focuses on the core loop first; v0.2 adds the visual layer
- **Mobile in v1.0+** — but the tech stack (Tauri 2) reserves a path for mobile

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
- **Always local**: All compiled products (Claims / Frames / Questions), the index (SQLite), and copies of original text exist only on the user's local `~/.lens/`, never passing through any lens cloud service

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

## V0.1 Minimum Viable (One-line Definition) — ✅ COMPLETE

```
v0.1 = Bun-compiled CLI binary (63MB, macOS)

Core validation goal: Can an LLM extract structured understanding
from real text that users trust?
Result: YES — validated with real articles and RSS feeds.

Can ingest 3 source types (all immutable):
  - web_article (via Defuddle + Turndown → markdown)
  - markdown / plain_text (pass-through)
  - manual_note (direct CLI input)

Can compile sources into Claim / Frame / Question
  (via Compilation Agent: short-lived agent per document, using pi-agent-core + pi-ai)
Can organize into Programme meta-structures
  (with scope-based 2-level hierarchy: big_picture + detail)

Added beyond original plan:
  - RSS feed pipeline (feedsmith, OPML import, autodiscovery)
  - Digest command (temporal views: day/week/month/year)
  - Scope-based hierarchy on Claims (big_picture vs detail)
  - Thread type for conversational flows

CLI commands (all support --json):
  - lens init / ingest / note / show / search / context
  - lens programme list / show
  - lens digest [day|week|month|year]
  - lens feed add / import / list / check / remove
  - lens status / rebuild-index
```

**v0.1 explicitly does not include**: GUI / Tauri app / chat growing source / auto-check / Bayesian updates / contradiction detection / PDF / Knowledge Maps / browser extension / MCP server / embedding.

**Privacy note**: v0.1's compilation relies on the cloud-based Anthropic API. Users' original text will be sent to Anthropic for structured extraction. This is the "local-first storage + cloud-powered inference" model, not fully local inference (see "Privacy Boundary" section below).

Detailed scope is in [`roadmap.md`](./roadmap.md) § v0.1. Technical implementation is in [`architecture.md`](./architecture.md).

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
