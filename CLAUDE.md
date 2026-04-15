# CLAUDE.md

## Project Overview

**lens** is a knowledge graph CLI for humans and agents. Like Git for knowledge — it stores, queries, and links. Any agent can use it. No API keys, no LLM dependencies.

**Status**: v1.7.6. 3 types (Source, Note, Task). --stdin agent mode. Git version tracking. `indexes` rel + `[[ID]]` body refs.

**Methodology**: The Collision Method — Spark → Collide → Crystallize. Knowledge grows through collision, not collection.

**Key docs**: `docs/product-vision.md`, `docs/product-evolution.md`, `docs/task-design.md`.

## Architecture

```
lens CLI (npm package: lens-note, compiled JS via tsup)
├── Storage (File-as-Truth + SQLite cache + Git version tracking)
│   Markdown files = truth, better-sqlite3 FTS5 = search cache, git = history
├── Write API (lens write: note/source/task/link/unlink/update/delete/batch)
├── Read API (lens search, show, list, links, tasks, context, digest)
├── Agent Mode (--stdin: JSON envelope, bypasses shell)
├── Web extraction (Defuddle + Turndown → markdown)
└── RSS feeds (feedsmith, OPML import)
```

## Commands

```bash
lens search "<query>" --json            # Find knowledge (CJK-aware)
lens search "<query>" --resolve --json  # Resolve title → ID (exact or disambiguate)
lens show <id> --json                   # Read one object with body + forward/backward links
lens links <id> --json                  # Show all relationships (forward + backward)
lens write --file <path> --json         # Write note/source/task/link/unlink/update/delete/batch
lens list notes --orphans --json        # List orphan notes (+ --limit/--offset)
lens list notes --since 7d --json       # List notes from last 7 days
lens fetch <url> [--save] --json        # Extract web content
lens similar <id> --json                # Find near-duplicate notes (+ --threshold)
lens similar --all --json               # Scan all notes, group duplicates
lens context "<query>" --json           # Assemble full context pack (notes with bodies)
lens digest [week|month|year] --json    # Recent insights summary (tensions/connected/seeds)
lens index --json                       # List keyword entry points (Schlagwortregister)
lens index add "<kw>" <id> --json       # Register entry point (max 3 per keyword)
lens status --json                      # Stats + graph health + user context
lens tasks [--all|--done] --json        # List tasks
lens config list --json                 # Show all config
lens config set context.role "PM" --json # Set user context
```

### Agent Mode (--stdin)

All commands via `--stdin` — JSON envelope, bypasses shell escaping:

```bash
printf '%s' '{"command":"write","input":{"type":"note","title":"...","body":"..."}}' | lens --stdin
printf '%s' '{"command":"search","positional":["query"]}' | lens --stdin
printf '%s' '{"command":"fetch","positional":["https://..."],"flags":{"save":true}}' | lens --stdin
```

Envelope: `{"command":"...", "positional":[], "flags":{}, "input":{}}`

## Data Model

3 types, each a markdown file with YAML frontmatter:

### Note (7 fields + body)

```yaml
---
id: note_01ABC
type: note
title: "High internal quality has negative cost in software"
source: src_01DEF
links:
  - to: note_01GHI
    rel: contradicts
    reason: "AI changes the cost equation"
created_at: '2026-04-13T02:50:14.932Z'
updated_at: '2026-04-13T02:50:14.932Z'
---
Evidence, reasoning, perspective — all as natural markdown body.
```

### Source

```yaml
---
id: src_01ABC
type: source
source_type: web_article    # book | paper | report | video | podcast | course | web_article | newsletter | social_post | conversation | manual_note | note_batch | markdown | plain_text
title: "Article Title"
url: https://example.com
word_count: 2718
created_at: '2026-04-13T02:50:14.932Z'
---
Full article content in markdown.
```

### Task

```yaml
---
id: task_01ABC
type: task
title: "Refactor search module"
status: open                # open | done
source: note_01DEF          # optional: what prompted this task
links:
  - to: note_01GHI
    rel: related
    reason: "Inspired by this insight"
created_at: '2026-04-13T02:50:14.932Z'
updated_at: '2026-04-13T02:50:14.932Z'
---
Task description and progress notes.
```

### Links

`links[]` array with `{to, rel, reason}`:
- `supports` — strengthens another note
- `contradicts` — conflicts (auto-bidirectional)
- `refines` — more precise version
- `related` — loose association
- `indexes` — MOC/index entry point (directional: index → child)

### Body Inline References

When referencing another object in body text, use double-bracket syntax with the object ID:

```markdown
[[note_01ABC]]   [[src_01DEF]]   [[task_01GHI]]
```

Same ID as `links[].to`. On read, JSON output (`--json`) returns body unchanged + `body_refs: [{id, title}]` with resolved titles. Text output resolves `[[ID]]` → `[Title](ID)` inline. Body references are for **readability only** — they do not create graph edges. To create an actual graph connection, add an entry to `links[]`. For MOC/index notes, use `rel: "indexes"` in `links[]` for each sub-note.

### Write API

```json
{"type": "note", "title": "...", "links": [{"to": "note_ID", "rel": "supports", "reason": "..."}], "body": "..."}
{"type": "source", "title": "...", "url": "...", "source_type": "web_article"}
{"type": "task", "title": "...", "status": "open"}
{"type": "link", "from": "note_A", "rel": "supports", "to": "note_B", "reason": "..."}
{"type": "unlink", "from": "note_A", "rel": "supports", "to": "note_B"}
{"type": "update", "id": "note_A", "set": {"title": "..."}, "add": {"links": [...]}}
{"type": "delete", "id": "note_A"}
[{...}, {...}]  // batch, $0/$1 reference earlier items
```

## Storage

```
~/.lens/ (git-tracked)
├── notes/note_01.md
├── sources/src_01.md
├── tasks/task_01.md
├── raw/                  # Original files (HTML etc)
├── .git/                 # Version history
├── index.sqlite          # Derived cache (FTS5 + links)
└── config.yaml
```

Every write auto-commits to git. `git log notes/note_01.md` shows full evolution.

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
| **tsup** | Build (TS → JS) |

## Development

```bash
pnpm install
npx tsx packages/lens-core/src/main.ts <cmd>    # Dev mode
cd packages/lens-core && npm test               # Run tests
npx tsc --noEmit --project packages/lens-core/tsconfig.json  # Type check
cd packages/lens-core && npx tsup && npm publish --access public  # Publish
```

## Change Protocol

When modifying the data model (`types.ts`), check ALL downstream references:

```bash
# Run from project root — checks both lens and lens-note-plugin repos
grep -rn 'ObjectType\|NoteLink\|LinkRel\|TaskStatus\|SourceType\|LensObject' \
  packages/lens-core/src/ --include='*.ts' | grep -v node_modules
```

Downstream files that reference the data model:
- `README.md` — Commands, Data Model section
- `CLAUDE.md` — Data Model section
- `docs/product-vision.md` — Data Model table
- `../lens-note-plugin/plugin/skills/lens/SKILL.md` — Commands, Write API Reference
- `../lens-note-plugin/plugin/skills/lens/references/note-fields.md` — Field reference table
- `../lens-note-plugin/plugin/skills/lens/references/tasks.md` — Task examples
- `../lens-note-plugin/plugin/skills/lens/references/compilation.md` — Write examples
- `../lens-note-plugin/plugin/skills/lens/references/curation.md` — Update/link examples

### Publish checklist

When publishing changes, bump versions and push in order:

1. **lens-note (npm)**: `packages/lens-core/package.json` version + `main.ts` version string → `tsup` → `npm publish`
2. **lens-note-plugin**: `plugin/.claude-plugin/plugin.json` version + `marketplace.json` version → `git push`
3. **Local install**: `npm install -g lens-note@latest` → verify `lens --version`

## Language Rules

- **All project artifacts in English**: code, comments, commits, docs, CLI output.

## Style

- Field names: `snake_case`
- Type names: `PascalCase`
- ID format: `<prefix>_<ULID>`
- ID prefixes: `src`, `note`, `task`
