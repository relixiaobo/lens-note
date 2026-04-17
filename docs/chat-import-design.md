# Chat Import Design

Date: 2026-04-14
Status: Draft

---

## Goal

Support importing chat exports from ChatGPT and Claude as Source objects (`source_type: "conversation"`). lens stores and indexes the conversations; knowledge extraction is the agent's job.

---

## Export Formats

### ChatGPT

- Export: Settings > Data controls > Export data → email with ZIP
- Key file: `conversations.json` — array of Conversation objects
- Message structure: **DAG** (directed acyclic graph), not linear list
  - `mapping`: dict of `{uuid: Node}`, each Node has `parent`, `children[]`, `message`
  - Root node: `parent: null`, `message: null`
  - Multiple children = edits/regenerations
  - Golden path: walk `current_node` → parent → ... → root, then reverse
- Message fields: `author.role` (system/user/assistant/tool), `content` (polymorphic by `content_type`), `create_time`, `metadata`
- Content types: `text`, `multimodal_text`, `code`, `execution_output`, `tether_quote`, `thoughts` (o1/o3 reasoning), `reasoning_recap`
- Conversation metadata: `title`, `create_time`, `update_time`, `default_model_slug`, `is_archived`

### Claude

- Export: Settings > Export Data → email with ZIP
- ZIP contains: `conversations.json`, `projects.json`, `users.json`, `memories.json`
- Key file: `conversations.json` — array of Conversation objects
- Message structure: **linear** array `chat_messages[]`
  - Each message: `uuid`, `text` (flat), `sender` ("human"|"assistant"), `created_at`, `updated_at`
  - `content[]`: discriminated union blocks — `text`, `thinking`, `tool_use`, `tool_result`, `token_budget`
  - `attachments[]`: `file_name`, `file_size`, `file_type`, `extracted_content`
- Conversation metadata: `uuid`, `name`, `summary`, `created_at`, `updated_at`, `project_uuid`

---

## Design

### Mapping: Conversation → Source

Each conversation becomes one Source:

```yaml
---
id: src_01ABC
type: source
source_type: conversation
title: "Conversation title (truncated to 120 chars)"
origin_id: "chatgpt:abc123-def456"  # provider:conversation_uuid for dedup/update
origin: chatgpt                      # chatgpt | claude
word_count: 1234
raw_file: raw/src_01ABC.json         # original conversation JSON preserved
created_at: '2026-01-15T...'         # from conversation's create_time
updated_at: '2026-01-15T...'         # from conversation's update_time
---
## User
What is the difference between...

## Assistant
The key difference is...

## User
Can you elaborate on...

## Assistant
...
```

### Markdown Body Format

Simple, human-readable conversation transcript:

```markdown
## User
Message text here.

## Assistant
Response text here.

## User
Follow-up question.

## Assistant
Follow-up response.
```

Rules:
- Only include `user` and `assistant` messages (skip system/tool internal messages)
- For ChatGPT: walk the golden path (current_node chain), ignore branches
- For Claude: include `text` content blocks, skip `thinking`/`tool_use`/`tool_result`/`token_budget`
- Preserve code blocks, lists, and other markdown formatting within messages
- Attachments: save to `raw/` directory, reference in body as `[attachment: filename](raw/src_ID/filename)`

### What We Skip (lens doesn't think)

- No insight extraction — agent's job
- No summarization — agent's job  
- No deduplication across conversations — agent can use `lens similar`
- No conversation splitting — one conversation = one Source, always
- Branch/edit history from ChatGPT DAG — only keep the golden path

### Pipeline

```
1. User provides export file (ZIP or conversations.json)
2. lens detects format (ChatGPT vs Claude by structure inspection)
3. For each conversation:
   a. Check origin_id against existing Sources
   b. If new → create Source
   c. If exists + updated_at is newer → update Source body + metadata
   d. If exists + not newer → skip
4. Save attachments to raw/src_ID/
5. Save raw conversation JSON to raw/src_ID.json
6. Output: summary (created: N, updated: N, skipped: N)
```

### Implementation: `lens ingest` Extension

Extend the existing `lens ingest <file>` command:

```bash
# Single file
lens ingest conversations.json --json

# ZIP (auto-extracts conversations.json)
lens ingest chatgpt-export.zip --json
lens ingest claude-export.zip --json
```

Auto-detection logic:
- ZIP with `conversations.json` + `users.json` → Claude format
- ZIP with `conversations.json` only → ChatGPT format
- JSON array where items have `mapping` field → ChatGPT format
- JSON array where items have `chat_messages` field → Claude format

### Filtering Options

```bash
lens ingest export.zip --since 30d --json    # only recent conversations
lens ingest export.zip --limit 10 --json     # cap count
```

---

## Reference Projects

| Project | Stars | Lang | Notes |
|---|---|---|---|
| [convoviz](https://github.com/mohamed-chs/convoviz) | 849 | Python | Best ChatGPT parser. Pydantic models, DAG reconstruction, YAML frontmatter. Has reverse-engineered [format spec](https://github.com/mohamed-chs/convoviz/blob/main/docs/dev/chatgpt-spec.md). |
| [ai-chat-md-export](https://github.com/sugurutakahashi-1234/ai-chat-md-export) | 56 | TypeScript | CLI for both ChatGPT + Claude → Markdown. npm package. Closest to what we need. |
| [chatgpt-to-markdown](https://www.npmjs.com/package/chatgpt-to-markdown) | — | JS | npm package, handles both ChatGPT and Claude. `npx chatgpt-to-markdown conversations.json` |
| [chatclerk](https://github.com/srstevenson/chatclerk) | new | Python | 4 providers (ChatGPT, Claude, Grok, Kagi). Clean architecture with per-provider CLI. |
| [lordjabez/claude-export-viewer](https://github.com/lordjabez/claude-export-viewer) | 6 | Python | Best Claude export data model (Pydantic). Handles artifacts, thinking blocks, tool use. |
| [chatgpt2md](https://github.com/NextStat/chatgpt2md) | 13 | Rust | Full-text search index + MCP server. Most "knowledge infrastructure" oriented. |

### Key Takeaway from Landscape

Every existing tool is a **format converter** (chat → markdown files). None attempt knowledge extraction, linking, or graph building. This is exactly the gap lens fills: lens stores the conversation as a Source, and the agent layer does the thinking — finding tensions, creating notes, building links.

---

## Implementation Plan

### Phase 1: Parsers (spike/)

1. `spike/chatgpt-clean.ts` — parse ChatGPT `conversations.json`, output JSONL
2. `spike/claude-clean.ts` — parse Claude `conversations.json`, output JSONL
3. Validate against real export files
4. Follow the same pattern as `spike/tana-clean.ts`

### Phase 2: Integrate into `lens ingest`

1. Add format detection to `ingest.ts`
2. Add conversation parser module (`src/sources/chat.ts`)
3. Support ZIP extraction
4. Each conversation → Source with formatted markdown body + raw JSON
5. Dedup/update logic via `origin_id` lookup
6. Claude `projects.json` → separate Sources per project document
7. Attachments → `raw/src_ID/` directory
8. Add `--since` and `--limit` filters

### Phase 3: Agent Workflow (plugin side)

1. After import, agent can `lens list sources --since 1d` to find new conversations
2. Agent reads each Source, extracts insights, creates Notes with links
3. Uses `lens similar` to detect overlap with existing knowledge
4. This is entirely the agent's responsibility — lens just stores

---

## Design Decisions

1. **Title handling**: Use conversation title from export. Fallback to first user message if title is null. **Truncate to 120 characters** to keep frontmatter clean.
2. **Deduplication + Update**: Track imported conversation UUIDs (in Source frontmatter as `origin_id`). On re-import, detect existing Source by `origin_id` — if conversation `updated_at` is newer, **update** the Source (new body, bump `updated_at`); otherwise skip. Never create duplicates.
3. **Incremental import**: Supported via the `origin_id` mechanism above. User can re-import the same export file repeatedly; only new or updated conversations produce changes.
4. **Attachments/images**: Save to `raw/` alongside the conversation JSON. Reference in the markdown body as `[attachment: filename.png](raw/src_01ABC/filename.png)`. Content extraction is the agent's job.
5. **Claude projects.json**: Import project documents as separate Sources (`source_type` based on content — likely `manual_note` or `plain_text`). Link to related conversation Sources if project_uuid matches.
