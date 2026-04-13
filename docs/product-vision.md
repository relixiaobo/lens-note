# Lens Product Vision

Date: 2026-04-12
Status: Active (v1.1.0)

---

## What Is Lens

lens is a **knowledge graph CLI** — like Git for knowledge. It stores, queries, and links. Any AI agent can use it. No API keys, no LLM dependencies.

### One-Line Definition

> A CLI tool that any agent uses to store, query, and link structured knowledge. lens never thinks — agents do.

---

## Design Principle

**lens stores, queries, and links. It never thinks.**

Just as Git stores code without writing it, lens stores knowledge without generating it. The intelligence comes from whatever agent calls lens — Claude Code, Cursor, ChatGPT, or any future system.

---

## Architecture

```
┌──────────────────────────────────────┐
│          Any AI Agent                │
│  (Claude Code / Cursor / koma / ...) │
│                                      │
│  Reads skill file → knows 5 commands │
│  Provides the intelligence           │
└──────────────┬───────────────────────┘
               │ bash calls
┌──────────────▼───────────────────────┐
│          lens CLI binary             │
│                                      │
│  search — find notes                 │
│  show   — read one object            │
│  write  — create/update/link/delete  │
│  fetch  — extract web content        │
│  status — stats + health             │
│                                      │
│  Zero LLM. Zero API key.            │
└──────────────┬───────────────────────┘
               │ reads/writes
┌──────────────▼───────────────────────┐
│          ~/.lens/                    │
│                                      │
│  notes/   — markdown files (truth)   │
│  sources/ — provenance records       │
│  tasks/   — collaboration protocol   │
│  index.sqlite — derived cache (FTS5) │
└──────────────────────────────────────┘
```

---

## 5 Core Commands

```bash
lens search "<query>" --json     # Find notes (CJK-aware)
lens search "<query>" --resolve --json  # Resolve title → ID
lens show <id> --json            # Read one object with links + counts
lens write --file <path> --json   # Write anything (from JSON file)
lens list notes --orphans --json # List orphan notes (+ --limit/--offset)
lens fetch <url> [--save] --json # Extract web content
lens status --json               # Stats + graph health
```

`lens write` accepts JSON with a `type` field that routes the operation:

```json
{"type": "note", "title": "...", "links": [{"to": "note_ID", "rel": "supports", "reason": "..."}], "body": "..."}
{"type": "source", "title": "...", "url": "..."}
{"type": "link", "from": "note_ID", "rel": "supports", "to": "note_ID", "reason": "..."}
{"type": "update", "id": "note_ID", "set": {...}, "add": {"links": [...]}, "body": "..."}
{"type": "delete", "id": "note_ID"}
[{...}, {...}]  // batch ($0/$1 reference earlier items)
```

---

## How Agents Use Lens

### Skill File = Application Logic

The skill file (`skills/SKILL.md`) teaches any agent how to use lens. It contains:
- The 5 commands and their JSON schemas
- Workflows: how to compile, curate, answer questions
- Note field definitions and validation rules

An agent reads the skill file → knows how to use lens. No integration code needed.

### Workflows (Defined in Skill File)

**Compile an article:**
1. `lens fetch <url> --save --json` → source_id + markdown
2. `lens search "topics" --json` → existing knowledge
3. Agent thinks: what's new? what supports/contradicts?
4. `lens write --file batch.json --json` → batch create notes with links

**Answer a question from knowledge:**
1. `lens search "<query>" --json` → relevant notes
2. `lens show <id> --json` → full detail
3. Agent synthesizes answer, citing note IDs

**Curate orphan notes:**
1. `lens status --json` → orphan count
2. `lens list notes --orphans --json` → get orphan IDs + previews
3. `lens show <orphan_id> --json` → read orphan
4. `lens search "related" --json` → find connections
5. `lens write --file link.json --json` → add link (idempotent)

---

## Data Model

3 types, stored as `type/id.md` with YAML frontmatter:

| Type | Prefix | Purpose |
|------|--------|---------|
| **Source** | `src_` | Provenance record (articles, conversations) |
| **Note** | `note_` | Universal knowledge card (one idea per card) |
| **Task** | `task_` | Collaboration protocol (status: open/done) |

### Note: the Universal Card

7 frontmatter fields: `id`, `type`, `title`, `source`, `links[]`, `created_at`, `updated_at`. Everything else (evidence, confidence, scope, perspective) goes in the body as free-form markdown.

### Links Are the Only Structure

| Link | Meaning |
|------|---------|
| supports | Strengthens another note |
| contradicts | Conflicts (always bidirectional) |
| refines | More precise version |
| related | Loose association (with optional reason) |

No folders, no tags, no categories. Structure emerges from links.

### File-as-Truth

Markdown files = source of truth. SQLite = derived cache (rebuildable via `lens rebuild-index`). Reason: portability, iCloud sync, data liberation.

---

## What Lens Is NOT

- **NOT an app** — it's infrastructure. Like Git, not like GitHub.
- **NOT an AI agent** — it never calls an LLM. Agents call it.
- **NOT a note-taking app** — it doesn't have a UI. Agents and CLI are the interface.
- **NOT a final-artifact generator** — it doesn't produce reports, PPTs, or code. It provides structured knowledge that other tools consume.
- **NOT tied to any specific agent** — Claude Code, Cursor, ChatGPT, koma, or anything with bash can use it.

---

## Distribution

lens ships as:
1. **An npm package** (`npm install -g lens-note`, compiled JS bundle)
2. **A plugin** for Claude Code, Codex CLI, Gemini CLI ([lens-note-plugin](https://github.com/relixiaobo/lens-note-plugin))

Installation:
```bash
npm install -g lens-note
lens init

# Claude Code plugin:
# /plugin marketplace add relixiaobo/lens-note-plugin
# /plugin install lens
```

No server, no daemon, no account, no API key.

---

## Design Decisions

1. **Infrastructure, not application.** lens outlasts any specific agent, just as Git outlasts any IDE.
2. **CLI is the product.** Not a transitional step toward GUI. The CLI is the final form.
3. **Skill file is application logic.** Compile/curate/converse workflows live in documentation, not code.
4. **Zero LLM dependency.** The calling agent is the LLM. lens doesn't duplicate that.
5. **Validation at the boundary.** lens validates all writes (ID existence, link targets, bidirectional contradicts). The skill file guides; the CLI enforces.
6. **Zettelkasten model.** One idea per card. Structure from links. Index sparse and post-hoc.
7. **File-as-Truth.** Markdown files are the source of truth. Everything else is derived.
8. **CJK-native search.** Full-text search works for Chinese, Japanese, Korean out of the box.

---

## Relationship to koma

koma is a separate project — an agent framework. lens and koma are independent:
- koma agents CAN use lens as a tool (via CLI)
- lens does NOT depend on koma
- They share a user but not code
