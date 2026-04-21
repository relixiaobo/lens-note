# Whiteboard as Primary Workspace

Date: 2026-04-21
Status: Design (pre-implementation)

## Position Shift

Until v1.32, whiteboards were an auxiliary surface — a place to lay out cards while reading the graph. Going forward, **the whiteboard is the primary workspace** for lens. The graph view stays for navigation and quality audit; the whiteboard is where a user actually arranges, connects, and annotates their thinking.

This is not a UI change. It's a product statement with three consequences:

1. The whiteboard needs structured state agents can read and write, not just pixel positions.
2. The whiteboard needs its own semantic primitives (groups and local arrows) that are **not** graph edges.
3. The renderer needs to be a canvas library, not a hand-rolled DOM layer, because the surface is now worth that investment.

## Two-Layer Invariant

**Graph layer and whiteboard layer are independent. They must never cross streams.**

| Layer | Storage | Meaning | Who writes |
|-------|---------|---------|-----------|
| **Graph** (`note.links[]`) | frontmatter on each note | "A supports B" — universal, cross-board, committed knowledge | Agent decisions, curated |
| **Whiteboard** (`wb_*.json`) | per-board JSON file | "On this board, I put X near Y and drew an arrow to Z labeled 'rebuts'" — local, contextual, draft | User gestures + agent helpers |

Concrete rules:
- A whiteboard arrow is **not** a typed rel. It has a free-text label, not an enum.
- A graph rel does **not** automatically appear as a whiteboard arrow. The whiteboard chooses what to show.
- Promoting a whiteboard arrow to a graph rel is an **explicit** act (see Promotion Workflow).
- Deleting a card from a whiteboard does not affect its graph links. Deleting a graph link does not touch the whiteboard.
- **Graph rels don't render on the whiteboard at all.** The whiteboard shows only its own arrows — nothing else. If you want to see graph rels, that's what the library sidebar, `lens map`, `lens discover`, and the main graph view are for. The whiteboard is a blank canvas you fill with your own connections.
- **Layout is not driven by graph structure either.** Even invisible graph edges would leak the graph's opinion into the board's spatial semantics ("A is above B because A supports B in the graph"). The renderer does NOT run any topology-aware layout. New members get a neutral grid fallback; meaningful placement is the user's job (drag) or an agent's job (`lens board move`, `lens board layout`). The renderer's Tidy action is an honest "reset to grid," nothing cleverer.

Why this matters: we previously bled graph rels onto whiteboards as auto-drawn edges — and, in an intermediate iteration, as the invisible scaffold that dagre used to auto-arrange cards. Both leaks made the board feel like a second graph view instead of a fresh canvas. Rendering graph rels duplicates what the library already does; layout-by-graph-topology does the same thing in a subtler way. Keep them fully separate — the whiteboard earns its keep by being where the *user* or an *agent* decides what belongs where, not where the graph decides for them.

## Data Model

The current `Whiteboard` type has `{id, title, body?, members[]}`. The whiteboard-as-primary model expands to:

```typescript
interface Whiteboard {
  id: string;                      // wb_<ULID>
  type: "whiteboard";
  title: string;
  body?: string;                   // research log / framing
  members: WhiteboardMember[];     // card references with layout
  groups: WhiteboardGroup[];       // named regions (empty array if none)
  arrows: WhiteboardArrow[];       // board-local connections between members
  camera: WhiteboardCamera;        // default viewport
  created_at: ISODate;
  updated_at: ISODate;
}

interface WhiteboardMember {
  id: string;                      // note_/src_/task_ ID
  x: number;
  y: number;
  parent?: string;                 // group ID if nested
}

interface WhiteboardGroup {
  id: string;                      // grp_<ULID>
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface WhiteboardArrow {
  id: string;                      // arr_<ULID>
  from: string;                    // member ID
  to: string;                      // member ID
  label?: string;                  // free text, NOT a graph rel enum
  color?: string;
  style?: "solid" | "dashed";
  promoted_to?: { rel: LinkRel; from_note: string; to_note: string };  // if arrow was promoted
}

interface WhiteboardCamera {
  x: number;
  y: number;
  scale: number;
}
```

### Schema posture

lens has a single real user today. The schema is **not** backward-compatible with pre-v1.33 whiteboard files: `groups`, `arrows`, `camera` are required, and members no longer carry `width/height`. A one-off in-place migration normalizes existing boards — after that, reading code can assume the full shape.

### ID prefixes

- Groups: `grp_<ULID>`
- Arrows: `arr_<ULID>`
- Whiteboards: `wb_<ULID>` (existing)

These IDs are whiteboard-local — they live only inside one `wb_*.json` file. They are **not** part of the graph and do not go into the SQLite index.

### Annotations are deferred

An earlier iteration included a `WhiteboardAnnotation` primitive (sticky notes and free-text labels). It was cut before implementation: the `label` role overlaps with `WhiteboardGroup.label`, and the `sticky` role overlaps with what a regular note or the whiteboard's own `body` already covers. When a concrete need for unindexed in-session scratch text emerges, we'll add it back — not before.

## CLI Command Family

Parallel to `lens note` / `lens source`, introduce `lens whiteboard` as the write surface for whiteboard-local state. Read stays unified under `lens show <wb_id> --json`.

```bash
# Read
lens show <wb_id> --json                    # full whiteboard state
lens whiteboard clusters <wb_id> --json     # spatial clusters (derived from positions + groups)

# Members
lens board add <wb_id> <card_id> [--x N --y N]
lens board remove <wb_id> <card_id>
lens board move <wb_id> <card_id> --x N --y N [--parent <grp_id>]

# Groups
lens board group <wb_id> --label "..." --x N --y N --width N --height N [--color "..."] [--members id,id,...]
lens board ungroup <wb_id> <grp_id>

# Arrows (between members only)
lens board arrow <wb_id> --from <member_id> --to <member_id> [--label "..." --style dashed]
lens board arrow-remove <wb_id> <arr_id>
lens board arrow-promote <wb_id> <arr_id> --rel <supports|contradicts|...> [--reason "..."]
```

All of these also accessible via `lens write --stdin` with `{"type": "whiteboard_add" | "whiteboard_arrow" | ...}`. JSON stdin is the primary agent surface; the subcommands are sugar for the human CLI.

`lens schema --json` registers every command so agents can discover them.

### Why a command family instead of flags on `lens write`

These operations don't fit the `{type, id, set}` shape of graph writes. A whiteboard arrow is not a link; a group is not a note. Packing them into `write` would force the agent to construct `{type: "whiteboard_arrow_add", wb: "...", from: "...", to: "..."}`-style payloads anyway. Giving them a named family is cleaner and keeps `lens write` focused on graph objects.

## Promotion Workflow

Whiteboard arrows are the draft space for graph rels. The flow:

1. User draws arrow from note_A to note_B on the whiteboard, labels it "contradicts".
2. Time passes. The arrow stays on the board.
3. Either the user or an agent decides the relationship is real:
   ```bash
   lens whiteboard arrow-promote wb_01 arr_01 --rel contradicts --reason "..."
   ```
4. This command:
   - Creates `note_A contradicts note_B` in the graph (idempotent).
   - Sets `arrow.promoted_to` on the whiteboard arrow so UI can render it differently (e.g., solid vs dashed).
   - Does NOT delete the arrow. The board-local presence remains useful as a visual anchor.

Reverse (demoting a graph rel back to a whiteboard arrow) is not supported. If a rel is wrong, unlink it; the whiteboard arrow stays independently.

Agents can find unpromoted arrows as a signal of unfinished thinking:

```bash
lens show <wb_id> --json | jq '.arrows[] | select(.promoted_to == null)'
```

## Renderer: React Flow

The DOM+SVG whiteboard is rewritten to use **@xyflow/react (React Flow)**, MIT-licensed. Rationale captured separately; key points:

- Data model is `{nodes, edges, viewport}` — matches whiteboard JSON after the expansion above
- Custom nodes render arbitrary React, so markdown cards work unchanged
- `useReactFlow()` gives agents a clean imperative API for UI-level operations (unused today but useful later)
- Native support for selection, multi-select, snap-to-grid, minimap, resizable nodes, custom connection handles
- Persistence stays externalized: UI feeds React Flow `nodes` and `edges` props; writes go through the CLI

Main graph view (900+ cytoscape nodes) stays on cytoscape. React Flow is **only** for the whiteboard surface.

### Bundle impact

Adding React + react-dom + @xyflow/react costs ~95 KB gzipped. The view-ui bundle grows from ~660 KB to ~800 KB uncompressed. For a local-only UI served by `lens view`, this is immaterial.

## Migration Plan

Strangler-fig, not rewrite:

### Phase 1: data model & CLI (no UI change)
- Extend `types.ts` with `WhiteboardGroup`, `WhiteboardArrow`, `WhiteboardCamera`; drop `width/height` from `WhiteboardMember`.
- Extend `whiteboard-storage.ts` with CRUD for the new collections.
- Extend `cli/board.ts` with group / arrow / arrow-promote / camera subcommands; register in `schema.ts`.
- Migrate existing boards in place (add empty arrays + default camera, strip legacy width/height).
- Add `whiteboard_dangling_member` lint check.
- Write tests. Ship as v1.33.0. **UI unchanged at this point** — existing DOM renderer keeps working, just doesn't render groups or arrows yet.

### Phase 2: parallel React Flow renderer
- Add `view-ui/src/whiteboard-rf.tsx` and esbuild config for a separate React subtree.
- Feature-gate with `?engine=rf` query string.
- Port: pan/zoom, drag, bezier edges, NoteCard custom node with markdown body.
- Keep vanilla `whiteboard.ts` as default. Two renderers coexist.

### Phase 3: feature parity + new features
- Multi-select, snap, fit-to-card, minimap, groups, arrows, promotion.
- Rich edge tooltips via `<EdgeLabelRenderer>`.

### Phase 4: cutover (done)
- The `?engine=dom|rf` toggle and the DOM+SVG renderer have both been removed. `WhiteboardRF` is now constructed directly in `app.ts` — there is one renderer, not two.
- `view-ui/src/whiteboard.ts` kept the shared types (`WhiteboardPayload`, `WhiteboardOptions`, etc.); everything else — the `Whiteboard` class, the markdown/`marked` pipeline for cards, the per-rel SVG arrow markers, the pair-indicator pie charts, the collision-resolution drag math — is gone.
- CSS for DOM-only whiteboard classes (`.wb-card*`, `.wb-edge*`, `.wb-world`, `.wb-root`, `.wb-pair-indicator`) was deleted from `app.css`. React Flow's own stylesheet (`xyflow.css`) plus the narrow `.wb-canvas-host` / `.wb-toolbar` helpers are all that's left.
- **Deliberate regressions we accepted by cutting over**: cards no longer show markdown body previews; edges use a single RF-standard arrow marker (no per-rel shape); there's no pair indicator for multi-rel pairs; drag doesn't resolve collisions. These were all DOM-renderer inventions; if any of them come back, it's as RF customizations, not by reviving the old engine.

Estimated total: ~2 weeks of focused work. Phase 1 (~3 days) is shippable on its own and unlocks agent access to whiteboard state even before the UI upgrade.

## Non-Goals

Explicitly out of scope:

- Freehand ink / drawing. Whiteboard is a card-and-arrow surface, not a sketchpad.
- Multiplayer / collaborative cursors. lens is single-player.
- Replacing the main graph view. Cytoscape stays for the 900+ node knowledge graph.
- Annotations / sticky notes. Deferred — see the "Annotations are deferred" note above. Reconsider when there's a concrete use case.
- Undo/redo across sessions. Out of scope for v1; may revisit.

## Resolved Decisions

1. **Arrow endpoints**: member IDs only. Groups are not valid endpoints (too ambiguous — is the arrow to the group's boundary, centroid, or all members?). Annotations are not in Phase 1 scope. Enforced at write time.
2. **Camera persistence scope**: lives inside the whiteboard JSON. Per-board, not per-user. Agents can read the camera as a signal of where the user is focused; cross-device sync works for free. No separate layout file.
3. **Dangling members**: silent filter on read. The `whiteboard_dangling_member` lint check surfaces them so users and agents can fix them deliberately, rather than having the UI crash or silently lose references.
