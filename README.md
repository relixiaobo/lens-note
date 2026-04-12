# lens

Knowledge graph CLI for humans and agents. Like Git for knowledge.

lens stores, queries, and links structured knowledge. Any AI agent can use it. No API keys, no LLM dependencies.

## Install

```bash
npm install -g lens-note

# Or use without installing:
npx lens-note search "query" --json
```

## Quick Start

```bash
# Initialize
lens init

# Write a note
echo '{"type":"note","text":"Simple tools composed together beat complex frameworks","role":"claim","qualifier":"likely"}' | lens write --json

# Search
lens search "tools frameworks" --json

# Fetch a web article
lens fetch https://example.com/article --save --json

# Check knowledge graph health
lens health --json
```

## 5 Core Commands

| Command | Purpose |
|---------|---------|
| `lens search "<query>" --json` | Find notes (supports CJK) |
| `lens show <id> --json` | Read one object with full detail |
| `lens write --json` | Write anything (stdin JSON) |
| `lens fetch <url> --json` | Extract web content |
| `lens health --json` | Graph health metrics |

## How Agents Use It

1. Install: `npm install -g lens-note`
2. Copy the [skill file](skills/lens.claude-skill.md) to your agent's config
3. The agent reads the skill file and learns the 5 commands

**Claude Code**: copy `lens.claude-skill.md` to `.claude/skills/`

### Agent Workflows

**Compile an article:**
```bash
lens fetch https://example.com --save --json  # Get content + source_id
lens search "related topics" --json            # Find existing knowledge
# Agent thinks about connections...
echo '[{"type":"note","text":"...","role":"claim","supports":["note_ID"]}]' | lens write --json
```

**Answer from knowledge:**
```bash
lens search "query" --json     # Find relevant notes
lens show note_01ABC --json    # Read full detail
# Agent synthesizes answer citing note IDs
```

## Write API

`lens write` accepts JSON via stdin. The `type` field routes the operation:

```json
{"type": "note", "text": "...", "role": "claim", "supports": ["note_ID"]}
{"type": "source", "title": "...", "url": "..."}
{"type": "link", "from": "note_A", "rel": "supports", "to": "note_B"}
{"type": "update", "id": "note_A", "set": {"qualifier": "certain"}}
{"type": "delete", "id": "note_A"}
```

Batch: pass a JSON array. Use `$0`, `$1` to reference earlier items.

## Data Model

3 types stored as markdown files in `~/.lens/`:

- **Source** (`src_`) — provenance record (where content came from)
- **Note** (`note_`) — universal knowledge card (one idea per card)
- **Thread** (`thr_`) — conversation record

Notes link to each other via typed relationships: `supports`, `contradicts`, `refines`, `related`.

## Philosophy

- **lens never thinks.** Agents provide the intelligence; lens provides the storage.
- **File-as-Truth.** Markdown files are the source of truth. SQLite is a derived cache.
- **Links are the only structure.** No folders, no tags, no categories.
- **Zero LLM dependency.** No API keys required. Any agent works.

## License

MIT
