# Lens Roadmap

Date: 2026-04-09
Version: `1.0`

This document defines the **phased implementation plan** for lens. Each phase has a clear scope, exit criteria, users, and dependencies.

- `positioning.md` defines **what** lens is
- `architecture.md` defines **how** lens is built
- **This document** defines **in what order** lens is built

---

## Overall Principles

1. **Each phase must be self-contained**: it can be used independently, even without subsequent phases
2. **Each phase must have a visual exit**: users can "see" something. v0.1 must have a GUI
3. **Scope can only shrink, not grow**: unplanned features go to the backlog, not into the current phase
4. **Do a retrospective at the end of each phase**: identify wrong assumptions and adjust for the next phase

---

## v0.1 — Core Loop (True MVP)

**Core validation goal**: **Can an LLM extract structured Claims / Frames / Questions from real text that users trust?**

If extraction quality is not trustworthy, everything that follows (Programmes, Anomalies, Knowledge Maps) is meaningless. v0.1 only builds the minimal closed loop to answer this question.

### Prerequisite: LLM Extraction Spike

**Before writing any product code**, validate LLM extraction quality with a standalone script (see `spike/extraction-spike.ts`):

- Take 5 real articles (different domains/lengths)
- Test Toulmin field population quality
- Test Miller structure_type classification consistency
- Test Reif elaboration dimension annotation stability
- **Results determine which fields to keep in the schema**: unstable fields are removed from the v0.1 schema or downgraded to optional

### User Story

As an independent researcher **Maya**, I want to:

1. Feed 3 AI memory-related web articles I recently read to lens
2. Browse the compiled Claims / Frames / Questions in lens's GUI
3. See these items organized into an "AI Memory Systems" Programme
4. Use the `lens context` command to pull relevant understanding as context

**Acceptance criteria**: Maya can complete the above 4 steps within 30 minutes.

### Scope

**Must do**:

- **Tauri 2 app shell** (macOS first)
- **CLI and GUI** (`lens` with no arguments opens GUI, with arguments runs CLI)
- **Ingest for 3 immutable source types**:
  - `web_article` (via Defuddle)
  - `markdown` / `plain_text` (pass-through)
  - `manual_note`
- **Compilation Agent**:
  - Agent-driven extraction using pi-agent-core
  - Programme assignment (agent explores existing Programmes + Inbox fallback)
  - Claim extraction (Toulmin core fields: statement / evidence / qualifier)
  - Frame extraction (sees / ignores / assumptions)
  - Question extraction
- **Core GUI views**:
  - **Welcome / Onboarding**: API key configuration + first ingest guidance
  - **Programme Dashboard**: Hard Core / Belt / Questions overview
  - **Reader**: Source reading view + Excerpt highlighting
  - **Claim Detail**: Toulmin structure display
  - **Settings**: API key configuration
- **Minimal search**: SQLite FTS5 full-text search
- **CLI commands** (all commands support `--json`):
  - `lens` (open GUI)
  - `lens init` (first-time configuration)
  - `lens ingest <url|file>` (ingest web_article / markdown / plain_text)
  - `lens note <text>` (quick note)
  - `lens context <query>` (context pack for agents, query-time inline evidence)
  - `lens show <id>` (view any object)
  - `lens search <query>` (search)
  - `lens programme list / show / create`
  - `lens status`
  - `lens rebuild-index` (rebuild SQLite cache from files)
- **Distribution**: `npm install -g lens-cli` (CLI enters PATH, agents can auto-install)
- **Agent Skill**: `skills/lens.claude-skill.md` (Claude Code Skill definition, tells agents how to install and use)
- **LLM extraction quality metrics** (see exit criteria)

**Explicitly not doing** (moved out of old v0.1 scope):

- ❌ PDF extraction / Marker (v0.2, to avoid Python installation friction)
- ❌ Chat conversation ingest / growing sources / auto-check (v0.2)
- ❌ Bayesian confidence numerical updates (v0.2, v0.1 uses LLM one-shot qualifier in four tiers)
- ❌ Contradiction detection / Anomaly Queue / resolution (v0.2)
- ❌ Semantic dedup (v0.2, depends on embedding)
- ❌ Embedding / sqlite-vec / semantic search (v0.2, v0.1 only uses FTS5)
- ❌ Knowledge Maps visualization (v0.2)
- ❌ ConceptAnatomy (v0.2)
- ❌ Programme split / merge / health check (v0.2)
- ❌ Browser extension (v0.3)
- ❌ MCP server (v0.3)
- ❌ Multi LLM provider (v0.2)
- ❌ Mobile (v1.0+)

### Implementation Tasks (in dependency order)

#### Phase 0: Extraction Spike (before product code)

```
0.1 LLM Extraction Quality Spike
    What: Standalone TS script, take 5 real articles, test Claude's structured extraction quality
    Acceptance: Produce a quality report: which fields are stable, which are unstable, recommended v0.1 schema subset
    Dependencies: None
    Important: Results may cause fields in schema.md to be cut or downgraded to optional
```

#### Phase 1: Foundation

```
1.1 Validate sidecar bundling approach
    What: Verify that Bun `bun build --compile` + bun:sqlite + defuddle + pi-ai + pi-agent-core can produce a working binary
    Why do this first: If incompatible, the entire sidecar strategy needs to change (see architecture.md §1.5 fallback plan)
    Acceptance: A compiled binary can successfully use bun:sqlite (FTS5), import all dependencies, and execute
    Result: ✅ VALIDATED — bun:sqlite replaces better-sqlite3 (Bun built-in, no N-API needed). 63MB binary, all deps work.
    Dependencies: None

1.2 Monorepo scaffold
    What: Create pnpm workspace + 3 empty package shells (lens-core / lens-ui / lens-tauri)
    Acceptance: pnpm install succeeds, pnpm dev can launch a Tauri empty window
    Dependencies: 1.1 (need to know the sidecar approach before configuring lens-core build)

1.3 TypeScript type definitions
    What: Translate v0.1 in-scope types from schema.md to types.ts
    Acceptance: tsc --noEmit passes
    Dependencies: 1.2, 0.1 (spike results may affect which fields to keep)

1.4 Storage layer (storage.ts)
    What: Implement ~/.lens/ directory creation + markdown/YAML frontmatter read/write + SQLite FTS5 index
    Acceptance: Can create ~/.lens/, can write a Source markdown file, can query it from SQLite
    Dependencies: 1.3

1.5 Minimal CLI framework
    What: CLI dispatcher + `lens init` + `lens note <text>` + `lens show <id>`
    Acceptance: `lens init` creates directory, `lens note "test"` writes Source, `lens show src_XXX` displays content
    Dependencies: 1.4

1.6 Tauri IPC integration
    What: Rust IPC handlers can call lens-core sidecar, React can display results
    Acceptance: Click button in GUI → call sidecar → return result → display in React
    Dependencies: 1.2, 1.5

1.7 Minimal GUI Reader view
    What: React Reader view, can display a Source's canonical markdown
    Acceptance: Create a Source via CLI → can view its content in GUI
    Dependencies: 1.6
```

#### Phase 2: Extraction Pipeline

```
2.1 Web article extraction (Defuddle)
    What: Integrate defuddle/node + linkedom
    Acceptance: `lens ingest https://...` → Source created, readable in GUI
    Dependencies: Phase 1
    Reference: source-pipeline.md §2.1

2.2 Markdown / plain_text ingestion
    What: pass-through pipeline (copy → normalize → index)
    Acceptance: `lens ingest notes.md` → Source created
    Dependencies: Phase 1

2.3 GUI Reader view refinement
    What: Reader renders markdown (headings/images/code/tables)
    Acceptance: Ingested web article is readable in GUI
    Dependencies: 2.1
```

#### Phase 3: Compilation Agent

```
3.1 pi-agent-core integration
    What: Integrate @mariozechner/pi-agent-core, set up agent loop with pi's built-in tools (read, grep, ls, bash)
    Acceptance: Can spawn an agent that reads a file and produces structured output
    Dependencies: Phase 1

3.2 Compilation Agent system prompt + workflow
    What: Design the agent's system prompt and expected workflow:
          - Read source document
          - Explore existing ~/.lens/ knowledge (grep, lens search --json)
          - Extract Claims (Toulmin), Frames (sees/ignores), Questions
          - Output structured JSON
    Acceptance: Agent processes a test article and outputs valid Claims/Frames/Questions JSON
    Dependencies: 3.1, Phase 2

3.3 Agent output processing
    What: lens-core receives agent's JSON output → generates ULIDs → validates schema (zod) → writes .md files → updates SQLite cache
    Acceptance: Agent extracts from article → markdown files appear in ~/.lens/claims/ etc. → SQLite cache updated
    Dependencies: 3.2

3.4 Programme assignment
    What: Agent checks existing Programmes during exploration, assigns new objects or creates new Programme
    Acceptance: Second related article's Claims auto-assigned to same Programme
    Dependencies: 3.3

3.5 GUI Claim Detail + Programme Dashboard
    What: React views: Claim Toulmin structure + Programme overview
    Acceptance: Can drill into Claims and Programmes in GUI
    Dependencies: 3.3
```

#### Phase 4: Search + Context + Polish

```
4.1 FTS5 full-text search
    What: SQLite FTS5 index for Claims/Sources/Frames text
    Acceptance: `lens search "hopfield"` returns relevant results
    Dependencies: Phase 3

4.2 `lens context <query>` command
    What: Assemble agent-ready context pack
    Acceptance: Output JSON can be used directly with Claude Code
    Dependencies: 4.1

4.3 GUI search
    What: GUI search bar + navigation
    Acceptance: Search in GUI can navigate to results
    Dependencies: 4.1

4.4 Settings UI + Welcome / Onboarding
    What: API key configuration GUI + first-launch guidance
    Acceptance: New users don't need to manually edit config.yaml
    Dependencies: Phase 1

4.5 Error handling + UX polish
    What: User-friendly error messages
    Acceptance: Common errors (network/invalid API key) have clear prompts
    Dependencies: all prior

4.6 macOS release build
    What: Tauri build → DMG
    Acceptance: Double-click to install and use
    Dependencies: all prior

4.7 Dogfooding + validation
    What: 10+ hours of dogfooding
    Acceptance: See exit criteria
    Dependencies: 4.6
```

#### Task Dependency Graph

```
Phase 0 (Spike)
  0.1 (independent, can run in parallel with 1.1)

Phase 1 (Foundation)
  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7
                ↑
              0.1 (affects field selection in 1.3)

Phase 2 (Extraction)        Phase 3 (Compilation Agent)
  2.1 ─┐                      3.1 → 3.2 → 3.3 → 3.4
  2.2 ─┼→ 2.3                            ↓
       ↓                               3.5
  Phase 3 needs Phase 2

Phase 4 (Search + Polish)
  4.1 → 4.2, 4.3
  4.4 (independent)
  4.5 → 4.6 → 4.7
```

### Exit Criteria

**Functional criteria**:
- [ ] 10+ hours of dogfooding with no critical bugs
- [ ] First alpha user can complete Maya's 4-step user story
- [ ] All CLI commands' `--help` is accurate
- [ ] macOS DMG is installable
- [ ] Documentation reflects current implementation

**LLM extraction quality criteria** (v0.1's core validation goal):
- [ ] Claim statement accuracy >= 80% (manual spot-check of 50 items)
- [ ] Toulmin core fields (statement / evidence / qualifier) population completeness >= 90%
- [ ] Frame sees/ignores/assumptions quality rated "useful" by 3 people
- [ ] Users willing to further reason based on compiled Claims (qualitative feedback)

**Security criteria**:
- [ ] Zero critical security issues (`cargo audit` + `npm audit`)

### Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **LLM extraction quality is unstable** | **High** | **Phase 0 spike validates first; simplify schema if quality is insufficient** |
| Bun compile + N-API incompatibility | Medium | Day 1 validation, fallback to esbuild + Node.js |
| Tauri 2 plugin has a blocker | Medium | Run Hello World early to validate critical plugins |
| First-time user cognitive overload | Medium | Simplify onboarding, v0.1 only exposes three concepts: Claim/Frame/Question |
| API cost exceeds expectations | Low | Track token consumption per article, v0.1 scope is small so manageable |

---

## v0.2 — Intelligence + Visual Layer + Growing Sources

**Goal**: lens has a complete visual layer (Knowledge Maps), can handle conversation-type sources, can detect contradictions, and is ready for 20-50 beta users.

v0.2 absorbs features moved out of the original v0.1 (marked with ⬆️), plus new features from the original v0.2.

### User Story

As an independent writer **Chen**:

1. I've been using lens for a month, with 50 Sources and 3 Programmes
2. I want to import ChatGPT discussions and Claude Code sessions into lens
3. I want to see a **panoramic view** of Programmes (Knowledge Maps)
4. I want to discover contradictions between two articles and make a decision
5. I want to use **ConceptAnatomy to dissect** the concept of "emergence"

**Acceptance criteria**: Chen can complete the above 5 steps through purely visual navigation.

### Scope

**Moved in from v0.1** ⬆️:

- ⬆️ **PDF extraction (Marker)**
- ⬆️ **Chat conversation ingest** (ChatGPT / Claude.ai / Claude Code export)
- ⬆️ **Growing source incremental append + divergence handling**
- ⬆️ **Auto-check mechanism** (CLI invocation + GUI timer dual mode)
- ⬆️ **Embedding integration (Voyage AI) + sqlite-vec semantic search**
- ⬆️ **Semantic dedup**
- ⬆️ **Contradiction detection (Anomaly detection) + Anomaly Queue GUI**
- ⬆️ **Bayesian confidence numerical updates + confidence_history**

**New**:

- **Knowledge Map views** (Reif + Miller contributed visualizations — from methodology.md this is "required")
  - Programme Map (radial layout)
  - Claim Graph (directed graph)
  - Frame Landscape
  - Question Tree
- **ConceptAnatomy** full implementation (8-layer dissection)
- **Programme management UI** (create / rename / archive / split / merge)
- **Claim / Frame editor** (inline editing)
- **Anomaly resolution UI**
- **Multi LLM provider** (abstraction layer, supporting OpenAI + Claude)
- **Keyboard shortcuts** (⌘K command palette)
- **Export**: Source / Programme export as markdown

### Explicitly Not Doing

- ❌ Browser extension (v0.3)
- ❌ MCP server (v0.3)
- ❌ Mobile (v1.0+)
- ❌ Multi-device sync UX

### Exit Criteria

- [ ] 20 beta users use it for 2 weeks with no critical bugs
- [ ] Knowledge Map view is smooth with up to 1000 claims (< 500ms render)
- [ ] All v0.1 CLI commands remain compatible
- [ ] Schema migration from v0.1 to v0.2 is seamless (transparent to users)
- [ ] Chat growing source incremental updates remain consistent after 10+ re-ingests

---

## v0.3 — Agent Integration & Browser

**Goal**: lens becomes part of the agent ecosystem while reducing browser ingest friction.

### Scope

**New**:

- **Browser Extension (Chrome / Firefox / Arc / Safari)**
  - One-click "Compile with lens" while reading a web page
  - Highlighted text automatically becomes an Excerpt
  - Calls lens daemon via localhost HTTP
- **MCP Server** (lens-mcp, optional)
  - ~100-line thin wrapper packaging lens CLI as MCP tools
  - For agent hosts that prefer MCP (v0.1's CLI + Skill already covers all agents)
  - Tools: `lens_context` / `lens_search` / `lens_note` / `lens_show`
- **Lens Daemon** (upgraded from v0.1's "ephemeral process" to a persistent service)
  - Starts localhost HTTP server on port 9999
  - Accepts requests from browser extension + MCP server
  - Auto-check scheduler runs persistently (no longer only checks during CLI invocation)
- **Audio source type**
  - macOS Apple Silicon: MLX Whisper (Python sidecar)
  - Other: whisper.cpp sidecar
- **Image source type** (via Claude Vision)
- **PDF scanned** (via Marker `--use_llm` or Tesseract)
- **Local inference mode** (Ollama + nomic-embed, privacy mode)

### Exit Criteria

- [ ] 100+ public beta users
- [ ] Browser extension publishable on Chrome Web Store
- [ ] MCP server works in Claude Code / Cursor
- [ ] Audio ingest quality is usable

---

## v0.4 — Public Launch

**Goal**: Official public release.

### Scope

- **Polish everything**
- **Comprehensive documentation** (lens.xyz/docs)
- **Onboarding video** + screencasts
- **Pricing decision** (open source / commercialization / freemium)
- **Complete website** (lens.xyz)
- **Community** (GitHub Discussions + Discord)

### Exit Criteria

- [ ] 500+ active users
- [ ] < 5% first-launch abandonment rate
- [ ] Someone writes a blog post or tweet recommending lens (organic)

---

## v1.0 — Mobile + Multi-Device

**Goal**: Cross-device + mobile.

### Scope

- **iOS app** (Tauri 2 mobile, reusing React UI)
- **Android app**
- **Multi-device sync** (via iCloud / Dropbox / self-hosted solution)
- **Collaborative Programmes** (multi-user collaboration, v1.0 stretch goal)

---

## Backlog (unassigned phase)

- Programme templates (preset research programme templates)
- Pluggable extractors (third parties can write extractors)
- Local embedding (Ollama + nomic-embed)
- Cross-language support (non-English Claim extraction)
- Cross-Programme knowledge graph view
- LLM cost dashboard
- Export formats (Notion / Roam / Obsidian / LaTeX)
- Cloud sync (if user demand is significant)

---

## Non-Goals (will never do)

- ❌ Cloud-hosted lens (violates local-first core principle)
- ❌ lens becoming a task manager / project manager
- ❌ lens becoming a general-purpose markdown editor (TipTap is used for specific Claim/Frame editing)
- ❌ Dedicated AI chat interface (lens does not replace Claude Code / ChatGPT, it only serves as their memory layer)
- ❌ Social network / public Programme sharing (revisit in v1.5+)
