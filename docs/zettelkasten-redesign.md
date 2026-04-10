# Lens v0.2: Zettelkasten-Native Redesign

Date: 2026-04-10
Status: Design proposal (not yet implemented)

---

## 1. Core Principle

**All knowledge is Notes. Structure emerges from links.**

No categories. No folders. No containers. No Programme. Notes link to each other. Over time, clusters of densely linked Notes form naturally. Structure notes are sparse post-hoc entry points — Notes themselves, not a separate concept.

---

## 2. Three Types

```
Source   — Where content came from (provenance, not knowledge)
Note     — A thought (one idea per card, with optional structure fields)
Thread   — A conversation about Notes (interaction, not knowledge)
```

### 2.1 Source

Provenance record + original content. Not a knowledge card.

```yaml
---
id: src_01HXY
type: source
title: "Is High Quality Software Worth the Cost?"
author: "Martin Fowler"
url: "https://martinfowler.com/articles/is-quality-worth-cost.html"
source_type: web_article
word_count: 2718
raw_file: "raw/src_01HXY.html"
ingested_at: "2026-04-10"
---
[full article content in markdown]
```

### 2.2 Note

The universal knowledge card. One idea per card.

Required fields: `id`, `type`, `text`, `created_at`
Everything else is optional. The optional fields express cognitive roles:

```
text              — the thought itself (always present)

Claim fields (makes this a substantiated assertion):
  evidence[]      — supporting quotes with source attribution
  qualifier       — certain / likely / presumably / tentative
  voice           — extracted / restated / synthesized

Frame fields (makes this a perspective):
  sees            — what this perspective reveals
  ignores         — what it overlooks
  assumptions[]   — what it takes for granted

Question field (makes this an open inquiry):
  question_status — open / tentative_answer / resolved

Hierarchy (Reif/Miller):
  scope           — big_picture / detail

Structure (Miller):
  structure_type  — taxonomy / causal / argument / etc.

Bridge (makes this a connection note):
  bridges[]       — IDs of notes being connected

Structure note (makes this an index entry):
  role: structure_note
  entries[]       — IDs of entry-point Notes

Links (the primary structure):
  supports[]      — Notes this strengthens
  contradicts[]   — Notes this conflicts with
  refines[]       — Notes this is a more precise version of
  related[]       — Notes with some relationship (with optional prose note)

Provenance:
  source          — which Source this was extracted from
  status          — active / superseded
```

**Role** is a soft hint (`role: claim | frame | question | observation | connection | structure_note`). It tells the display layer how to render, but does NOT constrain the card. A Note can have both `evidence` (claim) and `sees` (frame) simultaneously.

**Minimal Note** (an observation):
```yaml
---
id: note_01HXY
type: note
text: "Testing in production is underrated"
source: src_01DEF
created_at: "2026-04-10"
---
```

**Substantiated claim**:
```yaml
---
id: note_02ABC
type: note
text: "High internal quality software is actually cheaper"
evidence:
  - text: "this trade-off does not apply to software..."
    source: src_01DEF
qualifier: certain
scope: big_picture
role: claim
supports: [note_05GHI]
source: src_01DEF
created_at: "2026-04-10"
---
Fowler argues that the conventional quality-cost trade-off is inverted.
```

**Perspective (frame)**:
```yaml
---
id: note_03DEF
type: note
text: "Economic Cost-Benefit perspective on quality"
sees: "quality as ROI investment"
ignores: "non-economic motivations"
assumptions: ["market rewards faster delivery"]
role: frame
source: src_01DEF
created_at: "2026-04-10"
---
```

**Connection (bridge note)**:
```yaml
---
id: note_04GHI
type: note
text: "Fukasawa's design and vibe coding both make tools disappear into behavior"
bridges: [note_10MNO, note_15PQR]
role: connection
created_at: "2026-04-10"
---
Both are about invisible tools. But they diverge on stakes.
```

**Structure note (replaces Programme and Index)**:
```yaml
---
id: note_05STR
type: note
text: "Software Quality"
role: structure_note
entries: [note_02ABC, note_08DEF, note_03DEF]
created_at: "2026-04-10"
---
Entry points:
1. note_02ABC — "High quality is cheaper" (core insight)
2. note_08DEF — "Cruft accumulates inevitably"
3. note_03DEF — Economic Cost-Benefit perspective
```

### 2.3 Thread

A conversation about Notes. Not knowledge — interaction.

```yaml
---
id: thr_01HXY
type: thread
title: "Is Fowler's quality argument too strong?"
references: [note_02ABC, note_08DEF]
started_from: note_02ABC
created_at: "2026-04-10"
---
**You** · 2026-04-10
I think the claim about quality being cheaper ignores startup contexts...

**AI** · 2026-04-10
Based on your knowledge base, Note note_15PQR about "initial low-quality
advantage" addresses this — the window where low quality is cheaper exists
but closes within weeks...
```

Thread links to Notes via `references`. Notes don't know about Threads (no thread field on Notes). Backlinks from SQLite cache enable "which Threads discuss this Note?" queries.

---

## 3. Links

### 3.1 Types

```
Typed:
  supports       — strengthens another Note
  contradicts    — conflicts with another Note
  refines        — more precise version of another Note

Untyped:
  related        — some relationship (with optional note: "why")

Special:
  bridges        — Connection note linking cross-domain ideas
  entries        — Structure note pointing to entry-point Notes
  source         — provenance (which Source)
  references     — Thread referencing Notes
```

### 3.2 Links Are the Only Structure

No categories. No folders. No tags. No Programme membership.

A Note's position in the knowledge graph is defined entirely by its links to other Notes. Clusters emerge naturally from link density. Structure notes are optional navigational aids created post-hoc.

### 3.3 Hierarchy Through Links (Reif + Luhmann)

```
Note A (scope: big_picture): "High quality is cheaper"
  ← supports ← Note B (scope: detail): "Cruft slows dev within weeks"
  ← supports ← Note C (scope: detail): "15x defect density"

scope + supports links = implicit hierarchy
No container needed.
Hierarchy is recursive: Note B can be big_picture relative to its own supporters.
```

---

## 4. Storage

### 4.1 File Layout

```
~/.lens/
├── notes/                     # All knowledge cards
│   ├── note_01HXY.md         # claim, frame, question, observation, connection, structure_note
│   └── ...
├── sources/                   # Provenance records
│   └── src_01HXY.md
├── threads/                   # Conversations
│   └── thr_01HXY.md
├── raw/                       # Original files
│   └── src_01HXY.html
├── feeds.json                 # RSS subscriptions
├── index.sqlite               # Derived cache
└── config.yaml
```

3 directories for objects. 1 for raw files.

### 4.2 IDs

```
note_  → Note (any role)
src_   → Source
thr_   → Thread
```

3 prefixes.

### 4.3 SQLite Cache

```sql
CREATE VIRTUAL TABLE search_index USING fts5(
  id, type, role, text, body, tokenize='porter unicode61'
);

CREATE TABLE objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,     -- 'note' | 'source' | 'thread'
  role TEXT,              -- 'claim' | 'frame' | 'question' | 'observation' | 'connection' | 'structure_note'
  data TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE links (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rel TEXT NOT NULL,
  note TEXT,
  PRIMARY KEY (from_id, to_id, rel)
);
CREATE INDEX idx_links_to ON links(to_id, rel);
```

---

## 5. The AI Agent

### 5.1 Extraction Standard

The Agent does NOT target a fixed number of Notes per article. It targets RELATIONSHIPS to existing knowledge:

| What the Agent finds | Action |
|---|---|
| Genuinely new insight (not in knowledge base) | Create Note |
| Contradiction with existing Note | Create Note + `contradicts` link |
| New evidence for existing Note | Update existing Note's `evidence[]` |
| New perspective not yet seen | Create Note with `sees/ignores` |
| Genuinely open question | Create Note with `question_status: open` |
| Already known (duplicate) | Do not create |

**The number of Notes is a RESULT of what's genuinely new, not a target.**

An article that covers mostly known territory might produce 1-2 Notes. A breakthrough paper might produce 10. The Agent decides based on exploration.

### 5.2 Agent's Process

```
1. Read the source document
2. Explore existing knowledge (lens search, lens list, lens links)
3. Identify what's genuinely new, contradicting, or supporting
4. Create Notes with links to existing Notes
5. Optionally create Connection notes for surprising cross-domain links
6. Do NOT create structure notes (post-hoc, user-initiated)
```

### 5.3 Agent's Tools

```
lens list notes [--role] [--scope] [--since]    Browse
lens show <id> --json                            Inspect
lens search "<query>" --json                     Search
lens links <id> --json                           Relationships
lens context "<query>" --json                    Context pack
submit_extraction(...)                           Submit results
```

The Agent uses the same CLI tools as any other agent. No special tools.

---

## 6. Navigation + CLI

### 6.1 Commands

```
Explore:
  lens list notes [--role claim|frame|question|...] [--scope big_picture] [--since 7d]
  lens list sources
  lens list notes --role structure_note           # browse index entries
  lens show <id>
  lens search "<query>"
  lens links <id>
  lens context "<query>"

Write:
  lens ingest <url|file>                          # compile → Source + Notes + links
  lens note "<text>"                              # quick observation

Operations (v0.2):
  lens lint                                       # health check: orphans, missing links, implicit contradictions
  lens suggest-index                              # analyze link graph, propose structure notes

Operations (v0.3):
  lens run <id> anatomy                           # Li Jigang concept anatomy
  lens run <cluster> rank                         # Li Jigang rank reduction
  lens run <topic> roundtable                     # Li Jigang roundtable
  lens run <id> drill                             # Li Jigang essence drilling

RSS:
  lens feed add|import|list|check|remove

View:
  lens digest [week|month|year]

System:
  lens init | status | rebuild-index
```

### 6.2 Digest (Without Programmes)

```
Today's Digest
━━━━━━━━━━━━━━

New Insights
  ■■■ "Context windows are a programming environment"
      → supports existing: "Compilation > interpretation"
  ■■  "Observation-first design outperforms problem-first"

New Connections
  🔗 "Without thought design" ↔ "Vibe coding"
     Both: tools disappearing into user behavior

New Tensions
  🔥 "More context always better" ↔ "Over-stuffing hurts"

New Evidence
  📎 "High quality is cheaper" — new supporting evidence from article X

New Questions
  ? Can "design dissolving in behavior" apply to API design?

8 new Notes · 5 new links · from 3 sources
```

Grouped by RELATIONSHIP TYPE. If structure notes exist, their titles can optionally appear as context labels.

---

## 7. Theoretical Foundation

### 7.1 Luhmann's Zettelkasten
- Cards independent, no categories
- Links as primary structure
- Index sparse and post-hoc (structure notes)
- Surprise from traversal

### 7.2 Reif + Miller
- scope (big_picture/detail) creates implicit hierarchy through links
- structure_type (9 types) as optional metadata
- Hierarchy is recursive, not containerized

### 7.3 Li Jigang
- Cognitive operations (anatomy/rank/roundtable/drill) are `lens run` commands (v0.3)
- They produce Notes from existing Notes — "compiler passes"
- Frame concept maps to `sees/ignores/assumptions` fields

### 7.4 Karpathy's LLM Wiki
- Compile at ingest time, not at query time
- Source is immutable, Notes are maintained
- `lens lint` for health checks (v0.2)

### 7.5 Toulmin
- evidence/qualifier/voice as optional fields on Note
- A Note with evidence IS a substantiated claim
- A Note without evidence IS an observation

### 7.6 Lakatos (reinterpreted)
- Hard Core = Notes with `qualifier: certain` + `scope: big_picture`
- Protective Belt = Notes with `qualifier: likely/presumably`
- Open Questions = Notes with `question_status: open`
- Programme = structure note (a Note, not a separate concept)
- All emergent from the link graph, not pre-defined

---

## 8. Programme Is Gone

The word "Programme" does not exist in v0.2. What it did is now done by:

| Programme function | v0.2 equivalent |
|---|---|
| Container for Claims | **Gone.** Notes link to each other, no container. |
| Research theme | **Structure note** (a Note with `role: structure_note` + `entries[]`). |
| Auto-created per article | **Never auto-created.** Suggested by `lens suggest-index` after clusters form. |
| `programmes` field on Claims | **Gone.** No membership field. |
| `lens programme list` | `lens list notes --role structure_note` |
| `lens programme show` | `lens show <note_id>` (for a structure note) |

---

## 9. Migration from v0.1

```
v0.1 Claim     → v0.2 Note (role: claim, keeps evidence/qualifier/scope)
v0.1 Frame     → v0.2 Note (role: frame, keeps sees/ignores/assumptions)
v0.1 Question  → v0.2 Note (role: question, keeps question_status)
v0.1 Source    → v0.2 Source (unchanged)
v0.1 Programme → v0.2 Note (role: structure_note, entries = former members)
v0.1 Thread    → v0.2 Thread (unchanged)

Field changes:
  statement / name → text (unified)
  programmes[]     → removed (no container membership)
  clm_ / frm_ / q_ → note_ (unified prefix)
  claims/ frames/ questions/ programmes/ → notes/ (single directory)
```

---

## 10. Open Questions

1. **Thread UX**: How does the conversation work in CLI? `lens thread start <note_id>`? Or just `lens note "my thought about note_01" --re note_01`?

2. **Observation → Claim promotion**: `lens promote <note_id>` adds evidence and qualifier interactively?

3. **Structure note creation**: `lens suggest-index` analyzes link density and proposes entries. Threshold: how many interconnected Notes before suggesting?

4. **Multi-source Notes**: A Note synthesized from 3 articles has `source` pointing to... which one? Use `evidence[].source` for per-evidence provenance.

5. **Digest without grouping**: Is the flat "by relationship type" digest good enough? Or should it show structure note titles as optional group headers?

---

## 11. Summary

```
Types:     Source + Note + Thread (3 types, 3 directories, 3 ID prefixes)
Structure: Links only. No categories, no Programme, no containers.
Index:     Structure notes (Notes with role: structure_note). Sparse, post-hoc.
Agent:     Discovers relationships to existing knowledge. Creates Notes + links.
           Does NOT classify, does NOT create structure notes.
Quantity:  Determined by novelty, not by target number.
Theory:    Luhmann (cards + links) + Reif (scope hierarchy) + Toulmin (evidence)
           + Karpathy (compile at ingest) + Li Jigang (cognitive operations, v0.3)
```
