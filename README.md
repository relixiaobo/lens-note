# lens

**Knowledge graph CLI for AI agents.** Like Git for code, lens is for knowledge — any agent can store, query, and link persistent understanding across sessions.

Zero LLM dependency. Zero API keys. Your agent thinks; lens stores.

## Install

```bash
npm install -g lens-note
lens init
```

Requires Node.js >= 20.

## Commands

```bash
lens search "query" --json            # Find knowledge (Unicode/CJK-aware)
lens search "query" --resolve --json  # Resolve title → ID
lens show <id> --json                 # Read one object with body + forward/backward links
lens links <id> --json                # Show all relationships (forward + backward)
lens write --file <path> --json       # Write note/source/task/link/unlink/update/delete/batch
lens list notes --orphans --json      # List orphan notes (+ --limit/--offset)
lens list notes --since 7d --json     # List notes from last 7 days
lens fetch <url> [--save] --json      # Extract web content as markdown
lens similar <id> --json              # Find near-duplicate notes
lens similar --all --json             # Scan all notes, group duplicates
lens context "query" --json           # Assemble full context pack (notes with bodies)
lens digest [week|month|year] --json  # Recent insights summary
lens index --json                     # List keyword entry points (Schlagwortregister)
lens index add "<kw>" <id> --json     # Register entry point (max 3 per keyword)
lens status --json                    # Stats + graph health
lens tasks [--all|--done] --json      # List tasks
```

All commands support `--stdin` mode — content bypasses the shell entirely:

```bash
printf '%s' '{"command":"write","input":{"type":"note","title":"...","body":"..."}}' | lens --stdin
```

## Why lens

- **Infrastructure, not an app.** Like Git outlasts every IDE, lens outlasts every agent.
- **Any agent, any model.** Claude Code, Codex, Gemini, Cursor — anything that runs bash.
- **File-as-truth.** Markdown files are the source of truth. SQLite is a derived cache. Git tracks history.
- **Links are the only structure.** No folders, no tags, no categories. Structure emerges from connections.
- **The Collision Method.** Knowledge grows through collision, not collection. Built on [Luhmann's Zettelkasten, Karpathy's LLM Wiki, and Li Jigang's viewfinders](docs/theoretical-foundations.md).

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

**Links**: `supports`, `contradicts` (auto-bidirectional), `refines`, `related`. Each carries a `reason`.

## Use with Agents

| Agent | Setup |
|-------|-------|
| **Claude Code** | `/plugin marketplace add relixiaobo/lens-note-plugin` then `/plugin install lens`. Update: `claude plugin update lens@lens-note-plugin --scope user` |
| **Codex CLI** | Copy [SKILL.md](https://github.com/relixiaobo/lens-note-plugin/blob/main/plugin/skills/lens/SKILL.md) to `~/.codex/skills/lens/` |
| **Gemini CLI** | Copy SKILL.md to `~/.gemini/skills/lens/` |
| **Cursor** | Copy SKILL.md to `.cursor/skills/lens/` |

The skill file teaches the agent the full API, methodology, and when to use each mode (capture, compile, query, curate, task).

## License

MIT
