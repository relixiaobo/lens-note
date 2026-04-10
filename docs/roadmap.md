# Lens Roadmap

Date: 2026-04-09
Version: `1.1`

This document defines the **phased implementation plan** for lens. Each phase has a clear scope, exit criteria, users, and dependencies.

- `positioning.md` defines **what** lens is
- `architecture.md` defines **how** lens is built
- **This document** defines **in what order** lens is built

---

## Overall Principles

1. **Each phase must be self-contained**: it can be used independently, even without subsequent phases
2. **Each phase must have a usable exit**: users can use it for real work
3. **Scope can only shrink, not grow**: unplanned features go to the backlog, not into the current phase (note: RSS/digest/scope were added to v0.1 because they emerged as natural extensions of the core loop, not scope creep)
4. **Do a retrospective at the end of each phase**: identify wrong assumptions and adjust for the next phase

---

## v0.1 — Core Loop (True MVP) ✅ COMPLETE

**Status**: ✅ COMPLETE (6 commits, TypeScript zero errors, tested with real articles and RSS feeds)

**Core validation goal**: **Can an LLM extract structured Claims / Frames / Questions from real text that users trust?**

If extraction quality is not trustworthy, everything that follows (Programmes, Anomalies, Knowledge Maps) is meaningless. v0.1 builds the minimal closed loop to answer this question.

### What Was Actually Built vs What Was Planned

**Scope changes during implementation**:
- **Removed**: Tauri GUI, lens-ui, lens-tauri packages — v0.1 is **CLI-only**. GUI deferred to v0.2.
- **Removed**: Excerpt as a separate type — evidence is stored **inline in Claims**. Source file has full text.
- **Added**: Thread type (`thr_` prefix) for conversational threads
- **Added**: RSS feed support (`lens feed add/import/list/check/remove`) with feedsmith + OPML import + autodiscovery
- **Added**: Digest command (`lens digest [day|week|month|year]`) for temporal views of new insights
- **Added**: Scope-based hierarchy on Claims (`big_picture` vs `detail`) driving 2-level Programme display
- **Added**: `lens context --scope big_picture` for overview-only context packs
- **Simplified**: Distribution is a Bun-compiled single binary (63MB), not npm package

### User Story (Updated)

As an independent researcher **Maya**, I want to:

1. Feed 3 AI memory-related web articles I recently read to lens via CLI
2. View the compiled Claims / Frames / Questions via `lens show` and `lens programme show`
3. See these items organized into an "AI Memory Systems" Programme with 2-level display (Overview + Details)
4. Use the `lens context` command to pull relevant understanding as context for agents
5. Subscribe to RSS feeds and get a daily digest of new insights

**Acceptance criteria**: Maya can complete steps 1-4 within 30 minutes using CLI commands.

### Scope (As Built)

**What was built**:

- **CLI-only** (Bun-compiled single binary, 63MB)
- **Ingest for 3 immutable source types**:
  - `web_article` (via Defuddle + Turndown → markdown)
  - `markdown` / `plain_text` (pass-through)
  - `manual_note`
- **Compilation Agent**:
  - Agent-driven extraction using pi-agent-core + pi-ai (Claude Sonnet 4.6)
  - Programme assignment (agent explores existing Programmes + Inbox fallback)
  - Claim extraction (Toulmin core fields: statement / evidence / qualifier + scope)
  - Frame extraction (sees / ignores / assumptions)
  - Question extraction
  - Evidence stored inline in Claims (no separate Excerpt type)
- **6 object types**: Source, Claim, Frame, Question, Programme, Thread
- **Scope-based hierarchy**: Claims have `big_picture` or `detail` scope (Reif/Miller + Minto Pyramid)
- **RSS feed pipeline**: feedsmith for parsing, OPML import, website autodiscovery, feed check + compile
- **Digest**: Temporal views (today / week / month / year) of new insights, tensions, perspectives
- **SQLite FTS5 search** (bun:sqlite built-in, no N-API needed)
- **File-as-Truth storage**: Markdown files = truth, SQLite = derived cache (rebuildable)
- **CLI commands** (all support `--json`):
  - `lens init` (first-time setup)
  - `lens ingest <url|file>` (fetch + compile)
  - `lens note "<text>"` (quick note)
  - `lens show <id>` (show any object with context)
  - `lens search "<query>"` (FTS5 full-text search)
  - `lens context "<query>"` (agent-ready JSON context pack)
  - `lens context "<query>" --scope big_picture` (overview only)
  - `lens programme list` / `lens programme show <id>` (2-level display)
  - `lens digest [day|week|month|year]` (temporal views)
  - `lens feed add|import|list|check|remove` (RSS management)
  - `lens status` (system status)
  - `lens rebuild-index` (rebuild SQLite cache from files)
- **Agent Skill**: `skills/lens.claude-skill.md`

**Explicitly not done** (deferred):

- ❌ Tauri GUI / desktop app (v0.2)
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
- ❌ npm distribution (using Bun-compiled binary instead)

### Implementation Tasks (in dependency order) — All ✅ COMPLETE

#### Phase 0: Extraction Spike ✅ COMPLETE

```
0.1 LLM Extraction Quality Spike ✅ COMPLETE
    What: Standalone TS script, take 5 real articles, test Claude's structured extraction quality
    Result: Extraction quality validated. Toulmin core fields stable. Miller structure_type and Reif
            elaboration dimensions kept as optional/simplified. scope field (big_picture/detail) added
            based on Minto Pyramid research.
```

#### Phase 1: Foundation ✅ COMPLETE

```
1.1 Validate sidecar bundling approach ✅ COMPLETE
    Result: bun:sqlite replaces better-sqlite3 (Bun built-in, no N-API needed). 63MB binary, all deps work.

1.2 Monorepo scaffold ✅ COMPLETE
    Result: pnpm workspace created. Only lens-core package built (lens-ui/lens-tauri deferred to v0.2).

1.3 TypeScript type definitions ✅ COMPLETE
    Result: 6 object types defined in types.ts: Source, Claim, Frame, Question, Programme, Thread.
            Excerpt removed (evidence inline in Claims). Thread added. tsc --noEmit passes with zero errors.

1.4 Storage layer (storage.ts) ✅ COMPLETE
    Result: File-as-Truth + SQLite derived cache. bun:sqlite FTS5 + links table. gray-matter for
            YAML frontmatter. paths.ts for file path resolution.

1.5 Minimal CLI framework ✅ COMPLETE
    Result: CLI dispatcher in commands.ts + init, note, show, status, rebuild-index commands.

1.6 Tauri IPC integration — SKIPPED (GUI deferred to v0.2)
1.7 Minimal GUI Reader view — SKIPPED (GUI deferred to v0.2)
```

#### Phase 2: Extraction Pipeline ✅ COMPLETE

```
2.1 Web article extraction (Defuddle + Turndown) ✅ COMPLETE
    Result: Defuddle + linkedom extracts clean HTML, Turndown converts to markdown.
            `lens ingest https://...` → Source created with full text.

2.2 Markdown / plain_text ingestion ✅ COMPLETE
    Result: `lens ingest notes.md` → Source created.

2.3 GUI Reader view refinement — SKIPPED (GUI deferred to v0.2)
```

#### Phase 3: Compilation Agent ✅ COMPLETE

```
3.1 pi-agent-core integration ✅ COMPLETE
    Result: @mariozechner/pi-agent-core integrated. Agent uses pi's built-in tools (read, grep, ls, bash).

3.2 Compilation Agent system prompt + workflow ✅ COMPLETE
    Result: Agent reads source, explores existing ~/.lens/ knowledge, extracts Claims/Frames/Questions
            with scope field (big_picture/detail). Outputs structured JSON.

3.3 Agent output processing ✅ COMPLETE
    Result: process-output.ts: ULID generation, zod validation, .md file writing, SQLite cache update.

3.4 Programme assignment ✅ COMPLETE
    Result: Agent checks existing Programmes, assigns to matching Programme or creates new one.

3.5 GUI Claim Detail + Programme Dashboard — SKIPPED (GUI deferred to v0.2)
    Note: CLI equivalents built: `lens programme show <id>` with 2-level display (Overview + Details).
```

#### Phase 4: Search + Context + Polish ✅ COMPLETE

```
4.1 FTS5 full-text search ✅ COMPLETE
    Result: `lens search "hopfield"` returns relevant results via bun:sqlite FTS5.

4.2 `lens context <query>` command ✅ COMPLETE
    Result: Agent-ready JSON context pack. Supports --scope big_picture for overview-only output.

4.3 GUI search — SKIPPED (GUI deferred to v0.2)
4.4 Settings UI + Welcome / Onboarding — SKIPPED (GUI deferred to v0.2)

4.5 Error handling + CLI polish ✅ COMPLETE
    Result: User-friendly error messages for common errors.

4.6 macOS release build ✅ COMPLETE (CLI binary only)
    Result: `bun build --compile` → dist/lens (63MB single binary). No DMG (no GUI yet).

4.7 Dogfooding + validation ✅ COMPLETE
    Result: Tested with real articles and RSS feeds.
```

#### Phase 4b: Additional Features (Added During Implementation) ✅ COMPLETE

```
4b.1 RSS feed support ✅ COMPLETE
    What: Subscribe to RSS/Atom/RDF/JSON feeds, auto-discover from website URLs, OPML import
    Result: feedsmith for parsing. lens feed add/import/list/check/remove commands.
            feed-store.ts for subscription storage (feeds.json), feed-checker.ts for polling.

4b.2 Digest command ✅ COMPLETE
    What: Temporal views of new insights, tensions, perspectives
    Result: `lens digest [day|week|month|year]` — today's new insights by default.

4b.3 Scope-based hierarchy ✅ COMPLETE
    What: Claims have big_picture or detail scope. Programme show uses 2-level display.
    Result: Based on Reif/Miller + Minto Pyramid. `lens context --scope big_picture` for overview.
```

#### Task Dependency Graph (As Executed)

```
Phase 0 (Spike) ✅
  0.1 → informed schema decisions

Phase 1 (Foundation) ✅
  1.1 → 1.2 → 1.3 → 1.4 → 1.5
  (1.6, 1.7 skipped — GUI deferred)

Phase 2 (Extraction) ✅       Phase 3 (Compilation Agent) ✅
  2.1 ─┐                        3.1 → 3.2 → 3.3 → 3.4
  2.2 ─┘                        (3.5 skipped — CLI equivalent built)

Phase 4 (Search + Polish) ✅   Phase 4b (Added Features) ✅
  4.1 → 4.2                     4b.1 (RSS feeds)
  4.5 → 4.6 → 4.7               4b.2 (Digest)
  (4.3, 4.4 skipped — GUI)      4b.3 (Scope hierarchy)
```

### Exit Criteria (v0.1 Retrospective)

**Functional criteria**:
- [x] Tested with real articles and RSS feeds — no critical bugs
- [x] Core user story completable via CLI commands
- [x] All CLI commands support `--json` for agent consumption
- [ ] macOS DMG is installable — N/A (CLI binary only, GUI deferred)
- [x] Documentation reflects current implementation (this update)

**LLM extraction quality criteria** (v0.1's core validation goal):
- [x] Claim statement accuracy validated via spike + dogfooding
- [x] Toulmin core fields (statement / evidence / qualifier) reliably populated
- [x] Frame sees/ignores/assumptions quality validated in practice
- [ ] Users willing to further reason based on compiled Claims — pending alpha users

**What we learned**:
- GUI was unnecessary for v0.1 validation — CLI was sufficient to validate extraction quality
- RSS feeds + digest provided natural "input pipeline" that made dogfooding much more practical
- scope-based hierarchy (big_picture/detail) dramatically improved Programme readability
- Excerpt as a separate type added complexity without value — evidence inline in Claims is simpler
- Thread type was needed as a natural container for conversational flows

### Risks and Mitigations (Retrospective)

| Risk | Outcome |
|---|---|
| **LLM extraction quality is unstable** | **Mitigated** — spike validated quality. Simplified schema (removed unstable fields). scope field added. |
| Bun compile + N-API incompatibility | **Mitigated** — bun:sqlite is built-in, no N-API needed. 63MB binary works. |
| Tauri 2 plugin has a blocker | **Deferred** — GUI moved to v0.2, risk no longer applies to v0.1. |
| First-time user cognitive overload | **Mitigated** — CLI-only keeps it simple. `lens init` handles setup. |
| API cost exceeds expectations | **Low** — Anthropic Claude Sonnet 4.6 costs manageable for current volume. |

---

## v0.2 — GUI + Intelligence + Visual Layer + Growing Sources

**Goal**: lens gets a complete GUI (Tauri 2 desktop app), visual layer (Knowledge Maps), can handle conversation-type sources, can detect contradictions, and is ready for 20-50 beta users.

v0.2 absorbs features deferred from v0.1 (marked with ⬆️), plus new features from the original v0.2.

### User Story

As an independent writer **Chen**:

1. I've been using lens for a month, with 50 Sources and 3 Programmes
2. I want to **see my knowledge in a GUI** — not just CLI output
3. I want to import ChatGPT discussions and Claude Code sessions into lens
4. I want to see a **panoramic view** of Programmes (Knowledge Maps)
5. I want to discover contradictions between two articles and make a decision
6. I want to use **ConceptAnatomy to dissect** the concept of "emergence"

**Acceptance criteria**: Chen can complete the above 6 steps through purely visual navigation.

### Scope

**Moved in from v0.1** ⬆️:

- ⬆️ **Tauri 2 desktop app** (macOS first) — lens-ui (React 19) + lens-tauri (Rust IPC shell)
- ⬆️ **GUI views**: Welcome/Onboarding, Programme Dashboard, Reader, Claim Detail, Settings
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
