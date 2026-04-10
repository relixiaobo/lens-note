# CLAUDE.md

## Project Overview

**lens** is a Zettelkasten-native knowledge compiler. It ingests articles and extracts atomic Notes (claims, frames, questions, observations) linked to each other and to Sources. Structure emerges from links, not containers. Two equal users: humans (GUI) and agents (CLI).

**Status**: v0.2.0-dev. Zettelkasten-native redesign complete. 3 types (Source, Note, Thread), links only, no Programme. CLI working.

## Architecture Summary

```
lens-core (Bun-compiled single binary)
├── CLI entry point (src/main.ts)
├── Thinker Agent (pi-agent-core + pi-ai)
│   Reads source → explores existing notes → thinks → creates linked Notes
├── Storage (File-as-Truth + SQLite derived cache)
│   Markdown files = truth, bun:sqlite FTS5 = search cache
├── RSS feeds (feedsmith, OPML import, autodiscovery)
└── Web extraction (Defuddle + Turndown → markdown)
```

lens-core only in v0.2. GUI (lens-ui, lens-tauri) planned for v0.3+.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Bun** | Runtime + compile to single binary (`bun build --compile`) |
| **bun:sqlite** | Built-in SQLite binding. FTS5 search + links table. Derived cache. |
| **pi-ai** | Unified LLM API (20+ providers). Uses Anthropic Claude Sonnet. |
| **pi-agent-core** | Agent runtime. Each ingest spawns a Thinker Agent. |
| **Defuddle + linkedom** | Web article extraction → clean HTML |
| **Turndown** | HTML → Markdown conversion |
| **feedsmith** | RSS/Atom/RDF/JSON Feed parsing + OPML import |
| **gray-matter** | YAML frontmatter parsing for markdown files |
| **ulid** | Time-sortable unique ID generation |
| **zod** | Runtime schema validation |
| **pnpm** | Monorepo workspace manager |

## Data Model

3 object types, all stored as `type/id.md`:

| Type | Prefix | Purpose |
|---|---|---|
| **Source** | `src_` | Provenance record. title, url, word_count, source_type |
| **Note** | `note_` | Universal knowledge card. One idea per card. |
| **Thread** | `thr_` | Conversation about Notes. references[], started_from |

### Note: the universal card

Note is a single type with optional fields. Role (`claim`, `frame`, `question`, `observation`, `connection`, `structure_note`) is a soft hint for display, not a constraint.

| Optional Fields | When Present |
|---|---|
| `evidence[]`, `qualifier`, `voice` | Claim (Toulmin) |
| `sees`, `ignores`, `assumptions[]` | Frame |
| `question_status` | Question |
| `bridges[]` | Connection note |
| `entries[]` | Structure note (index) |
| `scope` | `big_picture` or `detail` (Reif/Miller hierarchy) |

### Links are the only structure

Notes grow through incoming links. No containers.

| Link Type | Meaning |
|---|---|
| `supports` | Evidence or agreement |
| `contradicts` | Tension or disagreement |
| `refines` | Nuance or narrowing |
| `related` | Untyped association (with optional annotation) |

## Storage Layout

```
~/.lens/
├── sources/src_01.md         # Every object = type/id.md
├── notes/note_01.md          # Frontmatter (YAML) + body (markdown)
├── threads/thr_01.md
├── raw/                      # Original files (HTML, etc.)
│   └── src_01.html
├── feeds.json                # RSS feed subscriptions
├── index.sqlite              # Derived cache (FTS5 + links), rebuildable
└── config.yaml
```

3 ID prefixes: `src_`, `note_`, `thr_`.

## Working CLI Commands

```bash
# Browsing
lens list notes               # List all notes
lens list notes --role claim   # Filter by role (claim, frame, question, ...)
lens list sources              # List all sources
lens list threads              # List all threads
lens show <id>                 # Show any object with its links
lens search "<query>"          # FTS5 full-text search
lens links <id>                # Show link graph for an object

# Agent interface
lens context "<query>"         # Agent-ready JSON context pack

# Ingestion
lens ingest <url|file>         # Fetch + Thinker Agent → linked Notes
lens note "<text>"             # Quick manual note

# RSS Feeds
lens feed add <url>            # Subscribe (auto-discovers RSS)
lens feed import <file.opml>   # Import from Reeder/Feedly/Inoreader
lens feed list                 # List subscriptions
lens feed check                # Check all feeds, compile new articles
lens feed check --dry-run      # Check without compiling
lens feed remove <id|url>      # Unsubscribe

# Temporal
lens digest                    # Today's new insights
lens digest week               # This week
lens digest month              # This month

# Maintenance
lens status                    # System status (object counts, cache size)
lens rebuild-index             # Rebuild SQLite cache from markdown files

# All commands support --json for agent consumption
```

## Key Design Decisions

1. **Zettelkasten model (Luhmann)**: One idea per card. Structure emerges from links between cards, not from categories or containers. Notes grow in value as they accumulate incoming links.
2. **Thinker Agent, not Extractor**: The agent reads the source, explores existing notes, thinks about connections, and creates new linked Notes. It is a thinking partner, not a mechanical extractor.
3. **Links only, no containers**: No Programme, no folders, no tags-as-categories. Related notes find each other through typed links (supports, contradicts, refines, related).
4. **Note growth through incoming links**: A note's importance is visible by how many other notes link to it. No explicit ranking needed.
5. **File-as-Truth**: Markdown files = source of truth. SQLite = derived cache (rebuildable). Reason: iCloud sync + data liberation.
6. **Role is a soft hint**: Note.role (`claim`, `frame`, `question`, ...) is for display convenience. The optional fields determine what a note actually is.
7. **No LLM synthesis for display**: Structured data is rendered directly. No extra LLM call to generate narratives.
8. **RSS as input pipeline**: Feeds are checked, articles compiled into Notes. Feed management is plumbing, not a primary view.

## Project Structure

```
lens/
├── CLAUDE.md                 # This file
├── packages/lens-core/       # ALL code lives here
│   └── src/
│       ├── main.ts           # CLI entry point
│       ├── cli/              # Command handlers
│       │   ├── commands.ts   # Command registry + arg parsing
│       │   ├── list.ts       # lens list (notes/sources/threads, --role filter)
│       │   ├── show.ts       # lens show (object + links)
│       │   ├── search.ts     # lens search (FTS5)
│       │   ├── links.ts      # lens links (link graph)
│       │   ├── context.ts    # lens context (agent JSON)
│       │   ├── digest.ts     # lens digest (temporal views)
│       │   ├── feed.ts       # lens feed (RSS management)
│       │   ├── ingest.ts     # lens ingest (fetch + compile)
│       │   ├── note.ts       # lens note (quick note)
│       │   ├── init.ts       # lens init
│       │   ├── status.ts     # lens status
│       │   └── rebuild-index.ts
│       ├── core/             # Storage + types
│       │   ├── types.ts      # All TypeScript types (Source, Note, Thread)
│       │   ├── storage.ts    # File I/O + SQLite cache + links
│       │   └── paths.ts      # File path resolution
│       ├── agent/            # Thinker Agent
│       │   ├── compilation-agent.ts  # pi-agent-core integration
│       │   └── process-output.ts     # Agent output → Note objects
│       ├── sources/          # Content extraction
│       │   ├── web.ts        # Defuddle + Turndown
│       │   └── file.ts       # Local file reading
│       └── feeds/            # RSS
│           ├── feed-store.ts # Feed subscription storage
│           └── feed-checker.ts # Feed polling + parsing
├── spike/                    # Validation scripts
├── skills/                   # Agent skill definitions
├── docs/                     # Design documents
└── dist/lens                 # Compiled binary
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
- ID format: `<prefix>_<ULID>` (e.g. `note_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`)
- ID prefixes: `src` (Source), `note` (Note), `thr` (Thread)
