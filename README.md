# lens

**Knowledge graph CLI for AI agents.** Like Git for code, lens is for knowledge — any agent can store, query, and link persistent understanding across sessions.

Zero LLM dependency. Zero API keys. Your agent thinks; lens stores.

## Install

```bash
npm install -g lens-note
lens init
```

Requires Node.js >= 20.

## Quick Start

```bash
# Write a note
printf '%s' '{"command":"write","input":{"type":"note","title":"Simple tools beat complex frameworks","body":"Composability > features."}}' | lens --stdin

# Search
printf '%s' '{"command":"search","positional":["simple tools"]}' | lens --stdin

# Show a note with links
printf '%s' '{"command":"show","positional":["note_01ABC..."]}' | lens --stdin

# Link two notes
printf '%s' '{"command":"write","input":{"type":"link","from":"note_A","rel":"supports","to":"note_B","reason":"both argue for minimalism"}}' | lens --stdin
```

## Commands

### Search & Read

```bash
lens search "<query>" --json              # Full-text search (Unicode/CJK-aware)
lens search "<query>" --resolve --json    # Resolve title → ID (exact match first)
lens search "<query>" --expand --json     # Search with full bodies + links (for synthesis)
lens search "<query>" --limit 5 --json    # Cap results
lens show <id> [id2...] --json            # Show object(s) with body + links (batch supported)
lens links <id> --json                    # All relationships (forward + backward)
lens links <id> --rel related --json      # Filter by rel type
lens links <id> --direction forward --json # Only outgoing links
```

### Browse

```bash
lens list notes --json                    # List all notes
lens list notes --orphans --json          # Unlinked notes (+ --limit/--offset)
lens list notes --since 7d --json         # Time filter (7d/2w/1m/1y)
lens list notes --min-links 10 --json     # Hub notes by link count
lens list notes --max-links 0 --json      # Isolated notes
lens list sources --source-type book --json # Filter by source type
lens list sources --inbox --json          # Sources awaiting agent processing
lens list sources --fields url --json     # Project to url only (clippers/manifests)
lens list tasks --status open --json      # Tasks by status (open/done)
```

### Write

```bash
lens write --file <path> --json           # Write from JSON file
printf '%s' '{"command":"write","input":{...}}' | lens --stdin  # Write via stdin
```

See [Write API](#write-api) below for all write types.

### Discover & Analyze

```bash
lens discover <id> --json                 # Unlinked-but-related notes (spatial browsing)
lens discover <id> --collide --json       # Cross-domain surprises (exclude connected component)
lens discover <id> --duplicates --json    # Near-duplicate notes (+ --threshold)
lens discover --all --duplicates --json   # Scan all notes, group duplicates
lens digest [week|month|year] --json      # Recent insights grouped by type
lens lint --json                          # Graph quality checks (12 checks) with offender IDs
lens lint --audit <check> --json          # Full offender export with context for one check
lens lint --audit <check> --target <id> --json  # Scope edge-shaped audits to one target node
lens lint --check --json                  # Same + exit code 1 on failures (for CI)
lens lint --summary --json                # Stats + graph health + user context
```

### Index (Schlagwortregister)

```bash
lens index --json                         # List all keyword entry points
lens index "<keyword>" --json             # Show entries for a keyword
lens index add "<keyword>" <id> --json    # Register entry point (max 3 per keyword)
lens index remove "<keyword>" [id] --json # Remove keyword or single entry
```

### Content

```bash
lens fetch <url> [--save] --json          # Extract web content (--save creates source)
lens ingest <url|file> --json             # Fetch + save (shortcut for fetch --save)
lens feed add <rss-url> --json            # Subscribe to RSS feed
lens feed list --json                     # List subscriptions
lens feed check [--dry-run] --json        # Check for new articles
lens feed remove <id|url> --json          # Unsubscribe
```

### Config & System

```bash
lens config list --json                   # Show all config
lens config set context.role "PM" --json  # Set user context
lens rebuild-index --json                 # Rebuild SQLite cache from files
lens schema --json                        # Machine-readable command catalog (for agents)
lens doctor --json                        # Self-diagnostic (paths, git, DB, schema version)
lens init                                 # First-time setup; re-run to repair a half-init
```

## JSON Output

All `--json` output uses a stable envelope carrying `schema_version: 1`:

```json
{"ok": true, "schema_version": 1, "data": {"query": "...", "results": [...]}}
```

```json
{"ok": false, "schema_version": 1, "error": {"code": "not_initialized", "message": "..."}, "hint": "Run: lens init"}
```

Always check `ok` first. On success, read `data`. On failure, read `error.code` and `error.message`, and follow `hint` when present.

`schema_version` bumps only when the envelope itself changes shape (never when data fields change). Consumers should pin to a known version and inspect this field before parsing.

**Readonly-safe commands** (work when LENS_HOME is read-only): `search`, `show`, `links`, `list`, `discover`, `lint`, `digest`, `schema`, `doctor`. Call `lens schema --json` for the full list.

Error codes include: `command_error`, `deprecated_command`, `unknown_command`, `not_initialized`, `db_missing`, `db_corrupt`, `readonly_mode_write`, `ambiguous_match`, `no_match`, `partial_failure` (batch), `invalid_request`, `empty_stdin`, `no_input`.

## Data Model

3 types — each a markdown file with YAML frontmatter:

| Type | Prefix | Purpose |
|------|--------|---------|
| **Note** | `note_` | Knowledge card — one idea, linked to others |
| **Source** | `src_` | Provenance — articles, conversations, documents |
| **Task** | `task_` | Human-agent collaboration — status: open/done |

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
Evidence and reasoning in markdown body.
```

**Link types**: `supports`, `contradicts` (auto-bidirectional), `refines`, `related` (requires `reason`), `indexes`, `continues` (Folgezettel continuation chain).

**IDs**: `<prefix>_<ULID>` — 26 uppercase characters. Never truncate.

## Write API

Pass JSON via `--stdin` (recommended) or `--file`. The `type` field routes:

```
note      Create a note (title + body + links)
source    Create a source (title + url + source_type)
task      Create a task (title + status)
link      Add link between objects (from + rel + to + reason)
unlink    Remove a link
retype    Change link type atomically (old_rel → new_rel)
merge     Merge two notes (redirects links, appends body, rewrites [[ID]] refs)
update    Modify existing object (set fields, add links, replace body)
delete    Remove object and clean up references
```

**Batch writes**: pass an array. Use `$0`, `$1` to reference earlier items' IDs:

```json
[
  {"type": "note", "title": "First insight", "body": "..."},
  {"type": "note", "title": "Second insight", "links": [{"to": "$0", "rel": "supports", "reason": "builds on first"}]}
]
```

**Links are idempotent.** Writing the same link twice returns `"unchanged"`. `contradicts` links are automatically bidirectional.

## Agent Mode (--stdin)

All commands work via structured JSON input — content never touches the shell:

```bash
printf '%s' '{"command":"<cmd>", "positional":[], "flags":{}, "input":{}}' | lens --stdin
```

Always returns JSON. No `--json` flag needed.

```bash
# Search
printf '%s' '{"command":"search","positional":["distributed systems"]}' | lens --stdin

# Show (batch)
printf '%s' '{"command":"show","positional":["note_01A","note_01B"]}' | lens --stdin

# Write
printf '%s' '{"command":"write","input":{"type":"note","title":"...","body":"..."}}' | lens --stdin

# Fetch + save
printf '%s' '{"command":"fetch","positional":["https://..."],"flags":{"save":true}}' | lens --stdin

# Links with filters
printf '%s' '{"command":"links","positional":["note_01A"],"flags":{"rel":"related","direction":"forward"}}' | lens --stdin
```

## Storage

```
~/.lens/
  notes/       Markdown files (note_*.md)
  sources/     Markdown files (src_*.md)
  tasks/       Markdown files (task_*.md)
  raw/         Original files (HTML, etc.)
  index.sqlite SQLite cache (derived, rebuilable)
  config.yaml  User configuration
  .git/        Version history
```

Markdown files are the source of truth. SQLite is a derived index. Git tracks history when available (best-effort — lens works without Git).

## Use with Agents

| Agent | Setup |
|-------|-------|
| **Claude Code** | `/plugin marketplace add relixiaobo/lens-note-plugin` then `/plugin install lens`. Update: `claude plugin update lens@lens-note-plugin --scope user` |
| **Codex CLI** | Copy [SKILL.md](https://github.com/relixiaobo/lens-note-plugin/blob/main/plugin/skills/lens/SKILL.md) to `~/.codex/skills/lens/` |
| **Gemini CLI** | Copy SKILL.md to `~/.gemini/skills/lens/` |
| **Cursor** | Copy SKILL.md to `.cursor/skills/lens/` |

The skill file teaches the agent the full API, methodology, and when to use each mode (capture, compile, query, curate, task).

## Why lens

- **Infrastructure, not an app.** Like Git outlasts every IDE, lens outlasts every agent.
- **Any agent, any model.** Claude Code, Codex, Gemini, Cursor — anything that runs bash.
- **File-as-truth.** Markdown files are the source of truth. SQLite is a derived cache. Git tracks history.
- **Links are the only structure.** No folders, no tags, no categories. Structure emerges from connections.
- **The Collision Method.** Knowledge grows through collision, not collection. Built on [Luhmann's Zettelkasten, Karpathy's LLM Wiki, and Li Jigang's viewfinders](docs/theoretical-foundations.md).

## License

MIT
