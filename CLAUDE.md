# CLAUDE.md

## Project Overview

**lens** is a knowledge graph CLI for humans and agents. Like Git for knowledge — it stores, queries, and links. Any agent can use it. No API keys, no LLM dependencies.

**Status**: v1.0. Pure infrastructure. Zero LLM dependency. 5 core commands. Git version tracking.

**Methodology**: The Collision Method — Spark → Collide → Crystallize. Knowledge grows through collision, not collection.

**Key docs**: `docs/product-vision.md`, `docs/product-evolution.md`.

## Architecture

```
lens CLI (npm package: lens-note, compiled JS via tsup)
├── Storage (File-as-Truth + SQLite cache + Git version tracking)
│   Markdown files = truth, better-sqlite3 FTS5 = search cache, git = history
├── Write API (lens write: note/source/link/update/delete/batch)
├── Read API (lens search, show, list, links, context, digest)
├── Web extraction (Defuddle + Turndown → markdown)
└── RSS feeds (feedsmith, OPML import)
```

## 5 Core Commands

```bash
lens search "<query>" --json     # Find knowledge (CJK-aware)
lens show <id> --json            # Read one object with links + reasons
lens write --file <path> --json  # Write anything (note/source/link/batch)
lens fetch <url> [--save] --json # Extract web content
lens status --json               # Stats + graph health
```

### Agent Mode (--stdin)

All commands can be called via `--stdin` with a JSON request envelope — bypasses shell escaping entirely:

```bash
printf '%s' '{"command":"write","input":{"type":"note","title":"...","body":"..."}}' | lens --stdin
printf '%s' '{"command":"search","positional":["query"]}' | lens --stdin
printf '%s' '{"command":"fetch","positional":["https://..."],"flags":{"save":true}}' | lens --stdin
```

Envelope: `{"command":"...", "positional":["..."], "flags":{...}, "input":{...}}`
- `positional` — command arguments (query text, ID, URL)
- `flags` — options like `save`, `since`
- `input` — structured payload for `write` (note/source/link objects, or batch array)

## Data Model

### Note (7 frontmatter fields + body)

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
Body: evidence, reasoning, qualifier, scope, frames — all as natural markdown.
```

### Source

```yaml
---
id: src_01ABC
type: source
title: "Article Title"
source_type: web_article
url: https://example.com
word_count: 2718
created_at: '2026-04-13T02:50:14.932Z'
---
Full article content in markdown.
```

### Links

Unified `links[]` array with `{to, rel, reason}`:
- `supports` — strengthens another note
- `contradicts` — conflicts (auto-bidirectional)
- `refines` — more precise version
- `related` — loose association

### Write API

```json
{"type": "note", "title": "...", "links": [{"to": "note_ID", "rel": "supports", "reason": "..."}], "body": "..."}
{"type": "source", "title": "...", "url": "..."}
{"type": "link", "from": "note_A", "rel": "supports", "to": "note_B", "reason": "..."}
{"type": "update", "id": "note_A", "set": {"title": "..."}, "add": {"links": [...]}}
{"type": "delete", "id": "note_A"}
[{...}, {...}]  // batch, $0/$1 reference earlier items
```

## Storage

```
~/.lens/ (git-tracked)
├── notes/note_01.md      # Frontmatter (YAML) + body (markdown)
├── sources/src_01.md
├── threads/thr_01.md
├── raw/                  # Original files
├── .git/                 # Version history
├── .gitignore            # Excludes SQLite cache
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
npx tsc --noEmit --project packages/lens-core/tsconfig.json  # Type check
cd packages/lens-core && npx tsup && npm publish --access public  # Publish
```

## Change Protocol

When modifying the data model (`types.ts`), check ALL downstream references:

```bash
# Run from project root — checks both lens and lens-note-plugin repos
grep -rn 'role\|qualifier\|scope\|voice\|evidence\|status\|entries\|sees\|ignores\|assumptions' \
  docs/ skills/ README.md CLAUDE.md \
  ../lens-note-plugin/plugin/skills/ \
  --include='*.md' | grep -v archive/
```

Downstream files that reference the data model:
- `README.md` — Write API examples, Data Model section
- `CLAUDE.md` — Data Model section
- `docs/product-vision.md` — Note card description, Write API
- `docs/product-evolution.md` — Design decisions
- `../lens-note-plugin/plugin/skills/lens/SKILL.md` — Write API Reference, mode examples
- `../lens-note-plugin/plugin/skills/lens/references/compilation.md` — Crystallization table
- `../lens-note-plugin/plugin/skills/lens/references/curation.md` — Merge/supersede examples
- `../lens-note-plugin/plugin/skills/lens/references/note-fields.md` — Field reference table

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
- ID prefixes: `src`, `note`, `thr`
