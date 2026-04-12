# Lens Architecture Plan

Date: 2026-04-11
Status: Active

This document defines the path from current state to target architecture.

---

## Current State (v0.2)

### What Works
- CLI with compile + place modes
- Thinker Agent (explores existing knowledge, creates linked Notes)
- 3 data types (Source, Note, Thread) with typed links
- File-as-Truth storage + SQLite derived cache
- RSS feed pipeline
- Digest (temporal views)
- `lens context` for agent consumption

### What's Broken / Missing
- Agent framework (pi-ai) has streaming bugs with non-ASCII content → replacing with koma
- No Converse mode (user can't query/correct knowledge)
- No Curate mode (no merge, evolve, supersede)
- `lens context` output is too thin (needs contradictions, open questions, tensions)
- Thread is a passive record, not an active workspace
- No feedback loop (Agent doesn't learn from corrections)
- Note lifecycle is create-only (no merge, no supersede)

---

## Target Architecture

```
┌─────────────────────────────────────────────────┐
│                    Thread (UI)                   │
│  Drag-drop + conversation = single input surface │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              koma AgentKernel                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Compile  │  │ Converse │  │ Curate   │       │
│  │ preset   │  │ preset   │  │ preset   │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
│  ModelGateway (Anthropic, direct, no pi-ai)      │
│  ToolRunner (lens CLI tools + file/web tools)    │
│  ContextProjector (Thread history + system)      │
│  EventLog (durable, replayable)                  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│            lens Knowledge Layer                  │
│                                                  │
│  Storage (File-as-Truth + SQLite cache)          │
│  Knowledge Graph (Notes + typed links)           │
│  Context API (structured output for any agent)   │
│                                                  │
│  Queries:                                        │
│  - search (FTS5)                                 │
│  - links (forward + backward)                    │
│  - orphans, weak links, similar notes            │
│  - context (assembled knowledge pack)            │
└─────────────────────────────────────────────────┘
```

---

## Migration Plan

### Phase A: Dogfood + Foundation (Now, parallel with koma development)

**Goal**: Validate compilation quality at scale. Build foundation queries for Curate.

Does NOT depend on koma. Uses current pi-ai workaround.

Tasks:
1. **Tana data preprocessing script** — Extract sources/articles/highlights from Tana JSON → markdown files
2. **Batch ingest Tana data** — Run through existing compile + place modes
3. **RSS dogfood** — Process accumulated RSS articles
4. **Storage layer enhancements**:
   - `getOrphanNotes()` — Notes with zero links
   - `getWeaklyLinkedNotes(threshold)` — Notes with fewer than N links
   - `getSimilarNotes(noteId)` — FTS similarity search
   - `getContradictions()` — All contradiction pairs
   - `getOpenQuestions()` — All notes with `question_status: open`
5. **`lens context` enhancement** — Include contradictions, open questions, link summary in output
6. **Update CLAUDE.md** — Reflect new product vision and architecture

### Phase B: koma Integration (After koma MVP)

**Goal**: Replace pi-ai/pi-agent-core with koma. Implement Converse mode.

Tasks:
1. **Replace `compilation-agent.ts`** — Swap pi-agent-core Agent with koma AgentKernel
   - Migration surface: 1 file, ~300 lines
   - koma needs: prompt(), waitForIdle(), tool definition, API key config
2. **Implement Compile preset** — Current Thinker Agent logic as a koma preset
3. **Implement Place preset** — Current Placement Agent as a koma preset
4. **Implement Converse preset** — New:
   - User asks a question → Agent reads relevant Notes → synthesized answer
   - User corrects a Note → Agent updates it
   - User asks for connections → Agent traces links and explains
5. **`lens converse "query"`** CLI command — Or integrate into Thread
6. **Remove pi-ai, pi-agent-core, @anthropic-ai/sdk dependencies**

### Phase C: Curate + Thread (After Phase B)

**Goal**: Implement knowledge maintenance and Thread as workspace.

Tasks:
1. **Implement Curate preset**:
   - Scan for orphan Notes → propose links
   - Scan for similar Notes → propose merges
   - Scan for evidence accumulation → propose qualifier upgrades
   - Scan for contradictions → surface tensions
2. **`lens curate` CLI command** — Run Curate agent on demand
3. **Note lifecycle operations** in storage layer:
   - `mergeNotes(sourceIds, targetId)` — Combine N notes into 1
   - `supersedeNote(oldId, newId)` — Mark old as superseded
   - `evolveNote(id, changes)` — Update qualifier, scope, role
4. **Thread model upgrade**:
   - `mode` field (compile/converse/curate)
   - `produced[]` field (Notes created by this Thread)
   - Thread as persistent workspace (context across sessions)
5. **`lens thread` command** — Interactive Thread in CLI (or via stdin/stdout for agents)

### Phase D: Unified Input (After Phase C)

**Goal**: Single input surface. User dumps anything, Agent routes.

Tasks:
1. **`lens add <anything>` command** — Smart router:
   - URL → fetch → compile
   - File → detect format → compile or place
   - Text → place
   - Directory → explore → compile
2. **Format detectors** — File type detection for common formats
3. **Reader tools** for koma ToolRunner:
   - File reader (text, markdown, PDF)
   - Web fetcher (URL → clean text)
   - Code explorer (glob, grep, read for code projects)
   - Archive extractor (zip, tar)

### Phase E: GUI (v1.0)

**Goal**: Thread-first GUI.

Tasks:
1. **Three screens**: Thread (input + converse), Knowledge (graph explorer), Digest (review)
2. **Thread UI**: Drag-drop zone + conversation + inline Note display
3. **Knowledge graph visualization**: Interactive link graph
4. **Digest UI**: Tensions, growing notes, open questions

---

## Key Technical Decisions

### koma Preset Configuration for lens

```typescript
// Compile preset
{
  systemPrompt: COMPILE_PROMPT,
  tools: [lens_query, submit_extraction],
  controller: { maxTurns: 30 },
}

// Converse preset
{
  systemPrompt: CONVERSE_PROMPT,
  tools: [lens_query, lens_show, lens_links, update_note, synthesize],
  controller: { maxTurns: 10 },
}

// Curate preset
{
  systemPrompt: CURATE_PROMPT,
  tools: [lens_query, lens_links, merge_notes, supersede_note, add_link],
  controller: { maxTurns: 50 },
}
```

### `lens context` Output Schema

```typescript
interface ContextOutput {
  query: string;
  timestamp: string;

  // Relevant Notes with full metadata
  notes: Note[];

  // Synthesized summary (LLM-generated)
  summary?: string;

  // Structural information
  contradictions: Array<{ note_a: string; note_b: string; tension: string }>;
  open_questions: Note[];
  structure_notes: Note[];  // relevant index entry points

  // Metadata
  total_notes_in_graph: number;
  notes_matching_query: number;
}
```

### Thread Data Model (Upgraded)

```typescript
interface Thread {
  id: string;            // thr_ULID
  type: "thread";
  title: string;
  mode?: "compile" | "converse" | "curate";
  references: string[];  // Note IDs discussed
  produced: string[];    // Note/Source IDs created by this Thread
  started_from?: string;
  status: "active" | "archived";
  created_at: string;
}
```

---

## Dependencies Between Phases

```
Phase A (dogfood + foundation) ─── independent, start now
         │
         ▼
Phase B (koma integration) ─────── depends on koma MVP
         │
         ▼
Phase C (curate + thread) ──────── depends on Phase B
         │
         ▼
Phase D (unified input) ────────── depends on Phase C
         │
         ▼
Phase E (GUI) ──────────────────── depends on Phase D
```

Phase A is fully independent and should start immediately.
