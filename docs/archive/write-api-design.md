# Lens Write API Design

> lens as a pure storage+query tool (like Git for knowledge).
> Agents call these commands via bash. Humans can use them too.

## Design Principles

1. **JSON-in, JSON-out.** All write commands accept `--json` and echo back the created/modified object's ID and path. For structured input (evidence, related, batch), accept JSON via `--input` flag or stdin.
2. **Positional args for the common case.** The most frequent call — create a simple note — should be one line with no flags.
3. **Flags for metadata.** Optional fields use `--flag value`. Repeatable fields (evidence, links) use repeated flags or JSON input.
4. **Validate on write.** IDs are validated (exist check). Enum values are validated. Errors are clear JSON when `--json` is set.
5. **Every write returns the ID.** So agents can chain: create source → create note with `--source`.

---

## 1. `lens add note`

Create a fully structured Note.

### Synopsis

```
lens add note "<text>" [flags]
lens add note --input <json-file>
lens add note --input -          # read JSON from stdin
```

### Flags

| Flag | Type | Description |
|---|---|---|
| `--role` | enum | `claim`, `frame`, `question`, `observation`, `connection`, `structure_note` |
| `--qualifier` | enum | `certain`, `likely`, `presumably`, `tentative` |
| `--voice` | enum | `extracted`, `restated`, `synthesized` |
| `--scope` | enum | `big_picture`, `detail` |
| `--source` | ID | Provenance source ID (`src_...`) |
| `--supports` | ID | Note this supports (repeatable) |
| `--contradicts` | ID | Note this contradicts (repeatable) |
| `--refines` | ID | Note this refines (repeatable) |
| `--related` | ID | Related note (repeatable) |
| `--structure-type` | enum | `taxonomy`, `causal`, `description`, `timeline`, `argument`, `content`, `story`, `process`, `relationships` |
| `--question-status` | enum | `open`, `tentative_answer`, `resolved`, `superseded` |
| `--json` | bool | JSON output |

For complex fields (evidence, related-with-annotation, frame fields, bridges, entries), use `--input`:

### `--input` JSON Schema

```jsonc
{
  "text": "Markets are efficient only under specific institutional conditions",
  "role": "claim",
  "qualifier": "likely",
  "voice": "synthesized",
  "scope": "big_picture",
  "source": "src_01ABC...",

  // Claim: evidence array
  "evidence": [
    {
      "text": "In markets with high information asymmetry, prices deviate systematically from fundamental value",
      "source": "src_01ABC...",
      "locator": "p. 42"
    }
  ],

  // Frame fields
  "sees": "institutional structure as prerequisite for efficiency",
  "ignores": "behavioral factors in price formation",
  "assumptions": ["rational actors exist at the margin", "arbitrage is possible"],

  // Question fields
  "question_status": "open",

  // Connection fields
  "bridges": ["note_01AAA...", "note_01BBB..."],

  // Structure note fields
  "entries": ["note_01CCC...", "note_01DDD..."],

  // Links
  "supports": ["note_01EEE..."],
  "contradicts": ["note_01FFF..."],
  "refines": ["note_01GGG..."],
  "related": [
    { "id": "note_01HHH...", "note": "similar argument structure" }
  ]
}
```

### Examples

**Quick observation (simplest case):**
```bash
lens add note "Most LLM benchmarks measure capability, not reliability"
# Created note: note_01HXY...
```

**Claim with evidence via flags:**
```bash
lens add note "Transformer attention is O(n²) in sequence length" \
  --role claim \
  --qualifier certain \
  --voice extracted \
  --scope detail \
  --source src_01ABC...
# Created note: note_01HXY...
```

**Claim with evidence via JSON stdin:**
```bash
cat <<'EOF' | lens add note --input - --json
{
  "text": "Transformer attention is O(n²) in sequence length",
  "role": "claim",
  "qualifier": "certain",
  "voice": "extracted",
  "scope": "detail",
  "source": "src_01ABC...",
  "evidence": [
    {
      "text": "The standard attention mechanism computes a full n×n matrix of attention weights",
      "source": "src_01ABC...",
      "locator": "Section 3.2"
    }
  ],
  "supports": ["note_01EXIST..."]
}
EOF
# {"id":"note_01HXY...","path":"~/.lens/notes/note_01HXY....md"}
```

**Frame:**
```bash
lens add note "Economics assumes rational actors; psychology does not" \
  --role frame --input - <<'EOF'
{
  "sees": "decision-making as bounded by cognitive limits",
  "ignores": "institutional incentives that enforce rationality",
  "assumptions": ["individuals are the unit of analysis"]
}
EOF
```

Note: when both positional `"<text>"` and `--input` are given, the positional text wins for the `text` field. The `--input` provides the remaining fields. This lets you combine the ergonomics of inline text with structured metadata.

**Question:**
```bash
lens add note "Does in-context learning generalize beyond the training distribution?" \
  --role question --question-status open
```

**Connection note with bridges:**
```bash
cat <<'EOF' | lens add note --input - --json
{
  "text": "Both Kahneman's dual-process theory and LLM prompting strategies distinguish between fast/automatic and slow/deliberate reasoning",
  "role": "connection",
  "bridges": ["note_01KAHNEMAN...", "note_01PROMPTING..."]
}
EOF
```

**Structure note (index):**
```bash
cat <<'EOF' | lens add note --input - --json
{
  "text": "Attention mechanisms in neural networks",
  "role": "structure_note",
  "structure_type": "taxonomy",
  "entries": ["note_01SELFATTN...", "note_01CROSSATTN...", "note_01LINEARATTN..."]
}
EOF
```

### Output

Default:
```
Created note: note_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
```

With `--json`:
```json
{
  "id": "note_01HXY2K8WJ3F6N9Q0V5T7M2R8Z",
  "path": "/Users/x/.lens/notes/note_01HXY2K8WJ3F6N9Q0V5T7M2R8Z.md"
}
```

### Validation Rules

- `text` is required (either positional or in `--input`)
- All IDs in links/evidence/bridges/entries are validated (must exist)
- Enum values are validated; invalid values produce clear error
- `--contradicts` creates bidirectional links automatically (adds the new note's ID to the target's contradicts list)

---

## 2. `lens add source`

Register a provenance record. No LLM involved — pure storage.

### Synopsis

```
lens add source --title "<title>" [flags]
lens add source --input <json-file>
lens add source --input -
```

### Flags

| Flag | Type | Description |
|---|---|---|
| `--title` | string | **Required.** Source title |
| `--url` | string | Origin URL |
| `--type` | enum | `web_article`, `markdown`, `plain_text`, `manual_note`, `note_batch`. Default: `plain_text` |
| `--author` | string | Author name |
| `--body-file` | path | Read body content from this file |
| `--body` | string | Inline body content (short text) |
| `--json` | bool | JSON output |

Body content can also come from stdin when no `--body-file` or `--body` is given:

```bash
# Body from stdin
echo "Article content here..." | lens add source --title "My Article" --type markdown
```

### `--input` JSON Schema

```jsonc
{
  "title": "Attention Is All You Need",
  "url": "https://arxiv.org/abs/1706.03762",
  "source_type": "web_article",
  "author": "Vaswani et al.",
  "body": "Full text content..."       // or omit if no body
}
```

### Examples

**Register a URL source (metadata only):**
```bash
lens add source --title "Attention Is All You Need" \
  --url "https://arxiv.org/abs/1706.03762" \
  --type web_article \
  --author "Vaswani et al." \
  --json
# {"id":"src_01ABC...","path":"~/.lens/sources/src_01ABC....md"}
```

**Register with body from a file:**
```bash
lens add source --title "My Research Notes" \
  --type markdown \
  --body-file ./notes.md
```

**Register with body from stdin:**
```bash
curl -s https://example.com/article.txt | \
  lens add source --title "Example Article" --type plain_text
```

### Output

Default:
```
Created source: src_01ABC2K8WJ3F6N9Q0V5T7M2R8Z — "Attention Is All You Need"
```

With `--json`:
```json
{
  "id": "src_01ABC2K8WJ3F6N9Q0V5T7M2R8Z",
  "path": "/Users/x/.lens/sources/src_01ABC2K8WJ3F6N9Q0V5T7M2R8Z.md"
}
```

---

## 3. `lens link` / `lens unlink`

Manage links independently of note creation.

### Synopsis

```
lens link <from-id> <rel> <to-id> [--note "annotation"]
lens unlink <from-id> <rel> <to-id>
```

### Relationship types

| rel | Meaning |
|---|---|
| `supports` | Evidence or agreement |
| `contradicts` | Tension or disagreement (auto-bidirectional) |
| `refines` | Nuance or narrowing |
| `related` | Untyped association (accepts `--note`) |

### Examples

```bash
# Simple link
lens link note_01AAA supports note_01BBB

# Related with annotation
lens link note_01AAA related note_01BBB --note "similar argument structure"

# Contradicts (automatically adds reverse link)
lens link note_01AAA contradicts note_01BBB
# Both note_01AAA.contradicts and note_01BBB.contradicts are updated

# Remove a link
lens unlink note_01AAA supports note_01BBB

# Remove contradicts (removes both directions)
lens unlink note_01AAA contradicts note_01BBB
```

### Behavior

- **Validates both IDs exist.** Errors if either is missing.
- **Validates rel.** Must be one of: `supports`, `contradicts`, `refines`, `related`.
- **Idempotent.** Linking twice is a no-op. Unlinking a non-existent link is a no-op (exit 0).
- **`contradicts` is bidirectional.** `lens link A contradicts B` adds B to A's contradicts AND A to B's contradicts. `lens unlink` removes both.
- **`related` with `--note`:** If a `related` entry for the same target ID already exists, the annotation is updated.

### Output

Default:
```
Linked: note_01AAA —[supports]→ note_01BBB
```

With `--json`:
```json
{
  "from": "note_01AAA...",
  "rel": "supports",
  "to": "note_01BBB...",
  "bidirectional": false
}
```

---

## 4. `lens update note`

Modify an existing note. Additive by default; explicit flags for replacement.

### Synopsis

```
lens update note <id> [flags]
lens update note <id> --input <json-file>
lens update note <id> --input -
```

### Flags

| Flag | Type | Description |
|---|---|---|
| `--text` | string | Replace the note text |
| `--role` | enum | Change role |
| `--qualifier` | enum | Change qualifier |
| `--voice` | enum | Change voice |
| `--scope` | enum | Change scope |
| `--source` | ID | Change source |
| `--status` | enum | `active`, `superseded` |
| `--question-status` | enum | Change question status |
| `--structure-type` | enum | Change structure type |
| `--add-supports` | ID | Append to supports (repeatable) |
| `--add-contradicts` | ID | Append to contradicts (repeatable, bidirectional) |
| `--add-refines` | ID | Append to refines (repeatable) |
| `--add-related` | ID | Append to related (repeatable) |
| `--rm-supports` | ID | Remove from supports (repeatable) |
| `--rm-contradicts` | ID | Remove from contradicts (repeatable, bidirectional) |
| `--rm-refines` | ID | Remove from refines (repeatable) |
| `--rm-related` | ID | Remove from related (repeatable) |
| `--json` | bool | JSON output |

For complex updates (add evidence, set frame fields, etc.), use `--input`:

### `--input` JSON Schema

```jsonc
{
  // Scalar fields: SET (replace)
  "text": "Updated text",
  "qualifier": "certain",
  "sees": "new perspective",

  // Array fields with add/rm semantics
  "add_evidence": [
    { "text": "New supporting quote", "source": "src_01NEW...", "locator": "p. 15" }
  ],
  "rm_evidence": [
    { "text": "Old quote to remove" }     // matched by text
  ],

  "add_supports": ["note_01NEW..."],
  "rm_supports": ["note_01OLD..."],

  "add_contradicts": ["note_01NEW..."],    // bidirectional
  "rm_contradicts": ["note_01OLD..."],     // bidirectional

  "add_assumptions": ["new assumption"],
  "rm_assumptions": ["old assumption"],

  "add_bridges": ["note_01NEW..."],
  "rm_bridges": ["note_01OLD..."],

  "add_entries": ["note_01NEW..."],
  "rm_entries": ["note_01OLD..."],

  "add_related": [
    { "id": "note_01NEW...", "note": "related because..." }
  ],
  "rm_related": ["note_01OLD..."]          // by ID
}
```

### Examples

**Change qualifier:**
```bash
lens update note note_01HXY... --qualifier certain
```

**Add evidence to an existing claim:**
```bash
cat <<'EOF' | lens update note note_01HXY... --input -
{
  "add_evidence": [
    {
      "text": "Additional experimental result confirming the claim",
      "source": "src_01NEW...",
      "locator": "Table 3"
    }
  ]
}
EOF
```

**Mark a question as resolved:**
```bash
lens update note note_01HXY... --question-status resolved
```

**Supersede a note:**
```bash
lens update note note_01OLD... --status superseded
```

**Add a link (equivalent to `lens link`):**
```bash
lens update note note_01HXY... --add-supports note_01TARGET...
```

### Output

Default:
```
Updated note: note_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
  qualifier: likely → certain
```

With `--json`:
```json
{
  "id": "note_01HXY...",
  "updated_fields": ["qualifier"],
  "path": "/Users/x/.lens/notes/note_01HXY....md"
}
```

---

## 5. `lens add batch`

Create multiple objects in one call. Designed for agents that think first, then write all results at once.

### Synopsis

```
lens add batch --input <json-file>
lens add batch --input -          # read from stdin
```

### Input Schema

```jsonc
{
  "notes": [
    {
      "text": "First note",
      "role": "claim",
      "qualifier": "likely",
      "source": "src_01ABC...",
      "evidence": [{ "text": "Quote", "source": "src_01ABC...", "locator": "p. 5" }],
      "supports": ["note_01EXIST..."]
    },
    {
      "text": "Second note",
      "role": "observation"
    },
    {
      "text": "Third note contradicts fourth",
      "role": "claim",
      "contradicts": ["$1"]          // $N references: "$1" = second note (0-indexed)
    }
  ],
  "sources": [
    {
      "title": "My Source",
      "source_type": "plain_text",
      "url": "https://example.com",
      "body": "Content..."
    }
  ]
}
```

### `$N` References

Within a batch, notes can reference each other by index using `$0`, `$1`, `$2`, etc. These are resolved after all objects are created. This handles the case where an agent creates multiple notes that link to each other.

Example: if the batch has 3 notes and note[2] has `"supports": ["$0"]`, the `$0` is replaced with the actual ID of note[0] after it's created.

`$N` references work in: `supports`, `contradicts`, `refines`, `related[].id`, `bridges`, `entries`.

Source references use `$src_0`, `$src_1`, etc. for cross-referencing within the batch.

### Examples

**Agent creates notes from a source:**
```bash
cat <<'EOF' | lens add batch --input - --json
{
  "sources": [
    {
      "title": "Agent's web fetch",
      "source_type": "web_article",
      "url": "https://example.com/article",
      "body": "Full article text..."
    }
  ],
  "notes": [
    {
      "text": "Key insight from the article",
      "role": "claim",
      "qualifier": "likely",
      "voice": "synthesized",
      "scope": "big_picture",
      "source": "$src_0",
      "evidence": [
        { "text": "Direct quote", "source": "$src_0", "locator": "para 3" }
      ]
    },
    {
      "text": "Supporting detail",
      "role": "claim",
      "qualifier": "certain",
      "voice": "extracted",
      "scope": "detail",
      "source": "$src_0",
      "supports": ["$0"]
    }
  ]
}
EOF
```

### Output

With `--json`:
```json
{
  "created": {
    "sources": [
      { "ref": "$src_0", "id": "src_01ABC...", "path": "..." }
    ],
    "notes": [
      { "ref": "$0", "id": "note_01DEF...", "path": "..." },
      { "ref": "$1", "id": "note_01GHI...", "path": "..." }
    ]
  },
  "errors": []
}
```

Default:
```
Created 1 source, 2 notes

Sources:
  src_01ABC... — "Agent's web fetch"

Notes:
  note_01DEF... — "Key insight from the article"
  note_01GHI... — "Supporting detail"
    → supports note_01DEF...
```

### Validation

- All external IDs (not `$N` refs) are validated before any writes happen.
- If any validation fails, nothing is written (atomic).
- `$N` index out of bounds is an error.
- `contradicts` within a batch creates bidirectional links automatically.

---

## 6. `lens fetch`

Fetch a URL and return clean markdown. No LLM. No storage. Pure extraction.

This is the "fetch" primitive that agents compose with `add source` + `add note`.

### Synopsis

```
lens fetch <url> [flags]
```

### Flags

| Flag | Type | Description |
|---|---|---|
| `--json` | bool | JSON output with full metadata |
| `--save` | bool | Also save as a Source object (returns source ID) |

### Examples

**Just fetch (no storage):**
```bash
lens fetch "https://example.com/article"
# Prints clean markdown to stdout
```

**Fetch with metadata:**
```bash
lens fetch "https://example.com/article" --json
```
```json
{
  "title": "Article Title",
  "author": "Author Name",
  "url": "https://example.com/article",
  "word_count": 2847,
  "markdown": "# Article Title\n\nFirst paragraph..."
}
```

**Fetch and save as source:**
```bash
lens fetch "https://example.com/article" --save --json
```
```json
{
  "title": "Article Title",
  "author": "Author Name",
  "url": "https://example.com/article",
  "word_count": 2847,
  "source_id": "src_01ABC...",
  "source_path": "/Users/x/.lens/sources/src_01ABC....md",
  "markdown": "# Article Title\n\nFirst paragraph..."
}
```

### Agent Workflow

An agent uses fetch + add to do its own thinking:

```bash
# 1. Fetch the article
ARTICLE=$(lens fetch "https://example.com" --json)

# 2. Save it as a source
SOURCE_ID=$(echo "$ARTICLE" | lens add source \
  --title "$(echo $ARTICLE | jq -r .title)" \
  --url "$(echo $ARTICLE | jq -r .url)" \
  --type web_article \
  --json | jq -r .id)

# 3. Agent reads the markdown, thinks, creates notes
# ... (agent's own reasoning) ...

# 4. Write results
cat <<EOF | lens add batch --input - --json
{
  "notes": [
    {
      "text": "My insight about this article",
      "role": "claim",
      "source": "$SOURCE_ID",
      ...
    }
  ]
}
EOF
```

Or more concisely with `--save`:

```bash
# 1. Fetch + save in one step
RESULT=$(lens fetch "https://example.com" --save --json)
SOURCE_ID=$(echo "$RESULT" | jq -r .source_id)
MARKDOWN=$(echo "$RESULT" | jq -r .markdown)

# 2. Agent thinks about $MARKDOWN...

# 3. Write notes referencing $SOURCE_ID
```

---

## 7. `lens delete`

Remove objects.

### Synopsis

```
lens delete <id> [--force]
```

### Behavior

- Without `--force`: soft delete. Sets `status: superseded`. Object remains on disk and in the index.
- With `--force`: hard delete. Removes the markdown file, removes from SQLite cache, removes all links from/to this object.
- Validates that `id` exists.
- Does NOT cascade. Deleting a source does not delete notes that reference it. Those notes keep their `source` field pointing to a now-missing ID (agents can detect this).

### Examples

```bash
# Soft delete (supersede)
lens delete note_01HXY...
# Superseded: note_01HXY...

# Hard delete
lens delete note_01HXY... --force
# Deleted: note_01HXY...

# JSON output
lens delete note_01HXY... --json
# {"id":"note_01HXY...","action":"superseded"}
```

---

## Command Summary

| Command | Purpose | Input |
|---|---|---|
| `lens add note "<text>"` | Create a note | Positional + flags or `--input` |
| `lens add source --title "..."` | Register a source | Flags or `--input` |
| `lens add batch --input` | Create multiple objects | JSON file or stdin |
| `lens link <from> <rel> <to>` | Add a link | Positional args |
| `lens unlink <from> <rel> <to>` | Remove a link | Positional args |
| `lens update note <id>` | Modify a note | Flags or `--input` |
| `lens fetch <url>` | Extract article (no storage) | Positional URL |
| `lens delete <id>` | Remove an object | Positional ID |

---

## Flag Parsing Upgrade

The current `parseCliArgs` only supports `--flag value` (single value). The write API needs:

1. **Repeatable flags**: `--supports id1 --supports id2` → `supports: ["id1", "id2"]`
2. **Stdin detection**: when `--input -`, read from stdin and parse as JSON
3. **Merge logic**: positional text + `--input` JSON are merged (positional wins for `text`)

Proposed implementation: a new `parseWriteArgs` function that extends `parseCliArgs` with these capabilities, used only by write commands.

---

## Error Format

All errors follow the existing pattern:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Note not found: note_01INVALID...",
    "command": "add note"
  }
}
```

Error codes:
- `validation_error` — bad input (missing required field, invalid enum, bad ID format)
- `not_found` — referenced object doesn't exist
- `already_exists` — duplicate (for idempotent operations, this is not an error)
- `command_error` — unexpected failure

---

## Migration from Current Commands

| Current | New | Notes |
|---|---|---|
| `lens note "text"` | `lens add note "text"` | Keep as alias for backward compat |
| `lens ingest <url>` | `lens fetch <url> --save` + agent | `ingest` stays as the "fetch + think" pipeline |
| `lens note --file <path>` | `lens add batch --input <path>` | Or keep `note --file` as alias |

The `ingest` command remains as the high-level "fetch + LLM compilation" pipeline. The new write API provides the low-level primitives that `ingest` (and external agents) use internally.
