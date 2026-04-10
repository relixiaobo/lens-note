# CLAUDE.md

## Project Overview

**lens** is a structured cognition compiler — it compiles articles, notes, and conversations into structured Claims (Toulmin-structured assertions), Frames (perspectives), and Questions (open inquiries), organized into Programmes (Lakatos research programmes). Two equal users: humans (GUI) and agents (CLI).

**Status**: Design docs complete. Ready for v0.1 implementation. Run extraction spike first.

## Architecture Summary

```
lens.app (Tauri 2)
├── lens-tauri (Rust)         — Thin IPC shell, sidecar lifecycle
├── lens-ui (React 19)        — GUI views (Reader, Programme Dashboard, Claim Detail, Settings)
└── lens-core (Bun-compiled)  — All business logic, CLI, Compilation Agent, LLM calls
```

Storage: **Markdown files = source of truth**, SQLite = derived cache (rebuildable via `lens rebuild-index`).

## Tech Stack — What Each Piece Does

| Technology | Package | Purpose |
|---|---|---|
| **Tauri 2** | `lens-tauri` | Desktop app shell. Rust handles IPC, sidecar management, OS integration. We write minimal Rust. |
| **React 19** | `lens-ui` | GUI frontend. Renders inside Tauri's WebView. |
| **Vite** | `lens-ui` | Frontend dev server and build tool. Tauri's recommended bundler. |
| **TypeScript 5.5** | all packages | Type safety across the entire codebase. Strict mode. |
| **Tailwind CSS 4** | `lens-ui` | Utility-first styling. "Clean Paper" design system. |
| **Zustand** | `lens-ui` | Lightweight state management (4KB). Replaces Redux. |
| **shadcn/ui** | `lens-ui` | Accessible UI components built on Radix UI primitives. |
| **TipTap + ProseMirror** | `lens-ui` | Rich text editor for Claim/Frame editing and Source reading. |
| **Bun** | `lens-core` | Compiles TypeScript to single native binary (`bun build --compile`). Fast startup (~50ms). |
| **pi-ai** (`@mariozechner/pi-ai`) | `lens-core` | Unified LLM API. Wraps 20+ providers (Anthropic, OpenAI, etc). Tool calling, streaming, cost tracking. v0.1 uses Anthropic only. |
| **pi-agent-core** (`@mariozechner/pi-agent-core`) | `lens-core` | Agent runtime for document compilation. Each ingest spawns a short-lived agent with read/grep/ls/bash tools. |
| **bun:sqlite** | `lens-core` | Bun's built-in SQLite binding (replaces better-sqlite3). Powers the derived cache (FTS5 full-text search, relation index). No N-API needed. |
| **sqlite-vec** | `lens-core` | SQLite extension for vector similarity search. v0.2 only. |
| **Defuddle + linkedom** | `lens-core` | Web article extraction. Strips ads/nav, produces clean markdown. Better than Mozilla Readability. |
| **gray-matter** | `lens-core` | Parses YAML frontmatter from markdown files (our source of truth format). |
| **ulid** | `lens-core` | Generates time-sortable unique IDs (e.g. `clm_01HXY2K8WJ...`). |
| **zod** | `lens-core` | Runtime schema validation for objects read from files or LLM output. |
| **pnpm** | root | Monorepo workspace manager. 3 packages: lens-core, lens-ui, lens-tauri. |

## Monorepo Structure

```
lens/
├── CLAUDE.md              # This file
├── docs/                   # Design documents
│   ├── positioning.md      # What lens is (source of truth for product decisions)
│   ├── architecture.md     # How lens is built (tech stack, components)
│   ├── methodology.md      # How lens thinks (5 traditions, compile lifecycle)
│   ├── schema.md           # Data types (source of truth for code)
│   ├── source-pipeline.md  # How lens ingests data
│   ├── roadmap.md          # Build order (v0.1 → v1.0)
│   ├── references.md       # ~120 academic/product references
│   ├── getting-started.md  # Onboarding for new agents/developers
│   └── launch-post-draft.md
├── spike/                  # Pre-product validation
│   ├── extraction-spike.ts # LLM extraction quality test (run BEFORE product code)
│   └── README.md
├── skills/                 # Agent integration
│   └── lens.claude-skill.md  # Claude Code Skill definition
├── packages/
│   ├── lens-core/          # Bun-compiled TS: CLI + Compilation Agent + LLM + storage
│   ├── lens-ui/            # React 19 + Tauri frontend
│   └── lens-tauri/         # Rust shell (thin IPC layer)
├── tests/
└── scripts/
```

## Key Design Decisions

1. **File-as-Truth**: Markdown files with lean YAML frontmatter (≤20 lines) are the source of truth. SQLite is a derived cache that can be rebuilt. Reason: iCloud sync compatibility + data liberation.
2. **CLI is the agent interface**: All commands support `--json`. No MCP server in v0.1. Agents use bash to call `lens context/search/show/note`.
3. **pi-ai over direct Anthropic SDK**: Unified provider interface. v0.1 uses Anthropic, v0.2 adds OpenAI/Gemini with zero code change.
4. **Compilation Agent over fixed pipeline**: Each document ingest spawns a short-lived Compilation Agent (via pi-agent-core) that autonomously reads the source, explores existing knowledge, and extracts Claims/Frames/Questions. The agent uses pi's built-in tools (read, grep, ls, bash) — no custom tools. Agent outputs structured JSON; lens-core processes it (ULID generation, schema validation, file writing, cache update).
5. **No redundancy in files**: Claim body contains LLM-generated explanation, NOT copies of evidence text. Evidence inlining happens at query time via `lens context --json`.

## Document Priority (on conflict)

```
schema.md     wins over  methodology.md    (schema = executable constraint)
architecture.md  wins over  roadmap.md     (architecture = tech decisions)
positioning.md   wins over  everything     (positioning = product truth)
```

## Current v0.1 Scope

**Core validation goal**: Can an LLM extract structured Claims/Frames/Questions that users trust?

- 3 immutable source types: `web_article` (Defuddle), `markdown/plain_text`, `manual_note`
- Compilation Agent reads source, explores existing knowledge, extracts Claims/Frames/Questions
- GUI: Welcome + Programme Dashboard + Reader + Claim Detail + Settings
- CLI: `lens init/ingest/note/context/show/search/programme/status` (all support `--json`)
- Search: SQLite FTS5 only (no embedding/vector until v0.2)
- Distribution: `npm install -g lens-cli`

**Not in v0.1**: PDF, chat ingest, growing sources, auto-check, Bayesian updates, anomaly detection, embedding, Knowledge Maps, ConceptAnatomy, MCP server, multi-provider.

## Development Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start full Tauri dev environment
pnpm typecheck            # TypeCheck all packages
pnpm test                 # Run all tests
pnpm lint                 # ESLint + Biome
pnpm build:sidecar        # Compile lens-core to binary
pnpm build:ui             # Compile React frontend
pnpm build:app            # Compile Tauri app (macOS DMG)
```

## Before Modifying Code

1. Check which package you're modifying: `lens-core` / `lens-ui` / `lens-tauri`
2. Check which roadmap phase the change belongs to (see `docs/roadmap.md`)
3. If changing schema: update `docs/schema.md` first (it's the source of truth)
4. If changing Compilation Agent: read `docs/methodology.md` § Compilation Lifecycle
5. If changing source ingest: read `docs/source-pipeline.md`
6. Frontmatter for any object must stay ≤ 20 lines YAML. If it exceeds this, the schema needs simplification.

## Language Rules

- **Reply to the user in Chinese (中文)**. The user's working language is Chinese. All conversational responses, explanations, questions, and status updates must be in Chinese.
- **All project artifacts in English**: code, code comments, commit messages, documentation (docs/*.md), CLI output, error messages, variable/function/type names, YAML frontmatter fields, log messages.
- In short: talk to the human in Chinese, write to the codebase in English.

## Style and Conventions

- Field names: `snake_case` (`confidence_history`, `structure_type`)
- Enum values: `snake_case` (`"big_picture"`, `"not_started"`)
- Type names: `PascalCase` (`Claim`, `FrameId`)
- ID format: `<prefix>_<ULID>` (e.g. `clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z`)
- ID prefixes: `pgm` (Programme), `src` (Source), `exc` (Excerpt), `clm` (Claim), `frm` (Frame), `q` (Question)
