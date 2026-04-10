# Source Pipeline Specification

Date: 2026-04-09
Version: `1.0`

This document defines how lens **acquires, stores, extracts, and incrementally updates** all raw sources. It is an extension of the Source section in [`schema.md`](./schema.md) — the schema defines **what the data looks like**, while this document defines **how the processing pipeline runs**.

Document network:
- [`getting-started.md`](./getting-started.md) — **New agents start here**
- [`positioning.md`](./positioning.md) — Product positioning + UX principles
- [`architecture.md`](./architecture.md) — Tech stack + component architecture
- [`schema.md`](./schema.md) — Source object fields and constraints
- **This document** — Acquisition / dedup / extraction / incremental update mechanism for each source type
- [`methodology.md`](./methodology.md) — The compilation lifecycle from Step -1 (auto-check) to Step 12 (health check)

If schema and pipeline conflict, **schema.md takes precedence** (schema is the executable constraint).

---

## 0. Core Concepts

### 0.1 Immutable vs Growing Sources

All sources fall into two major categories:

```
IMMUTABLE sources (one-time, content is fixed)
  ├── pdf_paper        ← Never changes after PDF upload
  ├── markdown         ← A file snapshot at a point in time
  ├── plain_text       ← Same as above
  ├── manual_note      ← Each note is an immutable event
  └── web_article      ← Author may modify, but not in a growth pattern

GROWING sources (live, content within the same identity keeps growing)
  ├── chat_conversation (ChatGPT)       ← User can return to the same conversation and continue
  ├── chat_conversation (Claude.ai)     ← Same as above
  └── chat_conversation (Claude Code)   ← Ongoing coding session
```

Both share the same TypeScript type `Source`, distinguished by the `growth_state` field (immutable is null).

### 0.2 External ID

Growing sources need a **stable identifier across ingests** to recognize "this is a new version of the same conversation". Lens uses the `external_id` field for this:

```
ChatGPT:       "chatgpt:conversation:{uuid-from-export}"
Claude.ai:     "claude-ai:conversation:{uuid-from-export}"
Claude Code:   "claude-code:session:{session-uuid}:{encoded-cwd}"
```

The `external_id` for immutable sources is `null`; dedup is done via the `sha256` field.

### 0.3 Content Fingerprint

Growing sources must have a `content_fingerprint` — three hashes used for divergence detection:

```ts
type ContentFingerprint = {
  head_hash: string      // sha256(first 3 turns, 500 chars each)
  tail_hash: string      // sha256(last 3 turns, 500 chars each)
  total_hash: string     // sha256(full conversation structure)
  total_units: number    // total turn / section count
  computed_at: ISODate
}
```

**Comparison logic**:

| Old fingerprint | New fingerprint | Verdict |
|---|---|---|
| total_hash identical | | **no_change** — skip |
| head_hash identical, total_hash differs, total_units increased | | **append** — incremental compile new turns |
| head_hash identical, total_units decreased | | **anomaly** — user may have deleted turns, enters anomaly queue |
| head_hash differs | | **divergence** — go through divergence handling |

### 0.4 Storage Layout (Recap)

Each source is a subdirectory, not a flat file:

```
~/.lens/sources/
├── src_01HXY....md                    # canonical markdown (file form of the Source object)
└── raw/
    └── src_01HXY/                      # one subdirectory per source
        ├── current.{ext}              #   latest snapshot
        ├── <timestamp>.{ext}          #   historical snapshots (growing sources)
        ├── figures/                   #   extracted images (PDFs, etc.)
        └── ingest_log.jsonl           #   IngestEvent history
```

---

## 1. Auto-check Mechanism (v0.2, Not in v0.1 Scope)

> **Note**: Auto-check and growing source support have been moved from v0.1 to v0.2. v0.1 only supports explicit `lens ingest` for immutable sources. The following describes the planned design for v0.2.

### 1.1 Design Goals

A core UX principle of Lens: **the user should not have to remember to run any maintenance commands**. Growing sources (especially Claude Code sessions) should be "automatically" detected by lens without requiring the user to manually pull.

However, lens also **does not want to use file watchers** (chokidar / fsevents), because:

- Events are unreliable across iCloud / cross-mount-point scenarios
- Daemon processes must stay alive; if they crash, no one knows
- Reading JSONL concurrently with Claude Code may cause race conditions
- Debounce logic is fragile
- The complexity is not worth it

**Solution** (dual-mode):
- **CLI mode**: Auto-check on CLI invocation — check alongside every CLI command invocation
- **GUI mode**: GUI has a built-in timer that checks for mtime changes on growing sources every 5 minutes in the background. This solves the problem of auto-check not triggering when the user mainly stays in the GUI and doesn't run CLI commands

### 1.2 Execution Flow

```
User or agent invokes any lens command (lens context / search / show / anomalies / ...)
  ↓
(1) Read ~/.lens/state/last_global_check.json
  ↓
(2) now() - last_global_check > staleness_threshold?
  ├─ No  → Execute the original command directly, done
  └─ Yes → Continue
  ↓
(3) Read ~/.lens/state/known_sources.json
    Find all Sources with source_type = "chat_conversation" and origin.type = "claude_code_session"
  ↓
(4) For each known Claude Code source:
    - stat ~/.claude/projects/<encoded_cwd>/<session_uuid>.jsonl
    - Compare mtime vs source.last_checked_at
    - No change → skip
    - Changed → add to "to_pull" list
  ↓
(5) Scan ~/.claude/projects/ for new sessions (not in known_sources)
    - Add to "to_create" list
  ↓
(6) Are to_pull + to_create both empty?
    ├─ Yes → Update last_global_check, execute original command
    └─ No  → Continue
  ↓
(7) Push to_pull / to_create into background compile queue
    (~/.lens/state/compile_queue.jsonl, append-only)
  ↓
(8) Fork background process or schedule background task to process queue
    Original CLI command returns immediately, output includes a line:
    "Ingesting 3 new Claude Code sessions in background..."
  ↓
(9) Execute original CLI command (using current data, don't wait for background)
```

**Key properties**:

- **(1)-(6) all < 50ms** (50 stat calls + JSON read/write)
- **(7)-(8) run in background**, do not block the original command
- User perception: commands always return immediately, "lens automatically keeps fresh"

### 1.3 Configuration

```yaml
# ~/.lens/config.yaml
auto_check:
  enabled: true                      # Set to false to completely disable
  staleness_threshold: "5m"          # 5-minute cache window
  
  # Which source types to check
  sources:
    claude_code: true                # Watch ~/.claude/projects/
    chatgpt: false                   # Cannot auto-check (no API access)
    claude_ai: false                 # Same as above
  
  # Claude Code directory location (default)
  claude_code_root: "~/.claude/projects"
  
  # Background compile concurrency
  max_concurrent_compiles: 2
  
  # Quiet hours (don't trigger background compiles)
  quiet_hours: []                    # e.g. ["22:00-06:00"]
```

### 1.4 CLI Overrides

Users can control per-command:

```bash
lens context "..."                   # Default uses auto-check
lens context "..." --no-auto-check   # Skip auto-check (use existing data)
lens context "..." --force-check     # Ignore cache and force check
lens pull                            # Explicit manual pull, triggers full scan + compile (synchronous wait)
lens pull --dry-run                  # Only show what would be compiled, don't actually do it
lens status                          # View last_check / pending compiles / queue length
```

### 1.5 State File Formats

**`state/last_global_check.json`**:

```json
{
  "last_check_at": "2026-04-09T14:23:01Z",
  "last_check_duration_ms": 38,
  "sources_scanned": 47,
  "sources_changed": 2,
  "compiles_queued": 2
}
```

**`state/known_sources.json`** (known Claude Code sessions cache):

```json
{
  "sources": [
    {
      "source_id": "src_01HXY3L...",
      "external_id": "claude-code:session:abc-def:/Users/lixiaobo/Documents/Coding/nodex",
      "file_path": "/Users/lixiaobo/.claude/projects/-Users-lixiaobo-Documents-Coding-nodex/abc-def.jsonl",
      "last_known_mtime": "2026-04-09T14:22:30Z",
      "last_known_size_bytes": 45678,
      "last_known_turn_count": 34
    }
  ]
}
```

**`state/compile_queue.jsonl`**:

```jsonl
{"id":"compile_01HXY5","source_id":"src_01HXY3L","trigger":"auto_check","reason":"mtime_changed","queued_at":"2026-04-09T14:23:01Z","status":"pending"}
{"id":"compile_01HXY6","source_id":null,"trigger":"auto_check","reason":"new_session","session_uuid":"xyz-789","queued_at":"2026-04-09T14:23:01Z","status":"pending"}
```

---

## 2. Complete Pipeline for Each Source Type

### 2.1 `web_article` (via Defuddle)

**Tier**: Immutable

#### Acquisition

```typescript
async function acquireWebArticle(url: string): Promise<AcquisitionResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'lens/0.1 (+https://lens.xyz)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });
  
  if (!response.ok) {
    throw new FetchError(`HTTP ${response.status}: ${url}`);
  }
  
  const html = await response.text();
  
  // Sanity check: too little content may indicate a JS-heavy page
  if (html.length < 1000) {
    throw new TooLittleContentError(
      'Page returned very little HTML. Try ingesting via browser extension.'
    );
  }
  
  return {
    raw_bytes: Buffer.from(html, 'utf8'),
    content_type: 'text/html',
    fetched_at: new Date().toISOString(),
    response_headers: Object.fromEntries(response.headers.entries()),
    final_url: response.url,  // after redirects
  };
}
```

#### Dedup

```typescript
// 1. Compute SHA256 of raw HTML
const sha256 = hash(result.raw_bytes);

// 2. Check SQLite index for existing identical sha256
const existing = await db.sources.findBySha256(sha256);
if (existing) {
  return { source_id: existing.id, action: 'already_exists' };
}

// 3. Check if URL already exists (content may have been updated)
const byUrl = await db.sources.findByUrl(url);
if (byUrl) {
  // Content changed, archive old source and create new source
  // Or update directly (based on user config.sources.web_article_on_change: "archive" | "update")
  return handleWebArticleUpdate(byUrl, sha256, result);
}
```

#### Storage

```
~/.lens/sources/raw/src_01HXY2/
  └── current.html          # Original HTML
```

#### Extraction (Defuddle)

```typescript
import { parseHTML } from 'linkedom';
import { Defuddle } from 'defuddle/node';

async function extractWebArticle(
  htmlBytes: Buffer,
  url: string
): Promise<ExtractionResult> {
  const html = htmlBytes.toString('utf-8');
  const { document } = parseHTML(html);
  
  const result = await Defuddle(document, url, {
    markdown: true,
    separateMarkdown: true,
    removeHiddenElements: false,  // Conservative strategy, don't over-clean
  });
  
  if (!result.content || result.content.length < 200) {
    throw new TooLittleContentError(
      'Defuddle extracted too little content (< 200 chars)'
    );
  }
  
  return {
    canonical_markdown: normalizeMarkdown(result.content),
    metadata: {
      title: result.title,
      authors: result.author ? [result.author] : [],
      published_at: result.published ? parseDate(result.published) : null,
      domain: result.domain,
      language: result.language,
      description: result.description,
      word_count: result.wordCount,
    },
    warnings: [],
  };
}
```

#### Canonical Form

```markdown
---
(frontmatter, see schema.md)
---

# {Article Title}

{Defuddle-cleaned markdown body, preserving headings / images / footnotes / tables / math}
```

Encoding rules (see schema.md §0.3): UTF-8 no BOM, LF, NFC normalized, no trailing whitespace, single final newline.

#### Locator Scheme

`char_offset` — The Excerpt's locator is `{type: "char_offset", value: "234-567"}`, corresponding to character offsets in the canonical markdown.

#### Error Handling

| Error | Cause | Action |
|---|---|---|
| `FetchError(4xx)` | URL wrong / doesn't exist | Report error, do not create Source |
| `FetchError(5xx)` | Server error | Report error, suggest retrying later |
| `FetchError(timeout)` | Network slow / hung | Report error, 30s timeout |
| `TooLittleContentError` | JS-heavy / paywall | Suggest "retry with browser extension" |
| `DefuddleError` | Abnormal HTML format | Log warning, attempt raw text fallback |

#### Example

```bash
$ lens ingest https://karpathy.github.io/2025/03/llm-wiki.html
Fetching... ✓ (142 KB)
Extracting via defuddle... ✓
Compiling... ✓
✅ src_01HXY2K8WJ3F6N9Q0V5T7M2R8Z
   Title: "LLM Wiki"
   Author: Andrej Karpathy
   3 claims, 1 frame, 2 questions
```

---

### 2.2 `pdf_paper` (via Marker)

**Tier**: Immutable

#### Acquisition

```typescript
// Supports URL or local file
async function acquirePdfPaper(source: string): Promise<AcquisitionResult> {
  if (isUrl(source)) {
    const response = await fetch(source);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Verify it is a real PDF
    if (!buffer.slice(0, 4).equals(Buffer.from('%PDF'))) {
      throw new NotAPdfError(source);
    }
    
    return {
      raw_bytes: buffer,
      content_type: 'application/pdf',
      fetched_at: new Date().toISOString(),
      source_url: source,
    };
  } else {
    // Local file
    const buffer = await fs.readFile(source);
    return {
      raw_bytes: buffer,
      content_type: 'application/pdf',
      fetched_at: new Date().toISOString(),
      source_path: source,
    };
  }
}
```

#### Dedup

SHA256 dedup (same as web_article).

#### Storage

```
~/.lens/sources/raw/src_01HXY3/
  ├── current.pdf         # Original PDF
  └── figures/
      ├── fig-1.png       # Images extracted by Marker
      ├── fig-2.png
      └── fig-3.png
```

#### Extraction (Marker)

```bash
# v0.1 uses Marker's basic mode (no LLM)
marker_single /path/to/current.pdf /tmp/marker-out/ \
  --output_format markdown \
  --extract_images

# Output:
#   /tmp/marker-out/current.md     ← canonical markdown
#   /tmp/marker-out/figures/       ← extracted images
```

```typescript
async function extractPdfPaper(
  pdfPath: string,
  outputDir: string
): Promise<ExtractionResult> {
  const result = await runMarker(pdfPath, outputDir);
  
  const canonical = await fs.readFile(
    path.join(outputDir, 'current.md'), 
    'utf-8'
  );
  
  // Parse Marker's markdown to extract structured metadata
  const metadata = extractPaperMetadata(canonical);
  
  // Move figures to raw/src_XXX/figures/
  const figureFiles = await fs.readdir(path.join(outputDir, 'figures'));
  // ... move ...
  
  return {
    canonical_markdown: normalizeMarkdown(canonical),
    metadata: {
      title: metadata.title,
      authors: metadata.authors,
      published_at: metadata.published_at || null,
      domain: null,
      language: metadata.language || 'en',
      description: metadata.abstract,
      word_count: countWords(canonical),
    },
    warnings: result.warnings,  // e.g. "Equation 4 rendered as text approximation"
    figures_count: figureFiles.length,
  };
}
```

#### Canonical Form

```markdown
---
(frontmatter)
---

# {Paper Title}

**Authors**: {comma-separated}
**Venue**: {venue name}
**arXiv**: {arxiv id}

## Abstract

{abstract text}

## 1. Introduction

{section content}

## 2. Related Work

{section content}

...

## References

[1] ...
[2] ...
```

#### Locator Scheme

`section_and_page`:

```yaml
locator:
  type: section_and_page
  section: "4"
  section_title: "Modern Hopfield Networks and Attention"
  pdf_page: 5
  char_offset_in_section: "1234-1456"
```

#### Marker Installation

v0.1 assumes the user **installs Marker themselves**:

```bash
pip install marker-pdf
```

The first time `lens ingest` processes a PDF, lens checks:

```typescript
async function checkMarkerInstalled(): Promise<void> {
  try {
    await execAsync('marker_single --help');
  } catch (e) {
    throw new Error(`
Marker is not installed. lens uses Marker to extract PDF papers.

Install:
  pip install marker-pdf

This will download ~2GB of model weights on first use.
See docs: https://github.com/VikParuchuri/marker
`);
  }
}
```

#### Error Handling

| Error | Cause | Action |
|---|---|---|
| `MarkerNotInstalled` | Marker not in PATH | Show install command |
| `NotAPdfError` | File is not a PDF | Report error, suggest using `--source-type plain_text` |
| `ScannedPdfError` | Text layer is empty | status: `needs_ocr`, not supported in v0.1 |
| `DrmProtectedError` | PDF is encrypted | status: `drm_protected`, cannot process |
| `HugePdfWarning` | > 100MB or > 500 pages | Prompt user for confirmation |

#### Example

```bash
$ lens ingest ~/Downloads/ramsauer2020.pdf
Copying PDF to sources/raw/src_01HXY3/... ✓
Running Marker (this may take 30-90 seconds)... ⠋
✓ Extracted 15 sections, 3 figures, 47 references
Compiling... ✓
✅ src_01HXY3L9YK4F7N0P1V8W9X5R6S
   Title: "Hopfield Networks is All You Need"
   Authors: Hubert Ramsauer, Bernhard Schäfl, ...
   12 claims, 2 frames, 4 questions
```

---

### 2.3 `markdown` / `plain_text`

**Tier**: Immutable

#### Acquisition

```typescript
async function acquireTextFile(filePath: string): Promise<AcquisitionResult> {
  const buffer = await fs.readFile(filePath);
  
  // Detect if UTF-8
  if (!isUtf8(buffer)) {
    throw new EncodingError(`${filePath} is not UTF-8`);
  }
  
  return {
    raw_bytes: buffer,
    content_type: filePath.endsWith('.md') ? 'text/markdown' : 'text/plain',
    fetched_at: new Date().toISOString(),
    source_path: filePath,
  };
}
```

#### Extraction

```typescript
async function extractTextFile(
  bytes: Buffer,
  sourceType: 'markdown' | 'plain_text',
  originalPath: string
): Promise<ExtractionResult> {
  const text = bytes.toString('utf-8');
  const normalized = normalizeMarkdown(text);
  
  let metadata;
  if (sourceType === 'markdown') {
    // Parse frontmatter (if present)
    const parsed = matter(normalized);
    metadata = {
      title: parsed.data.title || extractFirstH1(parsed.content) || path.basename(originalPath),
      authors: parsed.data.authors || [],
      published_at: parsed.data.date || null,
      language: parsed.data.language || null,
      description: parsed.data.description || null,
      word_count: countWords(parsed.content),
    };
  } else {
    metadata = {
      title: path.basename(originalPath),
      authors: [],
      published_at: null,
      language: null,
      description: null,
      word_count: countWords(text),
    };
  }
  
  return {
    canonical_markdown: normalized,
    metadata,
    warnings: [],
  };
}
```

#### Locator Scheme

`char_offset`.

---

### 2.4 `manual_note`

**Tier**: Immutable

#### Acquisition

```bash
# Direct CLI input
lens note "Just thought of this: Programme health check should only trigger when idle"

# From stdin
echo "some text" | lens ingest --stdin --source-type manual_note
```

```typescript
async function acquireManualNote(
  content: string,
  options: { as_claim?: boolean; programme?: ProgrammeId }
): Promise<AcquisitionResult> {
  return {
    raw_bytes: Buffer.from(content, 'utf8'),
    content_type: 'text/plain',
    fetched_at: new Date().toISOString(),
  };
}
```

#### Extraction

Almost none — manual_note is already canonical as-is:

```typescript
async function extractManualNote(bytes: Buffer): Promise<ExtractionResult> {
  const text = bytes.toString('utf-8');
  return {
    canonical_markdown: normalizeMarkdown(text),
    metadata: {
      title: generateNoteTitle(text),  // First line or first 60 characters
      authors: [],
      published_at: new Date().toISOString(),
      language: null,
      description: null,
      word_count: countWords(text),
    },
    warnings: [],
  };
}
```

#### Locator Scheme

`direct` (entire note is one Excerpt).

---

### 2.5 `chat_conversation` — ChatGPT Export

**Tier**: Growing

#### Acquisition

Users need to manually export from chatgpt.com:

```
Settings → Data Controls → Export data
→ Email arrives (may take minutes to hours)
→ Download ZIP
→ Extract → conversations.json
```

```bash
lens ingest --chatgpt ~/Downloads/chatgpt-export-2026-04.zip
```

```typescript
async function parseChatgptExport(
  zipPath: string
): Promise<ChatgptConversation[]> {
  const zip = await readZip(zipPath);
  const conversationsJson = await zip.readFile('conversations.json');
  const raw = JSON.parse(conversationsJson.toString('utf-8'));
  
  return raw.map(parseChatgptConversation);
}
```

#### Handling ChatGPT's Tree Structure

The `mapping` field in the ChatGPT export is a **tree structure**, because ChatGPT supports message editing (creating branches). Correct parsing requires traversing from the root to the final leaf (corresponding to the conversation the user currently sees):

```typescript
function linearizeChatgptConversation(
  conversation: ChatgptConversation
): ChatgptMessage[] {
  const { mapping } = conversation;
  
  // 1. Find root (parent === null)
  const root = Object.values(mapping).find(n => !n.parent);
  if (!root) return [];
  
  // 2. From root, follow the last child to reach the leaf
  //    (corresponding to the "canonical path" the user currently sees)
  const messages: ChatgptMessage[] = [];
  let current = root;
  while (current) {
    if (current.message?.content?.parts?.length) {
      messages.push(current.message);
    }
    if (current.children.length === 0) break;
    const lastChildId = current.children[current.children.length - 1];
    current = mapping[lastChildId];
  }
  
  return messages;
}
```

**v0.1 only processes the default branch** (the path to the latest leaf node), ignoring other branches. v0.5+ may consider alternative branches.

#### Each Conversation = One Source

```typescript
async function ingestChatgptExport(zipPath: string): Promise<IngestResult> {
  const conversations = await parseChatgptExport(zipPath);
  
  const results = { created: [], updated: [], skipped: [] };
  
  for (const conv of conversations) {
    const externalId = `chatgpt:conversation:${conv.id}`;
    const linearized = linearizeChatgptConversation(conv);
    const fingerprint = computeContentFingerprint(linearized);
    
    // Check for existing source
    const existing = await db.sources.findByExternalId(externalId);
    
    if (!existing) {
      // New conversation → create + compile
      const source = await createGrowingSource({
        source_type: 'chat_conversation',
        external_id: externalId,
        origin: {
          type: 'chat_export',
          value: `chatgpt:conversation:${conv.id}`,
          captured_via: 'manual_import',
        },
        title: conv.title || 'Untitled conversation',
        linearized_turns: linearized,
        fingerprint,
      });
      await compileSource(source);
      results.created.push(source.id);
      continue;
    }
    
    // Already exists → compare fingerprints
    const diff = compareFingerprints(existing.content_fingerprint, fingerprint);
    
    switch (diff.type) {
      case 'no_change':
        results.skipped.push(existing.id);
        break;
      case 'append':
        await appendToSource(existing, linearized, fingerprint, diff.new_turns);
        results.updated.push(existing.id);
        break;
      case 'divergence':
        await handleDivergence(existing, linearized, fingerprint);
        results.updated.push(existing.id);
        break;
    }
  }
  
  return results;
}
```

#### Storage

```
~/.lens/sources/raw/src_01HXY4/
  ├── current.json                      # Raw JSON of the latest snapshot
  ├── 2026-04-09T14-23-01Z.json         # Snapshot from first import
  ├── 2026-04-29T09-12-45Z.json         # Snapshot from second import
  └── ingest_log.jsonl                   # IngestEvent history
```

#### Canonical Form

```markdown
---
(frontmatter)
---

# {Conversation Title}

**Started**: 2026-03-15T14:23:00Z
**Ended**: 2026-03-15T15:47:00Z
**Model**: gpt-4o
**Turns**: 28

**User (turn 1, 2026-03-15T14:23:00Z)**:
I've been thinking about whether McClelland 1995's CLS theory has a fundamental connection to the memory problem in current LLMs...

**Assistant (turn 2, 2026-03-15T14:23:30Z)**:
That's a very interesting question. CLS theory says...

**User (turn 3, 2026-03-15T14:25:10Z)**:
...

(continues for all turns)
```

#### Locator Scheme

`turn_index`:

```yaml
locator:
  type: turn_index
  turn: 7
  role: "assistant"
  timestamp: "2026-03-15T14:31:22Z"
```

#### Voice Rules (Chat-specific)

See [`methodology.md`](./methodology.md) § Chat voice rules for details. Rules summary:

```typescript
function inferVoiceForChatExcerpt(
  excerpt: Excerpt,
  source: Source
): { voice: Voice; confidence_cap: number | null } {
  const role = excerpt.locator.role;
  
  if (role === 'user') {
    return { voice: 'restated', confidence_cap: null };
  }
  
  if (role === 'assistant' || role === 'tool') {
    return { voice: 'synthesized', confidence_cap: 0.6 };
  }
  
  if (role === 'system') {
    return { voice: null, confidence_cap: null };  // skip system messages
  }
}
```

**Rationale**: What the AI says should not automatically be treated as fact. `synthesized` + `confidence <= 0.6` forces these claims into a "tentative" state, requiring an independent source to promote.

---

### 2.6 `chat_conversation` — Claude.ai Export

**Tier**: Growing

Almost identical to ChatGPT, but **much simpler** — the Claude.ai export is a flat array, with no tree structure.

#### Acquisition

```
claude.ai → Settings → Privacy → Export data
→ Email arrives
→ Download ZIP
→ conversations.json
```

```bash
lens ingest --claude-ai ~/Downloads/claude-export.zip
```

#### Structural Differences

```typescript
// Claude.ai's conversation is flat
interface ClaudeAiConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: ClaudeAiMessage[];  // Direct array, not a tree
}

interface ClaudeAiMessage {
  uuid: string;
  text: string;
  sender: 'human' | 'assistant';
  created_at: string;
  // ...
}
```

**External ID**: `claude-ai:conversation:{uuid}`

The rest of the processing is the same as ChatGPT (dedup via external_id, fingerprint, incremental append, divergence handling).

---

### 2.7 `chat_conversation` — Claude Code Session

**Tier**: Growing (the most frequently used growing source)

#### Acquisition

**No manual export needed by the user** — Claude Code's sessions are **local files** that already exist:

```
~/.claude/projects/<encoded_cwd>/<session_uuid>.jsonl
```

Where `<encoded_cwd>` is the absolute working directory with every non-alphanumeric character replaced by `-`:

```
/Users/lixiaobo/Documents/Coding/nodex
→ -Users-lixiaobo-Documents-Coding-nodex
```

Each session is a JSONL file, with one event per line. **Append-only** — new messages are appended, existing content is never rewritten.

#### External ID

```
claude-code:session:{session_uuid}:{encoded_cwd}
```

Including `encoded_cwd` because the same session_uuid under a different cwd might differ (as a safety measure).

#### Discovery

```typescript
async function scanClaudeCodeSessions(): Promise<ClaudeCodeSession[]> {
  const root = expandPath('~/.claude/projects');
  
  if (!await exists(root)) {
    return [];
  }
  
  const sessions: ClaudeCodeSession[] = [];
  
  // Traverse each encoded_cwd directory
  const cwdDirs = await fs.readdir(root);
  for (const cwdDir of cwdDirs) {
    const cwdPath = path.join(root, cwdDir);
    const stat = await fs.stat(cwdPath);
    if (!stat.isDirectory()) continue;
    
    // Traverse session files
    const files = await fs.readdir(cwdPath);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      if (file === 'history.jsonl') continue;  // Global index, skip
      
      const sessionUuid = path.basename(file, '.jsonl');
      const filePath = path.join(cwdPath, file);
      const fileStat = await fs.stat(filePath);
      
      sessions.push({
        session_uuid: sessionUuid,
        encoded_cwd: cwdDir,
        file_path: filePath,
        mtime: fileStat.mtime.toISOString(),
        size_bytes: fileStat.size,
      });
    }
  }
  
  return sessions;
}
```

#### Auto-check Flow (see §1 for details)

During auto-check:

```typescript
async function autoCheckClaudeCode(): Promise<AutoCheckResult> {
  const sessions = await scanClaudeCodeSessions();
  const known = await readKnownSources();
  const knownById = new Map(
    known.sources
      .filter(s => s.external_id.startsWith('claude-code:session:'))
      .map(s => [s.external_id, s])
  );
  
  const toCreate: ClaudeCodeSession[] = [];
  const toPull: Array<{ session: ClaudeCodeSession; source: KnownSource }> = [];
  
  for (const session of sessions) {
    const externalId = `claude-code:session:${session.session_uuid}:${session.encoded_cwd}`;
    const knownSource = knownById.get(externalId);
    
    if (!knownSource) {
      toCreate.push(session);
      continue;
    }
    
    // Compare mtime
    if (session.mtime > knownSource.last_known_mtime) {
      toPull.push({ session, source: knownSource });
    }
  }
  
  return { toCreate, toPull };
}
```

#### Parsing JSONL

```typescript
async function parseClaudeCodeSession(
  filePath: string
): Promise<ClaudeCodeTurn[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const turns: ClaudeCodeTurn[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const event = JSON.parse(line);
      
      // Claude Code's JSONL format:
      // { type: "user" | "assistant" | "system" | "tool_use" | "tool_result", ... }
      
      if (event.type === 'user' || event.type === 'assistant') {
        turns.push({
          index: turns.length,
          type: event.type,
          role: event.type === 'user' ? 'user' : 'assistant',
          content: extractContent(event.message),
          timestamp: event.timestamp,
          tool_uses: event.message?.content?.filter(c => c.type === 'tool_use') || [],
          tool_results: event.type === 'user' 
            ? event.message?.content?.filter(c => c.type === 'tool_result') || []
            : [],
        });
      }
      
      // tool_use and tool_result are evidence (from the real environment)
      // → special voice handling: extracted (not synthesized)
    } catch (e) {
      // Ignore corrupted lines
      console.warn(`Skipping malformed line in ${filePath}`);
    }
  }
  
  return turns;
}
```

#### Storage

```
~/.lens/sources/raw/src_01HXY5/
  ├── current.jsonl                      # copy of latest snapshot
  ├── 2026-04-09T14-23-01Z.jsonl         # Snapshot from first ingest
  ├── 2026-04-10T09-12-45Z.jsonl         # Snapshot from incremental update
  └── ingest_log.jsonl
```

**Key point**: Lens **does not symlink**; each time auto-check detects a change, it **copies** current.jsonl to a new timestamp. This makes lens independent of `~/.claude/`'s existence (user cleaning up `.claude` does not affect lens).

#### Canonical Form

Same canonical format as ChatGPT / Claude.ai:

```markdown
---
(frontmatter with growth_state)
---

# Lens schema design discussion

**Participants**: lixiaobo, claude-code-sonnet-4-6
**Started**: 2026-04-09T14:23:01Z
**Turns**: 34

**User (turn 1, 2026-04-09T14:23:01Z)**:
Now we need to finalize schema.md...

**Claude (turn 2, 2026-04-09T14:23:30Z)**:
OK, I suggest...

...
```

#### Voice Rules (Claude Code Special Handling)

Claude Code's assistant turns often **include tool_use and tool_result** — these are not the assistant's reasoning, they are **environmental evidence**:

```typescript
function inferVoiceForClaudeCodeExcerpt(excerpt: Excerpt): VoiceAssignment {
  const turn = excerpt.turn;
  
  // tool_result is real data returned by the environment → extracted
  if (turn.type === 'tool_result') {
    return { voice: 'extracted', confidence_cap: null };
  }
  
  // tool_use itself is the AI's invocation (but parameters come from the AI)
  // → serves as context for the Excerpt, does not independently produce Claims
  if (turn.type === 'tool_use') {
    return { voice: null, confidence_cap: null };  // skip
  }
  
  // assistant's regular text → synthesized
  if (turn.role === 'assistant') {
    return { voice: 'synthesized', confidence_cap: 0.6 };
  }
  
  // user → restated
  if (turn.role === 'user') {
    return { voice: 'restated', confidence_cap: null };
  }
}
```

This makes Claude Code session ingestion more accurate — it can distinguish "what Claude reasoned" from "the grep results Claude saw".

---

## 3. Growing Source Incremental Update Mechanism

### 3.1 Determining Diff Type

```typescript
function compareFingerprints(
  old: ContentFingerprint,
  new_: ContentFingerprint
): FingerprintDiff {
  // Case 1: Completely identical
  if (old.total_hash === new_.total_hash) {
    return { type: 'no_change' };
  }
  
  // Case 2: head identical + new is longer → append
  if (old.head_hash === new_.head_hash && new_.total_units > old.total_units) {
    return {
      type: 'append',
      new_turns: range(old.total_units, new_.total_units),
    };
  }
  
  // Case 3: head identical + new is shorter → anomaly (user may have deleted turns)
  if (old.head_hash === new_.head_hash && new_.total_units < old.total_units) {
    return {
      type: 'shrinkage',  // Special anomaly, handled as divergence by default
    };
  }
  
  // Case 4: head identical + same unit count + total differs → middle was modified
  if (old.head_hash === new_.head_hash && new_.total_units === old.total_units) {
    return { type: 'divergence', reason: 'middle_edit' };
  }
  
  // Case 5: head differs → divergence
  return { type: 'divergence', reason: 'head_changed' };
}
```

### 3.2 Append Flow

```typescript
async function appendToSource(
  source: Source,
  allTurns: ChatTurn[],
  newFingerprint: ContentFingerprint,
  newTurnIndices: number[]
): Promise<void> {
  // 1. Save new snapshot
  const snapshotPath = await saveSnapshot(source, allTurns);
  
  // 2. Update canonical markdown: append new turns to end of file
  await appendCanonicalTurns(source, allTurns.slice(newFingerprint.total_units));
  
  // 3. Create Excerpts only for new turns
  const newExcerpts: Excerpt[] = [];
  for (const turnIdx of newTurnIndices) {
    const excerpt = await createExcerptFromTurn(source, allTurns[turnIdx]);
    newExcerpts.push(excerpt);
  }
  
  // 4. Run compile pipeline (Steps 2-12) on new Excerpts
  const compileResult = await compileExcerpts(newExcerpts, source);
  
  // 5. Update Source's growth_state + fingerprint
  await updateSource(source.id, {
    growth_state: {
      ...source.growth_state,
      last_known_turn_count: newFingerprint.total_units,
      last_appended_at: new Date().toISOString(),
      snapshot_count: source.growth_state.snapshot_count + 1,
    },
    content_fingerprint: newFingerprint,
    last_updated_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    excerpt_count: source.excerpt_count + newExcerpts.length,
    claim_count: source.claim_count + compileResult.claims_created.length,
  });
  
  // 6. Log IngestEvent
  await logIngestEvent(source.id, {
    diff_type: 'append',
    units_before: source.growth_state.last_known_turn_count,
    units_after: newFingerprint.total_units,
    new_unit_indices: newTurnIndices,
    excerpts_created: newExcerpts.map(e => e.id),
    claims_created: compileResult.claims_created,
    snapshot_path: snapshotPath,
    previous_snapshot_path: source.raw_dir + '/current.json',
    extraction_ms: compileResult.extraction_ms,
    compile_ms: compileResult.compile_ms,
    errors: [],
    warnings: [],
  });
}
```

### 3.3 Divergence Handling (`replace_if_diverged`)

When head_hash change (or middle_edit) is detected, execute the **replace_if_diverged** strategy:

```typescript
async function handleDivergence(
  source: Source,
  newAllTurns: ChatTurn[],
  newFingerprint: ContentFingerprint
): Promise<void> {
  // 1. Save old snapshot to history (already done by the copy mechanism)
  const oldSnapshotPath = source.raw_dir + '/current.json';
  const newSnapshotPath = await saveSnapshot(source, newAllTurns);
  
  // 2. Identify old Excerpts and Claims
  const oldExcerpts = await db.excerpts.findBySourceId(source.id);
  const oldClaims = await db.claims.findBySourceId(source.id);
  
  // 3. Replace canonical markdown with new version
  await replaceCanonical(source, newAllTurns);
  
  // 4. Create new Excerpts
  const newExcerpts: Excerpt[] = [];
  for (let i = 0; i < newAllTurns.length; i++) {
    newExcerpts.push(await createExcerptFromTurn(source, newAllTurns[i]));
  }
  
  // 5. Identify orphaned excerpts (old ones corresponding to disappeared turns)
  // Use semantic matching to find whether each old excerpt has a match in new excerpts
  const orphanedExcerptIds: ExcerptId[] = [];
  for (const oldExc of oldExcerpts) {
    const match = await findSemanticMatch(oldExc, newExcerpts);
    if (!match) {
      orphanedExcerptIds.push(oldExc.id);
      await db.excerpts.update(oldExc.id, { status: 'superseded' });
    }
  }
  
  // 6. Identify orphaned claims (claims whose evidence all comes from orphaned excerpts)
  const orphanedClaimIds: ClaimId[] = [];
  for (const claim of oldClaims) {
    const allEvidenceOrphaned = claim.evidence.every(cit => 
      orphanedExcerptIds.includes(cit.excerpt_id)
    );
    if (allEvidenceOrphaned) {
      orphanedClaimIds.push(claim.id);
      await db.claims.update(claim.id, { status: 'orphaned' });
    }
  }
  
  // 7. Run full compile pipeline on new Excerpts
  const compileResult = await compileExcerpts(newExcerpts, source, {
    // Special flag: dedup pipeline will specifically check if orphaned claims can be recovered
    attempt_orphan_recovery: true,
    orphan_candidates: orphanedClaimIds,
  });
  
  // 8. Log IngestEvent
  await logIngestEvent(source.id, {
    diff_type: 'divergence',
    units_before: source.growth_state.last_known_turn_count,
    units_after: newFingerprint.total_units,
    new_unit_indices: range(0, newFingerprint.total_units),
    excerpts_created: newExcerpts.map(e => e.id),
    excerpts_superseded: orphanedExcerptIds,
    claims_created: compileResult.claims_created,
    claims_orphaned: orphanedClaimIds,
    claims_recovered: compileResult.claims_recovered,
    snapshot_path: newSnapshotPath,
    previous_snapshot_path: oldSnapshotPath,
    extraction_ms: compileResult.extraction_ms,
    compile_ms: compileResult.compile_ms,
    errors: [],
    warnings: [
      `Divergence detected in ${source.id}. ` +
      `${orphanedClaimIds.length} claims orphaned, ` +
      `${compileResult.claims_recovered.length} auto-recovered.`,
    ],
  });
  
  // 9. Unrecoverable orphans enter the anomaly queue
  const unrecovered = orphanedClaimIds.filter(
    id => !compileResult.claims_recovered.includes(id)
  );
  if (unrecovered.length > 0) {
    await createAnomaly({
      anomaly_type: 'orphaned_claims_after_divergence',
      parties: unrecovered,
      description: `${unrecovered.length} claims lost their evidence after source ${source.id} diverged`,
      llm_analysis: await generateOrphanAnalysis(unrecovered, source),
      status: 'open',
      programmes: source.programmes,
    });
  }
}
```

### 3.4 Orphan Auto-Recovery via Dedup

After divergence, the confidence_history and relationships of orphaned claims **should be preserved** (if the new version contains a semantically equivalent claim). Auto-recovery is achieved through the dedup pipeline:

```typescript
async function compileExcerpts(
  excerpts: Excerpt[],
  source: Source,
  options: { attempt_orphan_recovery?: boolean; orphan_candidates?: ClaimId[] }
): Promise<CompileResult> {
  const claimsCreated: ClaimId[] = [];
  const claimsRecovered: ClaimId[] = [];
  
  for (const excerpt of excerpts) {
    // ... Step 2-7 (extract Claim / Frame / Question / elaboration) ...
    const newClaim = await extractClaim(excerpt, source);
    
    // Step 8: Dedup
    // Include orphaned claims in the dedup candidate set (normally dedup only looks at active)
    const candidates = await findDedupCandidates(newClaim, {
      include_orphaned: options.attempt_orphan_recovery,
      orphan_candidate_ids: options.orphan_candidates,
    });
    
    const match = await verifyWithLlm(newClaim, candidates);
    
    if (match) {
      if (match.status === 'orphaned') {
        // Orphan recovery: merge orphan's history into new claim
        newClaim.confidence_history = [
          ...match.confidence_history,
          ...newClaim.confidence_history,
        ];
        newClaim.evidence_independence.independent_sources = uniq([
          ...match.evidence_independence.independent_sources,
          ...newClaim.evidence_independence.independent_sources,
        ]);
        
        // Orphan transitions to superseded by new claim
        await db.claims.update(match.id, {
          status: 'superseded',
          superseded_by: newClaim.id,
        });
        
        claimsRecovered.push(match.id);
      } else {
        // Normal dedup merge
        await mergeClaim(match.id, newClaim);
      }
    } else {
      await db.claims.create(newClaim);
      claimsCreated.push(newClaim.id);
    }
  }
  
  return { claims_created: claimsCreated, claims_recovered: claimsRecovered, /* ... */ };
}
```

**User experience**:

- 99% of ChatGPT edits are minor changes (typos, rephrasing), where the old and new claims are semantically equivalent
- The dedup LLM verification will identify "these two claims say the same thing"
- Auto-recovery merges confidence_history, preserving history
- The user is completely unaware of this process

For the remaining 1% of genuinely semantic-level edits, orphaned claims enter the anomaly queue, and lens prompts: "You edited a conversation, N claims lost their evidence, would you like to review?"

---

## 4. Snapshot Retention

### 4.1 Default Policy

```yaml
sources:
  snapshot_retention:
    keep_first: true         # Always keep the first one
    keep_recent: 30          # Keep the most recent 30
    keep_cited: true         # Always keep snapshots cited by claims
```

### 4.2 Cleanup Algorithm

```typescript
async function cleanupSnapshots(source: Source): Promise<void> {
  const snapshotFiles = await listSnapshots(source.raw_dir);
  
  // Sorted by timestamp ASC
  snapshotFiles.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  
  const toDelete: string[] = [];
  
  // First snapshot is always kept
  const first = snapshotFiles[0];
  
  // Most recent N are kept
  const recent = snapshotFiles.slice(-30);
  
  // Snapshots cited by claims are kept
  const citedPaths = await findCitedSnapshots(source.id);
  
  // The rest can be deleted
  const keepSet = new Set([
    first.path,
    ...recent.map(s => s.path),
    ...citedPaths,
  ]);
  
  for (const snap of snapshotFiles) {
    if (!keepSet.has(snap.path)) {
      toDelete.push(snap.path);
    }
  }
  
  for (const path of toDelete) {
    await fs.unlink(path);
  }
  
  // Update snapshot_count
  await updateSource(source.id, {
    growth_state: {
      ...source.growth_state,
      snapshot_count: snapshotFiles.length - toDelete.length,
    },
  });
}
```

### 4.3 When Cleanup Runs

- **After each incremental update**: Check this source's snapshot_count; clean up when > keep_recent + 5
- **`lens cleanup` command**: Manually trigger global cleanup
- **At installation**: No automatic cleanup; let the user use it for a while first

---

## 5. Normalization Helpers

All canonical markdown must go through normalization to ensure cross-platform stability:

```typescript
function normalizeMarkdown(text: string): string {
  return text
    // CRLF → LF
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Unicode NFC
    .normalize('NFC')
    // Trim trailing whitespace per line
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    // Single final newline
    .replace(/\n+$/, '') + '\n';
}
```

**Why so strict**: `locator.char_offset` is based on character offsets in the canonical form. If the same content normalizes differently on macOS and Linux, char_offset will drift and the Excerpt's evidence link will break.

---

## 6. Error Recovery

### 6.1 Acquisition Failure

```
Source state: extraction.status = "failed"
             extraction.errors = [...]

Recoverable: user can retry with `lens recompile src_XXX`
```

### 6.2 Extraction Failure

```
Source state: raw file exists, canonical is missing
             extraction.status = "failed"

Recoverable: user can switch extractor and retry
             e.g. `lens recompile src_XXX --extractor alternative`
```

### 6.3 Compile Failure (Partial Success)

```
Source state: raw + canonical both exist
             extraction.status = "complete"
             but claim_count < expected

Handling: Successfully created claims are kept
          Failed turns go into jobs/retry_queue.jsonl
          `lens retry-failed` can re-run them
```

### 6.4 Divergence with Failed Auto-Recovery

```
Source state: new version compile complete
             Orphan claims exist (no evidence)

Handling: Orphans enter anomaly queue
          User can:
          - `lens orphans list` to view
          - `lens orphans show clm_XXX` to see details
          - `lens orphans delete clm_XXX` to permanently delete (becomes rejected)
          - `lens orphans find-evidence clm_XXX <src_id>` to manually associate new evidence
```

---

## 7. Supported Source Types — Summary

| Source Type | Tier | v0 | Acquisition | Extractor | Canonical Format | Locator |
|---|---|---|---|---|---|---|
| `web_article` | Immutable | **v0.1** | fetch(URL) | Defuddle (Node) | markdown | char_offset |
| `pdf_paper` | Immutable | **v0.1** | file/URL | Marker (Python) | markdown | section_and_page |
| `markdown` | Immutable | **v0.1** | file | pass-through | markdown | char_offset |
| `plain_text` | Immutable | **v0.1** | file | pass-through | markdown | char_offset |
| `manual_note` | Immutable | **v0.1** | CLI stdin | direct | markdown | direct |
| `chat_conversation` (ChatGPT) | Growing | **v0.1** | zip export | JSON tree walk | markdown (per-turn) | turn_index |
| `chat_conversation` (Claude.ai) | Growing | **v0.1** | zip export | JSON array parse | markdown (per-turn) | turn_index |
| `chat_conversation` (Claude Code) | Growing | **v0.1** | auto-check `~/.claude/` | JSONL parse | markdown (per-turn) | turn_index |
| `pdf_book` | Immutable | v0.2 | file | Marker + chapter split | markdown per chapter | section_and_page |
| `tweet_thread` | Immutable | v0.2 | URL | defuddle + X parser | markdown | tweet_id |
| `audio` | Immutable | v0.3 | file | MLX Whisper / whisper.cpp | markdown w/ timestamps | timestamp_range |
| `image` | Immutable | v0.3 | file | Claude Vision | markdown description | direct |
| `video` | Immutable | v0.5 | file/URL | Whisper + Vision | markdown + frames | timestamp_range |
| `pdf_scanned` | Immutable | v0.3 | file | Marker --use_llm / Tesseract | markdown | page_and_bbox |

---

## 8. Open Questions

1. **ChatGPT branch alternative paths**: v0.1 only processes the default branch. Should v0.5+ support alternative branches as independent Sources?
2. **Role of Claude Code history.jsonl**: `~/.claude/history.jsonl` is a global index. Should lens use it to optimize auto-check?
3. **Handling web article updates**: If the user re-ingests the same URL but the content has changed (the author edited a blog post), should a new source be created or should it be incremental? v0.1 defaults to **creating a new source**, keeping the old one.
4. **Marker v0.2 going to cloud**: The Marker author may provide a hosted API in the future. Users could opt-in to cloud extraction (more accurate but sends content to a third party).

---

## 9. References

- [`schema.md`](./schema.md) — Precise field definitions for Source types
- [`methodology.md`](./methodology.md) — Compilation lifecycle (Step -1 to Step 12)
- [`positioning.md`](./positioning.md) — Auto-check mechanism + UX principles
- [`references.md`](./references.md) — References for tools like Defuddle / Marker / Whisper
