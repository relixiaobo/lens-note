# lens Tool Redesign v2 (Final)

## Problem

lens has 14 commands. Through a real curation session (auditing agent-domain link quality, merging duplicates, expanding a 28→60 note MOC), we discovered:

1. **Composite commands waste tool slots** — `context` duplicates `search`+`read`; `tasks` duplicates `list tasks`
2. **Atomic operations are missing** — changing a link type requires 2 calls (unlink+link); merging notes requires 5+ steps
3. **Read commands lack filters** — agent must fetch full data and self-filter, wasting tokens
4. **Some names create ambiguity** — `show` vs `search` vs `context` — three ways to "get notes"

## Design Principles

See CLAUDE.md "Tool Design Principles" section for all 10 principles. Key ones for this redesign:

1. **Atomic over composite** — each tool does one thing; agent composes pipelines
2. **Few tools, rich parameters** — prefer adding a flag over adding a command
3. **Names are the first prompt** — model picks tool by name before reading description
4. **Document composition patterns** — atomic tools need documented pipelines

## Success Criteria

Every current command or composition pattern must be achievable in the new design with **equal or fewer steps**. Zero regressions.

| Current usage | New design | Steps | Verdict |
|---------------|------------|-------|---------|
| `search "agent"` | `search "agent"` | 1→1 | = same |
| `show <id>` | `read <id>` | 1→1 | = renamed |
| `show <id1>` + `show <id2>` + `show <id3>` | `read <id1> <id2> <id3>` | 3→1 | ✓ simpler |
| `links <id>` | `links <id>` | 1→1 | = same |
| `links <id>` → manual filter for related | `links <id> --rel related` | 2→1 | ✓ simpler |
| `list notes --orphans` | `list notes --orphans` | 1→1 | = same |
| `list notes` → manual filter by link count | `list notes --min-links 10` | 2→1 | ✓ simpler |
| `list sources` → manual filter by type | `list sources --source-type book` | 2→1 | ✓ simpler |
| `write` (all existing ops) | `write` (same + retype + merge) | 1→1 | = same |
| `unlink` + `link` (change link type) | `write retype` | 2→1 | ✓ simpler |
| show + note inbound + unlink each + relink + delete (merge) | `write merge` | 5+→1 | ✓ **much simpler** |
| `context "query"` | `search "query" --expand` | 1→1 | = same (flag replaces command) |
| `tasks` | `list tasks` | 1→1 | = same |
| `tasks --done` | `list tasks --status done` | 1→1 | = same |
| `status` | `lint --summary` | 1→1 | = same |
| `digest week` | `digest week` | 1→1 | = same |
| `similar <id>` | `similar <id>` | 1→1 | = same |
| `lint` | `lint` | 1→1 | = same |
| `index` / `index add` | `index` / `index add` | 1→1 | = same |
| `fetch` | `fetch` | 1→1 | = same |
| `config` | `config` | 1→1 | = same |

Result: 0 regressions. 7 improvements. All others unchanged.

## Deriving the Minimal Command Set

### Step 1: What are the irreducible operations on a knowledge graph?

| Operation | Description |
|-----------|-------------|
| Write node | Create/update/delete a note, source, or task |
| Write edge | Create/remove/retype a link between objects |
| Read by ID | Get one object's full content |
| Find by text | Full-text search across the graph |
| Enumerate | List objects by type and structural filters |
| Read edges | See relationships of an object, filtered by type/direction |
| External fetch | Download and extract web content |
| Configure | Manage settings |

Minimum = **6 commands** (write, read, search, list, fetch, config). Everything else is derivable.

### Step 2: Which derived commands justify independent existence?

| Candidate | Can be composed from | Why keep it anyway |
|-----------|---------------------|--------------------|
| `links` | `read` returns links | Different intent ("see relationships" ≠ "read content"). `read` would need --fields/--rel/--direction flag explosion. Agent picks wrong tool if overloaded. |
| `similar` | Theoretically a search mode | Different algorithm (trigram/Dice ≠ FTS5). `similar --all` has no search equivalent. Merging overloads search. |
| `lint` | Agent does list → links → analyze | Encodes quality analysis logic (6 checks). Saves 50+ API calls on a 1000-note graph. Absorbs `status`. |
| `digest` | `list --since` → `links` each → group | Encodes Collision Method domain knowledge (tensions/connected/seeds). Not trivially composable — requires N links calls. |
| `index` | `list indexes` + `write {type:"index"}` | Splitting doesn't reduce commands, just shifts complexity to list and write. Self-contained is cleaner. |

### Step 3: What should be removed?

| Remove | Why | Replacement |
|--------|-----|-------------|
| `context` | = `search` + `read` (composite). Name ambiguous vs `search`. | `search --expand` (same capability, 1 step, no new command) |
| `tasks` | = `list tasks` (exact duplicate) | `list tasks --status open` |
| `status` | Overlaps `lint`. Ambiguous name (git status?). | `lint --summary` (includes user context) |
| `show` | Renamed to `read` for clarity | `read` |

## Final Command Inventory: 14 → 11

| Command | Role | Access pattern | Cannot be replaced because |
|---------|------|----------------|---------------------------|
| **`search`** | Find by text | query → results | Unique algorithm (FTS5). `--expand` replaces `context`. |
| **`read`** | Get by ID | id → object | Unique access pattern (direct lookup) |
| **`links`** | See relationships | id → edges | Different intent from `read`; needs --rel/--direction filters |
| **`list`** | Enumerate | type + filters → objects | Unique structural query (orphans, since, link count) |
| **`similar`** | Find duplicates | id → matches | Unique algorithm (trigram/Dice) |
| **`lint`** | Quality + stats | → checks + summary | Encodes analysis logic; absorbs `status` |
| **`digest`** | Domain analysis | period → insights | Encodes Collision Method knowledge (tensions/connected/seeds) |
| **`index`** | Keyword entry points | keyword → entries | Self-contained is cleaner than splitting to list+write |
| **`write`** | All mutations | input → result | Unified write channel |
| **`fetch`** | External content | url → content | HTTP + extraction logic |
| **`config`** | Settings | key → value | Settings management |

### Naming verification

Each command answers a distinct question:

| When the agent thinks... | It calls |
|--------------------------|----------|
| "What do I know about X?" | `search` |
| "Show me note_01ABC" | `read` |
| "What's connected to this?" | `links` |
| "List all orphan notes" | `list` |
| "Are there duplicates?" | `similar` |
| "Is the graph healthy?" | `lint` |
| "What's new this week?" | `digest` |
| "Entry point for topic X?" | `index` |
| "Save/update/delete/link" | `write` |
| "Get this URL" | `fetch` |
| "Change a setting" | `config` |

No two commands answer the same question. No synonyms.

## New Read Capabilities

### `search` — new `--expand` flag
```bash
lens search "agent" --json                    # IDs + titles (existing)
lens search "agent" --expand --json           # IDs + titles + body + links (replaces `context`)
```
- `--expand`: enriches each result with full body and link array. Replaces the removed `context` command with zero loss of functionality.

### `read` (renamed from `show`)
```bash
lens read <id> --json                         # Read one object
lens read <id1> <id2> <id3> --json            # Batch read (new)
```

### `links` — new filter flags
```bash
lens links <id> --json                        # All links (existing)
lens links <id> --rel related --json          # Filter by rel type (new)
lens links <id> --direction forward --json    # Only outgoing (new)
lens links <id> --direction backward --json   # Only incoming (new)
```
- `--direction` values: `forward`, `backward`. Default: both.
- `--rel` values: `supports`, `contradicts`, `refines`, `related`, `indexes`.

### `list` — new filter flags
```bash
lens list notes --orphans --json              # Existing
lens list notes --min-links 10 --json         # Hub notes (new)
lens list notes --max-links 0 --json          # = --orphans (new)
lens list sources --source-type book --json   # Filter by source type (new)
lens list tasks --status done --json          # Replaces `tasks --done` (new)
```
- `--min-links` / `--max-links`: total link count (forward + backward).
- `--status`: `open` or `done`. Only for tasks.

### `lint` — absorbs status, new checks
```bash
lens lint --json                              # Full quality report (existing)
lens lint --summary --json                    # Quick stats + user context (replaces `status`)
lens lint --check related_dominance --json    # Run single check (new)
```

New lint checks:
- `vague_reasons` — links whose reason matches generic patterns ("相关笔记", "相关内容")
- `superseded_alive` — body contains "superseded" but note still alive
- `thin_notes` — note body < 50 chars

## New Write Capabilities

### `retype` — atomic link type change
```json
{"type": "retype", "from": "note_A", "to": "note_B", "old_rel": "related", "new_rel": "supports", "reason": "updated reason"}
```
- Validates `old_rel` exists before changing
- **Bidirectional invariant**: if retyping FROM `contradicts`, removes the reverse `contradicts` link. If retyping TO `contradicts`, creates the reverse link. Same rules as `link`/`unlink`.
- Idempotent: retyping to current state returns `"action": "unchanged"`

### `merge` — atomic note merge
```json
{"type": "merge", "from": "note_B", "into": "note_A"}
```
Semantics:
- **Inbound links**: all links pointing to `from` are redirected to `into`. Same dedupe/conflict rules apply: if a third note C already links to both `from` and `into` with the same `(target, rel)` pair, the existing C→into link wins and the redirected C→from link is dropped.
- **Forward links**: links from `from` are added to `into`
- **Dedupe key**: `(to, rel)` — applies to both forward links and redirected inbound links. If `into` already has a link to the same target with the same rel, skip (keep existing reason)
- **Conflict policy**: if `from→X (supports)` and `into→X (contradicts)` exist, keep `into`'s version (existing wins). Same policy applies to inbound link redirection.
- **Self-link prevention**: any resulting `into→into` link is silently dropped
- **Body**: `from`'s body is appended to `into`'s body under a `---` separator. Any `[[from]]` inside the appended body is rewritten to `[[into]]` before append.
- **`[[ID]]` body refs**: `[[from]]` references across all notes in the graph (not just `into`) are rewritten to `[[into]]`
- **Self-merge**: `from == into` returns validation error
- **Idempotent**: if `from` doesn't exist (already merged), returns `"action": "unchanged"`
- **Field handling**: `from`'s title, source, timestamps are not carried over (body append preserves content; metadata belongs to `into`)
- Delete: `from` is deleted after all redirections complete

### `update` body fix
`set.body` in update writes to markdown body (after `---` frontmatter delimiter), not into YAML frontmatter `body:` field.

## Cross-Cutting Improvements

### JSON output envelope

Current: each command returns a different top-level shape. No consistent success/failure signal in JSON.

Proposed: wrap all `--json` output in a standard envelope:

```json
// Success
{"ok": true, "data": { ... command-specific payload ... }}

// Error
{"ok": false, "error": {"code": "not_found", "message": "Object note_01XYZ not found"}, "hint": "Use `lens search` to find the correct ID"}

// Deprecation warning (during migration)
{"ok": true, "data": { ... }, "warning": "show is deprecated, use read", "replacement": "read"}
```

Rules:
- `ok` boolean at top level — agent checks this first, no exit-code parsing needed
- `data` contains command-specific payload (same shape as current output)
- `error.code` is machine-readable (e.g., `not_found`, `ambiguous_match`, `validation_error`, `unknown_command`)
- `hint` is present on every error, guiding agent to next action
- All output to stdout, human messages to stderr
- `snake_case` keys everywhere (already the case)
- Arrays of objects, not objects of objects (already the case)

### Graph invariant preservation

New design principle (9th): multi-object writes must preserve graph invariants transactionally.

Invariants:
- `contradicts` links are always bidirectional — `retype` and `merge` must maintain this
- No self-links — `merge` must silently drop any resulting `X→X` link
- No dangling `[[ID]]` body refs — `merge` rewrites `[[from]]` → `[[into]]` across the graph
- No orphaned reverse links — `delete` already cleans inbound links; `merge` does the same before deleting

### `--stdin` agent mode consistency

All changes (new commands, renamed commands, deprecation errors) must work identically in both:
- CLI argv mode: `lens read note_01ABC --json`
- `--stdin` envelope mode: `{"command": "read", "positional": ["note_01ABC"], "flags": {"json": true}}`

Deprecation aliases (`show` → `read`) and structured error responses apply in both modes.

### Help text as few-shot prompts

CLIG research: "Users tend to use examples over other forms of documentation. For agents, examples in help text serve as few-shot prompts."

Each command's `--help` output must include:
- One-line description
- 2-3 usage examples (covering common patterns)
- For `write` suboperations: example JSON input for each type

## Composition Patterns

### Link quality audit
```bash
lens links <id> --rel related --json          # 1. See all related links
lens read <target1> <target2> --json          # 2. Compare note content
lens write '{"type":"retype",...}'             # 3. Upgrade link type
```

### Duplicate merge
```bash
lens similar <id> --json                      # 1. Find duplicates
lens read <dup_a> <dup_b> --json              # 2. Compare content
lens write '{"type":"merge","from":"b","into":"a"}'  # 3. Merge
```

### MOC expansion
```bash
lens links <moc_id> --rel indexes --json      # 1. Current coverage
lens search "keyword" --type note --json      # 2. Find candidates
lens write '[{"type":"link",...}]'             # 3. Add to MOC
```

### Quality review cycle
```bash
lens lint --json                              # 1. Find issues
lens links <offender> --rel related --json    # 2. Inspect offender
lens write '[{"type":"retype",...},{"type":"unlink",...}]'  # 3. Fix
```

### Weekly review
```bash
lens digest week --json                       # 1. What's new (tensions/connected/seeds)
lens read <tension_id> --json                 # 2. Deep-dive a tension
lens write '{"type":"note","title":"..."}'    # 3. Crystallize insight
```

## Migration Path

### Breaking changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `show` → `read` | All callers (CLI + --stdin) | Alias `show` → `read` for 2 versions. JSON response includes: `{"ok": true, "data": {...}, "warning": "show is deprecated, use read", "replacement": "read"}`. Then remove. |
| Remove `context` | Callers use `search --expand` | Return: `{"ok": false, "error": {"code": "unknown_command", "message": "context has been removed"}, "hint": "Use search --expand for the same result in one step", "replacement": "search --expand"}` |
| Remove `tasks` | Callers use `list tasks` | Return: `{"ok": false, "error": {"code": "unknown_command", "message": "tasks has been removed"}, "hint": "Use list tasks --status open", "replacement": "list tasks"}` |
| Remove `status` | Callers use `lint --summary` | Return: `{"ok": false, "error": {"code": "unknown_command", "message": "status has been removed"}, "hint": "Use lint --summary for stats + user context", "replacement": "lint --summary"}` |

All deprecation/removal errors work in both CLI argv and `--stdin` JSON envelope mode.

### Non-breaking additions

All new flags (`--rel`, `--direction`, `--min-links`, `--max-links`, `--source-type`, `--status`, `--summary`, `--check`) and write operations (`retype`, `merge`) are additive.

### Change protocol extension

Add to CLAUDE.md Change Protocol: when modifying commands, flags, or agent-mode schemas, check downstream references:
- `README.md` — Commands section
- `CLAUDE.md` — Commands section
- `../lens-note-plugin/plugin/skills/lens/SKILL.md` — Commands, Write API Reference
- Any `--stdin` envelope examples in docs
