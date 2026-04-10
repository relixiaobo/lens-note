# CLAUDE.md

## Project Overview

**lens** is a structured cognition compiler — it compiles articles into structured Claims (assertions with evidence), Frames (perspectives), and Questions (open inquiries), organized into Programmes (research themes). Two equal users: humans (GUI) and agents (CLI).

**Status**: v0.1 CLI implementation complete. 6 commits, TypeScript zero errors, tested with real articles and RSS feeds.

## Architecture Summary

```
lens-core (Bun-compiled single binary, 63MB)
├── CLI entry point (src/main.ts)
├── Compilation Agent (pi-agent-core + pi-ai)
│   Reads source → explores existing knowledge → extracts Claims/Frames/Questions
├── Storage (File-as-Truth + SQLite derived cache)
│   Markdown files = truth, bun:sqlite FTS5 = search cache
├── RSS feeds (feedsmith, OPML import, autodiscovery)
└── Web extraction (Defuddle + Turndown → markdown)
```

GUI (Tauri + React) planned for v0.2. Currently CLI-only.

## Working CLI Commands

```bash
# Core
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

# All commands support --json for agent consumption
```

## Tech Stack

| Technology | Purpose |
|---|---|
| **Bun** | Runtime + compile to single binary (`bun build --compile`) |
| **bun:sqlite** | Built-in SQLite binding. FTS5 search + links table. Derived cache. |
| **pi-ai** | Unified LLM API (20+ providers). v0.1 uses Anthropic Claude Sonnet 4.6. |
| **pi-agent-core** | Agent runtime. Each ingest spawns a Compilation Agent. |
| **Defuddle + linkedom** | Web article extraction → clean HTML |
| **Turndown** | HTML → Markdown conversion |
| **feedsmith** | RSS/Atom/RDF/JSON Feed parsing + OPML import |
| **gray-matter** | YAML frontmatter parsing for markdown files |
| **ulid** | Time-sortable unique ID generation |
| **zod** | Runtime schema validation |
| **pnpm** | Monorepo workspace manager |

## Data Model

6 object types, all stored as `type/id.md`:

| Type | Prefix | Key Fields |
|---|---|---|
| **Source** | `src_` | title, url, word_count, source_type |
| **Claim** | `clm_` | statement, qualifier, voice, scope, evidence[], structure_type |
| **Frame** | `frm_` | name, sees, ignores, assumptions[] |
| **Question** | `q_` | text, question_status |
| **Programme** | `pgm_` | title, description (members reverse-queried) |
| **Thread** | `thr_` | title, references[], started_from |

Key design choices:
- **Typed fields** for relationships (not universal edges). Validated by research.
- **Evidence inline** in Claims (no separate Excerpt type). Source file has full text.
- **Programme doesn't store member lists** — reverse-queried via links table.
- **scope** field on Claims: `big_picture` (3-5 core insights) vs `detail` (supporting evidence). Drives 2-level display.
- **Related** field as escape hatch for untyped associations.

## Storage Layout

```
~/.lens/
├── sources/src_01.md        # Every object = type/id.md
├── claims/clm_01.md         # Frontmatter (≤20 lines) + body
├── frames/frm_01.md
├── questions/q_01.md
├── programmes/pgm_01.md     # Minimal: title + description
├── threads/thr_01.md
├── raw/                      # Original files (HTML, etc.)
│   └── src_01.html
├── feeds.json                # RSS feed subscriptions
├── index.sqlite              # Derived cache (FTS5 + links), rebuildable
└── config.yaml
```

## Key Design Decisions

1. **File-as-Truth**: Markdown files = source of truth. SQLite = derived cache (rebuildable). Reason: iCloud sync + data liberation.
2. **Compilation Agent**: Each `lens ingest` spawns a pi-agent-core agent that reads the source, explores existing knowledge, and extracts structured objects. Not a fixed pipeline.
3. **CLI + Skill as agent interface**: All commands support `--json`. Agents use bash. No MCP in v0.1.
4. **scope-based hierarchy**: Claims have `big_picture` or `detail` scope. Programme view shows Overview (3-5 core Claims) + Details (folded). Based on Reif/Miller and Minto Pyramid research.
5. **No LLM synthesis for display**: Structured data is rendered directly. No extra LLM call to generate narratives.
6. **RSS as input pipeline**: Feeds are checked, articles compiled. Results appear in digest/programme views. Feed management is in Settings, not a primary view.

## Project Structure

```
lens/
├── CLAUDE.md                 # This file
├── packages/lens-core/       # ALL code lives here
│   └── src/
│       ├── main.ts           # CLI entry point
│       ├── cli/              # Command handlers
│       │   ├── commands.ts   # Command registry + arg parsing
│       │   ├── digest.ts     # lens digest (temporal views)
│       │   ├── feed.ts       # lens feed (RSS management)
│       │   ├── ingest.ts     # lens ingest (fetch + compile)
│       │   ├── context.ts    # lens context (agent JSON)
│       │   ├── programme.ts  # lens programme (scope display)
│       │   ├── show.ts       # lens show (source contributions, claim evidence)
│       │   ├── search.ts     # lens search (FTS5)
│       │   ├── note.ts       # lens note
│       │   ├── init.ts       # lens init
│       │   ├── status.ts     # lens status
│       │   └── rebuild-index.ts
│       ├── core/             # Storage + types
│       │   ├── types.ts      # All TypeScript types
│       │   ├── storage.ts    # File I/O + SQLite cache + links
│       │   └── paths.ts      # File path resolution
│       ├── agent/            # Compilation Agent
│       │   ├── compilation-agent.ts  # pi-agent-core integration
│       │   └── process-output.ts     # Agent output → lens objects
│       ├── sources/          # Content extraction
│       │   ├── web.ts        # Defuddle + Turndown
│       │   └── file.ts       # Local file reading
│       └── feeds/            # RSS
│           ├── feed-store.ts # Feed subscription storage
│           └── feed-checker.ts # Feed polling + parsing
├── spike/                    # Validation scripts
├── skills/                   # Agent skill definitions
├── docs/                     # Design documents
└── dist/lens                 # Compiled binary (63MB)
```

## Development

```bash
pnpm install                                    # Install dependencies
bun run packages/lens-core/src/main.ts <cmd>    # Run CLI in dev mode
bun build --compile packages/lens-core/src/main.ts --outfile dist/lens  # Compile binary
npx tsc --noEmit --project packages/lens-core/tsconfig.json  # Type check
```

## Language Rules

- **Reply to the user in Chinese (中文)**. All conversational responses in Chinese.
- **All project artifacts in English**: code, comments, commits, docs, CLI output, error messages.

## Style and Conventions

- Field names: `snake_case`
- Enum values: `snake_case`
- Type names: `PascalCase`
- ID format: `<prefix>_<ULID>` (e.g. `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`)
- ID prefixes: `src` (Source), `clm` (Claim), `frm` (Frame), `q` (Question), `pgm` (Programme), `thr` (Thread)
