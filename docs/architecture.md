# Lens Architecture

Date: 2026-04-09
Version: `1.0`

This document defines the **technical architecture** of lens: the technology stack, how components are organized, how processes are divided, and how data flows. It serves as the bridge from design docs (positioning / methodology / schema) to code.

- `positioning.md` defines **what** lens is
- `methodology.md` defines **how** lens thinks
- `schema.md` defines **what lens's data looks like**
- `source-pipeline.md` defines **how lens ingests data**
- **This document** defines **how lens is built**

---

## 0. Core Decision: lens is a Client Application from Day 1

### 0.1 Why a Client is Necessary

The previous plan was "v0.1 CLI only, v0.2 adds Web App." This was **wrong**, with two fatal problems:

1. **Where do users read and view?** — a lens without UI is "writing into a black hole." Users ingest things but can't see them. This violates UX principle 1 (zero required ceremony) and principle 2 (complexity stays inside)
2. **The launch post demo is fake** — all visual descriptions of "Knowledge Map," "Programme health," and "anomaly review" require a client to implement
3. **Pre-launch users cannot experience it** — beta testing cannot proceed

**Reversed decision**: **lens is a complete client application starting from v0.1**, with CLI being a part of it rather than the whole thing.

### 0.2 Choosing the Client Form Factor

Theoretically 6 form factors to choose from:

| Form Factor | Description | Pros | Cons |
|---|---|---|---|
| **Web App (SaaS)** | Cloud-hosted, browser access | Zero install | Violates local-first, requires ops |
| **Local Web App** | CLI starts localhost server | Zero native dependencies | Doesn't feel like an "app", requires a browser tab |
| **PWA** | Installable Web App | Feels like an app | Limited offline storage, no fs access |
| **Electron Desktop** | Chromium + Node | Most mature ecosystem | 200MB, memory hog |
| **Tauri Desktop** | Rust + system WebView | Small, fast, secure | Requires Rust, newer ecosystem |
| **Native Swift/SwiftUI** | Native macOS | Most native feel | Locked into Apple |

**Decision**: **Tauri 2**. See §1 for detailed rationale.

### 0.3 Mobile?

Tauri 2 has supported iOS and Android since 2024-10. lens will consider mobile **after v1.0** (not in v0 scope), but choosing Tauri means a future mobile port only requires a subset of work rather than a rewrite.

---

## 1. Tech Stack Decisions

### 1.1 Desktop framework: **Tauri 2**

[Tauri v2 2024-10 stable release](https://v2.tauri.app/blog/tauri-20/)

**Decision**: Use **Tauri 2**, not Electron.

**Comparison data** ([pkgpulse 2026 comparison](https://www.pkgpulse.com/blog/tauri-vs-electron-vs-neutralino-desktop-apps-javascript-2026)):

| Metric | Electron | Tauri 2 |
|---|---|---|
| Idle memory | ~200 MB | ~30 MB |
| Bundle size | 80-200 MB | 2-10 MB |
| Startup time | 1-2 seconds | < 0.5 seconds |
| Security model | Broad OS/Node access | Allowlist + Rust backend |
| Ecosystem | 115k stars, most mature | 85k stars, fastest growing |
| Mobile (iOS/Android) | ❌ | ✅ (v2) |

**Why Tauri**:

1. **Lens's data is the user's most sensitive content** (chat logs, thoughts) — must use the strictest security model
2. **Startup speed is critical for a "reference tool"** — users looking up context can't wait 2 seconds
3. **Bundle size is an order of magnitude smaller** — 2-10 MB vs 80-200 MB, huge impact on distribution
4. **Future mobile in the same codebase** — no rewrite needed
5. **Memory 30 MB vs 200 MB** — lens is a "background-resident" type tool, memory usage directly affects whether users are willing to keep it running

**Tauri's drawbacks we can accept**:
- **Requires Rust**: We only write minimal Rust for IPC + sidecar management, most logic is in TS
- **Newer ecosystem**: Spacedrive, AppFlowy, Hoppscotch, and Padloc are already using Tauri 2 in production; mature enough for lens's needs
- **Some plugins need to be written ourselves**: The plugins we need (fs, sqlite, process) already exist

### 1.2 Frontend: **React 19 + Vite + TypeScript 5.5**

Based on [2026 Tauri React best practices](https://dev.to/purpledoubled/how-i-built-a-desktop-ai-app-with-tauri-v2-react-19-in-2026-1g47).

**Decisions**:

- **React 19**: Largest ecosystem + our team (including the nodex project) is already using it
- **Vite**: Officially recommended frontend build tool for Tauri, works well together
- **TypeScript 5.5**: strict mode, `bundler` module resolution
- **Tailwind CSS 4**: Fits lens's "Clean Paper" design system (inspired by nodex's design-system.md)
- **Zustand**: State management, lightweight (4KB)
- **shadcn/ui**: Accessible primitives based on Radix UI

**Not using**:
- ❌ **Next.js**: SSR is meaningless for a local app
- ❌ **Redux / MobX**: Zustand is sufficient
- ❌ **Material UI / Ant Design**: Too heavy, design style doesn't match
- ❌ **Emotion / styled-components**: Tailwind CSS is sufficient

### 1.3 Editor: **TipTap + ProseMirror**

Based on [Velt 2026 rich text editor comparison](https://velt.dev/blog/best-rich-text-editors-react-comparison) and [Liveblocks 2025 comparison](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025).

**Decision**: Use **TipTap** (built on ProseMirror).

**Why**:
- TipTap is a **headless editor built on ProseMirror**, providing a DX-friendly API + the full power of ProseMirror
- 1.8M+ monthly npm downloads
- We already use it in nodex, experience transfers
- Supports markdown / HTML / JSON serialization
- Supports custom node types — enables inline rendering of Claim / Frame

**Not using**:
- ❌ **CodeMirror / Monaco**: These are code editors, not document editors
- ❌ **Lexical** (Meta): Relatively new, smaller ecosystem
- ❌ **Quill / Draft.js**: Outdated, superseded by ProseMirror-based editors

### 1.4 Storage: **File-as-Truth + SQLite derived cache**

**Decisions**:

- **Markdown files + lean YAML frontmatter** as source of truth
- **SQLite + FTS5** as derived cache (can be deleted and rebuilt)
- **sqlite-vec** (v0.2) as embedding similarity extension
- **bun:sqlite** as SQLite binding
- **No more `relations.jsonl`** — relationships are written directly in frontmatter ID reference fields

#### Why File-as-Truth Instead of SQLite-as-Truth

This decision went through three rounds of evaluation. We ultimately chose File-as-Truth for the following reasons:

| Consideration | File-as-Truth | SQLite-as-Truth |
|---|---|---|
| **File-level sync (iCloud/Dropbox)** | ✅ Naturally supported, individual files sync independently | ❌ SQLite + WAL files must sync atomically, iCloud doesn't guarantee this → **data corruption risk** |
| **Data liberation** | ✅ User's understanding is plain text, data survives even if lens dies | ❌ Locked in binary format, requires export scripts |
| **Query performance** | ⚠️ Needs SQLite cache assistance | ✅ Natively fast |
| **Schema constraints** | ⚠️ Relies on code validation | ✅ CHECK / NOT NULL / FK |
| **Atomic writes** | ⚠️ Single file writes are atomic (rename), but cross-file writes are not | ✅ Transactions |

**Decisive factor**: lens promises "sync `~/.lens/` via iCloud / Dropbox / Syncthing." SQLite files have real data corruption risk under file-level sync (Obsidian and Logseq both chose individual files for this reason). Data liberation is also part of lens's core promise that "your understanding is yours."

#### Prerequisite: Objects Must Be Simple

File-as-Truth is viable on the premise that **frontmatter stays within 15-20 lines**. This requires:

1. **Cut fields after spike**: Claim reduced from 30+ fields to ~15 required fields (determined by spike results)
2. **Defer complex fields**: `confidence_history` arrays, `evidence_independence`, etc. deferred to v0.2
3. **Inline relationships**: `evidence: [exc_id]`, `programmes: [pgm_id]` written directly in frontmatter, no separate relations file needed

Simplified Claim file example:

```yaml
---
id: clm_01HXY2K8WJ
type: claim
statement: "Modern Hopfield networks have exponential storage capacity"
qualifier: likely
voice: extracted
evidence:
  - exc_01HXY3M9XK
warrant_frame: frm_01HXY4N0YL
programmes:
  - pgm_01HXY5O1ZM
structure_type: causal
created_at: "2026-04-09T14:23:01Z"
compiled_from: src_01HXY6P2AN
---

Modern Hopfield networks, introduced by Krotov and Hopfield (2016),
use higher-order interaction functions that achieve exponential storage
capacity, as demonstrated by Demircigil et al. (2017).
```

This ~15-line frontmatter is fully readable, editable, and Git-diffable.

#### Storage Layout: `~/.lens/`

Every object in lens follows the unified `type/id.md` pattern:

```
~/.lens/
├── programmes/pgm_01HXY.md    # Every object = type/id.md
├── sources/src_01HXY.md        # Source content (frontmatter + full markdown body)
├── excerpts/exc_01ABC.md
├── claims/clm_01DEF.md
├── frames/frm_01GHI.md
├── questions/q_01JKL.md
├── raw/                         # Original files (audit / recompile)
│   ├── src_01HXY.html          #   Web page original HTML
│   ├── src_01DEF.pdf           #   PDF original
│   └── src_01DEF/              #   Extracted assets (figures from PDF)
│       ├── fig1.png
│       └── fig2.png
├── index.sqlite                 # DERIVED CACHE (FTS5 + relations, rebuildable)
└── config.yaml
```

**Storage rules**:
- Every object = `type/id.md` — no exceptions
- Every `.md` = frontmatter + body, same format everywhere
- `raw/` stores original files separately (audit/recompile purpose only)
- `index.sqlite` is derived cache, can be rebuilt from .md files
- No nested directories per source, no `_meta.md` + `content.md` split

#### SQLite as Derived Cache: Its Role

SQLite is not the truth but is still the **primary read path** (same pattern as Obsidian):

```
Write flow: Code → write markdown file (truth) → notify indexer → SQLite cache update
Read flow:  Code → SQLite cache (vast majority of queries go here)
Rebuild:    lens rebuild-index → scan all .md → rebuild SQLite (< a few seconds)
```

**Not dual-write**: Files are the only write target. SQLite updates are best-effort cache refreshes. If an update fails, a dirty flag is set and the index is rebuilt on next startup.

```ts
async function createClaim(claim: Claim) {
  await writeMarkdownFile(`claims/${claim.id}.md`, claim); // truth
  try {
    indexer.updateClaim(claim); // cache, best-effort
  } catch {
    markIndexDirty(); // rebuild on next startup
  }
}
```

#### Why sqlite-vec Instead of Other Vector DBs

Based on [2026 vector DB comparison](https://encore.dev/articles/best-vector-databases):

| Option | Pros | Cons | Choose? |
|---|---|---|---|
| **sqlite-vec** | Vectors + FTS + metadata in the same cache DB | Relatively new | ✅ v0.2 |
| LanceDB | Good for big data | One more engine | ❌ |
| ChromaDB | Simple API | Python dependency | ❌ |

lens's data volume is small (thousands to tens of thousands of records), sqlite-vec is sufficient. v0.1 does not do embedding, v0.2 adds it.

### 1.5 CLI + Sidecar: **Bun or Node.js binary**

[Tauri sidecar docs](https://v2.tauri.app/develop/sidecar/)

Lens's core CLI logic is TypeScript (because defuddle / linkedom are from the Node ecosystem). Inside the Tauri app we need to **bundle the TS code as a sidecar**, so the Rust layer can invoke it.

**Decision**: Use **Bun** to bundle TS into a single binary.

**Why Bun instead of pkg or nexe**:
- Bun's `bun build --compile` produces a single binary ([Bun docs](https://bun.sh/docs/bundler/executables))
- 5-10x faster startup than Node
- Built-in TypeScript, no extra compilation step needed
- Includes node API + most of the npm ecosystem
- Clearly matured in 2025-2026

**UNVALIDATED ASSUMPTION**: Bun `bun build --compile` compatibility with `bun:sqlite` (C++ native addon) and `sqlite-vec` **has not been verified**. `bun:sqlite` is an N-API native module, and Bun's N-API support improved in 2025-2026 but is not 100%.

**Fallback plans** (by priority):
1. **esbuild bundle + Node.js standalone**: Use esbuild to bundle TS into a single JS file, use `pkg` (Vercel) or `vercel/ncc` to produce a cross-platform binary, requires bundled Node.js runtime (~50MB)
2. **Direct Node.js**: Don't bundle into a binary, require users to install Node.js 18+, lens-core as an npm global package. 200-300ms slower startup but best compatibility
3. **Deno compile**: Deno's `deno compile` can also produce a single binary, but npm ecosystem compatibility is uncertain

**The very first task on Week 1 Day 1** is to verify whether `bun build --compile` + `bun:sqlite` + `defuddle` can produce a working binary. If not, **immediately switch to Fallback 1**, don't waste time debugging Bun's native module compatibility.

### 1.6 PDF Extraction: **Marker (Python sidecar)**

Confirmed. Marker is a Python package, requiring the user to `pip install marker-pdf` themselves, or lens bundles it via a Python sidecar.

**v0.1 decision**: **User installs** Marker themselves, lens detects it in PATH. v0.2 will consider bundling (using PyInstaller to compile marker into a binary, paired with Tauri sidecar).

### 1.7 Web Extraction: **Defuddle (Node sidecar)**

Confirmed. Bundled as part of the Node sidecar (packaged together with lens CLI into the Bun binary).

### 1.8 Audio Transcription (v0.3): **MLX Whisper / whisper.cpp**

Implementation deferred to v0.3, but decisions locked in now:
- macOS Apple Silicon: **MLX Whisper** (Python sidecar)
- Other platforms: **whisper.cpp** (C++ sidecar)

### 1.9 LLM API: **pi-ai (unified multi-provider interface)**

[pi-mono](https://github.com/badlogic/pi-mono) — MIT open-source monorepo, by Mario Zechner

**Decision**: Use **`@mariozechner/pi-ai`** as the LLM invocation layer, not depending directly on `@anthropic-ai/sdk`.

**What is pi-ai**: A unified multi-LLM provider API supporting 20+ providers (Anthropic / OpenAI / Google / Mistral / Bedrock / Azure / xAI / Groq / OpenRouter / any OpenAI-compatible endpoint). Provides `stream()` / `complete()` interfaces with built-in tool calling (TypeBox schema), prompt caching, streaming, and cost/token tracking.

**Why pi-ai instead of using @anthropic-ai/sdk directly**:

| | Direct @anthropic-ai/sdk | pi-ai |
|---|---|---|
| v0.1 | ✅ Works | ✅ Works (Anthropic provider) |
| v0.2 multi-provider | ❌ Need to build abstraction layer ourselves | ✅ Already has 20+ providers, zero-code switching |
| Tool calling | Need to manually construct JSON schema | TypeBox schema + automatic validation |
| Cost tracking | Need to implement ourselves | Built-in token/cost tracking |
| Streaming | Need to handle manually | Unified streaming interface |
| Maintenance burden | Only need to follow one SDK | One dependency covers all providers |

**v0.1 usage**: Configure only the Anthropic provider, use `complete()` + tool calling for structured extraction. Claim/Frame/Question schemas are defined as TypeBox tool schemas, letting the LLM output structured data via tool calls (more reliable than prompt + JSON parse).

### 1.9.1 Agent Runtime: **pi-agent-core**

From the same [pi-mono](https://github.com/badlogic/pi-mono) monorepo as pi-ai.

**Decision**: Use `@mariozechner/pi-agent-core` for the Compilation Agent that processes each ingested document.

**What it provides**:
- Agent loop (tool call → execute → feed result → repeat)
- Built-in tools: `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`
- Sequential and parallel tool execution
- beforeToolCall / afterToolCall hooks (for cost tracking, loop limits)
- Abort handling

**Why use it**: Each document ingested into lens is processed by a Compilation Agent — a short-lived agent that reads the source, explores existing lens knowledge, and extracts new Claims/Frames/Questions. This requires an agent loop, not a single LLM call. pi-agent-core provides exactly this, and its built-in tools (read, grep, bash, ls) are sufficient — no custom tools needed.

**The agent uses pi's built-in tools to**:
- `read` source markdown files and existing Claims/Frames
- `grep` for related content across ~/.lens/
- `ls` to explore directory structure
- `bash` to run `lens search --json` and `lens programme list --json`

**The agent does NOT write files directly**. It outputs structured JSON (Claims/Frames/Questions). lens-core processes this output: generates ULIDs, validates schema, writes markdown files, updates SQLite cache.

**Previous decision reversed**:
- ~~❌ `pi-agent-core` — lens doesn't need an agent loop, only single LLM calls~~ → Now used for the Compilation Agent (see §2.2 and §2.4 for details)
- ❌ `pi-coding-agent` — completely different product
- ❌ `pi-tui` — lens uses Tauri GUI

### 1.10 Embeddings: **Voyage AI**

**Decision**: v0.1 uses **Voyage AI** as the default embedding provider (voyage-3-large or better).

**Reasons**:
- Anthropic recommends Voyage as a pairing with Claude
- Quality significantly better than OpenAI ada-2 (see Voyage official benchmarks)
- Has a free tier available (50M tokens/month)

**Fallback**: OpenAI text-embedding-3-large; local (Ollama) as v0.3 privacy mode.

---

## 2. Component Architecture

### 2.1 Process Model

Lens is a **Tauri 2 desktop app** with the following processes at runtime:

```
┌─────────────────────────────────────────────────────────────┐
│  lens.app (Tauri main window)                                │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Rust Layer (src-tauri/)                               │  │
│  │  ───────────────────                                   │  │
│  │  - Main process (Tauri runtime)                        │  │
│  │  - IPC command handlers                                │  │
│  │  - Sidecar lifecycle management                        │  │
│  │  - Fs operations (allowlisted)                         │  │
│  │  - Global shortcuts, menu bar, system tray             │  │
│  └───────────────────────────────────────────────────────┘  │
│           │                          │                        │
│           │ (IPC)                    │ (stdio)                │
│           ▼                          ▼                        │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │  React Frontend     │   │  lens-core Sidecar           │ │
│  │  ─────────────      │   │  (Bun-compiled TS binary)    │ │
│  │  WebView            │   │  ────────────────            │ │
│  │  (WKWebView/        │   │  - Compilation Agent         │ │
│  │   WebView2)         │   │    (pi-agent-core)           │ │
│  │                     │   │  - Extractors (Defuddle,     │ │
│  │  - Reader View      │   │    Marker invocation)        │ │
│  │  - Programme View   │   │  - LLM / Embedding calls     │ │
│  │  - Knowledge Maps   │   │  - SQLite index updates      │ │
│  │  - Anomaly queue    │   │  - File read/write           │ │
│  │  - Settings         │   │  - Exposes CLI interface     │ │
│  └─────────────────────┘   └──────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  ~/.lens/        │
                          │  Markdown files  │
                          │  + index.sqlite  │
                          └─────────────────┘
```

### 2.2 Why Three Layers: Rust Main + Bun Sidecar + React Frontend

**Rust main (Tauri runtime)**:
- Handles **OS integration** (menu bar / system tray / global shortcuts / fs permissions)
- Starts/stops Bun sidecar processes
- IPC routing (frontend requests → Bun sidecar or direct fs)
- **Write as little Rust as possible** — mainly glue code

**Bun sidecar (lens-core)**:
- Hosts **all core logic**: Compilation Agent (pi-agent-core + pi-ai), extractors, SQLite writes
- Each ingest spawns a **short-lived Compilation Agent** that autonomously reads the source, explores existing knowledge in `~/.lens/`, and extracts Claims/Frames/Questions
- Because core logic needs **Defuddle / linkedom / pi-ai / pi-agent-core** and other JS ecosystem libraries
- Compiled into a **single binary**, no need for users to install Node.js
- **Also distributed as a standalone CLI**: the `lens` command is directly this binary (bypassing Tauri)

**React frontend**:
- Hosts **all UI**: Reader / Programme / Knowledge Maps / Anomaly / Settings
- Calls Rust commands via Tauri IPC, Rust then forwards to Bun sidecar
- **Reads the same SQLite + markdown files** — UI primarily handles display and interaction

**Key benefits of this three-layer design**:
- **CLI and GUI share the same core logic** (lens-core sidecar)
- **Power users can bypass the GUI** and use CLI directly
- **Agents can call the CLI directly** (via Claude Code / Cursor's process spawn)
- **No duplicate code** — Compilation Agent is written only once

### 2.3 Relationship Between CLI and GUI

A key design decision: **CLI and GUI are two modes of the same binary**.

```bash
# Launch GUI (Tauri app)
$ lens                    # No arguments → open GUI (launch if not running, otherwise bring to front)
$ open -a lens           # macOS native method

# Use CLI (without launching GUI)
$ lens ingest <url>       # Run CLI command, exit directly
$ lens context "..."      # CLI
$ lens show clm_XXX       # CLI
```

**Implementation**:

```
lens.app is a Tauri app bundle
├── MacOS/lens                     ← Tauri main binary
├── Resources/
│   ├── lens-core                   ← Bun-compiled sidecar binary
│   └── frontend/                   ← React bundle
└── Info.plist

Symlink:
/usr/local/bin/lens → /Applications/lens.app/Contents/MacOS/lens
```

**Tauri main logic**:

```rust
fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() > 1 && !is_gui_arg(&args[1]) {
        // CLI mode: call sidecar binary directly, skip Tauri window
        run_cli_passthrough(&args[1..]);
        return;
    }
    
    // GUI mode: start Tauri normally
    tauri::Builder::default()
        .setup(|app| { ... })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

This lets users get both GUI + CLI through a **single `brew install lens`**, no need for two packages.

### 2.4 Data Flow: From Ingest to UI Display

A typical user action through the complete flow:

```
User action: Click "Ingest from URL" in the GUI, enter https://...
           ↓
React frontend (App.tsx)
  - Call invoke('ingest_url', { url: '...' })
           ↓
Tauri Rust layer (src-tauri/src/commands.rs)
  - Receive IPC call
  - Construct sidecar command: lens-core ingest <url> --json
  - Start sidecar subprocess
  - Collect stdout / stderr
           ↓
lens-core sidecar (bun-compiled binary)
  - Execute ingest pipeline:
    1. Acquire: fetch(url) → HTML
    2. Dedup: sha256 check → SQLite
    3. Store: write original to raw/src_XXX.html
    4. Extract: Defuddle + linkedom → canonical markdown
    5. Write: sources/src_XXX.md
    6. Spawn Compilation Agent (pi-agent-core):
       - Agent autonomously reads the source document
       - Agent explores existing knowledge (grep for related
         Claims/Frames, ls directory structure, bash to run
         lens search --json)
       - Agent extracts Claims / Frames / Questions
       - Agent outputs structured JSON
    7. lens-core processes agent output:
       - Generate ULIDs for new objects
       - Validate schema
       - Write claims/clm_XXX.md, frames/frm_XXX.md, etc.
       - Compute embeddings
       - Dedup: SQLite + sqlite-vec similarity query
       - Bayesian update: adjust confidence
    8. Update index.sqlite
  - Output JSON to stdout:
    { "source_id": "...", "claims_created": [...], ... }
           ↓
Tauri Rust layer
  - Parse sidecar JSON output
  - Send to frontend via Tauri event:
    app.emit("ingest_complete", { source_id, claims_created })
           ↓
React frontend
  - Listen for event, refresh UI
  - Display newly created Source and Claims
  - Reader view auto-navigates to this Source
```

### 2.5 Core npm Packages / Crate Dependencies

**React frontend**:

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tiptap/react": "^2.0.0",
    "@tiptap/starter-kit": "^2.0.0",
    "zustand": "^5.0.0",
    "immer": "^10.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "tailwindcss": "^4.0.0",
    "d3-hierarchy": "^3.0.0",          // Knowledge Maps
    "react-flow": "^12.0.0",            // Claim Graph view
    "fuse.js": "^7.0.0"                  // Fuzzy search
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

**lens-core sidecar** (TypeScript, bun-compiled):

```json
{
  "dependencies": {
    "defuddle": "^0.5.0",
    "linkedom": "^0.18.0",
    "@mariozechner/pi-ai": "latest",           // Unified LLM provider
    "@mariozechner/pi-agent-core": "latest",   // Agent runtime for Compilation Agent
    "bun:sqlite": "^11.0.0",
    "sqlite-vec": "^0.1.0",
    "gray-matter": "^4.0.0",            // YAML frontmatter
    "ulid": "^2.3.0",
    "chalk": "^5.0.0",                   // CLI output
    "zod": "^3.23.0",                    // Runtime schema validation
    "p-limit": "^6.0.0",                 // Concurrency control
    "mime-types": "^2.0.0"
  }
}
```

**Tauri Rust**:

```toml
[dependencies]
tauri = { version = "2", features = ["..."] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

**Python tools** (user-installed, not bundled in v0.1):

```
marker-pdf          # PDF extraction (v0.1 required)
# v0.3:
mlx-whisper         # macOS Apple Silicon audio
```

---

## 3. Directory Structure

```
lens/
├── README.md
├── docs/
│   ├── architecture.md          # This file
│   ├── positioning.md
│   ├── methodology.md
│   ├── schema.md
│   ├── source-pipeline.md
│   ├── roadmap.md                # Scope for each phase
│   ├── getting-started.md        # Onboarding for new agents
│   ├── references.md
│   └── launch-post-draft.md
│
├── packages/
│   ├── lens-core/                # Bun-compiled sidecar (TS)
│   │   ├── src/
│   │   │   ├── cli/              # CLI entry points
│   │   │   │   ├── commands/     # ingest, context, show, etc.
│   │   │   │   └── main.ts       # CLI dispatcher
│   │   │   ├── core/             # Core domain logic
│   │   │   │   ├── types.ts      # Generated from schema.md
│   │   │   │   ├── storage.ts    # fs + SQLite operations
│   │   │   │   ├── agent/        # Compilation Agent (pi-agent-core)
│   │   │   │   ├── extractors/   # Defuddle, Marker, etc.
│   │   │   │   └── llm/          # pi-ai provider wrappers
│   │   │   ├── sources/          # Per-source-type pipelines
│   │   │   │   ├── web-article.ts
│   │   │   │   ├── pdf-paper.ts
│   │   │   │   ├── chat-chatgpt.ts
│   │   │   │   ├── chat-claude-ai.ts
│   │   │   │   ├── chat-claude-code.ts
│   │   │   │   └── markdown.ts
│   │   │   ├── state/            # last_global_check, auto-check
│   │   │   └── index.ts          # Exports for Rust sidecar
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── build.ts              # Bun build script → lens-core binary
│   │
│   ├── lens-ui/                  # React frontend (Tauri)
│   │   ├── src/
│   │   │   ├── views/
│   │   │   │   ├── Reader.tsx    # Source / Excerpt reading view
│   │   │   │   ├── Programme.tsx # Programme dashboard
│   │   │   │   ├── KnowledgeMap.tsx  # Reif/Miller visualization
│   │   │   │   ├── ClaimGraph.tsx    # Toulmin relationship graph
│   │   │   │   ├── Anomalies.tsx     # Contradiction queue
│   │   │   │   ├── Settings.tsx
│   │   │   │   └── Welcome.tsx
│   │   │   ├── components/
│   │   │   │   ├── editor/       # TipTap editor
│   │   │   │   ├── layout/       # Sidebar, TopBar
│   │   │   │   ├── ui/           # shadcn primitives
│   │   │   │   └── ...
│   │   │   ├── stores/           # Zustand stores
│   │   │   ├── hooks/            # React hooks
│   │   │   ├── lib/
│   │   │   │   ├── tauri.ts      # IPC wrappers
│   │   │   │   ├── types.ts      # Shared types (same source as lens-core)
│   │   │   │   └── ...
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── lens-tauri/               # Tauri Rust shell
│       ├── src/
│       │   ├── main.rs           # Entry point (GUI vs CLI dispatch)
│       │   ├── commands.rs       # IPC command handlers
│       │   ├── sidecar.rs        # Sidecar lifecycle
│       │   └── cli_passthrough.rs # CLI mode passthrough to lens-core
│       ├── binaries/              # Sidecar binaries
│       │   ├── lens-core-aarch64-apple-darwin
│       │   ├── lens-core-x86_64-apple-darwin
│       │   ├── lens-core-x86_64-pc-windows-msvc.exe
│       │   └── lens-core-x86_64-unknown-linux-gnu
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       ├── capabilities/
│       │   └── default.json
│       ├── icons/
│       └── build.rs
│
├── tests/
│   ├── integration/              # E2E tests
│   └── fixtures/                 # Sample sources for testing
│
├── scripts/
│   ├── dev.sh                    # Start development environment
│   ├── build-sidecar.sh          # Build lens-core binaries for all targets
│   ├── build-app.sh              # Build Tauri app
│   └── release.sh                # Release pipeline
│
├── .github/workflows/
│   ├── test.yml
│   ├── build.yml
│   └── release.yml
│
├── package.json                  # Workspace root
├── pnpm-workspace.yaml           # pnpm workspaces
├── tsconfig.base.json
└── .editorconfig
```

**Key points**:
- **Monorepo**, using pnpm workspaces
- **3 packages**: lens-core (sidecar TS) / lens-ui (frontend React) / lens-tauri (Rust shell)
- **lens-core can run independently**: also an npm-installable CLI package
- **lens-ui can run independently**: uses mock IPC in `vite dev` mode for convenient UI development

---

## 4. Summary of Key Architecture Decisions

| # | Decision | Rationale |
|---|---|---|
| A1 | Tauri 2 not Electron | Memory / bundle size / startup speed / security / mobile future |
| A2 | React 19 + Vite + TS 5.5 | Team familiarity, mature ecosystem, officially recommended by Tauri |
| A3 | TipTap (ProseMirror) as editor | Already used in nodex, strong ecosystem |
| A4 | File-as-Truth + SQLite derived cache, unified type/id.md pattern | iCloud sync compatibility + data liberation + agents can read files directly + every object = `type/id.md` with frontmatter + body |
| A5 | Tailwind CSS 4 + shadcn/ui | Consistent with nodex, Radix a11y |
| A6 | Zustand for state management | 4KB, already used in nodex |
| A7 | Bun-compiled lens-core sidecar | Fast, single binary, cross-platform |
| A8 | pi-ai + pi-agent-core (multi-provider LLM API + agent runtime) | v0.1 Anthropic, v0.2 zero-code add OpenAI/Gemini; pi-agent-core provides the Compilation Agent loop |
| A9 | Voyage AI embeddings (v0.1) | Anthropic recommended pairing, free tier sufficient |
| A10 | Marker (user-installed Python) for PDF | Best open source PDF extractor |
| A11 | Defuddle (Node sidecar) for web | Kepano's library, superior to Readability |
| A12 | MLX Whisper (v0.3) for audio on macOS | Fastest on Apple Silicon |
| A13 | CLI and GUI same binary, two modes | Power users + regular users both happy |
| A14 | Monorepo with pnpm workspaces | 3 packages sharing types |
| A15 | Complete client from v0.1 | Users must be able to "see" what's in lens |
| A16 | CLI + Skill as agent interface | CLI does work, Skill tells agents how to install and use. No MCP (v0.3 community can wrap) |
| A17 | `lens context --json` query-time inline | Agent gets claim + evidence + frame in one call, files don't store redundancy |
| A18 | All CLI commands support `--json` | Agents consume structured output, humans consume human-readable output |
| A19 | npm global package distribution | `npm install -g lens-cli` one-line install, agents can auto-install too |
| A20 | Compilation Agent per document | Each ingest spawns a pi-agent-core agent that reads, explores, and extracts — not a fixed pipeline of steps |
| A21 | Agent uses pi's built-in tools only | No custom tools needed — read, grep, ls, bash are sufficient for the Compilation Agent |

---

## 5. Auto-Check Mechanism Implementation Under Tauri Architecture

[`source-pipeline.md`](./source-pipeline.md) defines the auto-check flow. Specific implementation under the Tauri architecture:

### 5.1 Scheduler Location

The auto-check scheduler runs in the **lens-core sidecar's persistent process** (when the GUI is open, the sidecar runs as a persistent subprocess).

**Two modes**:

- **GUI mode**: Tauri app starts → lens-core sidecar starts as subprocess → sidecar has an internal scheduler that ticks every 5 minutes → checks `~/.claude/projects/` → spawns a Compilation Agent if changes detected → emits event to frontend
- **CLI mode**: `lens context "..."` starts a **transient** lens-core process → performs one auto-check on process startup → executes the original CLI command → exits

### 5.2 Staleness Window Trade-off

- **GUI is open**: lens-core is persistent, scheduler tick is the main trigger, users barely notice staleness
- **GUI is closed + CLI invocation**: Each invocation checks once (if more than 5 minutes have passed)
- **GUI is closed + no CLI invocation**: lens does not proactively check, this is **acceptable** — if the user isn't using it, they aren't using it

### 5.3 Notifications

When the GUI is open and auto-check discovers new content:
- Background compile completes → lens-core sends event to Rust via stdio
- Rust emits to frontend via Tauri event
- Frontend displays a subtle toast: "3 new sessions ingested" (user can dismiss or view)
- Does not interrupt the user's current work

---

## 6. Mobile Strategy (v1.0+)

Tauri 2 already supports iOS + Android. Lens's future mobile strategy:

- **v0 - v1.0**: Desktop only (macOS, Windows, Linux)
- **v1.0+**: iOS-first mobile port
  - Most React UI can be reused directly
  - Same SQLite code can run
  - lens-core sidecar needs to be recompiled for iOS (Bun doesn't support iOS, may need Swift wrapper or Capacitor)
  - More likely approach: **lens on iOS is a viewer**, no compiling (heavy tasks delegated to desktop/cloud)

Not in v0 scope, but technology stack choices leave the door open for the future.

---

## 7. Performance Targets

| Metric | Target | Measurement Method |
|---|---|---|
| Cold start (GUI) | < 1 second | From click to first paint |
| CLI invocation overhead | < 50ms | `lens show <id>` response time (excluding IO) |
| Ingest a 5000-word article | < 30 seconds | Defuddle + Compilation Agent |
| Ingest a 20-page PDF | < 90 seconds | Marker + Compilation Agent |
| `lens context` query | < 200ms | SQLite query + embedding search |
| UI render 1000 claims | < 500ms | React list virtualization |
| Memory (idle, GUI open) | < 100 MB | Activity Monitor |
| Disk for 10000 claims | < 500 MB | `du -sh ~/.lens/` |

---

## 8. Testing Strategy

- **Unit tests** (lens-core): Each extractor / agent component has unit tests, using Vitest
- **Integration tests**: End-to-end ingest → Compilation Agent → query flow, using real fixtures (small PDF / small HTML)
- **Snapshot tests** (frontend): Screenshot tests for main views, using Playwright
- **Contract tests**: Invariants defined in schema.md must be enforced by validators, each type has invariant tests
- **Performance tests**: Benchmarks for performance targets, run once per release

---

## 9. Distribution and Installation

### 9.1 macOS

- Universal binary (x86_64 + arm64)
- Notarized and signed (Developer ID)
- Distribution methods:
  1. **Homebrew cask**: `brew install --cask lens` (recommended for power users)
  2. **DMG download** from lens.xyz (recommended for regular users)
  3. **Direct GitHub Releases** (alternative)

### 9.2 Windows

- MSI installer or portable .exe
- Distribution:
  1. **Scoop**: `scoop install lens`
  2. **MSI download** from lens.xyz
  3. **winget** (long-term)

### 9.3 Linux

- **AppImage** (most universal)
- **Flatpak** (long-term)
- **Direct tarball**

### 9.4 CLI-only Install (without GUI)

Some users only want the CLI (e.g., server / pure agent users). Provide:

```bash
curl -fsSL https://lens.xyz/install.sh | sh
# → Only downloads the lens-core binary, does not install the Tauri app
```

---

## 10. References

- [`schema.md`](./schema.md) — Data schema
- [`source-pipeline.md`](./source-pipeline.md) — Source pipeline spec
- [`methodology.md`](./methodology.md) — Compilation lifecycle
- [`roadmap.md`](./roadmap.md) — Phased implementation plan
- [`getting-started.md`](./getting-started.md) — Onboarding guide for new agents

**This document is the technical source of truth for lens's code**. If the implementation conflicts with this document, either update architecture.md (and record the rationale) or update the implementation — the two must not drift apart.
