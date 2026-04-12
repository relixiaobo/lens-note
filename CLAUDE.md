# CLAUDE.md

## Project Overview

**lens** is a knowledge graph CLI for humans and agents. Like Git for knowledge — it stores, queries, and links. Any agent can use it. No API keys, no LLM dependencies.

**Status**: v0.3.0. Pure infrastructure. Zero LLM dependency. 5 core commands for agents.

**Key docs**: `docs/product-vision.md`, `docs/product-evolution.md`, `docs/refactor-plan.md`.

## Architecture

```
lens CLI (npm package, runs on Node.js via tsx)
├── Storage (File-as-Truth + SQLite derived cache)
│   Markdown files = truth, better-sqlite3 FTS5 = search cache
├── Write API (lens write: note/source/link/update/delete/batch)
├── Read API (lens search, show, list, links, context, digest)
├── Web extraction (Defuddle + Turndown → markdown)
└── RSS feeds (feedsmith, OPML import)
```

No agent framework. No LLM calls. No API keys. Agents provide the intelligence; lens provides the storage.

## 5 Core Commands (Agent-Facing)

```bash
lens search "<query>" --json     # Find notes (CJK-aware)
lens show <id> --json            # Read one object with full detail + links
lens write --json < input        # Write anything (stdin JSON)
lens fetch <url> [--save] --json # Extract web content
lens status --json               # Stats + health metrics
```

### `lens write` accepts JSON by type:

```json
{"type": "note", "text": "...", "role": "claim", "supports": ["note_ID"]}
{"type": "source", "title": "...", "url": "..."}
{"type": "link", "from": "note_ID", "rel": "supports", "to": "note_ID"}
{"type": "update", "id": "note_ID", "set": {...}, "add": {...}}
{"type": "delete", "id": "note_ID"}
[{...}, {...}]  // batch (atomic, $N references)
```

## Data Model

3 types, stored as `type/id.md`:

| Type | Prefix | Purpose |
|---|---|---|
| **Source** | `src_` | Provenance record |
| **Note** | `note_` | Universal knowledge card |
| **Thread** | `thr_` | Conversation record |

Note roles (soft hint): claim, frame, question, observation, connection, structure_note.
Links: supports, contradicts, refines, related.
File-as-Truth: Markdown files = source of truth. SQLite = derived cache.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js + tsx** | Runtime (>=20) |
| **better-sqlite3** | FTS5 search + links table |
| **Defuddle + linkedom** | Web extraction |
| **Turndown** | HTML → Markdown |
| **feedsmith** | RSS/Atom parsing |
| **gray-matter** | YAML frontmatter |
| **ulid** | ID generation |

## Project Structure

```
lens/
├── CLAUDE.md
├── packages/lens-core/src/
│   ├── main.ts              # CLI entry point
│   ├── cli/
│   │   ├── commands.ts      # Command registry
│   │   ├── write.ts         # lens write (unified write API)
│   │   ├── fetch.ts         # lens fetch (web extraction)
│   │   ├── search.ts        # lens search (FTS5 + CJK)
│   │   ├── show.ts, list.ts, links.ts, context.ts
│   │   ├── health.ts        # Graph health metrics
│   │   ├── digest.ts, status.ts, note.ts, ingest.ts
│   │   ├── feed.ts, init.ts, rebuild-index.ts
│   ├── core/
│   │   ├── types.ts         # Source, Note, Thread
│   │   ├── storage.ts       # File I/O + SQLite cache
│   │   └── paths.ts
│   ├── sources/
│   │   ├── web.ts           # Defuddle + Turndown
│   │   └── file.ts
│   └── feeds/
│       ├── feed-store.ts
│       └── feed-checker.ts
├── skills/
│   └── lens.claude-skill.md # Skill file for any agent
├── docs/
└── dist/lens                # Compiled binary
```

## Development

```bash
pnpm install
npx tsx packages/lens-core/src/main.ts <cmd>    # Dev mode
npx tsc --noEmit --project packages/lens-core/tsconfig.json  # Type check
npx lens-cli <cmd>                               # After npm publish
```

## Language Rules

- **All project artifacts in English**: code, comments, commits, docs, CLI output.

## Style

- Field names: `snake_case`
- Type names: `PascalCase`
- ID format: `<prefix>_<ULID>`
- ID prefixes: `src`, `note`, `thr`
