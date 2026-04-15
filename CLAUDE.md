# CLAUDE.md

## Project Overview

**lens** is a knowledge graph CLI for humans and agents. Like Git for knowledge — stores, queries, and links. No API keys, no LLM dependencies.

**Status**: v1.9.0. **Methodology**: Collision Method — Spark → Collide → Crystallize.

**Key docs**: `docs/product-vision.md`, `docs/product-evolution.md`, `docs/task-design.md`, `docs/tool-redesign-v2.md`.

## Ecosystem

| Project | Path | What it does |
|---------|------|-------------|
| **lens** (this repo) | `packages/lens-core/` | Core CLI, npm package `lens-note` |
| **lens-note-plugin** | `../lens-note-plugin/` | Claude Code plugin wrapping lens as skills (`/lens:save`, `/lens:recall`, etc.) |
| **lens-clipper** | `../lens-clipper/` | Chrome extension for web capture into lens (pre-dev) |

Changes to data model or commands affect all three. See Change Protocol below.

## Tool Design Principles

Every CLI command is a tool an LLM will call. Design accordingly:

1. **Atomic over composite** — Each tool does one thing. Let the agent compose pipelines: `search` → `show` → `write`.
2. **Filter at the source** — `--rel`, `--direction`, `--since` are cheaper than making the agent parse and filter. An LLM filtering JSON wastes tokens and introduces errors.
3. **Few tools, rich parameters** — Prefer adding a flag to an existing command over creating a new command.
4. **Idempotent writes** — Re-running the same write should be safe. Return `"unchanged"`, not error.
5. **Batch-friendly** — Support arrays and multi-ID inputs. Every avoided call = faster agent loop.
6. **Errors guide next action** — Include `"hint"` telling the agent what to do next.
7. **Names are the first prompt** — If the model can't guess what the tool does from the name alone, rename it. No two commands should be synonyms.
8. **Document composition patterns** — Atomic tools need documented pipelines:
   - **Link audit**: `links --rel related` → `show <targets>` → `write retype`
   - **Duplicate merge**: `similar` → `show <pair>` → `write merge`
   - **MOC expansion**: `links --rel indexes` → `search` → `write link`
   - **Quality check**: `lint` → `links <offender>` → `write unlink/retype`
9. **Preserve graph invariants** — Multi-object writes must maintain: `contradicts` bidirectional, no self-links, no dangling `[[ID]]` refs, no orphaned reverse links.
10. **Stable JSON envelope** (target, not yet fully implemented) — All `--json` output should use `{"ok": bool, "data": {...}, "error"?: {...}, "hint"?: "..."}`. Never change field names or types without a version bump. Currently: deprecation errors follow this format; success responses still use bare payloads.

## Development

```bash
pnpm install
npx tsx packages/lens-core/src/main.ts <cmd>    # Dev mode
cd packages/lens-core && npm test               # Run tests
npx tsc --noEmit --project packages/lens-core/tsconfig.json  # Type check
cd packages/lens-core && npx tsup && npm publish --access public  # Publish
```

## Change Protocol

### When modifying the data model (`types.ts`)

```bash
grep -rn 'ObjectType\|NoteLink\|LinkRel\|TaskStatus\|SourceType\|LensObject' \
  packages/lens-core/src/ --include='*.ts' | grep -v node_modules
```

Downstream references (this repo):
- `README.md` — Commands, Data Model
- `docs/product-vision.md` — Data Model table

Downstream references (other repos):
- `../lens-note-plugin/plugin/skills/lens/SKILL.md` — Commands, Write API Reference
- `../lens-note-plugin/plugin/skills/lens/references/` — note-fields.md, tasks.md, compilation.md, curation.md
- `../lens-clipper/CLAUDE.md` — Data model for annotations

### When modifying commands or flags

- `README.md` — Commands section
- `--stdin` dispatch in `commands.ts` — must mirror CLI command changes
- `main.ts` help text — must list all current commands
- `../lens-note-plugin/plugin/skills/lens/SKILL.md` — Command reference

### Publish checklist

Bump versions and push in order:

1. **lens-note (npm)**: `packages/lens-core/package.json` version + `main.ts` version string → `tsup` → `npm publish`
2. **lens-note-plugin**: `plugin/.claude-plugin/plugin.json` version + `marketplace.json` version → `git push`
3. **Local install**: `npm install -g lens-note@latest` → verify `lens --version`

## Style

- Field names: `snake_case`, Type names: `PascalCase`
- ID format: `<prefix>_<ULID>`, prefixes: `src`, `note`, `task`
- **All project artifacts in English**: code, comments, commits, docs, CLI output
