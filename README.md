# lens

**The knowledge layer for AI agents.**

lens is a CLI that stores, queries, and links structured knowledge. Like Git for code, lens is for knowledge — any AI agent can use it to build and retrieve a persistent understanding of the world.

Zero LLM dependency. Zero API keys. Your agent does the thinking; lens does the storage.

## Why

AI agents are stateless. Every conversation starts from scratch. lens gives them persistent memory — a knowledge graph that grows across sessions, across projects, across agents.

- **Claude Code** compiles an article into linked notes today. Tomorrow, it finds connections to yesterday's research.
- **Cursor** queries your knowledge while writing code, using insights you compiled months ago.
- Any agent that can run bash can use lens. No integration code needed.

## Use with Claude Code

```bash
# 1. Install
npm install -g lens-note

# 2. Initialize
lens init

# 3. Install the plugin (in Claude Code)
#    /plugin marketplace add relixiaobo/lens-note-plugin
#    /plugin install lens
```

That's it. Claude Code now knows how to use lens. Try:

> "Fetch this article and compile the key insights into lens"
>
> "What do I know about distributed systems? Check lens."
>
> "Find orphan notes in lens and link them."

## Use with Any Agent

Any agent that can run bash commands can use lens. The [skill file](https://github.com/relixiaobo/lens-note-plugin/blob/main/plugin/skills/lens/SKILL.md) teaches the agent the API — copy it into your agent's skills directory.

| Agent | Skill location |
|-------|---------------|
| Claude Code | `.claude/skills/lens.claude-skill.md` |
| Cursor | `.cursor/rules/lens.mdc` |
| Generic | System prompt or project instructions |

## 5 Core Commands

```bash
lens search "<query>" --json       # Find notes (multilingual, CJK-aware)
lens show <id> --json              # Read one object with full detail + links
echo '<json>' | lens write --json  # Write anything: note, source, link, batch
lens fetch <url> [--save] --json   # Extract web content as clean markdown
lens status --json                 # Stats + graph health metrics
```

## What Agents Do With lens

### Compile an article

The agent fetches content, searches for existing knowledge, thinks about what's new, and writes structured notes with links.

```bash
# 1. Fetch and save as source
lens fetch https://example.com/article --save --json
# → {"source_id": "src_01ABC", "title": "...", "markdown": "..."}

# 2. Search existing knowledge
lens search "related topic" --json
# → {"count": 5, "results": [{"id": "note_01DEF", "text": "...", "role": "claim"}]}

# 3. Agent thinks, then writes notes with links
echo '[
  {"type": "note", "text": "Key insight from article", "role": "claim",
   "source": "src_01ABC", "supports": ["note_01DEF"]}
]' | lens write --json
# → {"created": [{"id": "note_01XYZ", "type": "note", "action": "created"}]}
```

### Answer a question from knowledge

```bash
lens search "software quality" --json    # Find relevant notes
lens show note_01ABC --json              # Read full detail
# Agent synthesizes answer, citing note IDs as evidence
```

### Maintain the knowledge graph

```bash
lens status --json                       # Check orphan rate, connectivity
# Agent finds orphans, searches for related notes, adds links
echo '{"type":"link","from":"note_01A","rel":"supports","to":"note_01B"}' | lens write --json
```

## Write API

`lens write` accepts JSON via stdin. The `type` field determines the operation:

```json
{"type": "note", "text": "...", "role": "claim", "qualifier": "likely", "supports": ["note_ID"]}
{"type": "source", "title": "...", "url": "...", "source_type": "web_article"}
{"type": "link", "from": "note_A", "rel": "supports", "to": "note_B"}
{"type": "update", "id": "note_A", "set": {"qualifier": "certain"}, "add": {"supports": ["note_B"]}}
{"type": "delete", "id": "note_A"}
```

**Batch**: pass a JSON array. Use `$0`, `$1` to reference earlier items by index.

**Link types**: `supports`, `contradicts` (auto-bidirectional), `refines`, `related`.

**Note roles**: `claim`, `frame`, `question`, `observation`, `connection`, `structure_note`.

## Data Model

3 types, stored as markdown files with YAML frontmatter in `~/.lens/`:

| Type | Prefix | Purpose |
|------|--------|---------|
| **Source** | `src_` | Where content came from (provenance) |
| **Note** | `note_` | One idea per card (universal knowledge card) |
| **Thread** | `thr_` | Conversation record |

Structure emerges from **links between notes**, not from folders or categories. This is the [Zettelkasten](https://en.wikipedia.org/wiki/Zettelkasten) model — the same system Niklas Luhmann used to write 70 books.

**File-as-Truth**: Markdown files are the source of truth. SQLite is a derived cache, rebuildable via `lens rebuild-index`.

## Design Philosophy

1. **lens never thinks.** It stores, queries, and links. Agents provide the intelligence.
2. **Infrastructure, not application.** Like Git outlasts every IDE, lens outlasts every agent.
3. **Zero dependencies on AI.** No API keys, no LLM calls, no cloud services. Pure local CLI.
4. **Links are the only structure.** No folders, no tags, no categories. Knowledge organizes itself through connections.
5. **Any agent works.** Claude Code, Cursor, ChatGPT, custom agents — anything with bash.

## Additional Commands

```bash
# Browsing
lens list notes [--role claim] [--scope big_picture] [--since 7d]
lens links <id>                     # Show all relationships
lens context "<query>"              # Assemble context pack (JSON)
lens digest [week|month|year]       # Recent insights summary

# Shortcuts
lens note "quick thought"           # Create a note directly
lens ingest <url|file>              # Save source (alias for fetch --save)

# RSS feeds
lens feed add <url>                 # Subscribe
lens feed import <file.opml>        # Import from OPML
lens feed check --dry-run           # Check for new articles

# System
lens init                           # First-time setup
lens status                         # Object counts
lens rebuild-index                  # Rebuild SQLite cache
```

All commands support `--json` for structured output.

## Install

```bash
# Global install
npm install -g lens-note

# Or zero-install via npx
npx lens-note search "query" --json
```

Requires Node.js >= 20.

## License

MIT
