# Lens Methodology — The Spine of Compilation

Date: 2026-04-08

This document defines the methodological spine of lens — what makes the type system coherent and inevitable.

Document network:
- [`getting-started.md`](./getting-started.md) — **New agents start here**
- [`positioning.md`](./positioning.md) defines **what lens is** (product + UX principles)
- [`architecture.md`](./architecture.md) defines **how lens is built** (tech stack + component architecture)
- **This document** defines **how lens thinks** (methodology + compilation lifecycle)
- [`schema.md`](./schema.md) defines **what lens's data looks like** (precise schema, the source of truth for code)
- [`source-pipeline.md`](./source-pipeline.md) defines **the ingest mechanism for each source type** (Defuddle / Marker / chat processing, etc.)
- [`roadmap.md`](./roadmap.md) defines **in what order to build**

If there is a conflict between methodology and schema, **schema.md takes precedence** — methodology is a conceptual description, schema is an executable constraint.

---

## Why a Methodological Spine Is Needed

An isolated Frame, an isolated Claim, an isolated Question — none of them are useful on their own. They must form an **evolvable cognitive system** — with direction, progress, counterexamples, and a core.

If we only have a pile of types without a theory of "how they collaborate," two things will happen:

1. **Types will proliferate infinitely** — a new type for every new scenario, eventually devolving into a chaos of 50 types
2. **The agent won't know when to use which** — no clear semantic boundaries

Philosophy of science and epistemology have studied this problem for 100 years. lens does not invent; it **directly adopts a synthesis of mature theories**.

---

## Synthesis of Five Traditions

The methodological spine of Lens is a synthesis of 5 traditions from philosophy of science / epistemology / cognitive science. Each is responsible for a different scale:

```
┌───────────────────────────────────────────────────┐
│  Macro structure: Lakatos's Research Programmes    │
│  Programme = Hard Core + Protective Belt           │
│              + Open Questions + Anomalies          │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│  Detail hierarchy: Reif + Miller's Hierarchical    │
│  Knowledge                                         │
│  5 elaboration dimensions within each Programme    │
│  Knowledge Maps as visual expression of structure  │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│  Cyclic dynamics: Popper's P1→TT→EE→P2            │
│  Each Programme continuously cycles through this   │
│  process                                           │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│  Local structure: Toulmin's Argumentation Model    │
│  Each Claim = Statement + Evidence + Warrant       │
│              + Qualifier + Rebuttal                │
│  + 9 knowledge structure types (Miller)            │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│  Belief dynamics: Bayesian updating                │
│  Each Claim's confidence increases or decreases    │
│  with new Excerpts                                 │
└───────────────────────────────────────────────────┘
```

### 1. Lakatos's Research Programmes (Macro Container)

[Imre Lakatos, *The Methodology of Scientific Research Programmes* (1978)](https://en.wikipedia.org/wiki/Imre_Lakatos)

Science is not about individual theories being right or wrong; it is about **the rise and fall of research programmes**. Each programme has:

- **Hard Core**: unfalsifiable core assumptions. Changing the Hard Core means switching programmes
- **Protective Belt**: adjustable auxiliary hypotheses. Adjusted here when encountering counterexamples
- **Positive Heuristic**: the directions the programme indicates as worth researching
- **Negative Heuristic**: the directions that are off-limits

Key indicators for judging a programme's health:

- **Progressive**: the programme can predict new phenomena that are independently confirmed
- **Degenerative**: the programme can only explain after the fact, unable to predict anything new

**Implication for lens**: The meta-structure of lens is the **Programme** — a complete unit of cognitive exploration. lens is not "a pile of claims"; it is "several Programmes, each with a Hard Core and Belt."

### 2. Popper's P1→TT→EE→P2 Cycle (Dynamics)

[Karl Popper, *Logik der Forschung* (1934)](https://en.wikipedia.org/wiki/The_Logic_of_Scientific_Discovery)

```
P1  →  TT  →  EE  →  P2
Problem  Tentative Theory  Error Elimination  New Problem
```

Knowledge is not the accumulation of facts; it is **problems being continuously replaced by deeper problems**. After each cycle, you are not closer to truth; you are **clearer about what you don't understand**.

**Implication for lens**: The true center of lens is the **Question**, not the Claim. Claims and Frames are TT; Excerpts are material for EE; ConceptAnatomy is a tool for EE. Everything revolves around Questions.

Popper also has a **Three Worlds theory** ([*Objective Knowledge*, 1972](https://en.wikipedia.org/wiki/Three_worlds_(Popper))):

- **World 1** = the physical world
- **World 2** = the subjective mind
- **World 3** = **objective knowledge itself** — theories, problems, criticisms, existing as independent objects

The objects compiled by lens are World 3 — they are independent of any particular agent or person, and can be accessed, modified, and cited by multiple parties.

### 3. Toulmin's Argumentation Model (Local Structure)

[Stephen Toulmin, *The Uses of Argument* (1958)](https://en.wikipedia.org/wiki/Stephen_Toulmin)

Every argument has 6 components:

```
Data ────────► Claim
              ↑
        Warrant
              ↑
        Backing

Qualifier: "presumably / likely / certain"
Rebuttal:  "unless..."
```

- **Claim**: the assertion being argued
- **Data**: supporting facts
- **Warrant**: the inferential license connecting Data to Claim (**this is where Frame sits**)
- **Backing**: deeper background supporting the warrant
- **Qualifier**: indicates the strength of the claim
- **Rebuttal**: conditions for reversal

**Implication for lens**: A Claim in lens **must** be a complete Toulmin structure. The `warrant: FrameId` field genuinely binds Frame and Claim together — a Claim is not a floating fact; it is **a fact under a particular Frame**. Change the Frame, and the same Data cannot derive the same Claim.

### 4. Bayesian Epistemology (Belief Dynamics)

[Bayesian Epistemology — Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/epistemology-bayesian/)

```
P(H | E) = P(E | H) × P(H) / P(E)
Posterior =  Likelihood × Prior / Marginal
```

- **Every belief is a matter of degree, not binary**
- **New evidence updates the prior via Bayes' rule**
- **After multiple updates, the prior is gradually dominated by data**

This is precisely Li Jigang's first underlying generator (the "BS formula").

**Implication for lens**: Each Claim's confidence is not a number made up by an LLM; it is a **traceable quantity updated by Bayes' rule**. When a new Excerpt arrives, the confidence of related Claims is automatically updated, with history preserved.

### 5. Reif + Miller — Hierarchical Detail Axis (Hierarchical Knowledge Organization)

[Frederick Reif, *Applying Cognitive Science to Education*, MIT Press 2010, Chapter 9](https://mitpress.mit.edu/9780262515146/) + [Francis Miller, *Organising Knowledge with Multi-level Content* (2018)](https://www.francismiller.com/organising_knowledge_paper.pdf)

This is the underappreciated 5th pillar. The first 4 traditions address the **macro structure, dynamics, local argumentation shape, and confidence** of a Programme, but none of them answer: **at what level of detail should the same knowledge be presented?**

Reif provides the answer from a cognitive-educational perspective: **all complex knowledge has a hierarchical structure; the upper level is central/important knowledge, the lower level is subordinate/subsidiary knowledge, and the two are connected through "elaboration" in both directions**. Miller applies this theory to the product form of multi-level content, and adds a 5th elaboration dimension.

#### Reif's 5 Elaboration Dimensions

A piece of central knowledge can be expanded downward into subordinate knowledge along **5 independent dimensions**:

```
① Big picture (coarse)      →   Detail (fine)
② Important (core)          →   Subsidiary
③ Whole                     →   Constituent parts
④ General (rules/principles) →  Specific (exceptions/anomalies)
⑤ Wider context             →   Narrower focus    (added by Miller)
```

**Key point**: These 5 dimensions are **orthogonal and independent**. A claim can be "important but specific" or "general but narrower" — a simple gist/summary/full three-level zoom cannot express this kind of combination.

#### Miller's 9 Knowledge Structure Types

Miller explicitly identifies 9 **mutually exclusive fundamental structural patterns**; an explanation typically consists of multiple nested types:

| Structure Type | Definition | Typical Application |
|---|---|---|
| **Taxonomy** | Hierarchical classification of elements | Species classification, concept family trees |
| **Causal explanation** | Causal chain leading to a result | Causes of historical events |
| **Description** | Parts that make up a whole | Product components, system composition |
| **Timeline** | Chronological order of events/trends | History, technological evolution |
| **Argument / case** | Reasoning leading to a conclusion | Academic argumentation, legal reasoning |
| **Content structure** | How content itself is organized | Chapter arrangement of a book |
| **Story** | Narrative from start to finish | Case studies, historical events |
| **Process / sequence** | Sequence of steps | Implementation workflows, algorithms |
| **Relationships** | Relationships between elements (including comparisons) | Organizational charts, comparison tables |

**This is orthogonal to lens's Claim/Frame/Question**:
- Lens's types answer "what epistemic role is this" (epistemic role)
- Miller's types answer "what structure is used to organize this content" (structural pattern)

One Claim can be "expressed with a causal explanation structure," another can be "expressed with a timeline structure."

#### Knowledge Maps Are Required, Not Optional

Miller cites Sweller's **Cognitive Load Theory** to argue:

> "Explanations that don't provide visual descriptions of knowledge structures increase extraneous cognitive load."

Don Moyer's "Lasagna Project" example confirms this: for the same employee relationship data, a textual description requires dozens of seconds of working memory processing to answer "who wasn't involved in the project"; an organizational chart reveals it in 2 seconds.

**Implication**: The complete form of lens must have Knowledge Maps as a **first-class view**, not a nice-to-have UI sugar. A lens without a visual layer is the very trap it criticizes — "conveying non-linear structure through linear text."

**Tension with the delivery plan**: Knowledge Maps are scheduled for v0.2 in the roadmap, not v0.1. This means **v0.1 is a knowingly incomplete validation** — it can only display inherently non-linear structures using list/detail views. This compromise is intentional: the primary goal of v0.1 is to validate **LLM extraction quality** (whether the structured output of Claim/Frame/Question is trustworthy to users), not to validate visual presentation. If extraction quality fails, even the best Knowledge Maps are meaningless. But Knowledge Maps in v0.2 are not optional — they are the key leap that transforms lens from an "advanced Reader" into an "understanding compiler."

#### Reif's 4 Practical Tips (Programme Design Guidelines)

Reif offers 4 practical guidelines for hierarchical knowledge organization:

1. **Cluster size control**: not too large (overwhelming), not too small (too many relationships)
2. **Internal cluster organization**: the internal organization of each cluster does not have to be hierarchical; it can use other structures
3. **Overlapping clusters**: adjacent clusters can overlap — like a map that includes part of neighboring states. **Claims crossing Programme boundaries is a feature, not a bug**
4. **Cross-references**: claims with non-hierarchical relationships should be able to reference each other

**Implication for lens**: These 4 guidelines directly provide design constraints for Programmes. Especially the 3rd — **Boundary Claims** (claims that span multiple Programmes) are a source of serendipity and should be explicitly identified and visualized.

#### Miller's 11 "Zooming Out" Atomic Operations

Miller decomposes the act of creating higher-level summaries into 11 atomic verbs:

> generalising, summarising, categorising, contextualising, systematising, comparing, simplifying, structuring, connecting, ranking, filtering

**This converges strongly with Li Jigang's ljg-rank, ljg-roundtable, ljg-learn, and other skills** — two independent sources yielding a similar inventory of cognitive operations is a strong signal of cross-source validation.

**Implication for lens**: These 11 should not all become independent CLI operators (too granular), but can serve as subcommands of `lens run <target> <operation>`:

```bash
lens run <programme-id> summarise
lens run <programme-id> categorise
lens run <programme-id> rank
lens run <programme-id> compare --with <another>
lens run <claim-id>     generalise
lens run <claim-id>     contextualise
```

#### Impact on lens's Schema

The 5th pillar directly affects the schema of Claim / Frame / Programme — see the `structure_type` and `elaboration` fields in the "Complete Schema for the Six Core Types" section below.

---

## Complete Schema for the Six Core Types

Based on the spine above, the type system of lens v0 consists of **5 content types + 1 meta-structure**:

### 0. Programme (Meta-structure)

A research programme — a complete unit of cognitive exploration. All content types in lens belong to at least one Programme.

```ts
type Programme = {
  id: ProgrammeId                       // pgm_01HXYZ
  title: string                         // "AI Memory Systems"
  root_question: QuestionId             // root question
  description: string                   // a paragraph describing what this programme is about
  
  // Lakatos three-layer structure
  hard_core: FrameId[]                  // immovable core Frames (few)
  protective_belt: {
    frames: FrameId[]                   // auxiliary Frames (can be opposed)
    claims: ClaimId[]                   // revisable Claims
  }
  open_questions: QuestionId[]          // currently open questions
  anomalies: AnomalyId[]                // unresolved counterexamples
  
  // Derived assets
  concept_anatomies: ConceptAnatomyId[] // concept anatomies within this programme
  
  // Health monitoring
  health: {
    is_progressive: boolean             // whether it is generating new Questions
    last_health_check: ISODate
    anomaly_trend: "growing" | "stable" | "shrinking"
    hard_core_age_days: number          // how long since last change
  }
  
  created_at: ISODate
  updated_at: ISODate
}
```

**Key design decisions**:
- Programmes are not created automatically — the system **proposes** when it observes a cluster, and a human confirms
- Hard Core is not modified automatically — the system **warns** when counterexamples accumulate, and a human decides whether to revise
- Programmes can share Excerpts / Claims / Frames (cross-membership)

### 1. Excerpt (substrate)

A raw evidence fragment — the ground truth for all other types.

```ts
type Excerpt = {
  id: ExcerptId                         // exc_01HXYZ
  text: string                          // original text fragment
  source_id: SourceId                   // points to raw source
  locator: {
    type: "char_offset" | "page" | "timestamp" | "url_fragment"
    value: string
  }
  captured_at: ISODate
  by: AgentOrHumanId                    // who captured it
  
  // Programme membership (an excerpt can contribute to multiple Programmes)
  programmes: ProgrammeId[]
}
```

**Key constraint**: All Claims must cite at least one Excerpt. Claims without an Excerpt are rejected on write.

### 2. Claim (Complete Toulmin Structure)

An extracted falsifiable assertion. **This is the biggest differentiator between lens and all existing products** — a Claim is not a flat fact + tags; it is a complete argument.

```ts
type Claim = {
  id: ClaimId                           // clm_01HXYZ
  
  // Content
  statement: string                     // normalized statement
  canonical_wording: string             // the cleanest formulation
  alternative_wordings: string[]        // different expressions from various sources
  
  // Toulmin structure
  evidence: ExcerptId[]                 // Data: supporting excerpts
  warrant: FrameId                      // Key: which Frame makes Data → Claim valid
  backing: ClaimId[]                    // deeper claims supporting the warrant
  qualifier: "certain" | "likely" | "presumably" | "tentative"
  rebuttals: ClaimId[]                  // conditions for reversal
  
  // Provenance + voice
  voice: "extracted" | "restated" | "synthesized"
  // extracted: as stated in the original text
  // restated: LLM rephrased but semantically identical
  // synthesized: distilled from multiple sources
  
  // Relationships
  contradicts: ClaimId[]                // claims that contradict this one
  supports: ClaimId[]                   // other claims this claim supports
  refines: ClaimId[]                    // this claim is a refinement of another
  superseded_by?: ClaimId               // replaced by a new claim
  
  // Bayesian confidence + history
  confidence: number                    // 0-1, current value
  confidence_history: [{
    timestamp: ISODate
    value: number
    reason: string                      // "new evidence" / "rebutted by clm_xxx" / "merged"
  }]
  
  // Independence tracing (prevents duplicate evidence from inflating confidence)
  evidence_independence: {
    independent_sources: SourceId[]
    citation_chains: { from: SourceId, cites: SourceId }[]
  }
  
  // Miller: which knowledge structure type does this claim belong to
  structure_type: "taxonomy" | "causal" | "description" | "timeline"
                | "argument" | "content" | "story" | "process" | "relationships"
  
  // Reif: position along the 5 elaboration dimensions
  elaboration: {
    scope: "big_picture" | "intermediate" | "detail"
    importance: "core" | "supporting" | "subsidiary"
    scale: "whole" | "part" | "sub_part"
    generality: "general" | "specific" | "exception"
    context: "wider" | "mid" | "narrow"
  }
  
  // Metadata
  programmes: ProgrammeId[]             // can belong to multiple Programmes (supports Reif's overlapping clusters)
  is_boundary: boolean                  // true = a claim spanning multiple Programmes (source of serendipity)
  status: "active" | "superseded" | "rejected" | "tentative"
  created_at: ISODate
  updated_at: ISODate
  compiled_from: SourceId               // original source
  compiler_version: string              // which version of the extractor
}
```

**Why so many fields**: Every field corresponds to a specific mechanism from Toulmin / Lakatos / Bayesian / Reif. Removing any one of them will break the framework in some incremental scenario. `structure_type` and `elaboration` are new fields contributed by the 5th pillar (Reif+Miller), supporting **precise positioning of the same Claim across different hierarchical levels and perspectives**.

### 3. Frame (Viewfinder)

A perspective for viewing the world — the origin of the product's name.

```ts
type Frame = {
  id: FrameId                           // frm_01HXYZ
  name: string                          // "Complementary Learning Systems"
  
  // Core definition (from Li Jigang + cognitive science)
  sees: string                          // what this frame makes visible
  ignores: string                       // what it deliberately ignores
  assumptions: string[]                 // what assumptions it is built on
  useful_when: string[]                 // when it is applicable
  failure_modes: string[]               // when it fails
  
  // Provenance
  held_by: string[]                     // who / which discipline holds this frame
  exemplar_claims: ClaimId[]            // representative claims under this frame
  
  // Robustness (how many independent sources hold it + how many claims support it)
  robustness: {
    independent_sources_count: number
    supporting_claims_count: number
    challenging_claims_count: number
  }
  
  // Relationships
  related_frames: FrameId[]
  contradicts_frames: FrameId[]
  refines: FrameId[]
  challenges: AnomalyId[]               // counterexamples that challenge this frame
  
  // Miller: the structure type this frame is best suited to express (optional)
  preferred_structure: StructureType | null
  
  // Metadata
  programmes: ProgrammeId[]
  created_at: ISODate
  updated_at: ISODate
  compiled_from: SourceId
}
```

**Why Frame is not a special case of Entity**: A Frame is "a perspective for viewing the world"; an Entity is "a thing being viewed." A company can **be viewed through many frames** — an economics frame sees P/E ratio, a culture frame sees organizational climate, an engineering frame sees tech debt. Frame and Entity do not overlap.

**Why Frame is Toulmin's Warrant**: A Warrant is "the inferential license that takes Data to Claim." A Frame is precisely this license — it provides the rationale for "why this Data can derive this Claim."

### 4. Question (IBIS + Strong Inference)

An open inquiry question. The true center of lens.

```ts
type Question = {
  id: QuestionId                        // q_01HXYZ
  text: string                          // "How should humans position themselves in the AI era?"
  
  // Hierarchy
  parent_question?: QuestionId          // root question
  sub_questions: QuestionId[]           // derived second-order / third-order questions
  
  // Strong Inference enhancement
  alternative_hypotheses: ClaimId[]     // mutually exclusive candidate answers
  discriminating_evidence?: string      // criteria that can distinguish between them
  
  // Status
  status: "open" | "tentative_answer" | "resolved" | "superseded"
  current_position?: string             // current best judgment
  supporting_claims: ClaimId[]
  opposing_claims: ClaimId[]
  open_threads: string[]                // unanswered sub-threads
  
  // Metadata
  programmes: ProgrammeId[]
  created_at: ISODate
  updated_at: ISODate
}
```

**4 status values**:
- `open`: no answer at all
- `tentative_answer`: has candidate answers but insufficient evidence
- `resolved`: a high-confidence answer
- `superseded`: the question itself has been overturned by new understanding ("asked the wrong question")

### 5. ConceptAnatomy (Concept Dissection, Unique to Li Jigang)

An 8-layer deep concept dissection — triggered on demand, not a default ingest output.

```ts
type ConceptAnatomy = {
  id: ConceptAnatomyId                  // ca_01HXYZ
  concept: string                       // the concept being dissected
  
  // 8 layers (from ljg-learn)
  layers: {
    history: string                     // evolutionary history
    dialectic: string                   // dialectical opposite
    phenomena: string                   // real-world manifestations
    language: string                    // etymology and semantics
    form: string                        // structural morphology
    existence: string                   // ontological status
    aesthetics: string                  // poetic dimension
    meta: string                        // meta-reflection
  }
  
  crystallized_insight: string          // single insight distilled from all 8 layers
  related_frames: FrameId[]             // associated frames
  related_claims: ClaimId[]             // associated claims
  
  // Metadata
  programmes: ProgrammeId[]
  created_at: ISODate
  compiled_from: SourceId
  compiler_version: string
}
```

**Why it is an independent type**: The 8-layer structure is schema-enforced — the LLM must fill all 8 layers. This differs from the free-form nature of Frame/Claim. It is lens's **most distinctive differentiating feature** from all existing products.

---

## Compilation Lifecycle: How an Excerpt Becomes "Understanding"

```
Step -1: Auto-check (growing sources only; skipped for immutable sources)
  Trigger: when any lens CLI command is invoked, checks the state/last_global_check timestamp
  Condition: elapsed time > staleness_threshold (default 5 minutes)
  Action:
    - Quick stat of mtime for all known growing sources
    - Identify those with changed mtime (< 50ms for ~50 sources)
    - For each changed source:
      a. Copy current raw file to raw/src_XXX/<timestamp>.{ext}
      b. Compute new content_fingerprint (head/tail/total hash)
      c. Compare old vs new fingerprint:
         - total_hash same → no_change, update last_checked_at
         - head_hash same + total_hash different → append, proceed to Step 0
         - head_hash different → divergence, proceed to Step 0b
  Result:
    - The original CLI command returns immediately (does not wait for compile)
    - Incremental compile runs in the background
    - Updates state/last_global_check.json

Step 0: Source Creation / Incremental Alignment
  Scenario a: New immutable source (`lens ingest <url|file>`)
    - Create Source object
    - Copy raw to raw/src_XXX/current.{ext}
    - Run the extractor corresponding to the source type (Defuddle / Marker / ...)
    - Produce canonical markdown
  Scenario b: New growing source (first time)
    - Same as above, + set up growth_state + external_id
  Scenario c: Existing growing source, append increment
    - Do not re-compile everything
    - Only execute Step 1 and beyond for new turns
  Scenario d: Existing growing source, divergence
    - Save old snapshot to history
    - Replace current with new version
    - Identify which Excerpts point to disappeared turns → mark superseded
    - Identify orphaned claims (all evidence from disappeared turns) → mark orphaned
    - Re-compile the entire new version (since everything after the fork point may differ)
    - Step 9's dedup phase will attempt auto-recovery of orphans

Step 1: Excerpt Ingestion
  Source: canonical content produced by Step 0
  Action: slice the original text; each meaningful segment becomes an Excerpt
  State: raw + provenance

Step 2: Programme Attribution
  Question: which Programme does this Excerpt belong to?
  Action: LLM compares Excerpt content against existing Programmes' relevance
  Result: assigned to one or more Programmes
  Special case: if it matches none, goes to Inbox awaiting clustering

Step 3: Identify Knowledge Structure Type (Miller)
  Question: which of the 9 structures (or which combination) organizes this Excerpt?
  Action: LLM determines taxonomy / causal / description / timeline /
                argument / content / story / process / relationships
  Result: structure_type field, used for the extraction strategy in subsequent Step 4

Step 4: Extract Claims (Toulmin-ize)
  Question: what can we assert based on this Excerpt?
  Action: LLM extracts Claims (statement + evidence link + qualifier)
  Constraints:
    - voice must be "extracted" or "restated"
    - must have evidence (i.e., this Excerpt itself)
    - warrant must point to an existing Frame, or be marked "new frame needed"
    - select the corresponding extraction prompt based on Step 3's structure_type

Step 5: Position on Elaboration Dimensions (Reif)
  Question: where does this Claim sit along the 5 elaboration dimensions?
  Action: LLM determines scope / importance / scale / generality / context
  Result: elaboration field, used for dimension-based filtering in `lens show`

Step 6: Extract Frames
  Question: what viewfinder does this Excerpt use to see the world?
  Action: LLM identifies sees / ignores / assumptions
  Special cases:
    - If it is an existing Frame → increase robustness
    - If it is a new Frame → create and assign to the Programme's Belt

Step 7: Extract Questions
  Question: what open questions does this Excerpt raise?
  Action: LLM identifies "unanswered questions," adds them to the Open Questions tree
  Special case: if close to an existing Question, attach as a sub-question

Step 8: Dedup (Semantic Deduplication + Orphan Auto-recovery)
  Question: is the new Claim substantively a duplicate of an existing Claim?
  Action: layered dedup pipeline
    - Phase 1: embedding similarity (top-k candidates, including status: orphaned ones)
    - Phase 2: LLM verification (confirm whether it is the same assertion)
  Result:
    - Is duplicate → MERGE (add evidence, update confidence)
    - Is new → CREATE
    - Is contradiction → proceed to Step 9
  Orphan auto-recovery (special handling after Step 0d):
    - If dedup candidates include an orphaned claim and it matches the new claim
    - → Merge the orphan's confidence_history into the new claim
    - → Change old orphan's status from "orphaned" to "superseded"
    - → Point old orphan's superseded_by to the new claim
    - → Transparent to the user, history preserved

Step 9: Conflict Detection (Anomaly Detection)
  Question: does the new Claim contradict an existing Claim?
  Action: LLM compares statements + frames
  Result:
    - Consistent → Bayesian update increases existing Claim's confidence
    - Contradictory → added to Anomalies queue, not auto-resolved
    - Orthogonal → no action

Step 10: Bayesian Update
  Question: how should the new Excerpt change the confidence of all related Claims?
  Action: consider evidence_independence, recalculate for related Claims
  Result: confidence adjusted + written to confidence_history

Step 11: Boundary Detection (Reif: overlapping clusters)
  Question: does this Claim simultaneously belong to multiple Programmes?
  Action: scan related Programmes; if it hits >= 2, mark is_boundary: true
  Value: Boundary Claims are a source of cross-Programme serendipity

Step 12: Programme Health Check (periodic, not run every time)
  Question: is this Programme progressive or degenerative?
  Action: check anomaly trend, hard core age, open questions growth
  Result: report to the human, may trigger a suggestion to revise the hard core
```

Every step has clear input/output and can be engineered. Every step corresponds to a specific research action.

---

## Incremental Compilation: Handling 6 Scenarios

The real-world usage pattern of lens is **continuous ingest**: an article today, another a few days later, with differing stances and overlapping viewpoints. Here is how 6 cases are handled:

### Scenario 1: New Article Contains Already-Known Facts (Duplication/Confirmation)

- Semantic-level dedup triggers MERGE
- New Excerpt is added to the existing Claim's evidence list
- Bayesian update increases confidence
- No new Claim is created
- **Key**: awareness of evidence_independence — when 5 articles cite the same source, it counts as only 1 independent piece of evidence

### Scenario 2: New Article Contradicts Known Facts

- Contradiction detected
- New Claim is created (does not overwrite the old one)
- Bidirectional contradicts markers set
- Added to Anomaly queue
- **Never auto-resolved** — handed to a human or agent for explicit resolution

4 types of Anomaly resolution:
- **Context dependent**: both sides are correct, but under different conditions → add qualifier
- **One side rebutted**: one side has stronger evidence → marked rebutted but preserved
- **Both tentative**: insufficient evidence on both sides → both marked tentative
- **Synthesis**: a new Claim is created synthesizing both sides → supersedes both

### Scenario 3: New Article Adds New Dimensions to an Existing Entity

- Multiple Claims are all related to the same subject
- Entities do not need to be predefined — they **emerge** from Claim aggregation
- When querying an entity, all related Claims are aggregated in real time
- **Avoids mem0's entity table duplication problem**

### Scenario 4: New Article Answers an Existing Open Question

- System finds related questions in the Programme's open_questions
- If found, updates status: open → tentative_answer
- Adds supporting_claims
- Will not auto-close — needs more evidence to resolve

### Scenario 5: New Article Raises New Questions

- New Question is identified
- Find parent question (if close to an existing question, attach as sub_question)
- Question tree grows naturally
- This is Li Jigang's "second-order / third-order questions keep extending"

### Scenario 6: New Article Is in an Entirely New Domain (Programme Boundary)

- Does not match any existing Programme
- Goes to Inbox Programme
- After accumulating to a threshold, the system **proposes** (does not create) a new Programme
- User confirms, then migration occurs

---

## Three Truly Hard Sub-problems

### Hard Problem 1: Reliability of Semantic-level Dedup

**Layered dedup pipeline**:

```
Level 1: Exact match (fingerprint + string normalization)
  → Hit: merge
  → Miss: proceed to Level 2

Level 2: Embedding similarity (top-k retrieval)
  → cosine > 0.95: highly likely duplicate, proceed to Level 3
  → cosine 0.7-0.95: ambiguous candidate, proceed to Level 3
  → cosine < 0.7: not a duplicate

Level 3: LLM verification (only for ambiguous cases)
  → Give LLM both claims + evidence
  → Output: same / supports / contradicts / orthogonal / refines
  → Structured judgment rather than free text

Level 4: Uncertain → review queue (human decides)
```

Cost: on average 1-2 LLM calls per new claim. Affordable at the Haiku tier.

### Hard Problem 2: Claim Granularity

**Using Toulmin structure + qualifier field to constrain granularity**:

- Each Claim is a Toulmin unit — one statement + warrant + qualifier
- The qualifier field carries conditionality: `"in conditions Y"` instead of splitting into multiple claims
- The rebuttals field carries exceptions
- Genuinely opposing positions → two claims with `contradicts` link
- Special cases → two claims with `refines` link

### Hard Problem 3: Cross-Programme Content

**All entities have a `programmes: ProgrammeId[]` field** — an Excerpt can contribute to multiple Programmes, a Claim can belong to multiple Programmes. There is no physical data duplication; Programme views are generated by filtering at query time.

---

## Edge Cases

### Edge Case 1: A Programme Should Split or Merge

As content accumulates, "AI Memory Systems" might need to split into "Conversational Memory" and "Knowledge Compilation." This is a meta decision; **lens should not do it automatically**.

Provided operations:
```bash
lens programme split <id> --into <new1> <new2> --rationale "..."
lens programme merge <id1> <id2> --rationale "..."
```

The system helps propose Claim/Frame assignments; the human makes the final decision.

### Edge Case 2: Hard Core Is Repeatedly Challenged (Kuhn Crisis)

If a Hard Core Frame is challenged by 5+ Anomalies, the system escalates:

```
$ lens programme show <id>
⚠️  CRISIS WARNING: Hard Core under sustained challenge
   frame_001 has 5 anomalies in last 30 days
```

lens **will not** automatically modify the hard core — it explicitly reminds "your foundation may need to change." This is the engineering realization of Kuhn's "crisis → revolution."

### Edge Case 3: The Same Claim Has Different Status Across Programmes

A Claim's status is **per-programme**, not global. The same Claim can have different epistemic fates in different Programmes. This reflects "the same fact has different relevance and credibility under different inquiry contexts."

---

## How This Spine Fundamentally Differs from Existing Products

| Dimension | Existing Products | lens |
|---|---|---|
| Meta-structure | Folders / tags / namespaces | **Programme** (Lakatos Research Programme) |
| Claim structure | Flat statement + tags | **Complete Toulmin** (statement + evidence + warrant + qualifier + rebuttal) |
| Contradiction handling | Later writes overwrite earlier / silent | **Anomaly queue + explicit resolve** |
| Confidence | Static number / none | **Bayesian update + history** |
| Counterexample accumulation | Not tracked | **Kuhn crisis warning** |
| Progress assessment | Not assessed | **Lakatos health check** |
| Recompilation | Not supported | **Supported from day 1** |

**lens is not "building a better KB" — it is the first time serious scientific epistemology has been engineered into a daily-driver tool**.

---

## Supplementary Theories: Other Traditions That Extend the Spine

Beyond the main 4 traditions, the following theories reinforce lens's design intuitions from different angles. They are not core components of the spine, but each solves a specific engineering problem. Full citations are in [references.md](./references.md).

### Klein's Data-Frame Theory of Sensemaking

[Klein, Moon & Hoffman, "Making Sense of Sensemaking" *IEEE Intelligent Systems* 2006](https://ieeexplore.ieee.org/document/1667948)

A theory distilled from real high-pressure decision-making environments such as military intelligence, emergency medicine, and firefighting command:

- Humans **understand data through frames**, not by processing information directly
- Data either fits into a frame or breaks a frame
- 6 sensemaking activities: notice / frame / reframe / question / elaborate / compare

**Specific implications for lens**:
- Compilation lifecycle Step 4 (Extract Frames) = Klein's "framing"
- Steps 6-7 (dedup + conflict detection) = Klein's "elaborate" and "reframe"
- The entire compile flow is an engineering implementation of the sensemaking cycle
- **Klein's theory explains why Frame must be a first-class object** — this is how the human brain works

### Laudan's Problems-as-Units

[Laudan, *Progress and its Problems* (UC Press, 1977)](https://en.wikipedia.org/wiki/Larry_Laudan)

The fundamental unit of science is not the theory; **it is the problem**. A theory's quality is determined by how many problems it solves.

- **Empirical problems**: explaining specific phenomena
- **Conceptual problems**: compatibility with other theories, internal consistency
- **Anomalous problems**: specific counterexamples the theory cannot explain

**Specific implications for lens**: Directly supports lens making **Question the center** (not Claim). A Programme's "health" is not the number of Claims or their confidence, but how many **Questions it has solved and raised**.

### Quine's Web of Belief

[Quine, "Two Dogmas of Empiricism" (1951)](https://en.wikipedia.org/wiki/Two_Dogmas_of_Empiricism)

Beliefs form a web; there are no atomic beliefs. Modifying any part sends ripples through its surroundings.

**Specific implications for lens**:
- The supports / contradicts / refines relationships between Claims are not decorations; they are core structure
- Modifying one Claim must propagate confidence changes to adjacent Claims
- This is the raison d'etre of lens's confidence_history

### Argyris's Double-Loop Learning

[Chris Argyris — Double-loop learning](https://en.wikipedia.org/wiki/Double-loop_learning)

- **Single-loop learning**: adjusting actions to better achieve established goals
- **Double-loop learning**: adjusting the goals themselves and the mental models driving them

**Specific implications for lens**:
- Single-loop = adding Claims within an existing Frame
- Double-loop = **modifying the Frame itself** when Anomalies accumulate
- lens's Programme Health Check monitors "whether double-loop learning is needed"

### Peirce's Inference to the Best Explanation (Abduction)

[Charles Sanders Peirce — Abduction](https://plato.stanford.edu/entries/abduction/)

The default cognitive mode of humans (and LLMs) is neither deduction nor induction, but **abduction** — given evidence, inferring the hypothesis that is the "best explanation."

**Specific implications for lens**:
- The compilation process is inherently abductive: inferring Claims/Frames from Excerpts
- LLMs are abductive engines, and lens's design should align with this nature
- But abduction is prone to hallucination ("best" does not necessarily mean "correct") — this is why lens enforces the voice field and evidence chains

### Adversarial Collaboration (Late Kahneman)

Two researchers with opposing viewpoints **pre-commit** to running a joint experiment, forcing epistemic honesty.

**Specific implications for lens**:
- Li Jigang's "roundtable" is the LLM version of this idea — summoning multiple Frames to weigh in on a single Question
- Points of disagreement are **genuine tensions**, not misunderstandings
- The ljg-roundtable operator in v0.5 should implement this

### Nanopublications (Mons et al.)

[nanopub.org](http://nanopub.org/) — Decomposing scientific papers into the smallest citable units of assertion + provenance.

**Specific implications for lens**: lens's Claim + Excerpt + provenance model is spiritually aligned with nanopub — the **smallest traceable cognitive unit** is the product's atomic primitive.

### Cochrane Systematic Review Methodology

[Cochrane Handbook](https://training.cochrane.org/handbook) — A mature methodology for medical evidence synthesis.

**Specific implications for lens**:
- The `evidence_independence` field directly borrows Cochrane's logic for handling "same primary data, different papers"
- When 5 papers cite the same source, it counts as only 1 independent piece of evidence, avoiding falsely high confidence

### SECI Model (Nonaka)

[Nonaka — SECI](https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions)

The spiral between tacit and explicit knowledge: Socialization → Externalization → Combination → Internalization.

**Specific implications for lens**: lens primarily performs Externalization (humans/agents converting tacit understanding into explicit Claims) and Combination (synthesizing multiple explicit Claims). lens does not do Socialization and Internalization — those are the responsibilities of humans and agents themselves.

---

## Relationship with Biological Memory Theories

lens's design is also inspired by neuroscience of the past 30 years; see the "III. Cognitive Science" section of [references.md](./references.md) for details. In brief:

- **CLS Dual-Speed Theory** (McClelland 1995) — suggests lens could have a fast/slow dual layer (cut from v0, but evolutionary space is preserved)
- **Hippocampal pattern separation** (Yassa & Stark 2011) — inspires lens's dedup to perform semantic-level "differentiation"
- **Hippocampal sharp-wave ripples offline replay** (Buzsaki 2015) — the inspiration for Programme Health Check
- **Reconsolidation** (Nader 2000) — insight: a read can also be an occasion for a write
- **Schacter constructive memory** — directly supports lens having the LLM perform reconstruction rather than returning raw text chunks
- **Tolman-Eichenbaum Machine** (Whittington 2020) — demonstrates that frames/viewfinders are first-class neural representations of relational structure
- **Sparse Distributed Memory** (Kanerva 1988) + **Modern Hopfield = Attention** (Ramsauer 2020; Bricken 2021) — LLM attention has biological-style associative memory built in; lens should not compete with it but complement it

---

## Validation: Comparison with Li Jigang's Actual Workflow

| Li Jigang's Actual Practice | Corresponding Element in the Spine |
|---|---|
| "The ontology exists but can only be seen through projections of viewfinders" | Ontological assumption of the Hard Core |
| "Collect as many viewfinders as possible" | Increasing Frames in the Protective Belt |
| "Separate opinions from myself as much as possible" | Frame's held_by + refutability |
| "A better viewfinder can critique mine — break then rebuild" | Anomaly triggers Hard Core revision |
| "Find the three most fundamental generators" | Rank reduction = finding the Programme's Hard Core |
| "BS formula" as the foundation | Formal basis of Bayesian update |
| "How should humans position themselves in the AI era" as the root question | Programme's root question |
| "Second-order, third-order questions keep extending" | Hierarchical structure of Open Questions |
| "Roundtable discussions to increase information density" | Adversarial collaboration of multiple Frames on a single Question |
| "Have the model read first; read the original only for beautifully structured thinking" | Compilation lifecycle Steps 1-3 |
| "Feed is fate — strictly control input" | Programme's Excerpt curation |

A perfect match — Li Jigang's entire practice is a concrete embodiment of Lakatos + Popper + Bayesian + Toulmin.

---

## Compile Prompt Drafts (Starting Point, Will Iterate)

Below are drafts of the two most critical prompts in the compile pipeline. **These are not final versions** — implementation requires iterative prompt tuning + testing with real content + iteration. But as a starting point, they are better than starting from scratch.

### Claim Extraction Prompt (Step 4)

```
You are a knowledge compiler. Given an excerpt from a source document, extract
structured claims (verifiable assertions).

INPUT:
- Excerpt text (verbatim quote from source)
- Source metadata (title, authors, type)
- Existing Programme context (if available): current Hard Core frames, existing claims

OUTPUT FORMAT (JSON array):
[
  {
    "statement": "A clear, concise, falsifiable assertion",
    "canonical_wording": "The most precise formulation of this claim",
    "alternative_wordings": ["other ways this is stated in the text"],
    "qualifier": "certain | likely | presumably | tentative",
    "voice": "extracted | restated",
    "structure_type": "taxonomy | causal | description | timeline | argument | content | story | process | relationships",
    "elaboration": {
      "scope": "big_picture | intermediate | detail",
      "importance": "core | supporting | subsidiary",
      "scale": "whole | part | sub_part",
      "generality": "general | specific | exception",
      "context": "wider | mid | narrow"
    },
    "evidence_quote": "The exact text span that supports this claim",
    "warrant_description": "What frame or reasoning connects the evidence to this claim",
    "potential_rebuttals": ["conditions under which this claim would be false"]
  }
]

RULES:
1. Every claim MUST have evidence_quote — a verbatim span from the excerpt.
   If you cannot point to specific text, do not create the claim.
2. Prefer fewer, higher-quality claims over many weak ones.
   A good extraction produces 2-5 claims from a typical 300-word excerpt.
3. voice = "extracted" if the claim uses the source's own words.
   voice = "restated" if you reformulated for clarity.
4. qualifier reflects the source's confidence, not yours.
   If the source says "we prove that X", qualifier = "certain".
   If the source says "this suggests X", qualifier = "presumably".
5. structure_type: what structural pattern does this claim use?
   "causal" = X causes Y. "argument" = premises lead to conclusion.
   "taxonomy" = X is classified as Y. "timeline" = X happened then Y.
6. Do NOT extract:
   - Background knowledge the source assumes (e.g. "Neural networks use backpropagation")
   - Meta-statements about the paper itself (e.g. "In section 3 we discuss...")
   - Claims without any evidence in the excerpt
```

### Frame Extraction Prompt (Step 6)

```
You are a knowledge compiler. Given an excerpt and its extracted claims,
identify the intellectual FRAME (perspective / lens) through which the
source views the world.

A Frame is NOT a topic. It is a way of seeing — what it makes visible,
what it deliberately ignores, and what assumptions it requires.

INPUT:
- Excerpt text
- Claims already extracted from this excerpt
- Existing frames in the Programme (to check if this is a known frame)

OUTPUT FORMAT (JSON, or null if no new frame):
{
  "name": "Short descriptive name (3-6 words)",
  "sees": "What this frame makes visible / emphasizes",
  "ignores": "What this frame deliberately leaves out",
  "assumptions": ["Assumption 1", "Assumption 2", ...],
  "useful_when": ["Situation where this frame helps"],
  "failure_modes": ["Situation where this frame misleads"],
  "held_by": ["Person, school, or discipline that uses this frame"],
  "is_existing_frame": "frm_XXX (if matches an existing frame, null if new)"
}

RULES:
1. Most excerpts do NOT introduce a new frame. Return null if the excerpt
   operates within an already-known frame in the Programme.
2. A frame is new only if it has a genuinely different sees/ignores combination
   from all existing frames.
3. "sees" and "ignores" should be complementary — what you see is defined
   by what you choose not to see.
4. held_by should be specific: "Demis Hassabis", "neuroscience community",
   "Austrian economics" — not "some researchers".
```

### Programme Attribution Prompt (Step 2)

```
You are a knowledge compiler. Given an excerpt and a list of existing
Programmes (with their titles, descriptions, and Hard Core frames),
decide which Programme(s) this excerpt belongs to. If none match, return "inbox".

INPUT:
- Excerpt text (first 500 chars)
- List of Programmes: [{id, title, description, hard_core_frame_names}]

OUTPUT FORMAT (JSON):
{
  "programme_ids": ["pgm_XXX"] or ["inbox"],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this excerpt fits here"
}

RULES:
1. An excerpt can belong to multiple Programmes if it's genuinely relevant to both.
2. Prefer existing Programmes over "inbox" — the threshold should be low.
3. If confidence < 0.3 for all Programmes, return "inbox".
```

**Note**: These prompts are formatted for Claude Sonnet 4.5/4.6. Actual implementation will require:
- Wrapping JSON output in `<tool_use>` or Anthropic's structured output API
- Adding few-shot examples (2-3 real examples per prompt)
- Adding system prompt constraints on token length and format

Detailed prompt engineering will be iterated during Phase 3 implementation; **this is just a starting point**.

---

## Core Constraints for Engineering Implementation

Prerequisites for the entire mechanism to work:

1. **Semantic dedup must be reliable** — this is the heaviest LLM call, but also the most critical
2. **Anomalies are never auto-resolved** — handing to humans is a feature, not a bug
3. **Confidence must be traceable** — every update is written to history
4. **Hard core must be explicitly modified** — the system only warns, never auto-modifies
5. **Programme split/merge must be explicit** — the system only proposes, never auto-executes
6. **Recompilation mechanism must work from day 1** — the schema will evolve

## Cost Estimates for Engineering Implementation

- One article on average → 10-20 Claim candidates
- 1-2 LLM calls per Claim for dedup + conflict detection
- One article total ≈ 30 LLM calls
- Using Haiku/Gemini Flash: ~$0.02/article
- Using full Sonnet: ~$0.30/article

A clear "compile budget" configuration is needed — letting users decide how expensive a model to use for compiling each article.

---

## What This Spine Does **Not** Promise

For honesty:

- ❌ **Does not promise automatic correctness** — the system will not self-correct when LLM extraction is wrong
- ❌ **Does not promise zero noise** — dedup will miss, granularity will be wrong
- ❌ **Does not promise to replace human judgment** — anomaly resolution, Programme creation, Hard Core revision all require humans
- ❌ **Does not promise zero cost** — every ingest incurs LLM call fees
- ❌ **Does not promise universality** — poor performance in domains not amenable to structured thinking (art appreciation, personal emotions)

But it does promise:

- ✅ **Traceable** — every epistemic decision has history
- ✅ **Auditable** — any Claim can be traced back to the original text
- ✅ **Recompilable** — the entire system can be re-processed when the schema is upgraded
- ✅ **Multi-perspective coexistence** — different Frames need not be forcibly reconciled
- ✅ **Truly long-term** — Programmes spanning 6 months, 1 year, 5 years can all evolve gracefully

---

## References

The full citation list (approximately 120 independent sources, organized by topic) is in [references.md](./references.md).

Core sources directly cited in this methodology.md:

**Methodological spine (5 traditions)**:
- Imre Lakatos, *The Methodology of Scientific Research Programmes* (1978)
- **Frederick Reif**, *Applying Cognitive Science to Education*, MIT Press (2010), Chapter 9
- **Francis Miller**, *Organising Knowledge with Multi-level Content* (2018)
- Karl Popper, *The Logic of Scientific Discovery* (1934/1959) + *Objective Knowledge* (1972)
- Stephen Toulmin, *The Uses of Argument* (1958)
- Bayesian Epistemology — Stanford Encyclopedia of Philosophy

**Supplementary traditions**:
- Thomas Kuhn, *The Structure of Scientific Revolutions* (1962)
- John Platt, "Strong Inference" *Science* (1964)
- Larry Laudan, *Progress and its Problems* (1977)
- Klein, Moon & Hoffman, "Making Sense of Sensemaking" *IEEE Intelligent Systems* (2006)
- Walton, Reed & Macagno, *Argumentation Schemes* (Cambridge UP, 2008)
- Karl Weick, *Sensemaking in Organizations* (1995)
- W.V.O. Quine, "Two Dogmas of Empiricism" (1951)
- Chris Argyris, Double-Loop Learning
- Ikujiro Nonaka, SECI Model
- Charles Sanders Peirce, Inference to the Best Explanation
- Daniel Kahneman, Adversarial Collaboration
- Mons et al, Nanopublications
- Cochrane Collaboration, Systematic Review Methodology

**Biological foundations**:
- McClelland, McNaughton & O'Reilly (1995), "Why there are complementary learning systems"
- Whittington et al. (2020), "The Tolman-Eichenbaum Machine" *Cell*
- Buzsaki (2015), "Hippocampal sharp wave-ripple"
- Schacter & Addis (2012), "Constructive memory"
- Nader et al. (2000), "Fear memories require protein synthesis... for reconsolidation" *Nature*
- Kanerva (1988), *Sparse Distributed Memory*
- Ramsauer et al. (2020), "Hopfield Networks is All You Need"
- Bricken & Pehlevan (2021), "Attention Approximates Sparse Distributed Memory"

**Direct inspiration**:
- Andrej Karpathy, [LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) (2026-04-04)
- Li Jigang, [ljg-skills](https://github.com/lijigang/ljg-skills) + E45 Meng Yan's conversation with Li Jigang transcript

Full publication details, links, and specific connections to lens design for each entry are in [references.md](./references.md).
