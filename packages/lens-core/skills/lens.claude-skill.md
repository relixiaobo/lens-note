---
name: lens
description: Store, query, and link knowledge in your personal knowledge graph
---

# lens — knowledge graph for agents

lens stores, queries, and links knowledge. You do the thinking. lens does the storage.

## 5 Core Commands

```bash
lens search "<query>" --json     # Find notes (supports Chinese/CJK)
lens show <id> --json            # Read one object with full detail + links
lens write --json < input        # Write anything (stdin JSON)
lens fetch <url> [--save] --json # Extract web content as markdown
lens status --json               # Object counts
lens health --json               # Graph health metrics (orphans, connectivity)
```

## Reading Knowledge

```bash
# Search by keyword
lens search "agent architecture" --json
# Returns: {query, count, results: [{id, type, text, role, qualifier, scope}]}

# Read full object with links
lens show note_01ABC --json
# Returns: full object with evidence, links, metadata

# Object counts
lens status --json

# Graph health (orphans, connectivity, link distribution)
lens health --json
# Returns: {total_notes, connectivity: {orphan_count, ...}, link_types, ...}
```

## Writing Knowledge

Pipe JSON to `lens write --json`. The `type` field determines what to create.

### Create a note

```bash
echo '{
  "type": "note",
  "text": "High quality software is cheaper in the medium term",
  "role": "claim",
  "qualifier": "certain",
  "scope": "big_picture",
  "source": "src_01ABC",
  "supports": ["note_01DEF"],
  "evidence": [{"text": "the high-quality track overtakes within weeks", "source": "src_01ABC"}]
}' | lens write --json
# Returns: {"id": "note_01XYZ", "type": "note", "action": "created"}
```

Note fields:
- `text` (required): the thought itself
- `role`: claim / frame / question / observation / connection / structure_note
- `qualifier`: certain / likely / presumably / tentative
- `scope`: big_picture / detail
- `voice`: extracted / restated / synthesized
- `source`: source ID this note comes from
- `supports`, `contradicts`, `refines`: arrays of note IDs
- `evidence`: array of `{text, source, locator}`
- `sees`, `ignores`: for frame notes
- `question_status`: open / tentative_answer / resolved
- `bridges`: array of note IDs (for connection notes)

### Create a source

```bash
echo '{"type": "source", "title": "Article Title", "url": "https://...", "source_type": "web_article"}' | lens write --json
```

### Add a link

```bash
echo '{"type": "link", "from": "note_01A", "rel": "supports", "to": "note_01B"}' | lens write --json
```

Contradicts links are automatically bidirectional.

### Update a note

```bash
echo '{"type": "update", "id": "note_01A", "set": {"qualifier": "certain"}, "add": {"supports": ["note_01B"]}}' | lens write --json
```

### Batch write

```bash
echo '[
  {"type": "source", "title": "Article X", "url": "https://..."},
  {"type": "note", "text": "Key insight from article", "role": "claim", "source": "$0"},
  {"type": "note", "text": "This supports the first note", "supports": ["$1"], "source": "$0"}
]' | lens write --json
```

Use `$0`, `$1`, `$2` to reference earlier items in the batch by index. Batch is atomic.

## Fetching Web Content

```bash
# Extract only (no storage)
lens fetch https://example.com/article --json
# Returns: {title, author, url, word_count, markdown}

# Extract + save as Source
lens fetch https://example.com/article --save --json
# Returns: {title, author, url, word_count, markdown, source_id}
```

## Workflows

### Compile an article into knowledge

1. `lens fetch <url> --save --json` → get `source_id` and `markdown`
2. `lens search "key topics from the article" --json` → find existing related notes
3. For each related note: `lens show <id> --json` → read full detail
4. Think: What's genuinely new? What supports or contradicts existing notes?
5. Batch write your notes:
```bash
echo '[
  {"type":"note", "text":"your insight", "role":"claim", "qualifier":"likely", "source":"src_ID", "supports":["note_ID"]},
  {"type":"note", "text":"another thought", "role":"observation", "source":"src_ID"}
]' | lens write --json
```

### Answer a question from knowledge

1. `lens search "<query>" --json` → find relevant notes
2. `lens show <id> --json` for top results → get full detail + links
3. Synthesize the answer from notes. Cite note IDs (e.g. "According to note_01ABC...").

### Curate orphan notes

1. `lens health --json` → check `connectivity.orphan_count`
2. For orphan notes: `lens show <id> --json` → read the note
3. `lens search "related keywords" --json` → find potential connections
4. Add links: `echo '{"type":"link","from":"orphan_id","rel":"supports","to":"target_id"}' | lens write --json`

## Error Format

All errors return: `{"error": {"code": "...", "message": "...", "command": "..."}}`

The `message` field always explains what went wrong and how to fix it.

## Tips

- Always use `--json` when consuming output
- Note IDs look like `note_01ABC...`, source IDs like `src_01ABC...`
- `lens search` supports Chinese and CJK text natively
- Contradicts links are always bidirectional (lens enforces this)
- Batch `$N` references resolve to the ID of the Nth item created in the same batch
