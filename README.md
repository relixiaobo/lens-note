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

## Use with Any Agent

Any agent that can run bash commands can use lens. The [skill file](https://github.com/relixiaobo/lens-note-plugin/blob/main/plugin/skills/lens/SKILL.md) teaches the agent the API — copy it into your agent's skills directory.

| Agent | Skill location |
|-------|---------------|
| Claude Code | `/plugin install lens` |
| Codex CLI | `~/.codex/skills/lens/SKILL.md` |
| Gemini CLI | `~/.gemini/skills/lens/SKILL.md` |
| Cursor | `.cursor/skills/lens/SKILL.md` |

## 5 Core Commands

```bash
lens search "<query>" --json       # Find knowledge (multilingual, CJK-aware)
lens show <id> --json              # Read one object with links + reasons
lens write --file <path> --json    # Write anything: note, source, link, batch
lens fetch <url> [--save] --json   # Extract web content as clean markdown
lens status --json                 # Stats + graph health metrics
```

### Agent Mode (--stdin)

For agents that need to pass complex content (Chinese, quotes, newlines), `--stdin` accepts any command as a JSON request — content never touches the shell:

```bash
printf '%s' '{"command":"write","input":{"type":"note","title":"标题","body":"正文..."}}' | lens --stdin
printf '%s' '{"command":"search","positional":["distributed systems"]}' | lens --stdin
```

Request format: `{"command":"...", "positional":[], "flags":{}, "input":{}}`

## What Agents Do With lens

### Compile an article (The Collision Method)

Spark → Collide → Crystallize. Fetch content, carry your thoughts into the knowledge graph, wander through existing notes, write what emerges from the collision.

```bash
# 1. Fetch and save as source
lens fetch https://example.com/article --save --json

# 2. Search existing knowledge
lens search "related topic" --json

# 3. Agent writes JSON to file, then imports
#    (file approach avoids shell escaping issues with quotes/CJK)
lens write --file notes.json --json
```

### Answer from knowledge

```bash
lens search "software quality" --json    # Find relevant notes
lens show note_01ABC --json              # Read full detail with link reasons
# Agent synthesizes answer, citing note IDs as evidence
```

## Data Model

Each note is a markdown file with minimal frontmatter:

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
Evidence, reasoning, and elaboration in markdown body.

> "the trade-off does not apply to internal quality" — Fowler
```

**7 frontmatter fields.** Everything else goes in the body as natural prose.

**Link types**: `supports`, `contradicts` (auto-bidirectional), `refines`, `related`. Each link can carry a `reason`.

**Version tracking**: Every write auto-commits to git. `git log` shows full note evolution.

## Write API

`lens write --file input.json --json` accepts JSON from a file. Also supports stdin and shell argument. The `type` field routes:

```json
{"type": "note", "title": "...", "links": [{"to": "note_ID", "rel": "supports", "reason": "..."}], "body": "..."}
{"type": "source", "title": "...", "url": "...", "source_type": "web_article"}
{"type": "link", "from": "note_A", "rel": "supports", "to": "note_B", "reason": "..."}
{"type": "update", "id": "note_A", "set": {"title": "..."}, "add": {"links": [...]}}
{"type": "delete", "id": "note_A"}
```

Batch: pass a JSON array. Use `$0`, `$1` to reference earlier items by index.

## Philosophy

1. **lens never thinks.** It stores, queries, and links. Agents provide the intelligence.
2. **Infrastructure, not application.** Like Git outlasts every IDE, lens outlasts every agent.
3. **Zero dependencies on AI.** No API keys, no LLM calls, no cloud services.
4. **Links are the only structure.** No folders, no tags, no categories.
5. **The Collision Method.** Knowledge grows through collision (Spark → Collide → Crystallize), not through collection.

## Additional Commands

```bash
lens list notes [--since 7d]            # Browse notes
lens links <id>                         # Show all relationships
lens context "<query>"                  # Context pack (JSON)
lens digest [week|month|year]           # Recent notes summary
lens note "quick thought"               # Create a note directly
lens ingest <url|file>                  # Save source (alias for fetch --save)
lens feed add <url>                     # Subscribe to RSS
lens feed check --dry-run               # Check for new articles
lens init                               # First-time setup
lens rebuild-index                       # Rebuild SQLite cache
```

## Install

```bash
npm install -g lens-note
```

Requires Node.js >= 20.

## License

MIT
