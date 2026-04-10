# Lens Schema Specification

Date: 2026-04-09
Version: `1.0`

This document is the precise specification of the lens type system. **It is the single source of truth for the code** — all implementations must conform to it.

- `getting-started.md` — **New agents start here**
- `positioning.md` defines what lens is (product + UX principles)
- `architecture.md` defines how lens is built (tech stack + component architecture)
- `methodology.md` defines how lens thinks (methodology + compilation lifecycle)
- **`schema.md` defines what lens's data looks like (this document)**
- `source-pipeline.md` defines the acquisition / extraction / incremental update for each source type
- `roadmap.md` defines the build order
- `references.md` defines where these designs come from (citations)

If the schema conflicts with the methodology, **this document takes precedence** (the schema is an executable constraint; the methodology is a conceptual description).

### Reading Guide (this document is ~1700 lines; you don't need to read it all at once)

**Must-read** (30 minutes, all information needed to translate types.ts):
- §0 Conventions & Version (ID / timestamps / file format / storage layout / naming conventions)
- §1 Shared Types (Qualifier / Voice / StructureType / Elaboration / Citation / ConfidenceChange)
- §2.3 Claim (the most complex and important type, ~200 lines)
- §3.1 Source (the second most complex, ~300 lines, including the growing source mechanism)

**Second pass** (read when working on specific features):
- §2.1 Programme — when building the Programme Dashboard view
- §2.2 Excerpt — when building the ingest pipeline
- §2.4 Frame — when building Frame extraction
- §2.5 Question — when building Question extraction
- §2.6 ConceptAnatomy — not needed until v0.2
- §3.2 Anomaly — when building contradiction detection

**Reference** (look up when issues arise):
- §4 Relation Model
- §5 Validation Rules
- §6 Schema Migration
- §7 Implementation Notes
- §8 Open Questions

---

## 0. Conventions & Version

### 0.1 Schema Version

All persisted objects must have a `schema_version: "1.0"` field in their frontmatter. Recompilation reads this field during schema upgrades to determine the migration strategy.

```yaml
schema_version: "1.0"   # current version
```

### 0.2 ID Convention

All object IDs follow the format: `<prefix>_<ULID>`

- **Prefix**: a fixed 3-4 character string per type, see table below
- **ULID**: [Crockford base32](https://github.com/ulid/spec), 26 characters, time-sortable
- **Full example**: `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`

| Type | Prefix | Example |
|---|---|---|
| Programme | `pgm` | `pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Excerpt | `exc` | `exc_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Claim | `clm` | `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Frame | `frm` | `frm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Question | `q`   | `q_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| ConceptAnatomy | `ca` | `ca_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Source | `src` | `src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Anomaly | `anm` | `anm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Job | `job` | `job_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |

**ID Rules**:
- Once generated, IDs **never change**
- Shared across Programmes (a Claim's ID is the same in all Programmes)
- IDs carry no semantics (if the name changes, the ID stays the same)

### 0.3 Timestamps

All timestamps use **ISO 8601 UTC**: `"2026-04-09T14:23:01Z"`

**Prohibited**: local time, Unix seconds, "X days ago", or other formats.

### 0.4 File Format

All objects are stored as **Markdown + YAML frontmatter**:

```markdown
---
schema_version: "1.0"
id: clm_01HXY...
type: claim
# ... other fields
---

# Claim Title (optional)

Body markdown content here. Can include [[wikilinks]] to other objects.
```

- **Frontmatter**: compact YAML (<=20 lines), containing structured fields and ID references
- **Body**: Markdown, carrying **self-contained** human/agent-readable content

**Readability Principle**: lens has two types of users — humans (GUI) and agents (CLI / file reading). File design follows:

- **Frontmatter**: compact YAML (<=20 lines), storing structured fields and ID references
- **Body**: LLM-generated natural language **explanation** — clarifying what this claim/frame is and why it matters
- **Body does not copy referenced content**: no inline evidence text, no copied frame descriptions. This avoids cascading update issues when references change
- The agent's **primary path for obtaining full context is the `lens context` command** (which inlines evidence and frames at query time), not reading files directly. Reading files directly is a fallback — in that case, follow frontmatter IDs and read one more file

### 0.5 Storage Layout

```
~/.lens/
├── programmes/pgm_01HXY.md    # Every object = type/id.md
├── sources/src_01HXY.md        # Source content (frontmatter + full markdown body)
├── excerpts/exc_01ABC.md
├── claims/clm_01DEF.md
├── frames/frm_01GHI.md
├── questions/q_01JKL.md
├── raw/                         # Original files (audit / recompile)
│   ├── src_01HXY.html
│   ├── src_01DEF.pdf
│   └── src_01DEF/              # Extracted assets (figures)
│       ├── fig1.png
│       └── fig2.png
├── index.sqlite                 # DERIVED CACHE (rebuildable)
└── config.yaml
```

**Rules**:
- **Every object = `type/id.md`** — no exceptions
- **Every `.md` = frontmatter + body**, same format everywhere
- **`raw/` stores original files separately** (audit / recompile only)
- **`index.sqlite` is derived cache**, rebuildable from .md files via `lens rebuild-index`
- **No nested directories per source**
- **Images in source markdown** reference `raw/src_ID/fig.png` via relative path

### 0.6 Agent Interface: CLI + Skill

The agent integration model for lens is **CLI for actions, Skill for telling the agent how to install and use it**.

The Compilation Agent uses pi-agent-core's built-in tools (`read`, `grep`, `ls`, `bash`) to explore `~/.lens/` directly. No custom tools are required. The agent can also use `bash: lens search --json` and other CLI commands for structured queries.

#### CLI Commands (all agent operations)

```bash
# Read understanding
lens context "AI memory" --json    # primary path: claims + evidence + frames inlined
lens search "hopfield" --json      # search
lens show clm_01HXY --json         # view a specific object (query-time evidence inlining)
lens programme list --json         # list all Programmes

# Write back findings
lens note "new finding" --programme pgm_01HXY

# All commands support --json
```

The Compilation Agent also uses these CLI commands via `bash` tool calls, e.g. `bash: lens search --json "query"`, to interact with the lens data store programmatically.

#### Skill (agent discovery and installation)

lens ships with a Skill definition file `skills/lens.claude-skill.md`, which users copy to their agent configuration:

- **Claude Code**: `cp skills/lens.claude-skill.md ~/.claude/skills/`
- **Cursor**: add Skill content to `.cursor/rules`
- **Other agents**: add lens usage instructions to the project's system prompt

Skill content includes:
1. Installation check and auto-install instructions (`npm install -g lens-cli`)
2. CLI command listing and parameter descriptions
3. Trigger conditions (when to use lens)
4. Output format description

This way, when an agent first encounters "look up my previous research on AI memory", it automatically installs lens, calls the CLI, and returns results.

#### Not doing

- **MCP server**: may do in v0.3; the community can also wrap the CLI as MCP tools in ~100 lines
- **Special agent discovery mechanism**: Skill already solves the discovery problem

**Rules**:
- **Markdown files are truth**, SQLite is a derived cache (rebuildable via `lens rebuild-index`)
- **Filename = ID + .md** — all objects follow `type/id.md`
- **Relations are inlined in frontmatter** (`evidence: [exc_id]`, `programmes: [pgm_id]`); there is no separate relation file
- **Frontmatter must be compact**: each object's frontmatter should be <=20 lines. Exceeding this indicates the schema needs simplification (see §8.2)

### 0.7 Naming Conventions

- **Field names**: `snake_case` (`confidence_history`, `structure_type`)
- **Enum values**: `snake_case` (`"big_picture"`, `"not_started"`)
- **Type names**: `PascalCase` (`Claim`, `FrameId`)
- **ID types**: `<Type>Id` (`ClaimId`, `FrameId`) — TypeScript branded type

---

## 1. Shared Types (used across objects)

These types appear in multiple objects and are defined separately.

### 1.1 ISODate

```ts
type ISODate = string  // ISO 8601 UTC, e.g. "2026-04-09T14:23:01Z"
```

### 1.2 Qualifier (Toulmin qualifier)

**Human-readable tiers** for a Claim's confidence:

```ts
type Qualifier = "certain" | "likely" | "presumably" | "tentative"
```

| Tier | Corresponding Numeric Range (Bayesian) |
|---|---|
| `"certain"` | 0.95 – 1.00 |
| `"likely"` | 0.75 – 0.95 |
| `"presumably"` | 0.50 – 0.75 |
| `"tentative"` | 0.00 – 0.50 |

### 1.3 Voice

The source posture of an assertion:

```ts
type Voice = 
  | "extracted"     // statement directly extracted from the original text (preserving original wording)
  | "restated"      // LLM rephrased but semantically equivalent to original
  | "synthesized"   // new statement distilled from multiple sources
```

**Key constraint**: the `statement` of a Claim with `voice="extracted"` must have high similarity to the text of its evidence Excerpt (lint check).

### 1.4 StructureType (Miller's 9 types)

```ts
type StructureType =
  | "taxonomy"       // classification / family tree
  | "causal"         // causal explanation
  | "description"    // description (part-whole)
  | "timeline"       // timeline
  | "argument"       // argumentation / case
  | "content"        // content structure
  | "story"          // narrative
  | "process"        // process / steps
  | "relationships"  // relationships
```

**Purpose**: labels the structural pattern used to organize a Claim or Frame. An object has **only one primary structure_type**, but may nest other structures in the body.

### 1.5 Elaboration (Reif's 5 dimensions)

```ts
type Elaboration = {
  scope:      "big_picture" | "intermediate" | "detail"
  importance: "core" | "supporting" | "subsidiary"
  scale:      "whole" | "part" | "sub_part"
  generality: "general" | "specific" | "exception"
  context:    "wider" | "mid" | "narrow"
}
```

**Purpose**: marks a Claim's position across 5 hierarchical dimensions. These 5 dimensions are **orthogonally independent** — a Claim can simultaneously be "core" (important) and "specific" (detailed).

### 1.6 Citation (evidence reference)

```ts
type Citation = {
  excerpt_id: ExcerptId
  relevance?: "primary" | "supporting" | "tangential"  // optional: relevance of this evidence
}
```

### 1.7 ConfidenceChange (a single record in Bayesian history)

```ts
type ConfidenceChange = {
  timestamp: ISODate
  previous_value: number   // 0-1
  new_value: number        // 0-1
  reason: string           // human-readable reason, e.g. "new evidence from exc_01XYZ"
  triggered_by?: ExcerptId | ClaimId | "manual" | "recompile"
}
```

### 1.8 AgentOrHumanId

```ts
type AgentOrHumanId = 
  | `human:${string}`             // "human:lixiaobo"
  | `agent:${string}`             // "agent:claude-code-sonnet-4-6"
  | `extractor:${string}`         // "extractor:lens-v0.1"
```

**Purpose**: used for all `by` fields. Explicitly distinguishes between humans, agents, and the system.

---

## 2. Core Types

### 2.1 Programme (meta-structure)

**Purpose**: a complete unit of cognitive exploration. All content objects in lens belong to at least one Programme.

#### TypeScript Definition

```ts
type Programme = {
  schema_version: "1.0"
  id: ProgrammeId                        // pgm_01HXY...
  type: "programme"
  
  // Basic information
  title: string                          // "AI Memory Systems"
  description: string                    // a paragraph explaining what this programme is about
  root_question: QuestionId              // the root question
  
  // Lakatos three-layer structure
  hard_core: FrameId[]                   // immutable core Frames
  protective_belt: {
    frames: FrameId[]                    // auxiliary Frames (can be opposed)
    claims: ClaimId[]                    // revisable Claims
  }
  open_questions: QuestionId[]           // currently open questions
  anomalies: AnomalyId[]                // unresolved counterexamples
  
  // Derived assets
  concept_anatomies: ConceptAnatomyId[]
  
  // Health monitoring (updated on each health check)
  health: {
    is_progressive: boolean              // whether new Questions are being generated
    last_health_check: ISODate
    anomaly_trend: "growing" | "stable" | "shrinking"
    hard_core_age_days: number           // how long since the hard core was last modified
    open_questions_new_this_month: number
  }
  
  // Metadata
  created_at: ISODate
  updated_at: ISODate
  created_by: AgentOrHumanId
}
```

#### File Format (`programmes/pgm_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
type: programme
title: "AI Memory Systems"
description: "How should AI agents persist memory? What are the methods for cross-agent sharing?"
root_question: q_01HXY3M9XK4G7P0R1W6U8N3S9A
hard_core:
  - frm_01HXY4N0YL5H8Q1S2X7V9O4T0B
protective_belt:
  frames:
    - frm_01HXY5O1ZM6I9R2T3Y8W0P5U1C
    - frm_01HXY6P2AN7J0S3U4Z9X1Q6V2D
  claims:
    - clm_01HXY7Q3BO8K1T4V5A0Y2R7W3E
    - clm_01HXY8R4CP9L2U5W6B1Z3S8X4F
open_questions:
  - q_01HXY9S5DQ0M3V6X7C2A4T9Y5G
anomalies: []
concept_anatomies: []
health:
  is_progressive: true
  last_health_check: "2026-04-09T14:23:01Z"
  anomaly_trend: "stable"
  hard_core_age_days: 45
  open_questions_new_this_month: 3
created_at: "2026-02-01T10:00:00Z"
updated_at: "2026-04-09T14:23:01Z"
created_by: "human:lixiaobo"
---

# AI Memory Systems

## Scope

This Programme explores the problem of persistent memory for AI agents — how to maintain consistent understanding across sessions, tools, and time.

## Current State

(Automatically updated by the consolidation job, showing Hard Core consensus + most active Claims + pending Anomalies)
```

#### Invariants

**Hard constraints** (reject write if not met):
- `root_question` must point to an existing Question
- All `hard_core` / `protective_belt.frames` must point to existing Frames
- All `protective_belt.claims` must point to existing Claims
- The `hard_core` set and `protective_belt.frames` set **must not overlap**
- `title` must be non-empty, recommended < 80 characters

**Soft constraints** (produce lint warning if violated):
- `hard_core` exceeds 5 entries -> warning "Hard Core may be too large"
- `protective_belt.frames` exceeds 30 entries -> warning "Belt may need to be split"
- `open_questions` is empty and age > 30 days -> warning "Programme may have stalled"
- `anomaly_trend == "growing"` for > 14 days -> Kuhn crisis warning

#### Lifecycle

- **Creation**: explicitly created via `lens programme create` (**not automatic**). Requires title + root_question
- **Update**: via commands like `lens programme <id> add-to-belt <claim_id>`, or automatically by the consolidation job adding Claims to the belt
- **Health check**: `lens programme health <id>` or scheduled task
- **Split**: `lens programme split <id> --into <title1> <title2>` — produces two new Programmes, old Programme marked `superseded_by: [new_ids]`
- **Merge**: `lens programme merge <id1> <id2>` — similar mechanism
- **Deletion**: **never truly deleted**, can only be archived (`status: archived`)

---

### 2.2 Excerpt (substrate)

**Purpose**: original text evidence fragment. The ground truth for all other types. Claims without Excerpts are rejected.

#### TypeScript Definition

```ts
type Excerpt = {
  schema_version: "1.0"
  id: ExcerptId                          // exc_01HXY...
  type: "excerpt"
  
  // Content
  text: string                           // original text fragment (verbatim)
  
  // Source
  source_id: SourceId                    // points to the raw source
  locator: {
    type: "char_offset" | "page" | "timestamp" | "url_fragment" | "section"
    value: string                        // e.g. "1520-1680" for char offsets, "p.42" for page
    context_before?: string              // ~100 characters of context before (for locating)
    context_after?: string               // ~100 characters of context after
  }
  
  // Multi-Programme membership (an Excerpt can contribute to multiple)
  programmes: ProgrammeId[]
  
  // Metadata
  captured_at: ISODate
  captured_by: AgentOrHumanId            // who ingested it
  created_at: ISODate                    // usually = captured_at
}
```

#### File Format (`excerpts/exc_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: exc_01HXY7Q3BO8K1T4V5A0Y2R7W3E
type: excerpt
source_id: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
locator:
  type: char_offset
  value: "1520-1680"
  context_before: "...and the authors argue that"
  context_after: "which contradicts the previous claim..."
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
captured_at: "2026-04-08T16:00:00Z"
captured_by: "agent:claude-code-sonnet-4-6"
created_at: "2026-04-08T16:00:00Z"
---

> Modern Hopfield networks have exponential capacity, and their retrieval step
> is mathematically equivalent to the softmax attention mechanism used in
> Transformers. This suggests that the Transformer architecture already implements
> a form of associative memory.

— Ramsauer et al. 2020, Section 4
```

**Important**: the body is a **verbatim quote from the original text** (markdown blockquote), not an LLM rephrasing.

#### Invariants

**Hard constraints**:
- `text` must be non-empty
- `source_id` must point to an existing Source
- `text` length recommended < 2000 characters (longer texts should be split into multiple Excerpts)
- `programmes` must have at least 1

**Soft constraints**:
- `text` should be verifiable at the character level against the source's original content (lint check)
- `locator` should be able to precisely locate the position within the source file

#### Lifecycle

- **Creation**: automatically created during ingest
- **Update**: **almost never updated**. Excerpts are append-only — if the original text doesn't change, the Excerpt doesn't change
- **Deletion**: **never deleted**. Even if the source is marked as archived, Excerpts are preserved
- **Citation**: referenced by Claims via `evidence: ExcerptId[]`

---

### 2.3 Claim (Toulmin + Miller + Reif)

**Purpose**: an extracted falsifiable assertion. **The biggest difference between lens and all existing products**: a Claim is not a flat fact — it is a complete Toulmin argument structure + structure type + hierarchical position.

#### TypeScript Definition

```ts
type Claim = {
  schema_version: "1.0"
  id: ClaimId                            // clm_01HXY...
  type: "claim"
  
  // Content
  statement: string                      // normalized statement
  canonical_wording: string              // the cleanest phrasing (dedup baseline)
  alternative_wordings: string[]         // different expressions from various sources
  
  // Toulmin structure
  evidence: Citation[]                   // Data: supporting excerpts
  warrant: FrameId | null                // which Frame makes Data -> Claim valid
  backing: ClaimId[]                     // deeper claims that support the warrant
  qualifier: Qualifier                   // "certain" | "likely" | "presumably" | "tentative"
  rebuttals: ClaimId[]                   // rebuttal conditions
  
  // Provenance
  voice: Voice                           // extracted | restated | synthesized
  
  // Relations
  contradicts: ClaimId[]
  supports: ClaimId[]
  refines: ClaimId[]                     // this claim is a refinement of another claim
  superseded_by: ClaimId | null
  
  // Bayesian confidence
  confidence: number                     // 0-1, current value
  confidence_history: ConfidenceChange[]
  
  // Independence tracking (prevents inflated confidence from duplicate evidence)
  evidence_independence: {
    independent_sources: SourceId[]
    citation_chains: {
      from: SourceId
      cites: SourceId
    }[]
  }
  
  // Miller: knowledge structure type
  structure_type: StructureType
  
  // Reif: position across 5 elaboration dimensions
  elaboration: Elaboration
  
  // Metadata
  programmes: ProgrammeId[]              // can belong to multiple Programmes
  is_boundary: boolean                   // true = claim spanning multiple Programmes (source of serendipity)
  status: "active" | "superseded" | "rejected" | "tentative" | "orphaned"
  created_at: ISODate
  updated_at: ISODate
  compiled_from: SourceId                // original source
  compiler_version: string               // which version of the extractor
  compiled_by: AgentOrHumanId
}
```

#### File Format (`claims/clm_01HXY....md`)

Frontmatter stores ID references (for cache and relation graph); body stores LLM-generated natural language explanation. **The body does not inline evidence text** — this avoids cascading updates when references change.

```markdown
---
id: clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
type: claim
statement: "Transformer attention is mathematically equivalent to modern Hopfield network retrieval"
qualifier: likely
voice: restated
evidence:
  - exc_01HXY7Q3BO8K1T4V5A0Y2R7W3E
  - exc_01HXYAT6EQ1N4W7Y8D3B5U0Z6H
warrant_frame: frm_01HXY4N0YL5H8Q1S2X7V9O4T0B
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
supports:
  - clm_01HXYBU7FR2O5X8Z9E4C6V1A7I
compiled_from: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
created_at: "2026-04-08T16:00:00Z"
---

# Transformer attention ≡ Modern Hopfield

Ramsauer et al. (2020) proved that the softmax-based attention mechanism in
Transformers is mathematically equivalent to a retrieval step in a modern
continuous Hopfield network. The equivalence holds under specific energy
function definitions.

If attention is Hopfield, then the Transformer architecture already implements
a form of biological-style associative memory. This affects how we should think
about external memory for agents — it may compete with an internal mechanism
already present.

## Open questions

- How does this interact with the claim that vector databases are a "crude"
  approximation (clm_01HXYBU7FR...)?
- Does this mean Titans-style test-time memory is redundant or complementary?
```

#### Invariants

**Hard constraints** (reject write):
- `statement` must be non-empty
- `evidence` must have at least 1 entry (**Claims without evidence are rejected** — this is lens's core anti-hallucination mechanism)
- Each `evidence[].excerpt_id` must point to an existing Excerpt
- When `warrant` is null, `status` must be `"tentative"` (Claims without a warrant are temporary)
- If `warrant` is not null, it must point to an existing Frame
- `confidence` must be in [0, 1]
- `confidence` and `qualifier` must be consistent (per the range mapping in 1.2)
- When `voice == "extracted"`, `canonical_wording` must have >= 0.9 character similarity with the text of some evidence Excerpt
- `programmes` must have at least 1 (unless status == "tentative" and in inbox)
- Each ClaimId in `supports` / `contradicts` / `refines` must exist
- A ClaimId cannot appear in both `supports` and `contradicts` of the same Claim
- `structure_type` must be one of the 9 valid values
- All 5 dimensions of `elaboration` must be filled

**Soft constraints** (lint warning):
- `voice == "synthesized"` but `evidence` has only 1 entry -> warning "synthesized claims usually need multiple sources"
- `confidence > 0.9` but `independent_sources.length < 2` -> warning "high confidence requires multiple independent sources"
- `contradicts.length > 3` -> warning "too many contradictions; consider whether the Claim should be split"

#### Lifecycle

- **Creation**: created during ingest Step 4 (Claim extraction). Must pass through the layered dedup pipeline
- **Confidence update**: Bayesian update when new Excerpts arrive. Each update is written to `confidence_history`
- **MERGE**: when dedup detects the same Claim, new Excerpts are added to the existing Claim's evidence, and `alternative_wordings` gains new phrasings
- **Contradiction detection**: new Claim opposes existing Claim -> bidirectional update of contradicts + create Anomaly
- **Supersede**: new Claim is more complete -> old Claim gets `status: "superseded"` + `superseded_by` points to the new one
- **Orphan** (triggered only by growing source divergence): all Excerpts in the evidence have been superseded (corresponding turns were deleted by user edit) -> Claim has no evidence support -> `status: "orphaned"`
  - Orphaned claims are not shown in default search results
  - `lens orphans list` can view them
  - On the next dedup pipeline run, auto-recovery is attempted: find semantically equivalent new claims -> merge confidence_history -> old orphan gets `status: superseded`
  - Orphans that cannot be recovered enter the anomaly queue for user review
- **Deletion**: never truly deleted; can only be `status: "rejected"`

---

### 2.4 Frame (viewfinder)

**Purpose**: a perspective for viewing the world. The source of the product name. A Frame is Toulmin's warrant — the reasoning license that pushes Data to Claim.

#### TypeScript Definition

```ts
type Frame = {
  schema_version: "1.0"
  id: FrameId                            // frm_01HXY...
  type: "frame"
  
  // Core definition
  name: string                           // "Complementary Learning Systems"
  sees: string                           // what this frame lets you see
  ignores: string                        // what it deliberately ignores
  assumptions: string[]                  // what assumptions it is built on
  useful_when: string[]                  // when it is applicable
  failure_modes: string[]                // when it fails
  
  // Provenance
  held_by: string[]                      // who / which discipline holds this frame
  exemplar_claims: ClaimId[]             // representative claims under this frame
  
  // Robustness
  robustness: {
    independent_sources_count: number
    supporting_claims_count: number
    challenging_claims_count: number
  }
  
  // Relations
  related_frames: FrameId[]
  contradicts_frames: FrameId[]
  refines: FrameId[]
  challenges: AnomalyId[]
  
  // Miller: the structure type this frame is best suited to express (optional)
  preferred_structure: StructureType | null
  
  // Metadata
  programmes: ProgrammeId[]
  status: "active" | "challenged" | "superseded"
  created_at: ISODate
  updated_at: ISODate
  compiled_from: SourceId
  compiler_version: string
}
```

#### File Format (`frames/frm_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: frm_01HXY4N0YL5H8Q1S2X7V9O4T0B
type: frame
name: "Biology-first AI architecture"
sees: "LLM architectures as instances of biological computation primitives"
ignores: "symbolic AI legacy, classical search algorithms, rule-based systems"
assumptions:
  - "Neural computation is the foundational primitive"
  - "Successful AI architectures converge with biology by necessity"
  - "Mathematical equivalences between ML and neuroscience are not coincidences"
useful_when:
  - "Analyzing why Transformer architectures work"
  - "Predicting which bio-inspired ideas will transfer"
  - "Evaluating novel architectures against biological plausibility"
failure_modes:
  - "Overconfident mapping between ML and biology without rigorous math"
  - "Dismissing symbolic/logical approaches as 'outdated'"
  - "Biology envy: assuming all biological traits must be replicated"
held_by:
  - "Demis Hassabis"
  - "DeepMind research culture"
  - "Geoffrey Hinton"
  - "neuroscience-ML interface community"
exemplar_claims:
  - clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
  - clm_01HXYBU7FR2O5X8Z9E4C6V1A7I
robustness:
  independent_sources_count: 4
  supporting_claims_count: 7
  challenging_claims_count: 1
related_frames:
  - frm_01HXY5O1ZM6I9R2T3Y8W0P5U1C
contradicts_frames: []
refines: []
challenges: []
preferred_structure: causal
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
status: active
created_at: "2026-04-08T16:00:00Z"
updated_at: "2026-04-08T16:00:00Z"
compiled_from: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
compiler_version: lens-v0.1
---

# Biology-first AI Architecture

A frame for analyzing LLM architectures by asking "what biological mechanism is
this implementing?" rather than "what's the engineering motivation?"

## Core moves

1. Find the mathematical form of an ML component
2. Look for the equivalent neural mechanism in biology
3. Use the equivalence to predict failure modes and capabilities

## When this frame is most productive

...

## When this frame misleads

...
```

#### Invariants

**Hard constraints**:
- `name` / `sees` / `ignores` must be non-empty
- `assumptions` must have at least 1 entry
- `held_by` must have at least 1 entry (a frame must belong to some person or school of thought)
- `programmes` must have at least 1
- Each FrameId in `related_frames` / `contradicts_frames` / `refines` must exist
- `contradicts_frames` and `related_frames` **must not overlap**

**Soft constraints**:
- `robustness.independent_sources_count == 0` -> warning "Frame lacks independent evidence sources"
- `challenging_claims_count > supporting_claims_count` -> warning "Frame is being challenged; consider whether it should be refined or rejected"

#### Lifecycle

- **Creation**: created during ingest Step 6 (Frame extraction)
- **Robustness update**: automatically incremented each time a new Claim uses it as a warrant
- **Challenge accumulation**: added to `challenges` when challenged by an Anomaly
- **Supersede**: marked `superseded` when replaced by a new refining Frame
- **Status**: active -> challenged (questioned but not yet replaced) -> superseded (replaced)

---

### 2.5 Question (IBIS + Strong Inference)

**Purpose**: an open inquiry question. **The true center of lens** — Claims and Frames revolve around Questions.

#### TypeScript Definition

```ts
type Question = {
  schema_version: "1.0"
  id: QuestionId                         // q_01HXY...
  type: "question"
  
  // Content
  text: string                           // question text
  context: string                        // background / motivation for this question
  
  // Hierarchy (IBIS tree)
  parent_question: QuestionId | null
  sub_questions: QuestionId[]
  
  // Strong Inference enhancement
  alternative_hypotheses: ClaimId[]      // mutually exclusive candidate answers
  discriminating_evidence: string | null // criterion that can distinguish between them
  
  // Status
  status: "open" | "tentative_answer" | "resolved" | "superseded"
  current_position: string | null        // current best judgment (if any)
  supporting_claims: ClaimId[]           // claims supporting the current judgment
  opposing_claims: ClaimId[]             // opposing claims
  open_threads: string[]                 // unanswered sub-threads
  
  // Metadata
  programmes: ProgrammeId[]
  priority: "critical" | "normal" | "background"
  created_at: ISODate
  updated_at: ISODate
  resolved_at: ISODate | null
}
```

#### File Format (`questions/q_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: q_01HXY3M9XK4G7P0R1W6U8N3S9A
type: question
text: "How should AI agents persist memory?"
context: "How to maintain consistent understanding across sessions, tools, and time"
parent_question: null
sub_questions:
  - q_01HXYDW9HT4Q7Z0B1G6E8X3C9K
  - q_01HXYEX0IU5R8A1C2H7F9Y4D0L
alternative_hypotheses:
  - clm_01HXYFY1JV6S9B2D3I8G0Z5E1M
  - clm_01HXYGZ2KW7T0C3E4J9H1A6F2N
discriminating_evidence: "Compare cross-session coherence scores of different approaches after 6 months of continuous use"
status: tentative_answer
current_position: "Markdown files + SQLite index + MCP tools, local-first"
supporting_claims:
  - clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
opposing_claims:
  - clm_01HXYHA3LX8U1D4F5K0I2B7G3O
open_threads:
  - "Reliability of semantic dedup still needs more data validation"
  - "Alternative to iCloud sync for non-Apple users"
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
priority: critical
created_at: "2026-02-01T10:00:00Z"
updated_at: "2026-04-09T14:23:01Z"
resolved_at: null
---

# How should AI agents persist memory?

## Why this is a critical question

...

## Current best judgment

...(automatically maintained by consolidation or manually edited)

## Still-open sub-threads

...
```

#### Invariants

**Hard constraints**:
- `text` must be non-empty, recommended < 200 characters
- `programmes` must have at least 1
- `parent_question`, if not null, must point to an existing Question
- Must not form cycles (if q1 is q2's parent, q2 cannot be q1's parent)
- When `status == "resolved"`, `current_position` must be non-empty
- When `status == "open"`, `supporting_claims` can be empty
- Each ClaimId in `alternative_hypotheses` must exist and be **mutually exclusive** (ClaimA's contradicts contains ClaimB, or the two statements are semantically opposed)
- `discriminating_evidence` is recommended (the essence of Strong Inference) but not required

**Soft constraints**:
- `status == "open"` for > 90 days -> warning "question stalled"
- `sub_questions.length > 8` -> warning "too many sub-questions; consider splitting the question"
- `alternative_hypotheses` is empty -> warning "no candidate answers; question may be too broad"

#### Lifecycle

- **Creation**:
  - Automatically created during ingest Step 7 (Question extraction)
  - Explicitly created via `lens question new` (human/agent)
- **Status transitions**:
  - `open` -> `tentative_answer`: has supporting claims with sufficient confidence
  - `tentative_answer` -> `resolved`: multiple independent supporting claims + low opposing
  - any -> `superseded`: question replaced by new question ("asked the wrong question")
- **Growth**: automatically added when new Excerpts trigger new sub_questions

---

### 2.6 ConceptAnatomy (8-layer concept dissection)

**Purpose**: deeply dissects a concept across 8 dimensions. Derived from ljg-learn by Li Jigang. **Triggered on demand**, not a default ingest output.

#### TypeScript Definition

```ts
type ConceptAnatomy = {
  schema_version: "1.0"
  id: ConceptAnatomyId                   // ca_01HXY...
  type: "concept_anatomy"
  
  // Content
  concept: string                        // the concept being dissected
  
  // 8 layers (from ljg-learn)
  layers: {
    history: string                      // evolutionary history
    dialectic: string                    // antithesis
    phenomena: string                    // real-world manifestations
    language: string                     // etymology and semantics
    form: string                         // structural form
    existence: string                    // ontological status
    aesthetics: string                   // poetic dimension
    meta: string                         // meta-reflection
  }
  
  crystallized_insight: string           // single insight distilled from all 8 layers
  
  // Relations
  related_frames: FrameId[]
  related_claims: ClaimId[]
  
  // Metadata
  programmes: ProgrammeId[]
  created_at: ISODate
  updated_at: ISODate
  compiled_from: SourceId
  compiler_version: string
  compiled_by: AgentOrHumanId
}
```

#### File Format (`concept_anatomies/ca_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: ca_01HXYIB4MY9V2E5G6L1J3C8H4P
type: concept_anatomy
concept: "Memory"
layers:
  history: "..."
  dialectic: "..."
  phenomena: "..."
  language: "..."
  form: "..."
  existence: "..."
  aesthetics: "..."
  meta: "..."
crystallized_insight: "..."
related_frames:
  - frm_01HXY4N0YL5H8Q1S2X7V9O4T0B
related_claims:
  - clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
created_at: "2026-04-09T10:00:00Z"
updated_at: "2026-04-09T10:00:00Z"
compiled_from: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
compiler_version: lens-v0.1
compiled_by: "extractor:lens-v0.1-concept-anatomy"
---

# Concept Anatomy: Memory

## History (evolutionary history)

...

## Dialectic (antithesis)

...

## Phenomena (real-world manifestations)

...

## Language (etymology and semantics)

...

## Form (structural form)

...

## Existence (ontological status)

...

## Aesthetics (poetic dimension)

...

## Meta (meta-reflection)

...

## Crystallized Insight

...
```

#### Invariants

**Hard constraints**:
- `concept` must be non-empty
- **All 8 fields** of `layers` must be non-empty (this is schema-enforced, unlike regular Claims — the completeness of a ConceptAnatomy is its raison d'etre)
- `crystallized_insight` must be non-empty
- `programmes` must have at least 1

**Soft constraints**:
- Each layer's text length is recommended to be 100-500 characters (too short lacks information; too long defeats the purpose of distillation)

#### Lifecycle

- **Creation**: **explicitly triggered** via `lens run <source> concept-anatomy <concept>`. Not triggered by default
- **Update**: can be re-run (`lens recompile <ca_id>`), producing a new version + old version superseded
- **Deletion**: never truly deleted

---

## 3. Support Types

### 3.1 Source (raw material)

**Purpose**: raw file + metadata + growth state. Excerpts come from Sources.

**Key classification**: Sources fall into two major categories:

- **Immutable**: one-time sources with fixed content (PDF / markdown / web article / manual note)
- **Growing**: sources whose content may keep growing within the same identity (chat conversation / Claude Code session)

Both Source categories share the same TypeScript definition, distinguished by the `growth_state` field. Growing sources have `external_id` for identifying the same identity across ingests.

#### TypeScript Definition

```ts
type Source = {
  schema_version: "1.0"
  id: SourceId                           // src_01HXY...
  type: "source"
  source_type: SourceType                // one of the 6 types supported in v0.1
  
  // Content location
  origin: {
    type: "url" | "file" | "chat_export" | "manual_note" 
        | "claude_code_session" | "stdin"
    value: string                        // URL / file path / conversation_id etc.
    captured_via?: "cli" | "browser_extension" | "auto_check" | "manual_import"
  }
  
  // Stable identifier across ingests (only for growing sources; null for immutable)
  external_id: string | null             // e.g. "chatgpt:conversation:abc-def-456"
                                          //       "claude-code:session:<uuid>:<encoded_cwd>"
                                          //       "claude-ai:conversation:xyz-789"
  
  // Physical file paths (relative to ~/.lens/)
  raw_file: string | null                // raw/src_01HXY.html (original file in raw/)
  raw_assets_dir: string | null          // raw/src_01HXY/ (extracted assets like figures, if any)
  
  // Content integrity
  sha256: string                         // SHA256 of the latest snapshot (for dedup)
  size_bytes: number                     // byte count of the latest snapshot
  
  // Growth state (null for immutable sources)
  growth_state: GrowthState | null
  
  // Content fingerprint (for incremental detection; required for growing sources, optional for immutable)
  content_fingerprint: ContentFingerprint | null
  
  // Metadata
  title: string
  authors: string[]
  published_at: ISODate | null
  domain: string | null
  language: string | null                // BCP 47 code
  description: string | null
  
  // Extraction pipeline metadata
  extraction: {
    extractor: string                    // e.g. "lens-defuddle-v0.1"
    extractor_version: string
    method: string                       // e.g. "defuddle+linkedom"
    status: ExtractionStatus
    extracted_at: ISODate | null
    extraction_ms: number | null
    warnings: string[]
    errors: string[]
    locator_scheme: LocatorScheme
  }
  
  // Programme membership (a Source can contribute to multiple)
  programmes: ProgrammeId[]
  
  // Derived stats (filled after compile)
  excerpt_count: number
  claim_count: number
  frame_count: number
  question_count: number
  
  // Timestamps
  ingested_at: ISODate                   // first ingest time
  last_checked_at: ISODate               // most recent auto-check time (even if no change)
  last_updated_at: ISODate               // most recent actual update (growth or divergence)
  ingested_by: AgentOrHumanId
  created_at: ISODate
  
  // Divergence relation
  supersedes: SourceId | null            // if this is a new source from divergence recovery, points to the orphaned old source
  supersede_reason: string | null
}

// Source type (v0.1 supports 6 types; others in v0.2+)
type SourceType =
  // v0.1 core
  | "web_article"          // web page, via Defuddle
  | "pdf_paper"            // PDF paper, via Marker
  | "markdown"             // markdown file, pass-through
  | "plain_text"           // txt file, pass-through
  | "manual_note"          // direct CLI input
  | "chat_conversation"    // single conversation (from ChatGPT / Claude.ai / Claude Code)
  // v0.2
  | "pdf_book"
  | "tweet_thread"
  // v0.3+
  | "audio" | "image" | "video" | "pdf_scanned"

// Chat conversation sub-type (detailed in origin.type)
type ChatProvider =
  | "chatgpt"           // OpenAI ChatGPT export
  | "claude_ai"         // Claude.ai export
  | "claude_code"       // ~/.claude/projects/ local files
  | "gemini"            // v0.3+
  | "cursor"            // v0.3+

// Growth state
type GrowthState = {
  is_growing: boolean                    // true = may be appended to; false = frozen
  last_known_turn_count: number          // turn count (or section count) seen at last ingest
  last_appended_at: ISODate              // most recent detected growth
  frozen_at: ISODate | null              // when frozen (if is_growing = false)
  frozen_reason: string | null           // "user closed conversation" / "divergence" / ...
  
  // Snapshot retention
  snapshot_count: number                 // current number of retained snapshots
  first_snapshot_at: ISODate             // time of the first snapshot
}

// Content fingerprint (for divergence detection)
type ContentFingerprint = {
  // Hash of the first N turns — determines whether this is a continuation of the same conversation
  head_hash: string                      // sha256 of first 3 turns (up to 500 chars each)
  
  // Hash of the last N turns — determines the latest state
  tail_hash: string                      // sha256 of last 3 turns (up to 500 chars each)
  
  // Full hash — determines whether content is completely identical
  total_hash: string                     // sha256 of full conversation structure
  
  // Total length
  total_units: number                    // turns / sections / chars, depending on source type
  
  computed_at: ISODate
}

type ExtractionStatus = 
  | "pending"           // just entered raw, not yet extracted
  | "in_progress"       // currently extracting
  | "complete"          // extraction complete
  | "failed"            // extraction failed (details in errors)
  | "needs_ocr"         // scanned PDF, needs OCR (not supported in v0.1)
  | "drm_protected"     // DRM protected, cannot process
  | "too_little_content" // defuddle couldn't extract enough content

type LocatorScheme = 
  | "char_offset"       // plain text (web article / markdown / plain text)
  | "section_and_page"  // PDF paper with sections
  | "page_and_bbox"     // PDF scan / no sections
  | "turn_index"        // chat conversation
  | "timestamp_range"   // audio / video
  | "direct"            // manual_note
```

#### Physical Storage Layout

Each Source is a single `.md` file in `sources/`. Original files and extracted assets are stored separately in the top-level `raw/` directory:

```
~/.lens/
├── sources/
│   ├── src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z.md    # frontmatter + full content
│   └── src_01HXY3L9YK4F7N0P1V8W9X5R6S.md
└── raw/
    ├── src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z.pdf    # original PDF
    ├── src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z/       # extracted assets (figures)
    │   ├── fig1.png
    │   └── fig2.png
    ├── src_01HXY3L9YK4F7N0P1V8W9X5R6S.jsonl  # latest snapshot (growing source)
    ├── src_01HXY3L9YK4F7N0P1V8W9X5R6S/       # snapshot history (growing source)
    │   ├── 2026-04-09T14-23-01Z.jsonl         #   first ingest snapshot
    │   ├── 2026-04-15T09-12-45Z.jsonl         #   intermediate snapshots
    │   └── 2026-04-29T10-05-22Z.jsonl
    └── src_01HXY4M0ZL5G8O9Q2T3U4V6W7X.json   # immutable ChatGPT export
```

**Key design decisions**:

1. **Every Source = one `.md` file** in `sources/`: frontmatter + full content body (same format as all other objects)
2. **`raw/` at top level**: original files stored separately for audit / recompile; not mixed with the source `.md`
3. **Growing sources retain snapshot history** in `raw/src_ID/`: used for divergence detection + audit
4. **Immutable sources have only one raw copy**: PDF / markdown / plain text don't need snapshot history
5. **Snapshots are copies, not symlinks**: no dependency on the original file's existence (evidence is preserved even if the user cleans `~/.claude`)
6. **Extracted assets** (figures from PDFs) go in `raw/src_ID/` and are referenced from the source `.md` as `![](raw/src_ID/fig1.png)`

#### Snapshot Retention Policy

Snapshots for growing sources are retained according to the following policy:

- **Always retained**: first snapshot (as "origin") + latest snapshot + snapshots referenced by Claim evidence
- **Sliding window**: most recent 30 snapshots
- **When exceeded**: delete from the middle (retain first, last + most recent 30)

Configurable via `~/.lens/config.yaml`:

```yaml
sources:
  snapshot_retention:
    keep_first: true          # always retain the first snapshot
    keep_recent: 30           # retain the most recent N snapshots
    keep_cited: true          # always retain snapshots referenced by claims
```

For JSONL / JSON snapshots (typically 10-100KB), 30 snapshots is approximately 1-3MB per source, and 50-200 sources is approximately 100-600MB total. Negligible for lens's target users.

#### Auto-check Mechanism (not a file watcher)

Lens **does not use** a file watcher (chokidar or fsevents). Growing sources are updated via the **auto-check on CLI invocation** pattern:

- On every lens CLI command invocation, the `state/last_global_check` timestamp is checked
- If the elapsed time exceeds `config.auto_pull.staleness_threshold` (default 5 minutes) -> trigger background scan
- The scan only performs `stat` to compare mtime vs. the recorded last mtime (fast, < 50ms for a typical 47 sessions)
- If changes are detected -> background compile; the original command **returns immediately** without blocking
- The original command's output includes a note: "Ingesting N new Claude Code sessions in background..."

**Users never need to remember `lens pull`**. Lens implicitly completes this on the edge of actions the user is already performing (any CLI invocation).

See [`docs/source-pipeline.md`](./source-pipeline.md) § Auto-check Mechanism for details.

#### File Format (`sources/src_01HXY....md`)

A Source is a single `.md` file with frontmatter + full body content. The body contains the complete source content in markdown format.

**Short article example** (web_article):

```markdown
---
id: src_01HXY
type: source
source_type: web_article
title: "Software 2.0"
author: "Andrej Karpathy"
url: "https://karpathy.medium.com/software-2-0-a64152b37c35"
word_count: 2500
raw_file: "raw/src_01HXY.html"
ingested_at: "2026-04-09T14:23:01Z"
---

# Software 2.0

[full article content in markdown]
```

**Chat conversation example** (growing source):

```markdown
---
schema_version: "1.0"
id: src_01HXY3L9YK4F7N0P1V8W9X5R6S
type: source
source_type: chat_conversation
origin:
  type: claude_code_session
  value: "claude-code:session:abc-def-456:/Users/lixiaobo/Documents/Coding/nodex"
  captured_via: auto_check
external_id: "claude-code:session:abc-def-456:/Users/lixiaobo/Documents/Coding/nodex"
raw_file: "raw/src_01HXY3L9YK4F7N0P1V8W9X5R6S.jsonl"
raw_assets_dir: null
sha256: "abc123..."
size_bytes: 45678
growth_state:
  is_growing: true
  last_known_turn_count: 34
  last_appended_at: "2026-04-29T10:05:22Z"
  frozen_at: null
  frozen_reason: null
  snapshot_count: 3
  first_snapshot_at: "2026-04-09T14:23:01Z"
content_fingerprint:
  head_hash: "sha256:abc..."
  tail_hash: "sha256:def..."
  total_hash: "sha256:ghi..."
  total_units: 34
  computed_at: "2026-04-29T10:05:22Z"
title: "Lens schema design discussion"
authors: ["lixiaobo", "claude-code-sonnet-4-6"]
published_at: "2026-04-09T14:23:01Z"
domain: null
language: "zh-CN"
description: "Discussion about Lens Source schema and growing sources"
extraction:
  extractor: "lens-claude-code-v0.1"
  extractor_version: "0.1.0"
  method: "jsonl_parse"
  status: complete
  extracted_at: "2026-04-29T10:05:45Z"
  extraction_ms: 230
  warnings: []
  errors: []
  locator_scheme: turn_index
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
excerpt_count: 34
claim_count: 8
frame_count: 2
question_count: 3
ingested_at: "2026-04-09T14:23:01Z"
last_checked_at: "2026-04-29T10:05:22Z"
last_updated_at: "2026-04-29T10:05:22Z"
ingested_by: "extractor:lens-v0.1"
created_at: "2026-04-09T14:23:01Z"
supersedes: null
supersede_reason: null
---

# Lens schema design discussion

**Participants**: lixiaobo, claude-code-sonnet-4-6
**Started**: 2026-04-09T14:23:01Z
**Turns**: 34

**User (turn 1, 2026-04-09T14:23:01Z)**:
Now we need to define schema.md...

**Claude (turn 2, 2026-04-09T14:23:30Z)**:
OK, I suggest...

...(full conversation, 34 turns)
```

**Long document note**: For long documents (books, 100K+ words), the same single-file format is used.
The markdown body contains the full content with heading structure (# Part / ## Chapter / ### Section).
Agents navigate using the `read` tool with offset/limit, or `grep` to find specific sections.
Images extracted from PDFs are stored in `raw/src_ID/` and referenced as `![](raw/src_ID/fig1.png)`.

#### Invariants

**Hard constraints**:
- `title` must be non-empty
- `sha256` must be non-empty and match the raw file content
- `source_type` must be a valid enum value
- When `growth_state.is_growing == true`, `content_fingerprint` is required
- When `external_id` is not null, it must be globally unique (only one active Source per external_id)
- When `supersedes` is not null, it must point to an existing Source
- When `extraction.status == "complete"`, `extracted_at` must not be null

**Soft constraints**:
- `growth_state.snapshot_count > 100` -> warning "too many snapshots; consider adjusting retention"
- `extraction.status == "failed"` for > 7 days -> warning "ingest has been failing for an extended period"
- `last_checked_at` is > 7 days ago -> warning "Source may be stale; run `lens pull` to refresh manually"

#### Lifecycle

For the complete lifecycle, see [`docs/source-pipeline.md`](./source-pipeline.md). Brief summary:

- **Creation** (immutable): `lens ingest <url-or-file>` directly creates the Source; compiled once
- **Creation** (growing): created on first `lens ingest --chatgpt <zip>` or when auto-check first discovers a Claude Code session
- **Incremental update** (growing): subsequent `lens ingest` or auto-check detects same head_hash + new turns -> incrementally compile the new portion
- **Divergence** (growing): head_hash changes -> `replace_if_diverged` strategy:
  1. Save old snapshot to history
  2. Replace current with the new version
  3. Recompile the entire conversation
  4. Identify "orphaned claims" (evidence only from vanished turns)
  5. Attempt dedup pipeline auto-recovery
  6. Orphans that cannot be recovered enter the anomaly queue
- **Freeze** (growing): user closes/deletes conversation + retention expired -> `is_growing: false`
- **Delete**: never truly deleted; can only mark all of the Source's Claims/Excerpts as `status: rejected`

---

### 3.1.5 IngestEvent (audit log)

**Purpose**: records each Source ingest / incremental / divergence event for audit and debugging. Not a first-class object (no independent file); stored in `index.sqlite` as an append-only audit table.

#### TypeScript Definition

```ts
type IngestEvent = {
  id: string                             // ingest_01HXY... (ULID)
  source_id: SourceId
  timestamp: ISODate
  
  // Trigger reason
  trigger: IngestTrigger
  
  // Diff result
  diff_type: "create" | "no_change" | "append" | "divergence" | "orphan_recovery"
  
  // Quantity changes
  units_before: number                   // turn / section count (or -1 for create)
  units_after: number
  new_unit_indices: number[]             // indices of newly added turns/sections
  
  // Processing results
  excerpts_created: ExcerptId[]
  excerpts_superseded: ExcerptId[]
  claims_created: ClaimId[]
  claims_updated: ClaimId[]
  claims_orphaned: ClaimId[]             // claims with no evidence after divergence
  claims_recovered: ClaimId[]            // orphans auto-merged into new claims via dedup
  
  // Raw snapshot pointer
  snapshot_path: string                  // raw/src_XXX/<timestamp>.jsonl
  previous_snapshot_path: string | null
  
  // Extraction performance
  extraction_ms: number
  compile_ms: number
  
  // Errors
  errors: string[]
  warnings: string[]
}

type IngestTrigger =
  | { type: "manual_ingest", command: string }         // e.g. "lens ingest --chatgpt foo.zip"
  | { type: "auto_check_on_cli", via_command: string } // triggered by auto-check
  | { type: "scheduled_pull" }                          // triggered by cron/launchd
  | { type: "manual_pull", command: string }            // "lens pull"
  | { type: "recompile", reason: string }               // "lens recompile src_XXX"
```

#### Storage

IngestEvents are stored in `index.sqlite` as an append-only `ingest_events` table (rebuildable from raw snapshot history). They are queryable via `lens ingest-log <source_id>`.

#### Invariants

- Append-only
- When `diff_type == "create"`, `units_before = -1`
- When `diff_type == "divergence"`, `claims_orphaned` may be non-empty
- `snapshot_path` must point to an existing file in `raw/src_XXX/`

---

### 3.2 Anomaly (conflict queue)

**Purpose**: unresolved contradictions or anomalies. The Kuhn crisis signal for lens.

```ts
type Anomaly = {
  schema_version: "1.0"
  id: AnomalyId                          // anm_01HXY...
  type: "anomaly"
  
  // Content
  anomaly_type: "contradiction" | "unexplained_excerpt" | "frame_failure" | "lint_finding"
  parties: (ClaimId | ExcerptId | FrameId)[]   // involved objects
  description: string                    // LLM-generated description of "how they contradict"
  llm_analysis: string                   // LLM's neutral analysis (not a verdict)
  
  // Status
  status: "open" | "context_dependent" | "one_side_rebutted" | "needs_more_evidence" | "resolved_by_synthesis"
  resolution_history: {
    timestamp: ISODate
    by: AgentOrHumanId
    decision: string
    reason: string
    resulting_claim_id: ClaimId | null   // if resolution produces a new Claim
  }[]
  
  // Metadata
  programmes: ProgrammeId[]
  created_at: ISODate
  updated_at: ISODate
  resolved_at: ISODate | null
}
```

**5 types of Resolution**:

1. **`context_dependent`**: both sides are correct under different conditions -> modify both parties' qualifiers with conditions
2. **`one_side_rebutted`**: one side wins -> losing side marked rejected, winning side's confidence increases
3. **`needs_more_evidence`**: neither is sufficient -> both marked tentative, awaiting more Excerpts
4. **`resolved_by_synthesis`**: create a synthesized Claim -> both sides superseded by the new Claim
5. **`open`**: unresolved (default)

---

## 4. Relation Model

### 4.1 Relation Storage Method (simplified)

> **Change note** (2026-04-09): the original design had a separate relation file, which has been removed. All relations now **exist only in frontmatter ID reference fields**, and the SQLite cache builds the relation index from frontmatter.

All lens relations are **inlined in object frontmatter**:

- `Claim.supports: ClaimId[]`
- `Claim.contradicts: ClaimId[]`
- `Claim.evidence: ExcerptId[]`
- `Claim.warrant_frame: FrameId`
- `Claim.programmes: ProgrammeId[]`
- `Frame.related_frames: FrameId[]`
- `Question.parent_question: QuestionId`
- etc.

**Reading relations**: the SQLite cache scans all frontmatter during rebuild and constructs a `relations` table, supporting efficient reverse queries ("which Claims reference this Frame?").

**Modifying relations**: modify the source object's frontmatter file -> notify the indexer to update the cache.

### 4.3 Relation Type Listing

All permitted `rel` values:

| Relation | From | To | Description |
|---|---|---|---|
| `supports` | Claim | Claim | A's truth supports B |
| `contradicts` | Claim | Claim | A's truth conflicts with B |
| `refines` | Claim | Claim | A is a special case of B |
| `superseded_by` | Claim/Frame/CA | Claim/Frame/CA | A is replaced by B |
| `warranted_by` | Claim | Frame | A uses B as its reasoning license |
| `backed_by` | Claim | Claim | A's warrant is backed by B |
| `exemplifies` | Claim | Frame | A is a typical example of B |
| `held_by` | Frame | (string) | who holds this frame |
| `parent_of` | Question | Question | Question hierarchy |
| `answers` | Claim | Question | Claim answers the Question |
| `raises` | Claim/Excerpt | Question | raises a new Question |
| `evidence_for` | Excerpt | Claim | Excerpt is evidence for the Claim |
| `challenges` | Claim/Excerpt | Frame | challenges a Frame |
| `related_to` | (any) | (any) | general relation (weak) |

---

## 5. Validation Rules

### 5.1 Writer-side validation (enforced at write time)

**All objects**:
- `schema_version` must be "1.0"
- `id` must follow the format `<prefix>_<ULID>`
- `created_at` / `updated_at` must be valid ISO 8601
- `type` field must match the object's actual type

**Type-specific** constraints: see the "Invariants" section of each type.

### 5.2 Lint checks (run periodically)

lens periodically (or via `lens lint`) runs these checks, producing lint findings:

#### Structural lint

- **Orphan Claim**: not included in any Programme
- **Orphan Frame**: no Claim uses it as a warrant
- **Broken reference**: points to a non-existent object
- **Circular reference**: Question parent-child forms a cycle
- **Dangling superseded**: `superseded_by` points to a non-existent Claim

#### Semantic lint (more expensive, uses LLM)

- **Duplicate claims**: semantically near-identical Claims that haven't been merged
- **Stale Programme**: `open_questions` is empty + no new Claims in 30 days
- **Hallucination risk**: `voice: extracted` but canonical_wording doesn't match the evidence
- **Schema drift**: multiple Frames for the same concept have overlapping semantics

### 5.3 Lint Findings as Anomalies

All lint issues become `Anomaly` objects, added to the `anomalies/` directory, awaiting agent or human handling.

---

## 6. Schema Migration

### 6.1 Principles

- **Never lose data**: during upgrades, all original fields are preserved; new fields are filled with default values
- **Mark versions**: each object's `schema_version` determines which migrator to use
- **Rollback support**: the previous version's schema is preserved, supporting downgrade

### 6.2 Migration Process

```
lens migrate --from 1.0 --to 1.1
```

1. Scan all objects
2. Group by type + schema_version
3. Run the migrator function for each group
4. **Validate before writing** (ensure all hard constraints of the new schema are satisfied)
5. Write to a temporary directory `~/.lens.migrated/`
6. After all succeed, atomically rename to `~/.lens/`
7. Back up the old version to `~/.lens.backup/<date>/`

### 6.3 Disallowed Schema Changes (require major version)

- Removing fields (can only deprecate and preserve)
- Changing field types
- Changing ID format
- Changing constraint direction (lenient -> strict)

These changes require `schema_version: "2.0"`, accompanied by an explicit migration tool.

---

## 7. Implementation Notes

### 7.1 Read/Write Model

- **Read**: CLI / MCP / Web App all read files through the same **`lens-core` library**. Read operations go directly to the file system + SQLite index
- **Write**: all write operations go through `lens-core`'s validate -> write -> update index -> emit relation event pipeline, ensuring atomicity
- **Concurrency**: writes to the same object use file locks (`.lock` file), preventing simultaneous modification by CLI and extension

### 7.2 SQLite Index Schema (derived)

index.sqlite is not the truth, but stores data for performance:

```sql
CREATE TABLE objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- projection of key frontmatter fields
  title TEXT,
  programmes TEXT,              -- JSON array
  status TEXT,
  confidence REAL,              -- only for claims
  structure_type TEXT           -- only for claims/frames
);

CREATE VIRTUAL TABLE objects_fts USING fts5(
  id, title, body, canonical_wording, statement, sees, ignores,
  content='objects', content_rowid='rowid'
);

CREATE TABLE relations (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rel TEXT NOT NULL,
  ts TEXT NOT NULL,
  context TEXT,
  PRIMARY KEY (from_id, to_id, rel, ts)
);

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  vector BLOB,                  -- sqlite-vec format
  model TEXT NOT NULL,
  computed_at TEXT NOT NULL
);

CREATE TABLE ingest_events (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  diff_type TEXT NOT NULL,
  data TEXT NOT NULL,            -- full IngestEvent as JSON
  FOREIGN KEY (source_id) REFERENCES objects(id)
);
```

**Key point**: this table **can always be rebuilt from the file system**. `lens rebuild-index` scans all markdown files' frontmatter and reconstructs index.sqlite (including the FTS5 index and relations table).

### 7.3 Backup Strategy

- **iCloud Drive** (recommended): place `~/.lens/` in an iCloud sync path; Apple handles e2e encrypted backup
- **git**: `~/.lens/` can be used as a git repo; commit history serves as backup
- **tar**: periodically run `tar -czf ~/.lens.backup.$(date).tar.gz ~/.lens/`

---

## 8. Open Questions

These are points in the schema that haven't been finalized, left for implementation time to decide:

### 8.1 Existing Open Questions

1. **Whether `confidence` truly needs a numeric value**: perhaps the 4-tier `qualifier` + history is sufficient; is the `confidence` field redundant? v0.1 uses only the 4-tier qualifier without numeric updates
2. **Whether all 5 dimensions of `elaboration` should be enums**: perhaps `scope` needs more tiers (5 instead of 3) to support finer zoom
3. **Whether `structure_type` should allow multiple selections**: a Claim might be both "causal" and "timeline". Should `structure_types: StructureType[]` be allowed?
4. ~~Performance boundaries of separate relation file~~: **Resolved** — separate relation file removed; relations are inlined in frontmatter
5. **The boundary between frontmatter and body**: `statement` is in frontmatter, but `explanation` should be in the body. Which fields belong in frontmatter is sometimes unclear

### 8.2 LLM Extraction Quality Validation (v0.1 prerequisite)

**This is the core unvalidated assumption for v0.1**: can an LLM reliably populate a Claim's ~30 structured fields?

Validate the following metrics in `spike/extraction-spike.ts`; results will determine the actual subset for the v0.1 schema:

| Field Group | Validation Content | If Unstable |
|---|---|---|
| **Toulmin core** (statement / evidence / qualifier) | Accuracy >= 80%, completeness >= 90% | **Cannot cut** — if this group fails, the product is unviable |
| **Toulmin extended** (warrant / backing / rebuttals) | Whether fill is meaningful | Downgrade to optional; v0.1 allows null |
| **Miller structure_type** (9 types) | Classification consistency (same document, two runs) | If < 70% consistent, skip in v0.1; add in v0.2 |
| **Reif elaboration** (5 dims x 3 tiers) | Labeling stability | If < 60% consistent, skip in v0.1. 243 combinations may be too granular |
| **voice** (extracted / restated / synthesized) | Classification accuracy | Should be stable; otherwise simplify to binary |
| **confidence numeric** | Whether the 0-1 number from the LLM is meaningful | v0.1 uses only the 4-tier qualifier; no numeric value |
| **Frame sees/ignores/assumptions** | Whether content is valuable to users | Qualitative evaluation; 3 people read and judge "useful/useless" |

**Key principle**: schema.md defines the **complete form**. The v0.1 implementation may use only a subset, but field design should not violate the direction of the complete form. Unstable fields are marked as `optional` (TypeScript `?`); to be restored to required in v0.2 as prompts are iterated.

### 8.3 Frontmatter Compactness Constraint (decided)

After three rounds of evaluation, the **File-as-Truth** approach is confirmed (see architecture.md §1.4 for the decision rationale). To make this approach viable, all objects' frontmatter must adhere to the following constraints:

1. **Each object's frontmatter must be <=20 lines of YAML**. Exceeding this indicates unstable fields that need to be cut or deferred
2. **No deep nesting allowed**: frontmatter allows at most 1 level of nesting (`evidence: [id1, id2]` is fine; `confidence_history: [{timestamp, value, reason}]` is not — deferred to v0.2)
3. **Inline relations**: relation fields like `evidence`, `programmes`, `contradicts` are written directly in frontmatter as ID arrays. No separate relation file
4. **SQLite cache handles queries**: the fields in frontmatter are sufficient to rebuild the SQLite cache. Nearly all read operations go through SQLite; only `lens show <id>` reads files directly
5. **Complex fields for v0.2** (`confidence_history`, `evidence_independence`, `alternative_wordings`) are stored in the SQLite cache, not written to frontmatter

**Verification method**: after writing a Claim's frontmatter, if it exceeds 20 lines, the field design needs to be revisited.

---

## 9. References

- Full methodology background: [methodology.md](./methodology.md)
- Product positioning: [positioning.md](./positioning.md)
- All citation sources: [references.md](./references.md)

**This schema is the source of truth for lens code.** If the implementation conflicts with this schema, **the schema takes precedence** — either change the schema (and document the reason), or change the implementation, but never let the two drift apart.
