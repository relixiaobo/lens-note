# Lens v0.2: Zettelkasten-Native Redesign

Date: 2026-04-10
Status: Design proposal (not yet implemented)

## 1. Why This Redesign

v0.1 used a **category-based model**: Claims "belong to" Programmes. This creates problems at scale:
- Every article creates a new Programme (7 articles = 7 Programmes)
- Claims are siloed — a Claim about "quality" in the "Software Quality" Programme is disconnected from a related Claim about "quality" in the "Design" Programme
- Structure is pre-defined, not emergent

Luhmann's Zettelkasten offers a proven alternative: **cards + links, no categories**. Structure emerges from connections, not from classification.

## 2. Theoretical Foundation

### 2.1 Luhmann's Zettelkasten (Primary Source)

From Luhmann's "Kommunikation mit Zettelkästen" (1981) and Johannes Schmidt's archival research (2018):

- **90,000 cards**, no categories, no folders, no tags
- **Branching IDs** give proximity (1, 1a, 1a1, 1b...) — new thoughts placed NEAR related thoughts
- **Cross-references** connect any card to any other — the source of "surprise"
- **Hub notes** (Strukturzettel) — curated overviews created AFTER cards accumulate
- **Index** — extremely sparse (3,200 entries for 67,000 cards = ~5%). Each entry points to 1-4 cards. Entry points, not catalogs.

Key quote: "A content-based classification system would mean adhering to a single structure forever." — Luhmann rejected categories.

### 2.2 Ahrens' Processing Pipeline

From "How to Take Smart Notes" (2017):

- **Fleeting notes** → quick captures, process within 1-2 days or discard
- **Literature notes** → brief notes on what you read, in your own words, tied to source
- **Permanent notes** → self-contained ideas, understandable without original context

Critical insight: literature notes are throwaway intermediaries. The permanent note is where real thinking happens.

### 2.3 Matuschak's Principles

- **Evergreen notes should be atomic** — one idea per note
- **Titled as declarative phrases** — "Spaced repetition makes memory a choice"
- **Bridge notes** — notes that explicitly explain WHY two ideas from different domains connect
- The note IS the thinking, not a record of thinking

### 2.4 What Lens Adds

Lens is not a manual note-taking tool. It uses AI to compile articles into structured cards. This changes the equation:

- **Toulmin structure** on Claims (evidence, qualifier, warrant) — more rigorous than Luhmann's flat text
- **Typed links** (supports, contradicts, refines) — more informative than Luhmann's untyped "see also"
- **AI Agent** discovers connections that humans might miss
- **scope field** (big_picture/detail) — Reif/Miller hierarchy for progressive disclosure

These are IMPROVEMENTS on Luhmann, not contradictions.

## 3. Card Types

### 3.1 The Type System

6 card types. Each is an independent Zettel. None "belongs to" any container.

| Type | What It Is | Zettelkasten Analog | Key Fields |
|---|---|---|---|
| **Source** | Where content came from | Luhmann's Box 1 (bibliography) | title, url, author, word_count |
| **Claim** | Assertion with evidence | Permanent note (with Toulmin) | statement, evidence[], qualifier, scope, voice |
| **Frame** | Perspective / lens | Novel to lens | name, sees, ignores, assumptions[] |
| **Question** | Open inquiry | Implicit in Luhmann, explicit here | text, status |
| **Observation** | Lightweight thought (no evidence required) | Fleeting/literature note | text |
| **Connection** | Bridge note explaining a cross-domain link | Luhmann's cross-reference, made explicit | text, bridges: [id, id] |

### 3.2 What Changed From v0.1

| v0.1 | v0.2 |
|---|---|
| Programme (container, auto-created) | **Removed**. Replaced by structure notes (see §4.3) |
| Thread (conversation) | **Removed from core types**. Chat history is a separate concern, not knowledge. |
| Claim with `programmes: [pgm_id]` | Claim with **no programme field**. Links only. |

### 3.3 New: Observation

A lightweight card for thoughts without full Toulmin structure:

```yaml
---
id: obs_01HXY
type: observation
text: "The way Fukasawa talks about 'design dissolving in behavior' reminds me of how good APIs disappear — you stop noticing them."
source: src_01DEF
created_at: "2026-04-10"
---
```

- No evidence required (unlike Claim)
- No qualifier (it's not asserting a falsifiable claim)
- Can be **promoted to a Claim** when evidence arrives
- Created by: user (`lens note`), or Agent (for interesting connections not yet substantiated)

### 3.4 New: Connection (Bridge Note)

A card that explicitly explains WHY two ideas from different domains are related:

```yaml
---
id: con_01HXY
type: connection
text: "Both Fukasawa's 'without thought' design and Karpathy's 'vibe coding' share the same core insight: the best tools disappear into the user's natural behavior. But they diverge on stakes — Fukasawa is designing physical objects (low risk), while vibe coding produces software (potentially high risk)."
bridges:
  - clm_01ABC
  - clm_02DEF
created_at: "2026-04-10"
---
```

- The card body IS the explanation of the connection
- `bridges` points to the two (or more) cards being connected
- This is where SURPRISE lives — cross-domain connections the user didn't expect
- Created by: Agent (when it discovers unexpected links) or user

### 3.5 Card Design Principles

1. **Atomic**: Each card is about exactly one thing
2. **Self-contained**: Understandable without reading other cards
3. **Titled as content** (not as category): Claim's `statement` IS its title
4. **Linked, not classified**: No `programmes`, `tags`, or `categories` fields
5. **Typed links are optional**: Most links can be untyped `related` with a prose `note`. Typed links (supports/contradicts/refines) are for when the relationship is clear.

## 4. Links

### 4.1 Link Types

```
Typed (clear relationship):
  supports      — evidence or reasoning that strengthens another card
  contradicts   — evidence or reasoning that weakens another card
  refines       — a more precise version of another card
  bridges       — Connection card linking two cross-domain ideas

Untyped (association):
  related       — some relationship exists (with optional note explaining why)

Provenance:
  source        — which Source this was extracted from
```

### 4.2 Links Are the Primary Structure

There are no categories, folders, tags, or Programmes. The ONLY way cards organize is through links.

Over time, clusters of densely linked cards emerge naturally. These clusters ARE the user's research themes — but they were never pre-defined.

### 4.3 Structure Notes (Replacing Programme)

When a cluster grows large enough, a user (or the system) creates a **structure note** — an Observation card that lists and organizes entry points into the cluster:

```yaml
---
id: obs_01STR
type: observation
text: "Software Quality: how internal code quality relates to development cost, productivity, and team practices."
role: structure_note
entry_points:
  - clm_01ABC
  - clm_05DEF
  - frm_02GHI
created_at: "2026-04-10"
---

Key entry points into this topic:

1. **clm_01ABC** — "High internal quality is actually cheaper" (the core insight)
2. **clm_05DEF** — "Cruft accumulates inevitably" (why quality degrades)
3. **frm_02GHI** — Economic Cost-Benefit Frame (the perspective)

From here, follow links to explore: evidence, counter-arguments, open questions.
```

This is Luhmann's hub note (Strukturzettel):
- Created AFTER cards accumulate (not at ingest time)
- Points to 3-5 entry points (not all cards about the topic)
- Is itself a card (an Observation with `role: structure_note`)
- Does NOT own its members — members don't know about it

### 4.4 How Structure Notes Are Created

1. **User-initiated**: `lens index create "Software Quality" --entries clm_01 clm_05 frm_02`
2. **System-suggested**: `lens suggest-index` analyzes the link graph, finds dense clusters, proposes entry points
3. **Never auto-created during ingest**

Target sparsity: ~5% of cards should be reachable from structure notes (matching Luhmann's ratio).

## 5. The AI Agent's Role

### 5.1 What the Agent Does

The Compilation Agent reads an article and produces:

1. **Source card** — provenance record
2. **Claim cards** — key assertions with evidence (3-5 per article, high quality bar)
3. **Frame cards** — genuinely novel perspectives (0-2 per article, only if truly new)
4. **Question cards** — genuinely open questions (1-3 per article)
5. **Links** — connections between new cards and existing cards (the CORE job)
6. **Connection cards** — when the Agent discovers a surprising cross-domain link

### 5.2 What the Agent Does NOT Do

- Does NOT create Programmes / structure notes (post-hoc, user-initiated)
- Does NOT classify or categorize
- Does NOT create every possible claim (only the ones that pass the quality bar)

### 5.3 Quality Bar for Extraction

Each card must pass ALL of these tests:

**Claim**:
- Non-obvious (not common knowledge)
- Independently valuable (makes sense without the original article)
- Referenceable (user would cite this in future thinking)
- Evidence-backed (article provides specific support)

**Frame**:
- Genuinely novel (not a generic analytical method like "economic analysis")
- Has explanatory power (reveals something you wouldn't see otherwise)
- Transferable (can apply to other domains)

**Question**:
- Genuinely open (the article doesn't answer it)
- Important (worth investigating)

### 5.4 Agent's Focus: Discovering Connections

The Agent's most valuable work is finding links between new and existing cards:

```
Agent reads article about Fukasawa's "without thought" design
  → searches existing cards: lens search "disappear behavior" --json
  → finds clm_XX about "vibe coding"
  → notices: both are about tools disappearing into behavior
  → creates Connection card explaining the parallel
  → creates Claim cards for genuinely new insights
  → links new Claims to existing ones via supports/contradicts/related
```

This is Luhmann's "communication partner" — the system produces connections the user didn't expect.

## 6. Storage

### 6.1 File Layout

```
~/.lens/
├── cards/                     # ALL cards in one directory
│   ├── src_01HXY.md          #   Source
│   ├── clm_01HXY.md          #   Claim
│   ├── frm_01HXY.md          #   Frame
│   ├── q_01HXY.md            #   Question
│   ├── obs_01HXY.md          #   Observation
│   └── con_01HXY.md          #   Connection
├── raw/                       # Original files
│   └── src_01HXY.html
├── feeds.json                 # RSS subscriptions
├── index.sqlite               # Derived cache (FTS5 + links)
└── config.yaml
```

Note: ALL cards in ONE directory. No type-based subdirectories. This matches Luhmann's single box — cards are distinguished by their ID prefix and frontmatter `type`, not by location.

Alternative: Keep type-based subdirectories for filesystem browsability. This is a pragmatic choice, not a philosophical one. Either works.

### 6.2 Card File Format

Same as v0.1: YAML frontmatter (≤20 lines) + markdown body.

Links stored as typed fields in frontmatter:

```yaml
---
id: clm_01HXY
type: claim
statement: "High internal quality software is actually cheaper"
qualifier: certain
scope: big_picture
voice: extracted
evidence:
  - text: "this trade-off does not apply to software..."
    source: src_01DEF
supports: [clm_05ABC]
related:
  - id: frm_02GHI
    note: "viewed through the economic cost-benefit lens"
source: src_01DEF
status: active
created_at: "2026-04-10"
---

Fowler argues that the conventional quality-cost trade-off is inverted for internal software quality.
```

No `programmes` field. No `superseded_by`. Links are the only structure.

## 7. Navigation

### 7.1 Three Ways to Navigate

1. **Search** → find cards by keyword → follow links from there
2. **Structure notes** → entry points into a cluster → follow links
3. **Digest** → new cards + new connections + new tensions → follow links

All three lead to the same thing: **graph traversal via links**.

### 7.2 CLI Commands (Unchanged)

```
lens list <type> [--filters]     Browse cards
lens show <id>                    Card details
lens search "<query>"             Full-text search
lens links <id>                   Relationships (forward + backward with labels)
lens context "<query>"            Agent-ready context pack

lens ingest <url|file>            Compile article → cards + links
lens note "<text>"                Quick observation
lens digest [week|month|year]     New cards + connections + tensions

lens suggest-index                Analyze link graph, propose structure notes
lens index create "<title>" --entries id1 id2 id3

lens feed add|import|list|check|remove
lens status
lens rebuild-index
```

### 7.3 Digest Changes

```
Today's Digest
━━━━━━━━━━━━━━

New Insights
  ■■■ "Context windows are a programming environment"
  ■■  "Observation-first design outperforms problem-first"

New Connections
  🔗 "Without thought design" ↔ "Vibe coding"
     Both: tools disappearing into behavior
     (from 2 different sources, linked by Agent)

New Tensions
  🔥 "More context is always better" ↔ "Over-stuffing hurts"

New Questions
  ? Can "design dissolving in behavior" apply to APIs?

From 3 sources · 8 new cards · 5 new links
```

Grouped by RELATIONSHIP TYPE, not by Programme/topic.

## 8. Migration from v0.1

### 8.1 Data Migration

- Claims, Frames, Questions: keep as-is, remove `programmes` field
- Programmes → convert to Observation cards with `role: structure_note`
- Source: keep as-is
- Threads: archive or convert to Observations

### 8.2 Code Migration

- types.ts: remove Programme type, add Observation + Connection types
- Remove `programmes` field from Claim/Frame/Question
- Agent: remove Programme creation, focus on link discovery
- process-output.ts: remove Programme logic, add Connection creation
- list/show/links: work the same (cards are still typed files)

## 9. Open Questions

1. **One directory or type-based subdirectories?** Luhmann had one box. But filesystem browsing is easier with subdirectories. Pragmatic choice.

2. **Should Connection be a separate type or just an Observation?** Connection has a special `bridges` field. But it could be an Observation with typed links. Leaning toward keeping it as a separate type for clarity.

3. **How to handle Thread/conversation functionality?** Users want to discuss cards with AI. This could be: (a) a separate Thread type outside the core card system, (b) comments appended to a card's body, (c) a new Observation that references the discussed card.

4. **Scope field on Observations?** Observations are lightweight. Should they have big_picture/detail? Probably not — scope is for Claims with evidence.

5. **When does an Observation become a Claim?** User says "promote obs_01 to claim" → system asks for evidence and qualifier. Or Agent notices an Observation has accumulated evidence from multiple sources and proposes promotion.

## 10. Summary of Changes

| Aspect | v0.1 | v0.2 (Zettelkasten) |
|---|---|---|
| **Organization** | Programme containers | Links between cards |
| **Structure** | Pre-defined (auto-created) | Emergent (from link graph) |
| **Agent's job** | Extract + classify | Extract + discover connections |
| **Card types** | 6 (Source, Claim, Frame, Question, Programme, Thread) | 6 (Source, Claim, Frame, Question, Observation, Connection) |
| **Programme** | Container, auto-created per article | Removed (replaced by structure notes) |
| **Thread** | Core type | Removed from core (separate concern) |
| **Navigation** | Browse by Programme | Search → links → links (graph traversal) |
| **Index/entry points** | Programme list | Structure notes (sparse, post-hoc) |
| **Digest grouping** | By Programme | By relationship type (new / connections / tensions) |
| **Quality bar** | 12 claims/article | 3-5 claims/article |
| **Frames** | 4/article | 0-2/article (only genuinely novel) |
