# Lens Roadmap

Date: 2026-04-12
Version: 3.0

---

## v0.1 — Core Loop ✅ COMPLETE

Validated LLM extraction quality. 6 types (Source, Claim, Frame, Question, Programme, Thread). CLI-only. Compilation Agent with pi-agent-core.

## v0.2 — Zettelkasten Redesign ✅ COMPLETE

Simplified to 3 types (Source, Note, Thread). Links as only structure. Agent redesigned as "thinker" that explores existing knowledge before creating notes.

## v0.3 — Infrastructure Pivot ✅ COMPLETE

**The defining change.** Removed all LLM dependencies. lens became pure infrastructure:

- Deleted: compilation-agent.ts, process-output.ts, converse.ts, curate.ts
- Removed: pi-agent-core, pi-ai, @anthropic-ai/sdk, typebox (-164 packages)
- Added: `lens write` (unified write API), `lens fetch` (web extraction)
- Added: `lens health` (graph metrics)
- CJK-native search
- Skill file as primary "application logic"
- Result: zero LLM, zero API key, 5 core commands, any agent can use

**Key insight**: The calling agent IS the LLM. lens doesn't need its own.

## v0.4 — Polish + Distribution (NEXT)

- [ ] `lens status --json` include health metrics (merge status + health)
- [ ] `lens show --json` include forward + backward links in output
- [ ] Error envelope consistency across all commands
- [ ] Batch atomicity (transaction rollback on validation failure)
- [ ] `brew install lens` / `npm install -g lens-cli` distribution
- [ ] Comprehensive skill files for multiple platforms (Claude Code, Cursor, generic)
- [ ] End-to-end test suite
- [ ] Build + publish compiled binary for macOS (arm64 + x86_64) and Linux

## v0.5 — Scale + Search

- [ ] Embedding-based semantic search (for >2000 notes)
- [ ] `lens similar <id>` — find semantically similar notes
- [ ] Performance optimization for large graphs (>10K notes)
- [ ] Feed check improvements (incremental, ETag caching)

## Backlog

- PDF extraction (Marker or similar)
- Audio source type (Whisper transcription)
- Image source type (Vision API)
- Export formats (Obsidian, Notion, LaTeX)
- Browser extension (one-click "save to lens")
- MCP server (thin wrapper around CLI for agent hosts that prefer MCP)
- Multi-device sync documentation (iCloud/Dropbox for markdown files)

## Non-Goals

- ❌ Cloud-hosted lens (local-first, always)
- ❌ GUI as core product (CLI is the product; GUI is optional consumer)
- ❌ Built-in LLM (agents provide intelligence)
- ❌ Task/project management
- ❌ Categories, tags, folders (links only)
