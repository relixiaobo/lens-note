# Lens Roadmap

Date: 2026-04-12
Version: 3.0

---

## v0.1 — Core Loop ✅ COMPLETE

Validated LLM extraction quality. 6 types (Source, Claim, Frame, Question, Programme, Thread). CLI-only. Compilation Agent with pi-agent-core.

## v0.2 — Zettelkasten Redesign ✅ COMPLETE

Simplified to 3 types (Source, Note, Task). Links as only structure. Agent redesigned as "thinker" that explores existing knowledge before creating notes.

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

## v1.0.4 — Agent Mode (2026-04-13)

- Added `--stdin` mode: JSON request envelope bypasses shell escaping for all commands
- Added `--file` flag for `lens write`
- Added `dispatchRequest()` shared layer (CLI + future MCP)
- Removed stale v0.2 field references across all docs

## v1.0.5 — Task + Thread Removal (2026-04-13)

- Added Task type (`status: open|done`) for human-agent collaboration
- Added `lens tasks` command
- Added `conversation` source_type
- Removed Thread type (conversations are now Sources)
- Rewritten README (173 → 80 lines)
- Removed 961 test data files from repo

## Future

- Embedding-based semantic search (for >2000 notes)
- MCP server (thin wrapper around --stdin dispatch for agent hosts that prefer MCP)
- PDF extraction
- Session import (Claude Code / ChatGPT conversation export → Source)
- Multi-device sync documentation (iCloud/Dropbox for markdown files)

## Non-Goals

- Cloud-hosted lens (local-first, always)
- GUI as core product (CLI is the product; GUI is optional consumer)
- Built-in LLM (agents provide intelligence)
- Full project management (tasks are lightweight collaboration, not Jira)
- Categories, tags, folders (links only)
