---
name: lens
description: Query and contribute to your compiled understanding (notes, sources, threads) from the lens knowledge base
---

# lens — structured cognition compiler

lens compiles articles, notes, and conversations into structured Notes (claims, frames, questions, observations, connections) linked in a Zettelkasten-inspired knowledge graph. Sources record provenance. Threads capture conversations about Notes.

## Setup

Check if lens is installed: `which lens`

If not installed:
1. `npm install -g lens-cli`
2. `lens init` — follow prompts to set ANTHROPIC_API_KEY and create ~/.lens/

## Commands

### Reading understanding

```bash
lens context "<query>" --json     # Best entry point. Returns relevant notes + evidence + links, all inlined
lens search "<query>" --json      # Search across all notes, sources, threads
lens show <id> --json             # Show one object with full detail (e.g. note_01HXY, src_01HXY)
lens list notes --json            # List all notes
lens list notes --role claim --json       # List notes with role: claim
lens list notes --role frame --json       # List notes with role: frame
lens list notes --role question --json    # List notes with role: question
lens list notes --role structure_note --json  # List structure notes (index entries)
lens list sources --json          # List all sources
lens links <id> --json            # Show relationships for a note
```

### Writing back

```bash
lens note "<text>"                          # Record a quick observation
lens ingest <url>                           # Ingest a web article
lens ingest <file.md>                       # Ingest a markdown file
```

### Other

```bash
lens status            # System status
lens rebuild-index     # Rebuild SQLite cache from files
lens lint              # Health check: orphans, missing links, implicit contradictions
```

## When to use lens

- User asks to reference their research, prior understanding, or past reading
- User mentions a topic they've studied before ("what do I know about...", "my research on...")
- User says "check lens" or "ask lens"
- You discover something relevant to existing notes and want to record it
- User asks you to ingest/compile an article or note

## Output format

`--json` output is structured. Key fields for Notes depend on their role:

- `notes[].text` — the thought itself (always present)
- `notes[].role` — soft hint: claim / frame / question / observation / connection / structure_note
- `notes[].evidence[]` — supporting excerpts with source attribution (claim notes)
- `notes[].qualifier` — confidence level: certain / likely / presumably / tentative (claim notes)
- `notes[].sees` / `.ignores` — what a frame reveals and hides (frame notes)
- `notes[].question_status` — open / tentative_answer / resolved (question notes)
- `notes[].supports[]` / `.contradicts[]` / `.refines[]` / `.related[]` — links to other notes
- `notes[].bridges[]` — IDs of notes being connected (connection notes)
- `notes[].entries[]` — IDs of entry-point notes (structure notes)
- `sources[].title` — source title
- `threads[].title` — conversation thread title

## Tips

- Always use `--json` when consuming output programmatically
- `lens context` is the best single command — it assembles relevant understanding across the knowledge graph
- Use `lens list notes --role structure_note` to browse index entries (replaces the old `lens programme list`)
- Prefer `lens note` over manually creating files in ~/.lens/
- Don't modify files in ~/.lens/ directly — use CLI commands
- There is no `programme` command — structure notes (Notes with role: structure_note) replace Programmes
