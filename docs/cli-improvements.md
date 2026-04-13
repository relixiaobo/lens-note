# CLI Improvements — Agent Feedback

Feedback from an agent that processed 784 Tana notes into lens. The agent wrote 40+ Python scripts to work around missing primitives. These improvements eliminate that need.

Status: **Design reviewed by Codex. Ready to implement.**

## 1. Batch Write: Partial Success

**Problem**: One invalid item fails the entire batch. Meanwhile, earlier items are already persisted (hidden partial side effects).

**Solution**: Process each item independently. Per-item error tracking. Dependency-aware `$N` failures.

New output format:
```json
{
  "results": [
    {"index": 0, "id": "note_01A", "type": "note", "action": "created"},
    {"index": 1, "id": "note_01B", "type": "note", "action": "created"},
    {"index": 2, "type": "link", "action": "error", "message": "note_01XYZ not found"},
    {"index": 3, "type": "note", "action": "error", "message": "Depends on failed $2"}
  ]
}
```

Rules:
- Each item has explicit `index` and status
- Items that reference a failed `$N` also fail with "depends on" message
- `process.exitCode = 1` when any errors
- Single-item writes keep current format (not breaking)

**Breaking change**: Batch output changes from `{created:[...]}` to `{results:[...]}`. Mark as v1.1.0.

**Implementation**: ~20 lines in `executeWrite()`. Try/catch per item. Track failed indices for `$N` dependency.

## 2. Link Idempotency

**Problem**: Writing the same link twice may create duplicates. Agent had to maintain dedup sets.

**Solution**: Check before creating. Handle edge cases:

| Case | Behavior |
|------|----------|
| Link (from, to, rel) already exists, same reason | Return `{"action": "unchanged"}` |
| Link exists, different reason | Update reason, return `{"action": "updated"}` |
| `contradicts` link exists on from-side only | Repair the missing reverse edge, return `{"action": "repaired"}` |
| Link doesn't exist | Create normally, return `{"action": "created"}` |

Never throw on duplicate. Never create duplicate entries.

**Implementation**: ~15 lines in `writeLink()`. Check existing note's links array. For `contradicts`, verify both directions.

## 3. Orphan Query: `lens list --orphans`

**Problem**: `lens status` returns max 20 orphan IDs. Agent needed all 400+.

**Solution**: Add `--orphans` filter and `--limit`/`--offset` pagination to `lens list`.

```bash
lens list notes --orphans --json                # all orphan notes
lens list notes --orphans --limit 50 --json     # first 50
lens list notes --orphans --offset 50 --json    # next batch
```

Orphan definition: **note-to-note edges only** (consistent with current `status` definition). A note with only a `source` link is still an orphan. SQL:

```sql
SELECT o.id, o.data FROM objects o
WHERE o.type = 'note'
  AND o.id NOT IN (SELECT from_id FROM links WHERE rel IN ('supports','contradicts','refines','related'))
  AND o.id NOT IN (SELECT to_id FROM links WHERE rel IN ('supports','contradicts','refines','related'))
ORDER BY o.updated_at DESC
LIMIT ? OFFSET ?
```

Output includes title + body preview (first 100 chars) for triage without extra `show` calls:
```json
{
  "type": "notes",
  "filter": "orphans",
  "count": 47,
  "items": [
    {"id": "note_01ABC", "title": "...", "preview": "First 100 chars of body..."}
  ]
}
```

**Breaking change**: Remove `orphan_ids` from `status` output. Keep `orphan_count`.

**Implementation**: ~30 lines in `list.ts` + SQL query.

## 4. ID Resolution: `lens search --resolve`

**Problem**: Agent knows a note's title but needs its ID. Had to hardcode ID dictionaries.

**Solution**: Add `--resolve` flag to `lens search`. Conservative resolution with disambiguation.

Resolution order:
1. **Exact ID match** — input is already a valid ID
2. **Exact title match** (case-insensitive)
3. **FTS5 ranked search** — only if single clear winner

```bash
# Clear match
lens search "High internal quality" --resolve --json
# → {"id": "note_01ABC", "title": "High internal quality has negative cost in software"}

# Ambiguous
lens search "quality" --resolve --json
# → {"error": {"code": "ambiguous_match", "candidates": [{"id":"note_01A","title":"..."},{"id":"note_01B","title":"..."}]}}

# No match
lens search "nonexistent" --resolve --json
# → {"error": {"code": "no_match", "message": "No results for \"nonexistent\""}}
```

**Implementation**: ~20 lines in `search.ts`. Title-match query in `storage.ts`.

## 5. Show: Directional Link Counts

**Problem**: `links` is a dict `{forward, backward}`, not a list. `len(d['links'])` returns 2 (dict keys), misleading.

**Solution**: Add directional counts that match the JSON payload:

```json
{
  "id": "note_01ABC",
  "title": "...",
  "forward_link_count": 2,
  "backward_link_count": 3,
  "links": {
    "forward": [...],
    "backward": [...]
  }
}
```

Counts only include displayed links (not hidden `source` edges).

**Implementation**: 2 lines in `show.ts`.

## 6. Documentation Updates (same release)

- **`--stdin` usage**: Add clear rule to SKILL.md — "always use `--stdin` for write operations"
- **Bulk orphan curation**: Add workflow to `references/curation.md` for `orphan_count > 20`
- **`status` limitations**: Document that `orphan_count` is the count, use `list --orphans` for details

## Summary

| # | Change | Breaking? | Effort |
|---|--------|-----------|--------|
| 1 | Batch partial success | Yes (batch output format) | ~20 lines |
| 2 | Link idempotency | No (additive actions) | ~15 lines |
| 3 | List --orphans + pagination | Yes (remove status.orphan_ids) | ~30 lines |
| 4 | Search --resolve | No (opt-in flag) | ~20 lines |
| 5 | Show link counts | No (additive fields) | ~2 lines |
| 6 | Documentation | No | ~50 lines |

**Version**: Ship as v1.1.0 (breaking changes to batch output and status).

**Total**: ~140 lines of code + ~50 lines of docs.
