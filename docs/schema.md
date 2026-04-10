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

### Reading Guide

**Must-read** (20 minutes, all information needed to translate types.ts):
- §0 Conventions & Version (ID / timestamps / file format / storage layout / naming conventions)
- §1 Shared Types (Qualifier / Voice / StructureType / ClaimScope / ObjectStatus / Evidence / RelatedRef)
- §2 Core Types: all 6 object types (Source, Claim, Frame, Question, Programme, Thread)

**Second pass** (read when working on specific features):
- §3 Feed (configuration object, stored in feeds.json)
- §4 Relation Model (typed fields + SQLite links table)
- §5 Validation Rules

**Reference** (look up when issues arise):
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

- **Prefix**: a fixed 1-3 character string per type, see table below
- **ULID**: [Crockford base32](https://github.com/ulid/spec), 26 characters, time-sortable
- **Full example**: `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`

| Type | Prefix | Example |
|---|---|---|
| Source | `src` | `src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Claim | `clm` | `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Frame | `frm` | `frm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Question | `q`   | `q_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Programme | `pgm` | `pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |
| Thread | `thr` | `thr_01HXY2K8WJ3F6N9Q0V5T7M2R8Z` |

**ID Rules**:
- Once generated, IDs **never change**
- Shared across Programmes (a Claim's ID is the same in all Programmes)
- IDs carry no semantics (if the name changes, the ID stays the same)

ID generation in code:

```ts
import { ulid } from "ulid";

const prefixes: Record<ObjectType, string> = {
  source: "src",
  claim: "clm",
  frame: "frm",
  question: "q",
  programme: "pgm",
  thread: "thr",
};

function generateId(type: ObjectType): string {
  return `${prefixes[type]}_${ulid()}`;
}
```

### 0.3 Timestamps

All timestamps use **ISO 8601 UTC**: `"2026-04-09T14:23:01Z"`

**Prohibited**: local time, Unix seconds, "X days ago", or other formats.

```ts
type ISODate = string  // ISO 8601 UTC, e.g. "2026-04-09T14:23:01Z"
```

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

Body markdown content here.
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
├── sources/src_01HXY.md        # Every object = type/id.md
├── claims/clm_01DEF.md         # Frontmatter (<=20 lines) + body
├── frames/frm_01GHI.md
├── questions/q_01JKL.md
├── programmes/pgm_01MNO.md     # Minimal: title + description
├── threads/thr_01PQR.md
├── raw/                         # Original files (audit / recompile)
│   └── src_01HXY.html
├── feeds.json                   # RSS feed subscriptions (not markdown)
├── index.sqlite                 # DERIVED CACHE (rebuildable)
└── config.yaml
```

**Rules**:
- **Every object = `type/id.md`** — no exceptions
- **Every `.md` = frontmatter + body**, same format everywhere
- **`raw/` stores original files separately** (audit / recompile only)
- **`feeds.json`** is a JSON file storing RSS feed subscriptions (not a markdown object; see §3)
- **`index.sqlite` is derived cache**, rebuildable from .md files via `lens rebuild-index`
- **No nested directories per source** (no `chapters/`, no `content.md` separate files)
- **No `_meta.md`**, no `inbox/`, no `relations.jsonl`, no `AGENT.md`

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
- **Relations are inlined in frontmatter** (`evidence: [{text, source}]`, `programmes: [pgm_id]`); there is no separate relation file (`relations.jsonl` does not exist)
- **Frontmatter must be compact**: each object's frontmatter should be <=20 lines. Exceeding this indicates the schema needs simplification

### 0.7 Naming Conventions

- **Field names**: `snake_case` (`structure_type`, `source_type`)
- **Enum values**: `snake_case` (`"big_picture"`, `"tentative"`)
- **Type names**: `PascalCase` (`Claim`, `Source`, `Programme`)
- **ID format**: `<prefix>_<ULID>` (`clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`)
- **ID prefixes**: `src` (Source), `clm` (Claim), `frm` (Frame), `q` (Question), `pgm` (Programme), `thr` (Thread)

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
| `"certain"` | 0.95 -- 1.00 |
| `"likely"` | 0.75 -- 0.95 |
| `"presumably"` | 0.50 -- 0.75 |
| `"tentative"` | 0.00 -- 0.50 |

### 1.3 Voice

The source posture of an assertion:

```ts
type Voice =
  | "extracted"     // statement directly extracted from the original text (preserving original wording)
  | "restated"      // LLM rephrased but semantically equivalent to original
  | "synthesized"   // new statement distilled from multiple sources
```

**Key constraint**: the `statement` of a Claim with `voice="extracted"` must have high similarity to the text of its evidence (lint check).

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

### 1.5 ClaimScope

```ts
type ClaimScope = "big_picture" | "detail"
```

**Purpose**: marks a Claim's position in the scope hierarchy. `big_picture` Claims are the 3-5 overarching insights from a source; `detail` Claims are supporting evidence. This drives the 2-level display in Programme views (Overview + Details).

Based on Reif/Miller research on knowledge structure and the Minto Pyramid principle.

### 1.6 ObjectStatus

```ts
type ObjectStatus = "active" | "superseded"
```

All objects have a `status` field and an optional `superseded_by` field. When an object is replaced (via merge, split, or refinement), the old object gets `status: "superseded"` and `superseded_by` points to the replacement(s).

### 1.7 ObjectType

```ts
type ObjectType = "source" | "claim" | "frame" | "question" | "programme" | "thread"
```

The 6 first-class object types in lens. Each maps to a directory and an ID prefix.

### 1.8 SourceType

```ts
type SourceType = "web_article" | "markdown" | "plain_text" | "manual_note"
```

Classifies the origin of a Source. v0.1 supports these 4 types.

### 1.9 Evidence (inline in Claim)

Evidence is stored **inline** in the Claim object, not as a separate Excerpt type. The Source file contains the full original text; Evidence carries only a verbatim quote for provenance.

```ts
interface Evidence {
  text: string;       // verbatim quote from source (50-300 chars)
  source: string;     // Source ID
  locator?: string;   // where in the source (section, paragraph, etc.)
}
```

**Design rationale**: v0.1 uses inline evidence for simplicity. The Source `.md` file stores the full article content in its body; the Evidence `text` field is a short verbatim excerpt sufficient for provenance and display.

### 1.10 RelatedRef (escape hatch)

```ts
interface RelatedRef {
  id: string;
  note?: string;   // optional context for why this is related
}
```

A weak/untyped association for cases where no typed relationship field fits. Used sparingly as an escape hatch.

---

## 2. Core Types

lens has 6 object types, all stored as `type/id.md`:

| Type | Prefix | Key Fields |
|---|---|---|
| **Source** | `src_` | title, url, word_count, source_type |
| **Claim** | `clm_` | statement, qualifier, voice, scope, evidence[], structure_type |
| **Frame** | `frm_` | name, sees, ignores, assumptions[] |
| **Question** | `q_` | text, question_status |
| **Programme** | `pgm_` | title, description (members reverse-queried) |
| **Thread** | `thr_` | title, references[], started_from |

Key design choices:
- **Typed fields** for relationships (not universal edges). Validated by research.
- **Evidence inline** in Claims (no separate Excerpt type). Source file has full text.
- **Programme doesn't store member lists** — reverse-queried via `links` table in SQLite.
- **scope** field on Claims: `big_picture` (3-5 core insights) vs `detail` (supporting evidence). Drives 2-level display.
- **Related** field as escape hatch for untyped associations.

---

### 2.1 Source (raw material)

**Purpose**: raw ingested content + metadata. Claims, Frames, and Questions are extracted from Sources.

#### TypeScript Definition

```ts
interface Source {
  id: string;
  type: "source";
  source_type: SourceType;         // "web_article" | "markdown" | "plain_text" | "manual_note"
  title: string;
  author?: string;
  url?: string;
  word_count: number;
  raw_file?: string;               // e.g. "raw/src_01.html"
  ingested_at: ISODate;
  created_at: ISODate;
  status: ObjectStatus;            // "active" | "superseded"
}
```

#### File Format (`sources/src_01HXY....md`)

A Source is a single `.md` file with frontmatter + full body content. The body contains the complete source content in markdown format.

```markdown
---
schema_version: "1.0"
id: src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
type: source
source_type: web_article
title: "Software 2.0"
author: "Andrej Karpathy"
url: "https://karpathy.medium.com/software-2-0-a64152b37c35"
word_count: 2500
raw_file: "raw/src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z.html"
ingested_at: "2026-04-09T14:23:01Z"
created_at: "2026-04-09T14:23:01Z"
status: active
---

# Software 2.0

[full article content in markdown, converted by Turndown from Defuddle-extracted HTML]
```

**Manual note example** (from `lens note`):

```markdown
---
schema_version: "1.0"
id: src_01HXYAB1CD2E3F4G5H6I7J8K9L
type: source
source_type: manual_note
title: "Quick observation on memory architectures"
word_count: 45
ingested_at: "2026-04-09T15:00:00Z"
created_at: "2026-04-09T15:00:00Z"
status: active
---

I noticed that the retrieval step in modern Hopfield networks looks very similar
to the attention mechanism. This might mean Transformers already have built-in
associative memory.
```

#### Invariants

**Hard constraints**:
- `title` must be non-empty
- `source_type` must be a valid enum value (`web_article`, `markdown`, `plain_text`, `manual_note`)
- `word_count` must be >= 0
- `status` must be `"active"` or `"superseded"`

**Soft constraints**:
- If `source_type` is `web_article`, `url` should be present
- If `raw_file` is set, the file should exist in `~/.lens/raw/`

#### Lifecycle

- **Creation**: `lens ingest <url-or-file>` fetches content (Defuddle + Turndown for web), writes `.md` file, then spawns the Compilation Agent to extract Claims/Frames/Questions
- **Manual note**: `lens note "<text>"` creates a Source with `source_type: manual_note`
- **Deletion**: never truly deleted; can only be `status: "superseded"`

---

### 2.2 Claim (Toulmin + Miller + Reif)

**Purpose**: an extracted falsifiable assertion. **The biggest difference between lens and all existing products**: a Claim is not a flat fact — it is a complete Toulmin argument structure with structural type and scope position.

#### TypeScript Definition

```ts
interface Claim {
  id: string;
  type: "claim";
  statement: string;               // normalized statement
  qualifier: Qualifier;            // "certain" | "likely" | "presumably" | "tentative"
  voice: Voice;                    // "extracted" | "restated" | "synthesized"
  evidence: Evidence[];            // inline evidence: [{text, source, locator?}]
  structure_type?: StructureType;  // Miller's 9 types (optional)
  scope?: ClaimScope;              // "big_picture" | "detail" (optional)

  // Typed relationship fields
  warrant_frame?: string;          // Frame ID: which perspective makes this claim valid
  supports?: string[];             // Claim IDs this claim supports
  contradicts?: string[];          // Claim IDs this claim contradicts
  refines?: string[];              // Claim IDs this claim refines
  programmes?: string[];           // Programme IDs this is relevant to
  source: string;                  // Source ID: provenance

  // Lifecycle
  status: ObjectStatus;            // "active" | "superseded"
  superseded_by?: string[];        // Claim IDs that replaced this (merge/split)

  // Escape hatch for untyped associations
  related?: RelatedRef[];          // [{id, note?}]

  created_at: ISODate;
}
```

**Key differences from earlier schema designs**:
- **Evidence is inline** (`Evidence[]`, not `ExcerptId[]`) — no separate Excerpt type
- **`scope`** replaces the 5-dimension `Elaboration` — simplified to `big_picture` vs `detail`
- **No `confidence` numeric value** — the 4-tier `qualifier` is sufficient for v0.1
- **No `confidence_history`** — deferred to v0.2
- **No `canonical_wording` / `alternative_wordings`** — deferred to v0.2
- **No `backing` / `rebuttals`** — deferred to v0.2
- **`superseded_by` is `string[]`** (not `string | null`), supporting merge/split scenarios

#### File Format (`claims/clm_01HXY....md`)

Frontmatter stores typed fields and ID references (~15 lines); body stores LLM-generated natural language explanation. **The body does not inline evidence text** — this avoids cascading updates when references change.

```markdown
---
schema_version: "1.0"
id: clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
type: claim
statement: "Transformer attention is mathematically equivalent to modern Hopfield network retrieval"
qualifier: likely
voice: restated
scope: big_picture
structure_type: causal
evidence:
  - text: "Modern Hopfield networks have exponential capacity, and their retrieval step is mathematically equivalent to the softmax attention mechanism"
    source: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
    locator: "Section 4"
warrant_frame: frm_01HXY4N0YL5H8Q1S2X7V9O4T0B
source: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
supports:
  - clm_01HXYBU7FR2O5X8Z9E4C6V1A7I
status: active
created_at: "2026-04-08T16:00:00Z"
---

# Transformer attention = Modern Hopfield

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
- Each `evidence[].source` must be a valid Source ID
- `qualifier` must be one of `"certain"`, `"likely"`, `"presumably"`, `"tentative"`
- `voice` must be one of `"extracted"`, `"restated"`, `"synthesized"`
- `source` must point to an existing Source
- When `voice == "extracted"`, `statement` must have high character similarity with the text of some evidence entry
- Each ClaimId in `supports` / `contradicts` / `refines` must exist
- A ClaimId cannot appear in both `supports` and `contradicts` of the same Claim
- `structure_type`, if present, must be one of the 9 valid values

**Soft constraints** (lint warning):
- `voice == "synthesized"` but `evidence` has only 1 entry -> warning "synthesized claims usually need multiple sources"
- `contradicts.length > 3` -> warning "too many contradictions; consider whether the Claim should be split"

#### Lifecycle

- **Creation**: created during ingest by the Compilation Agent. Must pass evidence validation
- **MERGE**: when dedup detects the same Claim, new Evidence entries are added to the existing Claim
- **Contradiction detection**: new Claim opposes existing Claim -> bidirectional update of `contradicts`
- **Supersede**: new Claim is more complete -> old Claim gets `status: "superseded"` + `superseded_by` points to the new one(s)
- **Deletion**: never truly deleted; can only be `status: "superseded"`

---

### 2.3 Frame (viewfinder)

**Purpose**: a perspective for viewing the world. The source of the product name. A Frame is Toulmin's warrant — the reasoning license that pushes Data to Claim.

#### TypeScript Definition

```ts
interface Frame {
  id: string;
  type: "frame";
  name: string;                     // "Complementary Learning Systems"
  sees: string;                     // what this frame lets you see
  ignores: string;                  // what it deliberately ignores
  assumptions: string[];            // what assumptions it is built on
  useful_when?: string[];           // when it is applicable
  failure_modes?: string[];         // when it fails

  // Typed relationship fields
  programmes?: string[];            // Programme IDs
  contradicts_frames?: string[];    // Frame IDs
  refines?: string[];               // Frame IDs this refines
  source: string;                   // Source ID: provenance

  // Lifecycle
  status: ObjectStatus;             // "active" | "superseded"
  superseded_by?: string[];         // Frame IDs that replaced this
  related?: RelatedRef[];           // escape hatch
  created_at: ISODate;
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
useful_when:
  - "Analyzing why Transformer architectures work"
  - "Predicting which bio-inspired ideas will transfer"
failure_modes:
  - "Overconfident mapping between ML and biology without rigorous math"
  - "Biology envy: assuming all biological traits must be replicated"
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
source: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
status: active
created_at: "2026-04-08T16:00:00Z"
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

**Key differences from earlier schema designs**:
- **No `held_by`** — removed for v0.1 simplicity
- **No `exemplar_claims`** — reverse-queried via links table (Claims point to Frames via `warrant_frame`)
- **No `robustness`** — deferred to v0.2
- **No `preferred_structure`** — deferred to v0.2
- **`contradicts_frames`** (not `contradicts`) to avoid ambiguity with Claim's `contradicts` field
- **`useful_when` and `failure_modes` are optional** — may not always be extractable

#### Invariants

**Hard constraints**:
- `name` / `sees` / `ignores` must be non-empty
- `assumptions` must have at least 1 entry
- `source` must point to an existing Source
- Each FrameId in `contradicts_frames` / `refines` must exist

**Soft constraints**:
- `useful_when` is empty -> warning "Frame lacks usage guidance"
- `failure_modes` is empty -> warning "Frame lacks failure mode documentation"

#### Lifecycle

- **Creation**: created during ingest by the Compilation Agent
- **Supersede**: marked `superseded` when replaced by a new refining Frame
- **Deletion**: never truly deleted; can only be `status: "superseded"`

---

### 2.4 Question (IBIS + Strong Inference)

**Purpose**: an open inquiry question. **The true center of lens** — Claims and Frames revolve around Questions.

#### TypeScript Definition

```ts
interface Question {
  id: string;
  type: "question";
  text: string;                     // question text
  question_status: "open" | "tentative_answer" | "resolved" | "superseded";
  current_position?: string;       // current best judgment (if any)

  // Typed relationship fields
  parent_question?: string;        // Question ID
  candidate_answers?: string[];    // Claim IDs that might answer this
  programmes?: string[];           // Programme IDs
  source: string;                  // Source ID: provenance

  // Lifecycle
  status: ObjectStatus;            // "active" | "superseded"
  superseded_by?: string[];        // Question IDs that replaced this
  related?: RelatedRef[];          // escape hatch
  created_at: ISODate;
}
```

**Key differences from earlier schema designs**:
- **`question_status`** is separate from `status`. `question_status` tracks the intellectual resolution state (`open` -> `tentative_answer` -> `resolved`); `status` tracks the object lifecycle (`active` / `superseded`)
- **No `context`** field — context goes in the markdown body
- **No `sub_questions`** — reverse-queried via `parent_question` in children
- **No `alternative_hypotheses` / `discriminating_evidence`** — `candidate_answers` serves this purpose more simply
- **No `supporting_claims` / `opposing_claims`** — reverse-queried via links table
- **No `priority`** — deferred to v0.2

#### File Format (`questions/q_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: q_01HXY3M9XK4G7P0R1W6U8N3S9A
type: question
text: "How should AI agents persist memory?"
question_status: open
parent_question: null
candidate_answers:
  - clm_01HXYFY1JV6S9B2D3I8G0Z5E1M
  - clm_01HXYGZ2KW7T0C3E4J9H1A6F2N
programmes:
  - pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
source: src_01HXY8R4CP9L2U5W6B1Z3S8X4F
status: active
created_at: "2026-02-01T10:00:00Z"
---

# How should AI agents persist memory?

## Why this is a critical question

How to maintain consistent understanding across sessions, tools, and time.

## Current best judgment

...(manually edited or updated by the Compilation Agent)

## Sub-threads still open

- Reliability of semantic dedup still needs more data validation
- Alternative to iCloud sync for non-Apple users
```

#### Invariants

**Hard constraints**:
- `text` must be non-empty, recommended < 200 characters
- `question_status` must be one of `"open"`, `"tentative_answer"`, `"resolved"`, `"superseded"`
- `parent_question`, if not null, must point to an existing Question
- Must not form cycles (if q1 is q2's parent, q2 cannot be q1's parent)
- When `question_status == "resolved"`, `current_position` must be non-empty
- `source` must point to an existing Source

**Soft constraints**:
- `question_status == "open"` for > 90 days -> warning "question stalled"
- `candidate_answers` is empty -> warning "no candidate answers; question may be too broad"

#### Lifecycle

- **Creation**: automatically created during ingest by the Compilation Agent, or explicitly via CLI
- **Status transitions**:
  - `open` -> `tentative_answer`: has supporting claims with sufficient confidence
  - `tentative_answer` -> `resolved`: multiple independent supporting claims
  - any -> `superseded`: question replaced by new question ("asked the wrong question")

---

### 2.5 Programme (meta-structure)

**Purpose**: a research theme that organizes Claims, Frames, and Questions. Programme is **minimal** — it stores only title and description. Member lists are not stored in the Programme; they are **reverse-queried** via the `links` table in SQLite.

#### TypeScript Definition

```ts
interface Programme {
  id: string;
  type: "programme";
  title: string;                   // "AI Memory Systems"
  description: string;             // a paragraph explaining what this programme is about

  // Typed relationship fields
  root_question?: string;          // Question ID: the Programme's driving question

  // Lifecycle
  status: ObjectStatus;            // "active" | "superseded"
  related?: RelatedRef[];          // escape hatch
  created_at: ISODate;
  updated_at: ISODate;
}
```

**Key differences from earlier schema designs**:
- **No `hard_core` / `protective_belt` / `open_questions` / `anomalies`** — Lakatos three-layer structure removed for v0.1 simplicity
- **No `concept_anatomies`** — ConceptAnatomy type removed in v0.1
- **No `health`** — deferred to v0.2
- **No `created_by`** — not needed in v0.1
- **Members are reverse-queried**: Claims, Frames, and Questions that belong to a Programme have `programmes: [pgm_id]` in their frontmatter. The links table indexes this, enabling `getProgrammeMembers(pgm_id)` queries

#### File Format (`programmes/pgm_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: pgm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
type: programme
title: "AI Memory Systems"
description: "How should AI agents persist memory? What are the methods for cross-agent sharing?"
root_question: q_01HXY3M9XK4G7P0R1W6U8N3S9A
status: active
created_at: "2026-02-01T10:00:00Z"
updated_at: "2026-04-09T14:23:01Z"
---

# AI Memory Systems

## Scope

This Programme explores the problem of persistent memory for AI agents — how to
maintain consistent understanding across sessions, tools, and time.

## Current State

(Members are queried from the links table: `lens programme show pgm_01HXY`)
```

#### Invariants

**Hard constraints**:
- `title` must be non-empty, recommended < 80 characters
- `description` must be non-empty
- `root_question`, if not null, must point to an existing Question
- `status` must be `"active"` or `"superseded"`

**Soft constraints**:
- Programme has no members (no Claims/Frames/Questions with `programmes: [this_id]`) for > 30 days -> warning "Programme may have stalled"

#### Lifecycle

- **Creation**: explicitly created via `lens programme create` (**not automatic**). Requires title + description
- **Member management**: Claims, Frames, Questions declare their Programme membership via `programmes: [pgm_id]` in their own frontmatter
- **Display**: `lens programme show <id>` queries the links table for all members, then groups by type and scope (big_picture first, then details)
- **Deletion**: never truly deleted; can only be `status: "superseded"`

---

### 2.6 Thread (conversation)

**Purpose**: a conversation or discussion thread. A **peer object**, not owned by any other object. The markdown body contains the conversation messages.

#### TypeScript Definition

```ts
interface Thread {
  id: string;
  type: "thread";
  title: string;

  // Typed relationship fields
  references: string[];            // IDs of any objects discussed in this thread
  started_from?: string;           // ID of the object that triggered this thread

  // Lifecycle
  status: ObjectStatus;            // "active" | "superseded"
  created_at: ISODate;
  // Body (markdown) contains the conversation messages
}
```

**Key design choices**:
- **Thread has no `superseded_by`** — threads are append-only conversations, they don't get superseded
- **`references`** is the primary relationship: lists all objects discussed in the thread
- **`started_from`** records what triggered the creation of this thread (e.g., a Claim or Question)
- **Body contains messages** — the conversation content lives in the markdown body, not in structured fields

#### File Format (`threads/thr_01HXY....md`)

```markdown
---
schema_version: "1.0"
id: thr_01HXYPQ3RS4T5U6V7W8X9Y0Z1A
type: thread
title: "Discussion: Is Hopfield-Transformer equivalence practically useful?"
references:
  - clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
  - q_01HXY3M9XK4G7P0R1W6U8N3S9A
started_from: clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G
status: active
created_at: "2026-04-09T15:00:00Z"
---

# Discussion: Is Hopfield-Transformer equivalence practically useful?

**User (2026-04-09T15:00:00Z)**:
The mathematical equivalence is proven, but does it have practical implications?

**Agent (2026-04-09T15:00:30Z)**:
Based on clm_01HXY9S5DQ0M3V6X7C2A4T9Y5G, there are two implications...
```

#### Invariants

**Hard constraints**:
- `title` must be non-empty
- `references` must be an array (can be empty)
- Each ID in `references` should point to an existing object
- `started_from`, if present, must be a valid object ID

#### Lifecycle

- **Creation**: created when a user or agent starts a discussion about existing objects
- **Update**: messages are appended to the markdown body
- **Deletion**: never truly deleted

---

## 3. Feed (configuration object)

**Purpose**: RSS/Atom feed subscription. Feeds are **not markdown objects** — they are stored as JSON in `~/.lens/feeds.json`. Feed management is in Settings, not a primary view.

### 3.1 Feed Interface

```ts
interface Feed {
  id: string;                // "feed_<ULID>" — uses "feed" prefix, not one of the 6 object prefixes
  url: string;               // RSS/Atom feed URL
  title?: string;            // feed title (from feed metadata)
  html_url?: string;         // the website URL (not the feed URL)
  added_at: string;          // ISODate
  last_checked_at?: string;  // ISODate: when last polled
  etag?: string;             // HTTP ETag for conditional fetch
  last_modified?: string;    // HTTP Last-Modified for conditional fetch
  programme_id?: string;     // optional: auto-assign articles to this Programme
  ingested_urls: string[];   // URLs already ingested (dedup)
}
```

### 3.2 Storage Format (`feeds.json`)

```json
{
  "feeds": [
    {
      "id": "feed_01HXY2K8WJ3F6N9Q0V5T7M2R8Z",
      "url": "https://karpathy.medium.com/feed",
      "title": "Andrej Karpathy's Blog",
      "html_url": "https://karpathy.medium.com",
      "added_at": "2026-04-01T10:00:00.000Z",
      "last_checked_at": "2026-04-09T14:00:00.000Z",
      "etag": "\"abc123\"",
      "ingested_urls": [
        "https://karpathy.medium.com/software-2-0-a64152b37c35"
      ]
    }
  ]
}
```

### 3.3 CLI Commands

```bash
lens feed add <url>          # Subscribe (auto-discovers RSS from website URLs)
lens feed import <file.opml> # Import from Reeder/Feedly/Inoreader
lens feed list               # List subscriptions
lens feed check              # Check all feeds, compile new articles
lens feed check --dry-run    # Check without compiling
lens feed remove <id|url>    # Unsubscribe
```

### 3.4 Feed Lifecycle

- **Add**: `lens feed add <url>` discovers the feed URL (if given a website URL), fetches metadata, and stores the subscription in `feeds.json`
- **Check**: `lens feed check` polls all feeds, identifies new articles (via `ingested_urls` dedup), and runs `lens ingest` for each new article
- **Conditional fetch**: uses `etag` and `last_modified` to avoid re-downloading unchanged feeds
- **Remove**: `lens feed remove <id|url>` removes the subscription. Already-ingested Sources are not affected

---

## 4. Relation Model

### 4.1 Relation Storage Method

All lens relations are **inlined in object frontmatter as typed fields**:

- `Claim.source: SourceId`
- `Claim.evidence: Evidence[]` (each has a `source` field)
- `Claim.supports: ClaimId[]`
- `Claim.contradicts: ClaimId[]`
- `Claim.refines: ClaimId[]`
- `Claim.warrant_frame: FrameId`
- `Claim.programmes: ProgrammeId[]`
- `Claim.superseded_by: ClaimId[]`
- `Frame.programmes: ProgrammeId[]`
- `Frame.contradicts_frames: FrameId[]`
- `Frame.refines: FrameId[]`
- `Frame.source: SourceId`
- `Question.parent_question: QuestionId`
- `Question.candidate_answers: ClaimId[]`
- `Question.programmes: ProgrammeId[]`
- `Question.source: SourceId`
- `Programme.root_question: QuestionId`
- `Thread.references: ObjectId[]`
- `Thread.started_from: ObjectId`
- All types: `related: RelatedRef[]` (escape hatch)

**There is no separate relation file** (`relations.jsonl` does not exist). Relations exist only in frontmatter.

### 4.2 SQLite Links Table (derived cache)

The SQLite cache builds a `links` table from frontmatter during `lens rebuild-index`, supporting efficient reverse queries:

```sql
CREATE TABLE links (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rel TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id, rel)
);
CREATE INDEX idx_links_to ON links(to_id, rel);
CREATE INDEX idx_links_rel ON links(rel);
```

**Link extraction**: when an object is indexed, its typed frontmatter fields are parsed into link rows. For example, a Claim with `programmes: [pgm_01, pgm_02]` generates:

```
(clm_01, pgm_01, "programme")
(clm_01, pgm_02, "programme")
```

**Reverse queries** (e.g., "which Claims belong to this Programme?"):

```ts
function getBacklinks(id: string): { from_id: string; rel: string }[]
function getProgrammeMembers(programmeId: string): { from_id: string; rel: string }[]
```

### 4.3 Relation Type Listing

All relationship types extracted into the links table:

| Relation | From | To | Frontmatter Field |
|---|---|---|---|
| `source` | Claim/Frame/Question | Source | `source: src_id` |
| `evidence` | Claim | Source | `evidence[].source` |
| `warrant` | Claim | Frame | `warrant_frame: frm_id` |
| `supports` | Claim | Claim | `supports: [clm_id]` |
| `contradicts` | Claim | Claim | `contradicts: [clm_id]` |
| `refines` | Claim/Frame | Claim/Frame | `refines: [id]` |
| `superseded_by` | Claim/Frame/Question | Claim/Frame/Question | `superseded_by: [id]` |
| `programme` | Claim/Frame/Question | Programme | `programmes: [pgm_id]` |
| `root_question` | Programme | Question | `root_question: q_id` |
| `parent` | Question | Question | `parent_question: q_id` |
| `candidate_answer` | Question | Claim | `candidate_answers: [clm_id]` |
| `discusses` | Thread | any | `references: [id]` |
| `started_from` | Thread | any | `started_from: id` |
| `related` | any | any | `related: [{id, note?}]` |

---

## 5. Validation Rules

### 5.1 Writer-side validation (enforced at write time)

**All objects**:
- `schema_version` must be "1.0"
- `id` must follow the format `<prefix>_<ULID>` (regex: `/^(src|clm|frm|q|pgm|thr)_[A-Z0-9]{26}$/`)
- `created_at` must be valid ISO 8601
- `type` field must match the object's actual type
- `status` must be `"active"` or `"superseded"`

**Type-specific** constraints: see the "Invariants" section of each type in §2.

### 5.2 Lint checks (run periodically)

lens periodically (or via `lens lint`) runs these checks, producing lint findings:

#### Structural lint

- **Orphan Claim**: not included in any Programme (`programmes` is empty)
- **Orphan Frame**: no Claim uses it as a warrant
- **Broken reference**: frontmatter points to a non-existent object
- **Circular reference**: Question `parent_question` forms a cycle
- **Dangling superseded**: `superseded_by` points to a non-existent object

#### Semantic lint (more expensive, uses LLM)

- **Duplicate claims**: semantically near-identical Claims that haven't been merged
- **Stale Programme**: no new members in 30 days
- **Hallucination risk**: `voice: extracted` but statement doesn't match the evidence text
- **Schema drift**: multiple Frames with overlapping semantics

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

- **Read**: CLI reads files through the `lens-core` library. Read operations go directly to the file system + SQLite index
- **Write**: all write operations go through `lens-core`'s validate -> write -> update index pipeline. Uses atomic write (write to temp file, then rename) to prevent corruption
- **Concurrency**: single-process model in v0.1

### 7.2 SQLite Index Schema (derived)

`index.sqlite` is not the truth, but stores data for performance:

```sql
-- FTS5 full-text search across all objects
CREATE VIRTUAL TABLE search_index USING fts5(
  id,
  type,
  title,
  body,
  tokenize='porter unicode61'
);

-- Object metadata for fast lookups
CREATE TABLE objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,            -- full object JSON
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- Universal relationship index (built from typed frontmatter fields)
CREATE TABLE links (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rel TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id, rel)
);
CREATE INDEX idx_links_to ON links(to_id, rel);
CREATE INDEX idx_links_rel ON links(rel);
```

**Key point**: this database **can always be rebuilt from the file system**. `lens rebuild-index` scans all markdown files' frontmatter and body content, and reconstructs `index.sqlite` (including the FTS5 index, objects table, and links table).

### 7.3 Backup Strategy

- **iCloud Drive** (recommended): place `~/.lens/` in an iCloud sync path; Apple handles e2e encrypted backup
- **git**: `~/.lens/` can be used as a git repo; commit history serves as backup
- **tar**: periodically run `tar -czf ~/.lens.backup.$(date).tar.gz ~/.lens/`

---

## 8. Open Questions

These are points in the schema that haven't been finalized, left for future implementation to decide:

### 8.1 Existing Open Questions

1. **Whether `confidence` truly needs a numeric value**: perhaps the 4-tier `qualifier` is sufficient; v0.1 uses only the qualifier without numeric updates
2. **Whether `structure_type` should allow multiple selections**: a Claim might be both "causal" and "timeline". Should `structure_types: StructureType[]` be allowed?
3. **The boundary between frontmatter and body**: `statement` is in frontmatter, but the explanation should be in the body. Which fields belong in frontmatter is sometimes unclear

### 8.2 Frontmatter Compactness Constraint (decided)

The **File-as-Truth** approach is confirmed (see architecture.md for the decision rationale). To make this approach viable, all objects' frontmatter must adhere to the following constraints:

1. **Each object's frontmatter must be <=20 lines of YAML**. Exceeding this indicates unstable fields that need to be cut or deferred
2. **No deep nesting allowed**: frontmatter allows at most 1 level of nesting (`evidence: [{text, source}]` is the deepest nesting in v0.1)
3. **Inline relations**: relation fields like `evidence`, `programmes`, `contradicts` are written directly in frontmatter as ID arrays. No separate relation file
4. **SQLite cache handles queries**: the fields in frontmatter are sufficient to rebuild the SQLite cache. Nearly all read operations go through SQLite; only `lens show <id>` reads files directly
5. **Complex fields for v0.2** (`confidence_history`, `evidence_independence`, `alternative_wordings`) are stored in the SQLite cache, not written to frontmatter

**Verification method**: after writing a Claim's frontmatter, if it exceeds 20 lines, the field design needs to be revisited.

---

## 9. Union Type

The union of all 6 object types:

```ts
type LensObject = Source | Claim | Frame | Question | Programme | Thread;
```

All storage and indexing functions accept and return `LensObject`.

---

## 10. References

- Full methodology background: [methodology.md](./methodology.md)
- Product positioning: [positioning.md](./positioning.md)
- All citation sources: [references.md](./references.md)
- Types implementation: `packages/lens-core/src/core/types.ts`
- Storage implementation: `packages/lens-core/src/core/storage.ts`

**This schema is the source of truth for lens code.** If the implementation conflicts with this schema, **the schema takes precedence** — either change the schema (and document the reason), or change the implementation, but never let the two drift apart.
