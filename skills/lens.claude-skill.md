---
name: lens
description: Query and contribute to your compiled understanding (claims, frames, questions) from the lens knowledge base
---

# lens — structured cognition compiler

lens compiles articles, notes, and conversations into structured Claims (assertions with evidence), Frames (perspectives), and Questions (open inquiries), organized into Programmes (research agendas).

## Setup

Check if lens is installed: `which lens`

If not installed:
1. `npm install -g lens-cli`
2. `lens init` — follow prompts to set ANTHROPIC_API_KEY and create ~/.lens/

## Commands

### Reading understanding

```bash
lens context "<query>" --json     # Best entry point. Returns relevant claims + evidence + frames, all inlined
lens search "<query>" --json      # Search across all claims, frames, questions
lens show <id> --json             # Show one object with evidence inlined (e.g. clm_01HXY, frm_01HXY)
lens programme list --json        # List all programmes with stats
lens programme show <id> --json   # Show one programme's structure
```

### Writing back

```bash
lens note "<text>"                          # Record a quick finding
lens note "<text>" --programme <pgm_id>     # Record and assign to a programme
lens ingest <url>                           # Ingest a web article
lens ingest <file.md>                       # Ingest a markdown file
```

### Other

```bash
lens status            # System status
lens rebuild-index     # Rebuild SQLite cache from files
```

## When to use lens

- User asks to reference their research, prior understanding, or past reading
- User mentions a topic they've studied before ("what do I know about...", "my research on...")
- User says "check lens" or "ask lens"
- You discover something relevant to an existing programme and want to record it
- User asks you to ingest/compile an article or note

## Output format

`--json` output is structured. Key fields:

- `claims[].statement` — the falsifiable assertion
- `claims[].qualifier` — confidence level: certain / likely / presumably / tentative
- `claims[].evidence[]` — supporting excerpts with source attribution
- `frames[].name` — perspective name
- `frames[].sees` / `.ignores` — what a frame reveals and hides
- `questions[].text` — open research questions
- `programmes[].title` — research programme name

## Tips

- Always use `--json` when consuming output programmatically
- `lens context` is the best single command — it assembles relevant understanding across programmes
- Prefer `lens note` over manually creating files in ~/.lens/
- Don't modify files in ~/.lens/ directly — use CLI commands
