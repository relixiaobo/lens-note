# Lens v0.2: Zettelkasten-Native Redesign

Date: 2026-04-10
Status: Design proposal (not yet implemented)

---

## 1. Core Principle

**All knowledge is cards. Structure emerges from links.**

No categories. No folders. No containers. Cards link to each other. Over time, clusters of densely linked cards form naturally. Index entries are sparse post-hoc navigational aids — created when a cluster grows large enough to need an entry point.

---

## 2. Three Object Types

```
Source  — Where content came from (metadata, not knowledge)
Note    — A thought (one idea per card, with optional structure)
Index   — A sparse entry point into a cluster of Notes (post-hoc)
```

That's it. Everything is a Note.

### 2.1 Source

A provenance record. Not a knowledge card — it records WHERE content came from.

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
ingested_at: "2026-04-10T14:23:01Z"
---
[full article content in markdown]
```

### 2.2 Note

The universal knowledge card. One idea per card.

A Note has a small set of **required fields** and many **optional fields**. The optional fields express different cognitive roles — a Note with `evidence` is a substantiated claim; a Note with `sees/ignores` is a perspective; a Note with `question_status` is an open inquiry.

```yaml
---
id: note_01HXY
type: note
text: "High internal quality software is actually cheaper to produce"

# Optional: Toulmin structure (makes this a substantiated claim)
evidence:
  - text: "this trade-off does not apply to software..."
    source: src_01DEF
qualifier: certain
voice: extracted

# Optional: Perspective (makes this a frame/lens)
sees: "quality as ROI investment"
ignores: "non-economic motivations for quality"
assumptions: ["market rewards faster feature delivery"]

# Optional: Question (makes this an open inquiry)
question_status: open

# Optional: Hierarchy (Reif/Miller)
scope: big_picture

# Optional: Structure type (Miller)
structure_type: argument

# Optional: Bridge (makes this a connection note)
bridges: [note_01ABC, note_02DEF]

# Optional: Role hint (for display, not for classification)
role: claim  # claim | frame | question | observation | connection | structure_note

# Links (the primary structure)
supports: [note_05ABC]
contradicts: [note_12DEF]
refines: [note_08GHI]
related:
  - id: note_20JKL
    note: "similar insight from a different domain"

# Provenance
source: src_01DEF
status: active
created_at: "2026-04-10T14:23:01Z"
---
Fowler argues that the conventional quality-cost trade-off is inverted
for internal software quality. The economic case is stronger than the
moral case.
```

**Key properties:**

- **One idea per card.** Atomic. Self-contained. Understandable alone.
- **`text` is the only required field** (besides id/type/created_at). Everything else is optional.
- **Role is soft.** `role: claim` hints to the UI "display this with Toulmin structure." But the card isn't constrained by its role. A card can be both a claim (has evidence) and a frame (has sees/ignores) and a connection (has bridges).
- **Links are the only structure.** No `programmes` field. No container membership.

### 2.3 Index

A sparse entry point into a cluster of Notes. Created AFTER notes accumulate.

```yaml
---
id: idx_01HXY
type: index
title: "Software Quality"
entries:
  - note_01ABC
  - note_05DEF
  - note_09GHI
created_at: "2026-04-10"
---
Entry points into this topic:

1. **note_01ABC** — "High quality is cheaper" (the core insight)
2. **note_05DEF** — "Cruft accumulates inevitably" (why quality degrades)
3. **note_09GHI** — Economic Cost-Benefit perspective

From here, follow links to explore evidence, counter-arguments, and open questions.
```

**Key properties:**

- **Sparse.** Points to 2-5 entry Notes, not all Notes about a topic.
- **Post-hoc.** Created when a user notices a cluster, or when `lens suggest-index` detects one.
- **Not a container.** Notes don't "belong to" an Index. The Index points to them; they don't point back.
- **Target: ~5% of notes** should be reachable from Index entries (Luhmann's ratio).

---

## 3. Links

### 3.1 Link Types

```
Typed (clear relationship):
  supports       — strengthens another note
  contradicts    — weakens another note
  refines        — more precise version of another note

Untyped (association):
  related        — some relationship (with optional prose note explaining why)

Special:
  bridges        — Connection note linking 2+ cross-domain ideas
  source         — provenance (which Source this came from)

Structural:
  entries        — Index pointing to entry-point Notes
```

### 3.2 Links Are Primary

There are no categories, folders, tags, or programmes. Links are the ONLY organizational mechanism.

```
Note A ──supports──→ Note B
Note A ──contradicts──→ Note C
Note D ──related("both about tools disappearing into behavior")──→ Note A
Note E (connection) ──bridges──→ Note A, Note D
```

Over time, clusters of densely linked Notes emerge. These clusters ARE the user's research themes.

### 3.3 How Links Are Stored

In the Note's frontmatter (typed fields):

```yaml
supports: [note_05ABC]
contradicts: [note_12DEF]
related:
  - id: note_20JKL
    note: "similar insight about invisible infrastructure"
```

In SQLite cache (links table, for reverse queries):

```sql
SELECT from_id, rel FROM links WHERE to_id = 'note_01ABC';
-- "Who supports/contradicts/references this note?"
```

---

## 4. The AI Agent's Role

### 4.1 What the Agent Does

When `lens ingest <url>` is called:

1. **Create Source card** — provenance record
2. **Create Note cards** — 3-5 per article, high quality bar:
   - Claims: assertion + evidence + qualifier (role: claim)
   - Frames: perspective + sees/ignores (role: frame), only if genuinely novel (0-2 per article)
   - Questions: open inquiries (role: question), only truly open (1-3 per article)
   - Observations: interesting thoughts without evidence (role: observation)
3. **Discover links** — the Agent's CORE job:
   - Search existing Notes (`lens search`, `lens list`, `lens links`)
   - Set `supports/contradicts/refines/related` on new Notes
   - Create Connection notes for surprising cross-domain links (role: connection)

### 4.2 What the Agent Does NOT Do

- Does NOT create Index entries (post-hoc, user-initiated)
- Does NOT classify or categorize
- Does NOT extract every possible assertion (only pass quality bar)
- Does NOT create Programme/container structures

### 4.3 Quality Bar

Each Note must pass ALL tests:

**For claims (has evidence):**
- Non-obvious (not common knowledge)
- Independently valuable (makes sense without the article)
- Referenceable (would cite this later)
- Evidence-backed (article provides specific support)

**For frames (has sees/ignores):**
- Genuinely novel perspective (not "economic analysis" — that's generic)
- Transferable (applies beyond this article)

**For questions:**
- Genuinely open (article doesn't answer it)
- Important (worth investigating)

**Target: 3-7 Notes per article, not 12.**

### 4.4 Agent's Exploration (Using CLI Tools)

```
Agent reads article about "design dissolving in behavior"
  → lens list notes --role claim --scope big_picture --json
  → lens search "behavior design" --json
  → lens search "disappear intuitive" --json
  → Discovers: Note about "vibe coding" has a parallel insight
  → Creates: Connection note bridging design + vibe coding
  → Creates: 4 new claim Notes with links to existing Notes
  → Does NOT create: Index or Programme
```

---

## 5. Navigation

### 5.1 Three Paths

```
Search → Note → links → links → links    (keyword entry → graph traversal)
Index → entry Notes → links → links       (curated entry → graph traversal)
Digest → new Notes + connections + tensions (temporal entry → graph traversal)
```

All three converge on the same thing: **following links between Notes.**

### 5.2 CLI Commands

```
Explore:
  lens list notes [--role claim|frame|question|...] [--scope big_picture] [--since 7d]
  lens show <id>                    Show full details
  lens search "<query>"             Full-text search
  lens links <id>                   Relationships (forward + backward with labels)
  lens context "<query>"            Agent-ready context pack

Write:
  lens ingest <url|file>            Compile → Source + Notes + links
  lens note "<text>"                Quick observation

Index:
  lens suggest-index                Analyze link graph, propose entry points
  lens index create "<title>" --entries id1 id2 id3
  lens index list

RSS:
  lens feed add|import|list|check|remove

View:
  lens digest [week|month|year]     New Notes + connections + tensions

System:
  lens init | status | rebuild-index
```

### 5.3 Digest

```
Today's Digest
━━━━━━━━━━━━━━

New Insights
  ■■■ "Context windows are a programming environment"
      → supports: "Compilation > interpretation"
  ■■  "Observation-first design outperforms problem-first"

New Connections
  🔗 "Without thought design" ↔ "Vibe coding"
     Both: tools disappearing into user's natural behavior

New Tensions
  🔥 "More context always better" ↔ "Over-stuffing hurts"

New Questions
  ? Can "design dissolving in behavior" apply to APIs?

8 new Notes · 5 new links · from 3 sources
```

Not grouped by Programme/topic. Grouped by RELATIONSHIP TYPE.

---

## 6. Storage

### 6.1 File Layout

```
~/.lens/
├── notes/                     # All Notes (type prefix in ID distinguishes role)
│   ├── note_01HXY.md         #   Could be claim, frame, question, observation, connection
│   ├── note_02ABC.md
│   └── ...
├── sources/                   # Source provenance records
│   └── src_01HXY.md
├── indexes/                   # Sparse entry points
│   └── idx_01HXY.md
├── raw/                       # Original files
│   └── src_01HXY.html
├── feeds.json                 # RSS subscriptions
├── index.sqlite               # Derived cache (FTS5 + links)
└── config.yaml
```

### 6.2 ID Prefixes

```
src_   → Source
note_  → Note (any role)
idx_   → Index
```

Only 3 prefixes. Simple.

### 6.3 Frontmatter Constraint

≤ 20 lines. A minimal Note:

```yaml
---
id: note_01HXY
type: note
text: "Testing in production is underrated"
source: src_01DEF
created_at: "2026-04-10"
---
```

5 lines. A full claim with links:

```yaml
---
id: note_01HXY
type: note
text: "High internal quality software is actually cheaper"
evidence:
  - text: "this trade-off does not apply..."
    source: src_01DEF
qualifier: certain
scope: big_picture
role: claim
supports: [note_05ABC]
source: src_01DEF
created_at: "2026-04-10"
---
```

12 lines. Well within the 20-line constraint.

---

## 7. Theoretical Foundation

### 7.1 From Luhmann

- **Cards are independent.** No containers, no classification.
- **Links are primary structure.** Cross-references + Folgezettel.
- **Index is sparse and post-hoc.** ~5% coverage. Entry points, not catalogs.
- **Hub notes (Strukturzettel).** Curated overviews created after cards accumulate.
- **Surprise from traversal.** Following links leads to unexpected connections.

### 7.2 From Ahrens

- **Fleeting → Literature → Permanent note pipeline.** In lens: Agent creates literature-level Notes, user/AI refine to permanent level.
- **One idea per card.** Atomic, self-contained.
- **Writing IS thinking.** The Note is the thought, not a record of it.

### 7.3 From Matuschak

- **Evergreen notes accumulate insight.** Notes are updated as new evidence arrives.
- **Bridge notes explain connections.** The Connection role makes cross-domain links explicit.
- **Titled as declarative phrases.** The `text` field IS the title (statement as title).

### 7.4 From Toulmin (preserved from lens v0.1)

- **Claim = statement + evidence + qualifier.** Optional fields on Note.
- **Frame = sees + ignores + assumptions.** Optional fields on Note.
- **Warrant: Frame justifies Claim.** Expressed as a link, not a container.

### 7.5 From Reif/Miller (preserved from lens v0.1)

- **scope: big_picture | detail.** Optional field on Note. Drives progressive disclosure.
- **structure_type.** Optional field (taxonomy/causal/argument/...). For display, not classification.

### 7.6 From Lakatos (reinterpreted)

- Lakatos's "Hard Core" beliefs → Notes with `qualifier: certain` and `scope: big_picture`
- Lakatos's "Protective Belt" → Notes with `qualifier: likely/presumably`
- Lakatos's "Open Questions" → Notes with `role: question`
- Lakatos's "Programme" → Index entry (post-hoc entry point into a cluster)

The Lakatos structure is EMERGENT, not pre-defined. It's discovered in the link graph.

---

## 8. Migration from v0.1

### 8.1 Data

```
v0.1 Claim  → v0.2 Note (role: claim, keeps evidence/qualifier/scope)
v0.1 Frame  → v0.2 Note (role: frame, keeps sees/ignores/assumptions)
v0.1 Question → v0.2 Note (role: question, keeps question_status)
v0.1 Programme → v0.2 Index (entries point to key Notes)
v0.1 Source → v0.2 Source (unchanged)
v0.1 Thread → archived (not part of core type system)
```

### 8.2 Fields

```
Remove: programmes[] on all objects
Keep: supports, contradicts, refines, related, source, evidence, qualifier, scope, voice, sees, ignores, assumptions, question_status
Add: role (soft hint), bridges (for connection notes), text (required, replaces statement/name/text variations)
```

### 8.3 Storage

```
v0.1: claims/, frames/, questions/, programmes/, threads/ (5 directories)
v0.2: notes/, sources/, indexes/ (3 directories)
```

---

## 9. Open Questions

1. **Thread/conversation**: How does the user discuss a Note with AI? Options: (a) append to Note body, (b) separate chat system outside core types, (c) create a new Note referencing the discussed Note.

2. **Observation → Claim promotion**: How does a lightweight observation get promoted to a full claim? User runs `lens promote note_01 --evidence "..." --qualifier likely`?

3. **When to suggest Index**: After how many interconnected Notes should `lens suggest-index` propose an entry point? 10? 20? Based on link density?

4. **Single `note_` prefix or keep type prefixes?** `note_01` for everything, or `clm_01`/`frm_01`/`q_01`/`obs_01`/`con_01`? Keeping type prefixes is more informative when reading file names. But it implies classification.

5. **Link directionality**: Should `supports` be stored on the supporter or the supported? Current: on the supporter (`note A supports note B` → stored on A). This is correct (each Note stores its own outgoing links).

---

## 10. Summary

```
v0.1                              v0.2

6 types + 5 directories          3 types + 3 directories
Programme containers              Links only, no containers
Agent classifies                  Agent discovers connections
12 claims/article                 3-7 notes/article
4 frames/article                  0-2 frames/article
Structure pre-defined             Structure emergent
Digest by Programme               Digest by relationship type
Typed fields rigid                Optional fields flexible
Cards belong to Programme         Cards are independent
```

**One sentence: Notes + Links + optional structure. That's lens v0.2.**
