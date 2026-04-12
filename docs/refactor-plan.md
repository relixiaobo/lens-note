# Lens Infrastructure Refactor Plan

Date: 2026-04-12
Status: Proposed

## Goal

Transform lens from "app with embedded LLM" to "pure infrastructure (like Git for knowledge)". Any agent can use lens without API keys, without LLM dependencies, without our client.

## Design Principle

lens stores, queries, and links. It never thinks.

## Architecture Change

```
BEFORE:
  User → lens ingest → [fetch] → [LLM thinks] → [write notes] → done

AFTER:
  User → Agent (Claude Code / Cursor / any) → lens fetch → agent thinks → lens write → done
```

---

## Agent-Facing API: 5 Core Commands

Based on research from Anthropic, OpenAI, and shipping products (Claude Code ~15 tools, Linearis 4-5 commands, Stripe Agent Toolkit filtered by scope):

- **<20 tools per turn** (OpenAI guidance)
- **Consolidate tools** with action parameters instead of splitting (Anthropic guidance)
- **Return semantic identifiers** not raw UUIDs (Anthropic: reduces hallucinations)
- **Error = problem + cause + solution** (agents hallucinate recovery steps without explicit affordances)
- **Coarse-grained > fine-grained** (Berkeley ToolPlanner: coarse instructions outperform fine-grained)

The skill file teaches agents **only these 5 commands**:

```bash
lens search "<query>" --json         # Find notes (CJK-aware)
lens show <id> --json                # Read one object with full detail + links
lens write --json < input.json       # Write anything (note, source, link, batch)
lens fetch <url> [--save] --json     # Extract web content (no LLM)
lens status --json                   # Stats + health metrics
```

### `lens search` — Find

```bash
lens search "software quality" --json
```

Returns:
```json
{
  "query": "software quality",
  "count": 5,
  "results": [
    {"id": "note_01ABC", "type": "note", "role": "claim", "text": "High internal quality has negative cost...", "snippet": "..."}
  ]
}
```

### `lens show` — Read

```bash
lens show note_01ABC --json
```

Returns the full object with all fields, evidence, and links (forward + backward).

### `lens write` — Write anything

One command, JSON in, JSON out. The `type` field determines what to create.

**Single note:**
```bash
echo '{
  "type": "note",
  "text": "High quality software is actually cheaper in the medium term",
  "role": "claim",
  "qualifier": "certain",
  "scope": "big_picture",
  "source": "src_01ABC",
  "supports": ["note_01DEF"],
  "evidence": [{"text": "the high-quality track overtakes within weeks", "source": "src_01ABC"}]
}' | lens write --json
```

Returns: `{"id": "note_01XYZ", "type": "note"}`

**Source:**
```bash
echo '{
  "type": "source",
  "title": "Is High Quality Software Worth the Cost?",
  "url": "https://martinfowler.com/...",
  "source_type": "web_article"
}' | lens write --json
```

**Link:**
```bash
echo '{
  "type": "link",
  "from": "note_01ABC",
  "rel": "supports",
  "to": "note_01DEF"
}' | lens write --json
```

Contradicts links are automatically bidirectional.

**Unlink:**
```bash
echo '{
  "type": "unlink",
  "from": "note_01ABC",
  "rel": "supports",
  "to": "note_01DEF"
}' | lens write --json
```

**Update:**
```bash
echo '{
  "type": "update",
  "id": "note_01ABC",
  "set": {"qualifier": "certain", "scope": "big_picture"},
  "add": {"supports": ["note_01DEF"], "evidence": [{"text": "...", "source": "src_01GHI"}]},
  "remove": {"supports": ["note_01OLD"]}
}' | lens write --json
```

**Batch (array):**
```bash
echo '[
  {"type": "source", "title": "Article X", "url": "..."},
  {"type": "note", "text": "...", "role": "claim", "source": "$0"},
  {"type": "note", "text": "...", "supports": ["$1"], "source": "$0"}
]' | lens write --json
```

`$0`, `$1` reference earlier items in the batch by index. Batch is atomic — all succeed or all fail.

Returns: `{"created": [{"index": 0, "id": "src_01..."}, {"index": 1, "id": "note_01..."}, ...]}` 

**Delete:**
```bash
echo '{"type": "delete", "id": "note_01ABC"}' | lens write --json
```

### `lens fetch` — Extract web content

```bash
lens fetch https://martinfowler.com/articles/is-quality-worth-cost.html --json
```

Returns:
```json
{
  "title": "Is High Quality Software Worth the Cost?",
  "author": "Martin Fowler",
  "markdown": "# Is High Quality Software...\n\n...",
  "word_count": 2718
}
```

With `--save`: also creates a Source and returns `source_id`.

### `lens status` — Stats + Health

Merges current `status` + `health` into one command:

```json
{
  "notes": 747,
  "sources": 168,
  "threads": 0,
  "connectivity": {
    "orphan_count": 42,
    "orphan_rate": 5.6,
    "components": 89,
    "giant_component_pct": 72.3,
    "avg_in_degree": 1.27
  },
  "link_types": {"supports": 451, "contradicts": 34, "refines": 15, "related": 17},
  "cross_source_pct": 92.1
}
```

### Error format (all commands)

```json
{
  "error": {
    "code": "not_found",
    "message": "Note note_01XYZ does not exist",
    "hint": "Use `lens search` to find the correct note ID"
  }
}
```

Always: code + message + hint. Agent can recover without guessing.

### Validation rules (enforced by CLI)

- `role` must be one of: claim, frame, question, observation, connection, structure_note
- `qualifier` must be one of: certain, likely, presumably, tentative
- `scope` must be one of: big_picture, detail
- `voice` must be one of: extracted, restated, synthesized, experiential
- `source_type` must be one of: web_article, markdown, plain_text, manual_note, note_batch
- All referenced IDs (supports, contradicts, source, etc.) must exist
- Contradicts links are always bidirectional (enforced by CLI)

---

## Human-Facing Commands (Porcelain)

These exist for human convenience but are NOT in the skill file:

```bash
# Browsing (human-friendly display)
lens list notes [--role R] [--scope S] [--since P]
lens list sources
lens links <id>
lens context "<query>"
lens digest [week|month|year]

# Shortcuts
lens note "<text>"              # alias for: echo '{"type":"note","text":"..."}' | lens write
lens ingest <url>               # alias for: lens fetch <url> --save

# RSS
lens feed add <url>
lens feed import <opml>
lens feed list
lens feed check [--dry-run]
lens feed remove <id|url>

# Maintenance
lens rebuild-index
lens init
```

---

## Skill File

`skills/lens.claude-skill.md` — the primary "application logic":

```markdown
# lens — knowledge graph for agents

lens is a CLI tool that stores, queries, and links knowledge. 
You do the thinking. lens does the storage.

## 5 Core Commands

lens search "<query>" --json     # Find notes
lens show <id> --json            # Read one object  
lens write --json < input        # Write anything (note/source/link/batch)
lens fetch <url> --json          # Extract web content
lens status --json               # Stats + health

## Workflows

### Compile an article
1. lens fetch <url> --save --json → get source_id + markdown
2. lens search "key topics" --json → find existing knowledge
3. Think: what's new? what supports/contradicts?
4. Pipe your notes as JSON array to lens write --json
5. lens status --json → verify orphan rate didn't spike

### Answer a question from knowledge
1. lens search "<query>" --json → find relevant notes
2. For top results: lens show <id> --json → get full detail + links
3. Synthesize the answer from notes. Cite note IDs.

### Curate (fix orphan notes)
1. lens status --json → check orphan_count
2. For orphans: lens show <id> --json → read the note
3. lens search "related topic" --json → find connections
4. echo '{"type":"link","from":"orphan_id","rel":"supports","to":"target_id"}' | lens write --json

## Write Format
{"type":"note", "text":"...", "role":"claim", "qualifier":"likely", "supports":["note_ID"]}
{"type":"source", "title":"...", "url":"...", "source_type":"web_article"}
{"type":"link", "from":"note_ID", "rel":"supports|contradicts|refines|related", "to":"note_ID"}
{"type":"update", "id":"note_ID", "set":{...}, "add":{...}, "remove":{...}}
[{...}, {...}]  — array for batch (atomic). Use $0, $1 to reference earlier items.
```

---

## Dependencies After Refactor

### Remove (4 packages)

| Package | Reason |
|---------|--------|
| `@mariozechner/pi-agent-core` | Agent framework — no longer needed |
| `@mariozechner/pi-ai` | LLM wrapper — no longer needed |
| `@anthropic-ai/sdk` | Anthropic API — no longer needed |
| `@sinclair/typebox` | Schema for agent tools — no longer needed |

### Keep (7 packages)

| Package | Reason |
|---------|--------|
| `defuddle` | Web article extraction (used by `lens fetch`) |
| `linkedom` | DOM parser for Defuddle |
| `turndown` | HTML → Markdown |
| `feedsmith` | RSS/Atom feed parsing |
| `gray-matter` | YAML frontmatter for markdown files |
| `ulid` | ID generation |
| `zod` | Input validation for write API |

---

## Files

### Delete (4 files)

| File | Reason |
|------|--------|
| `agent/compilation-agent.ts` | All LLM logic |
| `agent/process-output.ts` | Agent output processing |
| `cli/converse.ts` | LLM synthesis — replaced by search + show |
| `cli/curate.ts` | LLM curation — replaced by status + write workflow |

### Modify (4 files)

| File | Change |
|------|--------|
| `cli/note.ts` | Remove `placeNotesFromFile`. Keep `createNote` as alias for write. |
| `cli/ingest.ts` | Remove `compile()`. Become alias for `fetch --save`. |
| `cli/feed.ts` | Remove auto-ingest from `feedCheck`. Keep `--dry-run`. |
| `cli/status.ts` | Merge health metrics into status output. |

### New (2 files)

| File | Purpose |
|------|--------|
| `cli/write.ts` | `lens write` — unified write entry point (note/source/link/update/delete/batch) |
| `cli/fetch.ts` | `lens fetch` — web extraction (extracted from ingest.ts) |

### Unchanged (15 files)

Core storage, query, display, and feed management files stay as-is.

---

## Implementation Phases

### Phase 1: Build write API + fetch (non-breaking)

Add new commands alongside existing ones. Nothing removed yet.

1. Implement `cli/write.ts`:
   - Parse stdin JSON
   - Route by `type` field: note → createNote, source → createSource, link → createLink, etc.
   - Validate all fields (role enum, ID existence, etc.)
   - Return `{id, type}` on success, `{error: {code, message, hint}}` on failure
   - Batch mode with `$N` reference resolution
   - Atomic batch (transaction)
2. Implement `cli/fetch.ts`:
   - Extract from ingest.ts (web extraction only)
   - `--save` flag to also create Source
   - Return `{title, author, markdown, word_count, source_id?}`
3. Merge health into status (`cli/status.ts`)
4. Register new commands in `commands.ts`
5. Type check: `npx tsc --noEmit`

### Phase 2: Skill file + validation

1. Rewrite `skills/lens.claude-skill.md` with 5-command API
2. Test with Claude Code end-to-end:
   - Can it compile an article? (fetch → search → think → write)
   - Can it answer a knowledge question? (search → show → synthesize)
   - Can it fix orphans? (status → show → search → write link)
3. Iterate on skill file based on test results

### Phase 3: Remove LLM dependencies

Only after Phase 2 is validated:

1. Delete: `compilation-agent.ts`, `process-output.ts`, `converse.ts`, `curate.ts`
2. Simplify: `note.ts` (alias to write), `ingest.ts` (alias to fetch --save), `feed.ts` (no auto-ingest)
3. Remove dependencies from `package.json`
4. Remove `pnpm.overrides` for @anthropic-ai/sdk
5. Update `commands.ts` dispatch table
6. Update `main.ts` help text
7. `pnpm install` — verify clean install

### Phase 4: Polish

1. Type check: zero errors
2. Test all 5 core commands + all porcelain commands
3. Rebuild binary: `bun build --compile` — verify smaller size
4. Update all docs: CLAUDE.md, product-vision.md, architecture-plan.md, product-evolution.md
5. Clean up stale task list and memory

---

## Validation Criteria

1. **Agent test**: Claude Code with ONLY skill file + lens binary can:
   - Compile an article into linked Notes (zero API key)
   - Answer a question from the knowledge graph
   - Find and fix orphan notes
2. **Zero LLM**: No `ANTHROPIC_API_KEY` required anywhere in lens
3. **Core commands**: All 5 agent-facing commands work with --json
4. **Porcelain**: All human-facing commands still work
5. **Binary size**: < 40MB (down from 63MB)
6. **Dependencies**: 4 packages removed

---

## Design References

| Source | Key Insight |
|--------|------------|
| Anthropic "Writing effective tools" | Consolidate tools. Return semantic identifiers. |
| OpenAI function calling guide | <20 tools per turn. Strict schemas. Merge sequential functions. |
| Anthropic "Building effective agents" | Agent = LLM + tools. Tools should be deterministic. |
| Berkeley ToolPlanner | Coarse-grained > fine-grained instructions |
| Linearis (Linear CLI for agents) | 4-5 core commands, `--json` everywhere, smart ID resolution |
| Claude Code internals | ~15 agent-facing tools. 90% safety, 10% execution. Large output → demand-paging. |
| MCP tool smell study | 97% of tools have description quality issues. Clear purpose > examples. |
| Klavis "Less is More" | Workflow-based design > API-endpoint mirroring |
