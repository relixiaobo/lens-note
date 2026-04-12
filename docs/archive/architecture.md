# Lens Architecture

Date: 2026-04-09
Version: `1.1` (updated to reflect v0.1 implementation)

This document defines the **technical architecture** of lens: the technology stack, how components are organized, how processes are divided, and how data flows. It serves as the bridge from design docs (positioning / methodology / schema) to code.

- `positioning.md` defines **what** lens is
- `methodology.md` defines **how** lens thinks
- `schema.md` defines **what lens's data looks like**
- `source-pipeline.md` defines **how lens ingests data**
- **This document** defines **how lens is built**

---

## 0. Status and Scope

### 0.1 What Is Implemented (v0.1)

The v0.1 CLI is **complete and working**. 6 commits, TypeScript zero errors, tested with real articles and RSS feeds.

v0.1 delivers:
- **Bun-compiled single binary** (63 MB), `bun build --compile` validated with bun:sqlite + all dependencies
- **Compilation Agent** (pi-agent-core) that reads sources, explores existing knowledge, and extracts Claims/Frames/Questions
- **Full CLI** with ingest, search, context, digest, feed, programme commands (all support `--json`)
- **RSS feed pipeline** with feedsmith, OPML import, and feed autodiscovery
- **File-as-Truth storage** with SQLite FTS5 derived cache

### 0.2 What Is Planned (v0.2+)

- **GUI**: Tauri 2 + React 19 desktop application (see Appendix A for design rationale)
- **sqlite-vec**: Embedding similarity search
- **Auto-check mechanism**: Background monitoring of `~/.claude/projects/` for new sessions
- **Mobile**: Tauri 2 iOS/Android (v1.0+)

---

## 1. Tech Stack

### 1.1 Runtime and Binary: **Bun**

**Decision**: Use **Bun** as runtime and `bun build --compile` to produce a single binary.

**Validated**: `bun build --compile` + `bun:sqlite` + Defuddle + pi-ai + pi-agent-core produces a working 63 MB binary. `bun:sqlite` is a Bun built-in (not an N-API native module), so no compatibility issues.

**Why Bun**:
- `bun build --compile` produces a single binary ([Bun docs](https://bun.sh/docs/bundler/executables))
- 5-10x faster startup than Node
- Built-in TypeScript, no extra compilation step needed
- `bun:sqlite` is built-in (no native addon needed, unlike better-sqlite3)
- Includes Node API + most of the npm ecosystem

### 1.2 Storage: **File-as-Truth + SQLite Derived Cache**

**Decisions**:

- **Markdown files + lean YAML frontmatter** as source of truth
- **bun:sqlite + FTS5** as derived cache (can be deleted and rebuilt)
- **sqlite-vec** deferred to v0.2 for embedding similarity
- **No `relations.jsonl`** — relationships are written directly in frontmatter typed fields

#### Why File-as-Truth Instead of SQLite-as-Truth

This decision went through three rounds of evaluation. File-as-Truth was chosen for the following reasons:

| Consideration | File-as-Truth | SQLite-as-Truth |
|---|---|---|
| **File-level sync (iCloud/Dropbox)** | Naturally supported, individual files sync independently | SQLite + WAL files must sync atomically, iCloud doesn't guarantee this — **data corruption risk** |
| **Data liberation** | User's understanding is plain text, data survives even if lens dies | Locked in binary format, requires export scripts |
| **Query performance** | Needs SQLite cache assistance | Natively fast |
| **Schema constraints** | Relies on code validation | CHECK / NOT NULL / FK |
| **Atomic writes** | Single file writes are atomic (rename), but cross-file writes are not | Transactions |

**Decisive factor**: lens promises "sync `~/.lens/` via iCloud / Dropbox / Syncthing." SQLite files have real data corruption risk under file-level sync (Obsidian and Logseq both chose individual files for this reason). Data liberation is also part of lens's core promise that "your understanding is yours."

#### Prerequisite: Objects Must Be Simple

File-as-Truth is viable on the premise that **frontmatter stays within 15-20 lines**. This requires:

1. **Cut fields after spike**: Claim reduced from 30+ fields to ~15 required fields (determined by spike results)
2. **Defer complex fields**: `confidence_history` arrays, `evidence_independence`, etc. deferred to v0.2
3. **Inline relationships**: `evidence: [quote, ...]`, `programmes: [pgm_id]` written directly in frontmatter, no separate relations file needed

Simplified Claim file example:

```yaml
---
id: clm_01HXY2K8WJ
type: claim
statement: "Modern Hopfield networks have exponential storage capacity"
qualifier: likely
voice: extracted
scope: big_picture
evidence:
  - "Krotov and Hopfield (2016) showed higher-order interaction functions achieve exponential capacity"
  - "Demircigil et al. (2017) provided formal proofs for the exponential storage bound"
warrant_frame: frm_01HXY4N0YL
programmes:
  - pgm_01HXY5O1ZM
structure_type: causal
created_at: "2026-04-09T14:23:01Z"
compiled_from: src_01HXY6P2AN
---

Modern Hopfield networks, introduced by Krotov and Hopfield (2016),
use higher-order interaction functions that achieve exponential storage
capacity, as demonstrated by Demircigil et al. (2017).
```

This ~15-line frontmatter is fully readable, editable, and Git-diffable.

#### Storage Layout: `~/.lens/`

Every object in lens follows the unified `type/id.md` pattern:

```
~/.lens/
├── sources/src_01.md           # Source content (frontmatter + full markdown body)
├── claims/clm_01.md            # Claims with inline evidence
├── frames/frm_01.md            # Frames (perspectives)
├── questions/q_01.md           # Open questions
├── programmes/pgm_01.md        # Research themes (members reverse-queried)
├── threads/thr_01.md           # Conversation threads (type exists, CLI not yet implemented)
├── raw/                        # Original files (audit / recompile)
│   └── src_01.html             #   Web page original HTML
├── feeds.json                  # RSS feed subscriptions
├── index.sqlite                # DERIVED CACHE (FTS5 + links table, rebuildable)
└── config.yaml                 # User configuration
```

**Storage rules**:
- Every object = `type/id.md` — no exceptions
- Every `.md` = frontmatter + body, same format everywhere
- `raw/` stores original files separately (audit/recompile purpose only)
- `index.sqlite` is derived cache, can be rebuilt from .md files via `lens rebuild-index`
- `feeds.json` stores RSS feed subscriptions (managed by feed commands)
- No nested directories per source, no `_meta.md` + `content.md` split

#### SQLite as Derived Cache: Its Role

SQLite is not the truth but is still the **primary read path** (same pattern as Obsidian):

```
Write flow: Code → write markdown file (truth) → update SQLite cache
Read flow:  Code → SQLite cache (vast majority of queries go here)
Rebuild:    lens rebuild-index → scan all .md → rebuild SQLite
```

**Not dual-write**: Files are the only write target. SQLite updates are best-effort cache refreshes. If an update fails, a dirty flag is set and the index is rebuilt on next startup.

```ts
async function saveObject(obj: LensObject) {
  await writeMarkdownFile(`${obj.type}s/${obj.id}.md`, obj); // truth
  try {
    indexer.update(obj); // cache, best-effort
  } catch {
    markIndexDirty(); // rebuild on next startup
  }
}
```

**Links table**: SQLite contains a `links` table for reverse queries (e.g., "which Claims belong to this Programme?"). This allows Programme to not store member lists — members are discovered by querying `SELECT * FROM links WHERE target = ?`.

#### Why sqlite-vec Instead of Other Vector DBs (v0.2)

| Option | Pros | Cons | Choose? |
|---|---|---|---|
| **sqlite-vec** | Vectors + FTS + metadata in the same cache DB | Relatively new | v0.2 |
| LanceDB | Good for big data | One more engine | No |
| ChromaDB | Simple API | Python dependency | No |

lens's data volume is small (thousands to tens of thousands of records), sqlite-vec is sufficient. v0.1 does not do embedding; v0.2 adds it.

### 1.3 Web Extraction: **Defuddle + Turndown**

**Defuddle** (by Kepano, Obsidian creator) extracts article content from web pages, producing clean HTML. It runs with **linkedom** as the DOM implementation (no browser required).

**Turndown** converts the clean HTML to Markdown, which becomes the body of the Source object. This two-step pipeline (Defuddle HTML extraction + Turndown markdown conversion) produces high-quality readable content.

The original HTML is preserved in `raw/src_XXX.html` for audit and potential recompilation.

### 1.4 RSS/Feed Support: **feedsmith**

**feedsmith** handles RSS/Atom/RDF/JSON Feed parsing and OPML import.

**Capabilities**:
- Parse RSS 2.0, Atom 1.0, RDF/RSS 1.0, and JSON Feed formats
- Import OPML files from feed readers (Reeder, Feedly, Inoreader, etc.)
- Feed autodiscovery: given a website URL, find the RSS feed automatically

**Feed workflow**:
1. `lens feed add <url>` — subscribes to a feed (autodiscovers RSS from website URLs)
2. `lens feed import <file.opml>` — bulk import from existing feed reader
3. `lens feed check` — polls all feeds, compiles new articles through the Compilation Agent
4. Feed subscriptions stored in `~/.lens/feeds.json`

### 1.5 LLM API: **pi-ai (Unified Multi-Provider Interface)**

[pi-mono](https://github.com/badlogic/pi-mono) — MIT open-source monorepo, by Mario Zechner

**Decision**: Use **`@mariozechner/pi-ai`** as the LLM invocation layer, not depending directly on `@anthropic-ai/sdk`.

**What is pi-ai**: A unified multi-LLM provider API supporting 20+ providers (Anthropic / OpenAI / Google / Mistral / Bedrock / Azure / xAI / Groq / OpenRouter / any OpenAI-compatible endpoint). Provides `stream()` / `complete()` interfaces with built-in tool calling (TypeBox schema), prompt caching, streaming, and cost/token tracking.

**Why pi-ai instead of using @anthropic-ai/sdk directly**:

| | Direct @anthropic-ai/sdk | pi-ai |
|---|---|---|
| v0.1 | Works | Works (Anthropic provider) |
| v0.2 multi-provider | Need to build abstraction layer ourselves | Already has 20+ providers, zero-code switching |
| Tool calling | Need to manually construct JSON schema | TypeBox schema + automatic validation |
| Cost tracking | Need to implement ourselves | Built-in token/cost tracking |
| Streaming | Need to handle manually | Unified streaming interface |

**v0.1 usage**: Configured with the Anthropic provider (Claude Sonnet 4.6). Uses `complete()` + tool calling for structured extraction. Claim/Frame/Question schemas are defined as TypeBox tool schemas, letting the LLM output structured data via tool calls (more reliable than prompt + JSON parse).

### 1.6 Agent Runtime: **pi-agent-core (Compilation Agent)**

From the same [pi-mono](https://github.com/badlogic/pi-mono) monorepo as pi-ai.

**Decision**: Use `@mariozechner/pi-agent-core` for the Compilation Agent that processes each ingested document.

**What it provides**:
- Agent loop (tool call → execute → feed result → repeat)
- Built-in tools: `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`
- Sequential and parallel tool execution
- beforeToolCall / afterToolCall hooks (for cost tracking, loop limits)
- Abort handling

**Why use it**: Each document ingested into lens is processed by a Compilation Agent — a short-lived agent that reads the source, explores existing lens knowledge, and extracts new Claims/Frames/Questions. This requires an agent loop, not a single LLM call. pi-agent-core provides exactly this, and its built-in tools (read, grep, bash, ls) are sufficient — no custom tools needed.

**The agent uses pi's built-in tools to**:
- `read` source markdown files and existing Claims/Frames
- `grep` for related content across ~/.lens/
- `ls` to explore directory structure
- `bash` to run `lens search --json` and `lens programme list --json`

**The agent does NOT write files directly**. It outputs structured JSON (Claims/Frames/Questions). lens-core processes this output: generates ULIDs, validates schema, writes markdown files, updates SQLite cache.

### 1.7 PDF Extraction: **Marker (User-Installed Python)**

Marker is a Python package requiring the user to `pip install marker-pdf`. lens detects it in PATH.

v0.2 will consider bundling (using PyInstaller to compile Marker into a binary, paired with Tauri sidecar).

### 1.8 Audio Transcription (v0.3)

Implementation deferred to v0.3:
- macOS Apple Silicon: **MLX Whisper** (Python sidecar)
- Other platforms: **whisper.cpp** (C++ sidecar)

### 1.9 Embeddings: **Voyage AI (v0.2)**

v0.1 does not use embeddings. v0.2 will add **Voyage AI** as the default embedding provider (voyage-3-large or better).

**Reasons**:
- Anthropic recommends Voyage as a pairing with Claude
- Quality significantly better than OpenAI ada-2 (see Voyage official benchmarks)
- Has a free tier available (50M tokens/month)

**Fallback**: OpenAI text-embedding-3-large; local (Ollama) as v0.3 privacy mode.

### 1.10 Complete Tech Stack Summary

| Technology | Purpose | Status |
|---|---|---|
| **Bun** | Runtime + compile to single binary (`bun build --compile`) | v0.1 implemented |
| **bun:sqlite** | Built-in SQLite binding. FTS5 search + links table. Derived cache. | v0.1 implemented |
| **pi-ai** | Unified LLM API (20+ providers). v0.1 uses Anthropic Claude Sonnet 4.6. | v0.1 implemented |
| **pi-agent-core** | Agent runtime. Each ingest spawns a Compilation Agent. | v0.1 implemented |
| **Defuddle + linkedom** | Web article extraction → clean HTML | v0.1 implemented |
| **Turndown** | HTML → Markdown conversion | v0.1 implemented |
| **feedsmith** | RSS/Atom/RDF/JSON Feed parsing + OPML import | v0.1 implemented |
| **gray-matter** | YAML frontmatter parsing for markdown files | v0.1 implemented |
| **ulid** | Time-sortable unique ID generation | v0.1 implemented |
| **zod** | Runtime schema validation | v0.1 implemented |
| **pnpm** | Monorepo workspace manager | v0.1 implemented |
| **Tauri 2** | Desktop GUI framework (React + Rust shell) | v0.2 planned |
| **React 19 + Vite** | Frontend UI | v0.2 planned |
| **TipTap / ProseMirror** | Rich text editor for GUI | v0.2 planned |
| **sqlite-vec** | Embedding similarity search extension | v0.2 planned |
| **Voyage AI** | Embedding provider | v0.2 planned |

---

## 2. Data Model

6 object types, all stored as `type/id.md`:

| Type | Prefix | Key Fields |
|---|---|---|
| **Source** | `src_` | title, url, word_count, source_type |
| **Claim** | `clm_` | statement, qualifier, voice, scope, evidence[], structure_type |
| **Frame** | `frm_` | name, sees, ignores, assumptions[] |
| **Question** | `q_` | text, question_status |
| **Programme** | `pgm_` | title, description (members reverse-queried via links table) |
| **Thread** | `thr_` | title, references[], started_from (type defined, CLI not yet implemented) |

### 2.1 Key Design Choices

- **Typed fields** for relationships (not universal edges). Each relationship type (e.g., `compiled_from`, `warrant_frame`, `programmes`) is a named field in frontmatter. This was validated by research — typed fields are more expressive and queryable than a generic edge table.
- **Evidence inline** in Claims. Evidence is stored as an array of quoted strings directly in the Claim's frontmatter. There is no separate Excerpt type — the Source file contains the full text, and Claims carry the specific evidence passages inline.
- **Programme doesn't store member lists**. Members (Claims, Frames, Questions that belong to a Programme) are discovered by reverse-querying the `links` table in SQLite: `SELECT source FROM links WHERE target = ? AND field = 'programmes'`.
- **scope** field on Claims: `big_picture` (3-5 core insights per source) vs `detail` (supporting evidence). This drives 2-level display: Programme view shows Overview (big_picture Claims) + Details (detail Claims, folded by default). Based on Reif/Miller cognitive hierarchy and Minto Pyramid research.
- **related** field as escape hatch for untyped associations that don't fit any typed field.

### 2.2 ID Format

- Pattern: `<prefix>_<ULID>` (e.g., `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`)
- Prefixes: `src` (Source), `clm` (Claim), `frm` (Frame), `q` (Question), `pgm` (Programme), `thr` (Thread)
- ULIDs are time-sortable, so chronological ordering is implicit

---

## 3. Component Architecture

### 3.1 Process Model (v0.1 — CLI Only)

In v0.1, lens is a **Bun-compiled CLI binary**:

```
┌──────────────────────────────────────────────────────────────┐
│  lens CLI (Bun-compiled single binary, 63 MB)                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CLI Entry (src/main.ts)                               │  │
│  │  ─ Parses args, dispatches to command handlers         │  │
│  └────────────────────────────────────────────────────────┘  │
│           │                                                   │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Command Handlers (src/cli/)                           │  │
│  │  ─ ingest, search, context, show, digest, feed,        │  │
│  │    programme, note, status, init, rebuild-index         │  │
│  └────────────────────────────────────────────────────────┘  │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  Core Storage     │  │  Compilation Agent               │ │
│  │  (src/core/)      │  │  (src/agent/)                    │ │
│  │  ─ File I/O       │  │  ─ pi-agent-core runtime         │ │
│  │  ─ bun:sqlite     │  │  ─ reads source, explores        │ │
│  │  ─ FTS5 + links   │  │    existing knowledge,           │ │
│  │  ─ gray-matter    │  │    extracts Claims/Frames/Qs     │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
│           │                         │                         │
│           ▼                         ▼                         │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  Sources          │  │  Feeds                           │ │
│  │  (src/sources/)   │  │  (src/feeds/)                    │ │
│  │  ─ Defuddle       │  │  ─ feedsmith (RSS/Atom/OPML)     │ │
│  │  ─ Turndown       │  │  ─ feed-store (feeds.json)       │ │
│  │  ─ linkedom       │  │  ─ feed-checker (poll + compile) │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ~/.lens/        │
                    │  Markdown files  │
                    │  + index.sqlite  │
                    │  + feeds.json    │
                    └─────────────────┘
```

### 3.2 Data Flow: Ingest Pipeline

When the user runs `lens ingest <url>`:

```
1. Acquire:   fetch(url) → raw HTML
2. Store raw: write raw/src_XXX.html (for audit)
3. Extract:   Defuddle + linkedom → clean HTML → Turndown → Markdown
4. Write:     sources/src_XXX.md (frontmatter + markdown body)
5. Compile:   Spawn Compilation Agent (pi-agent-core):
              ─ Agent reads the source document
              ─ Agent explores existing knowledge (grep related Claims/Frames,
                ls directory structure, bash to run lens search --json)
              ─ Agent extracts Claims / Frames / Questions
              ─ Agent outputs structured JSON
6. Process:   lens-core processes agent output:
              ─ Generate ULIDs for new objects
              ─ Validate schema (zod)
              ─ saveObject → write claims/clm_XXX.md, frames/frm_XXX.md, etc.
              ─ Update links in index.sqlite
7. Display:   Print summary to stdout (or JSON with --json)
```

### 3.3 Data Flow: Feed Check

When the user runs `lens feed check`:

```
1. Load:      Read feeds.json for subscriptions
2. Poll:      For each feed, fetch RSS/Atom via feedsmith
3. Filter:    Compare article GUIDs against already-ingested sources
4. Compile:   For each new article, run the full ingest pipeline (§3.2)
5. Update:    Update last_checked timestamps in feeds.json
```

With `--dry-run`, step 4 is skipped and new articles are listed without compiling.

### 3.4 CLI and Agent Interface

**All commands support `--json`** for agent consumption:

```bash
# Core commands
lens init                    # First-time setup (~/.lens/)
lens ingest <url|file>       # Fetch + Compilation Agent → Claims/Frames/Questions
lens note "<text>"           # Quick note
lens show <id>               # Show any object (source: contributions, claim: evidence)
lens search "<query>"        # FTS5 full-text search
lens context "<query>"       # Agent-ready JSON context pack
lens context "<q>" --scope big_picture  # Overview only (3-5 core Claims)

# Programmes
lens programme list          # List all Programmes with member counts
lens programme show <id>     # 2-level display: Overview + Details (use --full)

# Digest (temporal views)
lens digest                  # Today's new insights, tensions, perspectives
lens digest week             # This week
lens digest month            # This month (compact)
lens digest year             # This year (compact)

# RSS Feeds
lens feed add <url>          # Subscribe (auto-discovers RSS from website URLs)
lens feed import <file.opml> # Import from Reeder/Feedly/Inoreader
lens feed list               # List subscriptions
lens feed check              # Check all feeds, compile new articles
lens feed check --dry-run    # Check without compiling
lens feed remove <id|url>    # Unsubscribe

# Maintenance
lens status                  # System status (object counts, cache size)
lens rebuild-index           # Rebuild SQLite cache from markdown files
```

**Agent integration**: Agents (Claude Code, Cursor, etc.) use `lens` via bash. The `--json` flag on every command provides structured output. No MCP server in v0.1 (v0.3 community can wrap if desired).

---

## 4. Project Structure

```
lens/
├── CLAUDE.md                     # Up-to-date project reference
├── packages/
│   └── lens-core/                # ALL code lives here (v0.1)
│       ├── src/
│       │   ├── main.ts           # CLI entry point
│       │   ├── cli/              # Command handlers
│       │   │   ├── commands.ts   # Command registry + arg parsing
│       │   │   ├── digest.ts     # lens digest (temporal views)
│       │   │   ├── feed.ts       # lens feed (RSS management)
│       │   │   ├── ingest.ts     # lens ingest (fetch + compile)
│       │   │   ├── context.ts    # lens context (agent JSON)
│       │   │   ├── programme.ts  # lens programme (scope display)
│       │   │   ├── show.ts       # lens show (source contributions, claim evidence)
│       │   │   ├── search.ts     # lens search (FTS5)
│       │   │   ├── note.ts       # lens note
│       │   │   ├── init.ts       # lens init
│       │   │   ├── status.ts     # lens status
│       │   │   └── rebuild-index.ts
│       │   ├── core/             # Storage + types
│       │   │   ├── types.ts      # All TypeScript types
│       │   │   ├── storage.ts    # File I/O + SQLite cache + links
│       │   │   └── paths.ts      # File path resolution
│       │   ├── agent/            # Compilation Agent
│       │   │   ├── compilation-agent.ts  # pi-agent-core integration
│       │   │   └── process-output.ts     # Agent output → lens objects
│       │   ├── sources/          # Content extraction
│       │   │   ├── web.ts        # Defuddle + Turndown
│       │   │   └── file.ts       # Local file reading
│       │   └── feeds/            # RSS
│       │       ├── feed-store.ts # Feed subscription storage
│       │       └── feed-checker.ts # Feed polling + parsing
│       ├── package.json
│       └── tsconfig.json
├── spike/                        # Validation scripts + benchmarks
├── skills/                       # Agent skill definitions
├── docs/                         # Design documents
│   ├── architecture.md           # This file
│   ├── positioning.md
│   ├── methodology.md
│   ├── schema.md
│   ├── source-pipeline.md
│   ├── roadmap.md
│   ├── getting-started.md
│   └── references.md
├── dist/lens                     # Compiled binary (63 MB)
├── package.json                  # Workspace root
└── pnpm-workspace.yaml          # pnpm workspaces
```

**Key points**:
- **Monorepo**, using pnpm workspaces
- **v0.1 has one package**: lens-core (Bun-compiled CLI)
- **v0.2 will add**: lens-ui (React frontend) and lens-tauri (Rust shell)
- **lens-core runs independently**: it is both the CLI binary and will serve as the Tauri sidecar in v0.2

---

## 5. Benchmark Results

Benchmark suite is in `spike/benchmark.ts`. Measured on development machine.

| Metric | Result | Notes |
|---|---|---|
| **Binary startup** (`lens --version`) | ~14 ms | Bun-compiled, 63 MB binary |
| **FTS5 search** (`lens search`) | ~30 ms | Including process startup |
| **Context query** (`lens context`) | ~30 ms | SQLite FTS5, no embedding |
| **Status command** | ~30 ms | Object counts + cache stats |
| **Digest** | ~30 ms | Temporal aggregation from SQLite |
| **Programme list** | ~30 ms | Reverse-query via links table |
| **Index rebuild** | < 1 s | For typical knowledge base (dozens of sources) |
| **Article ingest** | 15-45 s | Dominated by LLM Compilation Agent time |

CLI overhead is dominated by Bun process startup (~14 ms). All local operations (search, context, show, digest) complete in under 50 ms total, well below the 200 ms perceptual threshold.

---

## 6. Summary of Key Architecture Decisions

| # | Decision | Rationale |
|---|---|---|
| A1 | File-as-Truth + SQLite derived cache | iCloud sync compatibility + data liberation + agents can read files directly |
| A2 | Unified `type/id.md` storage pattern | Every object same format: frontmatter + body, simple and consistent |
| A3 | Bun-compiled single binary | Fast startup (14 ms), single file distribution, built-in SQLite |
| A4 | bun:sqlite (not better-sqlite3) | Built-in to Bun, no N-API compatibility issues, works with `bun build --compile` |
| A5 | pi-ai + pi-agent-core | Unified LLM API (20+ providers) + Compilation Agent loop |
| A6 | Compilation Agent per document | Each ingest spawns a pi-agent-core agent that reads, explores, and extracts — not a fixed pipeline |
| A7 | Agent uses pi's built-in tools only | No custom tools needed — read, grep, ls, bash sufficient for Compilation Agent |
| A8 | Defuddle + Turndown for web extraction | Defuddle (by Kepano) for article extraction, Turndown for HTML→Markdown |
| A9 | feedsmith for RSS/feeds | RSS/Atom/RDF/JSON Feed + OPML import in one library |
| A10 | Typed fields for relationships | Not universal edges — each relationship is a named field, validated by research |
| A11 | Evidence inline in Claims | No separate Excerpt type — source has full text, claims carry specific evidence |
| A12 | Programme members reverse-queried | Programme doesn't store member lists — links table enables reverse queries |
| A13 | Scope field on Claims | `big_picture` vs `detail` drives 2-level display (Reif/Miller + Minto Pyramid) |
| A14 | All CLI commands support `--json` | Agents consume structured output, humans consume human-readable output |
| A15 | CLI + Skill as agent interface | CLI does work, Skill tells agents how to install and use. No MCP in v0.1 |
| A16 | `lens context --json` query-time inline | Agent gets claim + evidence + frame in one call, files don't store redundancy |
| A17 | Monorepo with pnpm workspaces | Shared types, single repo |

---

## Appendix A: GUI Design Rationale (v0.2)

The following decisions are locked in for v0.2 GUI implementation but are not yet built.

### A.1 Desktop Framework: Tauri 2

[Tauri v2 2024-10 stable release](https://v2.tauri.app/blog/tauri-20/)

**Comparison data** ([pkgpulse 2026 comparison](https://www.pkgpulse.com/blog/tauri-vs-electron-vs-neutralino-desktop-apps-javascript-2026)):

| Metric | Electron | Tauri 2 |
|---|---|---|
| Idle memory | ~200 MB | ~30 MB |
| Bundle size | 80-200 MB | 2-10 MB |
| Startup time | 1-2 seconds | < 0.5 seconds |
| Security model | Broad OS/Node access | Allowlist + Rust backend |
| Mobile (iOS/Android) | No | Yes (v2) |

**Why Tauri**:
1. **Lens's data is the user's most sensitive content** (chat logs, thoughts) — must use the strictest security model
2. **Startup speed is critical for a "reference tool"** — users looking up context can't wait 2 seconds
3. **Bundle size is an order of magnitude smaller** — 2-10 MB vs 80-200 MB
4. **Future mobile in the same codebase** — no rewrite needed
5. **Memory 30 MB vs 200 MB** — lens is a "background-resident" type tool

### A.2 Frontend Stack

- **React 19 + Vite + TypeScript 5.5**: Team familiarity, mature ecosystem
- **Tailwind CSS 4**: Fits lens's "Clean Paper" design system
- **Zustand**: State management (4KB)
- **shadcn/ui**: Accessible primitives based on Radix UI
- **TipTap (ProseMirror)**: Rich text editor, supports markdown/HTML/JSON serialization

### A.3 Three-Layer Architecture (v0.2)

When the GUI is added, lens becomes a three-layer application:

```
Tauri App
├── Rust Layer (IPC, OS integration, sidecar management)
├── React Frontend (Reader, Programme, Knowledge Maps, Settings)
└── lens-core Sidecar (current CLI binary, invoked by Rust)
```

CLI and GUI share the same lens-core logic. Power users continue to use CLI directly. Agents call CLI via bash.

### A.4 Mobile Strategy (v1.0+)

Tauri 2 supports iOS + Android. lens on mobile would likely be a **viewer** (no compiling), with heavy tasks delegated to desktop. Not in v0 scope.

---

## Appendix B: Auto-Check Mechanism (v0.2)

`source-pipeline.md` defines the auto-check flow for monitoring `~/.claude/projects/` for new sessions. Implementation requires the GUI:

- **GUI mode**: lens-core sidecar runs as persistent subprocess with internal scheduler (tick every 5 minutes)
- **CLI mode**: Each invocation checks once if more than 5 minutes have passed
- **GUI closed, no CLI**: lens does not proactively check (acceptable — if the user isn't using it, they aren't using it)

---
