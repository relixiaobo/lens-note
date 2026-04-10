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

## V0 Type System: 5 Content Types + 1 Meta-structure

V0 supports **5 content types** (Excerpt / Claim / Frame / Question / ConceptAnatomy) + **1 meta-structure** (Programme).

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

### Excerpt (substrate)

Raw evidence fragments — the ground truth for all other types. All Claims must cite at least one Excerpt.

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
1. How to check and install lens (`npm install -g lens-cli`)
2. What commands are available and what arguments they accept
3. When to use lens ("the user says to check their research")
4. What the output format is

**Agents can install lens themselves** — the Skill includes installation instructions, and agents automatically run `npm install -g lens-cli && lens init` the first time it is needed.

### No MCP (v0.3 community can wrap)

MCP is a protocol supported by 5/7 mainstream agents, but CLI already covers 100% of agents. MCP is merely a ~100-line typed wrapper around the CLI. It will be added in v0.3 or when the community demands it.

### V0.1 Command List (Minimal Set)

```bash
# Ingest (v0.1 only supports immutable sources)
lens ingest <url>                              # web page (via Defuddle)
lens ingest <file>                             # markdown / plain_text
lens note "<text>" [--programme <id>]          # directly record a raw observation

# Compile
lens run <source_id> extract                   # extract claim/frame/question from source

# Query
lens search "<query>" [--programme <id>]       # FTS5 full-text search
lens show <id>                                 # read claim/frame/question/programme
lens context "<intent>"                        # assemble relevant structures (most important)

# Programme operations
lens programme list
lens programme show <id>                       # show Programme status
lens programme create <title>                  # create new Programme

# Browse
lens list claims [--programme <id>] [--frame <id>]
lens list frames
lens list questions [--status open]
lens sources

# Meta
lens status                                    # system status
lens recompile <source_id>                     # recompile

# All commands support --json
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

- **Synchronous layer (sub-second)**: `search`, `show`, `context`, `note`, `list`
- **Asynchronous layer (job model)**: `ingest`, `run extract`, `recompile`

Asynchronous commands immediately return a `job_id`, queryable via `lens status`.

## Storage Layout

Default path `~/.lens/`, or placed in an iCloud sync path at `~/Library/Mobile Documents/com~apple~CloudDocs/lens/` (lens auto-detects symlinks):

```
~/.lens/ (or iCloud sync location)
├── programmes/                # Programme meta-structures
│   └── pgm_01HXYZ.md
├── sources/                   # Source metadata
│   └── src_01HXYZ.md         # canonical markdown
├── raw/                       # Original files (HTML, uploaded files, etc.)
├── excerpts/
│   └── exc_01HXYZ.md
├── claims/
│   └── clm_01HXYZ.md         # Concise frontmatter (≤ 20 lines) + body
├── frames/
│   └── frm_01HXYZ.md
├── questions/
│   └── q_01HXYZ.md
├── index.sqlite               # DERIVED CACHE (FTS5 + relationship graph, rebuildable)
└── config.yaml
```

**Markdown files are the source of truth**; SQLite is a derived cache (rebuildable via `lens rebuild-index`). Benefits:

- Humans can directly open, view, and edit them
- Git can diff them
- iCloud / Dropbox / Syncthing sync them directly (SQLite has data corruption risks with file-level sync; individual files do not)
- If lens is discontinued, users' data remains plain text
- Relationships are inlined in frontmatter (`evidence: [exc_id]`), no separate relations file needed

## Things Not in V0 (Explicitly Deferred)

Each item has a specific reason for deferral:

- ❌ **Li Jigang's remaining operations** (roundtable / rank / paper-river / writes) — v0.1 only does extract. The rest are v0.2+
- ❌ **ConceptAnatomy (8-layer concept anatomy)** — v0.2. v0.1 first validates base Claim/Frame/Question extraction quality
- ❌ **Programme split / merge** — v0.2. v0.1 only supports create / add-to-belt
- ❌ **Knowledge Maps visualization** — v0.2. v0.1 uses list/detail views to validate the core loop (see methodology.md for explanation)
- ❌ **Chat growing source incremental updates** — v0.2. v0.1 only supports immutable source ingest
- ❌ **Auto-check / growing source mechanism** — v0.2. v0.1 requires explicit `lens ingest` from users
- ❌ **Bayesian confidence numerical updates** — v0.2. v0.1 uses four levels (`certain / likely / presumably / tentative`), assigned by the LLM in one pass
- ❌ **Contradiction detection (Anomaly detection)** — v0.2. v0.1 first ensures single-source extraction quality
- ❌ **PDF extraction (Marker)** — v0.2. v0.1 avoids the installation friction of Python dependencies
- ⚠️ **Multi-user, collaboration** — v0 is single-machine single-user; multi-user is an entirely different product dimension
- ✅ **Multi-device sync (via iCloud)** — place `~/.lens/` at the iCloud path. lens has zero sync infrastructure
- ❌ **MCP server** — v0.3. CLI first needs to stabilize
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

Most design questions have been answered by methodology.md. Still open:

1. **Programme naming granularity**: Should users create broad Programmes like "AI Memory Systems" or narrow ones like "mem0 vs Zep comparison"? V0 does not enforce a choice; this will be decided by observing usage
2. **How human feedback triggers recompilation**: How do highlight / comment / tag become compiler signals? V0 uses a simple `lens note --re` trigger
3. **First LLM provider**: Anthropic only, or pre-build a provider abstraction? Leaning toward Anthropic only, but with an abstract interface for future swaps
4. **CLI binary language**: TypeScript (slow startup but familiar ecosystem + fast iteration) / Rust (fast startup but slow development) / Go (middle ground). Leaning toward TypeScript for v0; hot paths can be rewritten later
5. **Embedding model choice**: Local (ollama) or cloud (OpenAI/Voyage)? Local is better for privacy but worse in quality; v0 pre-builds an abstraction, defaults to cloud

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

**1. lens.app (Tauri 2 desktop application, v0.1 core)**
- One binary that is both GUI and CLI
- Running `lens` (no args) → opens GUI
- Running `lens ingest` / `lens context` / ... → CLI mode
- **GUI** provides: Reader / Programme Dashboard / Claim Detail / Settings (v0.1); Knowledge Maps / Anomaly Queue (v0.2)
- **CLI** is for power users and agents
- Tech stack: Tauri 2 + React 19 + pi-ai (LLM calls) + pi-agent-core (Compilation Agent runtime) + SQLite (derived cache) + Bun-compiled core (see [`architecture.md`](./architecture.md))

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
| **v0.1** | Tauri desktop app (GUI + CLI unified), 6 source types, Reader/Programme/Anomaly views | Self + 3-5 alpha testers |
| **v0.2** | + Knowledge Maps visual layer + ConceptAnatomy + Multi-LLM provider | 20-50 beta testers |
| **v0.3** | + Browser extension + MCP server + Audio/Image support | 100-500 users |
| **v0.4** | + lens.xyz official launch | Public release |
| **v1.0+** | + iOS/Android mobile (Tauri 2 mobile) | All platforms |

**Key decisions**:
- **v0.1 is not CLI-only** — from the start it is a complete client; users need to be able to "see" what is in lens
- **CLI and GUI share one binary** — the same `lens-core` sidecar is used by both the Tauri GUI and CLI, zero code duplication
- **Knowledge Maps in v0.2** — v0.1 focuses on the core loop first; v0.2 adds the visual layer
- **Mobile in v1.0+** — but the tech stack (Tauri 2) reserves a path for mobile

### Forms Explicitly Not Pursued

- ❌ **Mobile app** (not in v0; v1.0+ will use Tauri 2 mobile, iOS first)
- ❌ **Cloud-hosted storage / multi-device sync service** — local-first storage is a core positioning principle
- ❌ **Electron** — too heavy: 200MB bundle, 200MB memory, 2-second startup. lens uses **Tauri 2** (see [`architecture.md`](./architecture.md) § 1.1)
- ❌ **Pure Web App (SaaS)** — violates local-first storage
- ❌ **Third-party integration network** (Slack/Notion/Readwise direct connections) — feature bloat trap

### Privacy Boundary (Honest Disclosure)

**Lens is "local-first storage + cloud-powered inference," not fully local inference.**

- **v0.1 – v0.2**: The Compilation Agent depends on **Anthropic Claude API** (structured extraction) and **Voyage AI API** (embedding). Users' source text (articles, notes) will be sent to these cloud APIs for processing
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

## V0.1 Minimum Viable (One-line Definition)

```
v0.1 = A Tauri 2 desktop app (macOS first) + CLI

Core validation goal: Can an LLM extract structured understanding
from real text that users trust?

Can ingest 3 source types (all immutable):
  - web_article (via Defuddle)
  - markdown / plain_text (pass-through)
  - manual_note (direct CLI input)

Can compile sources into Claim / Frame / Question
  (via Compilation Agent: short-lived agent per document, using pi-agent-core)
Can organize into Programme meta-structures

GUI views (Tauri desktop app):
  - Welcome / Onboarding (first-time API key setup + first ingest)
  - Programme Dashboard (Programme list + Hard Core / Belt / Questions overview)
  - Reader (source + excerpt view)
  - Claim Detail (Toulmin structure display)
  - Settings

CLI:
  - lens (no args) → launch GUI
  - lens ingest / context / show / search / ... → CLI commands
```

**v0.1 explicitly does not include** (see "Things Not in V0" section): chat growing source / auto-check / Bayesian updates / contradiction detection / PDF / Knowledge Maps / browser extension / MCP server.

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
