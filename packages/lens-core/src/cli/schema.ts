/**
 * lens schema — machine-readable command catalog.
 *
 * Emits a stable JSON document describing every command, its inputs, and
 * expected output shape. Consumers:
 *  - Agents: register lens commands as tools without hard-coding the catalog
 *  - Skills/plugins: render reference docs at runtime instead of hand-syncing
 *  - Future clients: generate TypeScript types for UI forms
 *
 * This is the single source of truth for the input contract. Update this file
 * when adding or modifying commands.
 */

import type { CommandOptions } from "./commands";
import { respondSuccess, SCHEMA_VERSION } from "./response";

type ScalarType = "string" | "integer" | "number" | "boolean";

interface PositionalArg {
  name: string;
  type: ScalarType;
  description: string;
  required?: boolean;
  variadic?: boolean;
}

interface FlagDef {
  type: ScalarType;
  description: string;
  enum?: readonly string[];
  default?: string | number | boolean;
}

interface CommandSpec {
  description: string;
  readonly: boolean;
  positional?: PositionalArg[];
  flags?: Record<string, FlagDef>;
  input_shape?: string; // JSON input via `input` field in RequestEnvelope
  output: string;
  examples: { description: string; request: object }[];
}

const LINK_RELS = ["supports", "contradicts", "refines", "related", "indexes"] as const;
const SOURCE_TYPES = ["web_article", "paper", "book", "video", "podcast", "conversation", "other"] as const;
const TASK_STATUSES = ["open", "done"] as const;
const OBJECT_TYPES = ["note", "source", "task"] as const;

const COMMANDS: Record<string, CommandSpec> = {
  search: {
    description: "Full-text search across notes/sources/tasks. CJK-aware.",
    readonly: true,
    positional: [{ name: "query", type: "string", description: "Search query", required: true }],
    flags: {
      limit: { type: "integer", description: "Max results (default 20)" },
      resolve: { type: "boolean", description: "Return single ID for an exact title match" },
      expand: { type: "boolean", description: "Include full bodies and forward links" },
    },
    output: "{query, total, count, results: [{id, type, title, snippet, ...typed_fields}]}",
    examples: [
      { description: "Basic search", request: { command: "search", positional: ["distributed systems"] } },
      { description: "Title → ID", request: { command: "search", positional: ["My Note Title"], flags: { resolve: true } } },
    ],
  },

  show: {
    description: "Fetch one or more objects with body, forward links, and backward links.",
    readonly: true,
    positional: [{ name: "id_or_title", type: "string", description: "Object ID or title (batch supported)", required: true, variadic: true }],
    output: "Single: {id, type, title, body, forward_links, backward_links, ...}\nBatch: {count, items: [...], errors?: [...]}",
    examples: [
      { description: "Show by ID", request: { command: "show", positional: ["note_01ABC..."] } },
      { description: "Batch", request: { command: "show", positional: ["note_01ABC...", "note_01DEF..."] } },
    ],
  },

  links: {
    description: "List all relationships (forward and backward) for an object.",
    readonly: true,
    positional: [{ name: "id_or_title", type: "string", description: "Object ID or title", required: true }],
    flags: {
      rel: { type: "string", description: "Filter by relationship type", enum: LINK_RELS },
      direction: { type: "string", description: "Show only one side", enum: ["forward", "backward"] },
    },
    output: "{id, forward?: [...], backward?: [...]} — each link has {id, rel, type, title, reason?}",
    examples: [
      { description: "All links", request: { command: "links", positional: ["note_01ABC..."] } },
      { description: "Only supports", request: { command: "links", positional: ["note_01ABC..."], flags: { rel: "supports" } } },
    ],
  },

  list: {
    description: "List objects by type with filters. Paginated via --limit/--offset.",
    readonly: true,
    positional: [{ name: "type", type: "string", description: "Object type", required: true }],
    flags: {
      since: { type: "string", description: "Time filter like '7d', '2w', '1m'" },
      limit: { type: "integer", description: "Max results per page" },
      offset: { type: "integer", description: "Skip N results" },
      orphans: { type: "boolean", description: "Only notes with no note-to-note links" },
      "min-links": { type: "integer", description: "Minimum total link count" },
      "max-links": { type: "integer", description: "Maximum total link count" },
      "source-type": { type: "string", description: "Filter sources by source_type", enum: SOURCE_TYPES },
      inbox: { type: "boolean", description: "Sources awaiting agent processing (set by clippers)" },
      status: { type: "string", description: "Filter tasks by status", enum: TASK_STATUSES },
    },
    output: "{type, total, count, items: [{id, title, ...typed_fields}], offset?, limit?, filter?}",
    examples: [
      { description: "Orphans", request: { command: "list", positional: ["notes"], flags: { orphans: true } } },
      { description: "Inbox sources", request: { command: "list", positional: ["sources"], flags: { inbox: true } } },
      { description: "Open tasks", request: { command: "list", positional: ["tasks"], flags: { status: "open" } } },
    ],
  },

  similar: {
    description: "Find near-duplicate notes using character trigrams + Dice coefficient.",
    readonly: true,
    positional: [{ name: "id_or_title", type: "string", description: "Note ID or title (omit with --all)" }],
    flags: {
      all: { type: "boolean", description: "Scan all notes and group duplicates" },
      threshold: { type: "number", description: "Similarity threshold 0.0–1.0 (default 0.3)" },
    },
    output: "Single: {id, count, results: [{id, title, similarity}]}\n--all: {count, groups: [{notes, pairs}]}",
    examples: [
      { description: "Near-duplicates", request: { command: "similar", positional: ["note_01ABC..."] } },
      { description: "Scan all", request: { command: "similar", flags: { all: true, threshold: 0.5 } } },
    ],
  },

  digest: {
    description: "Recent insights grouped by time window.",
    readonly: true,
    positional: [{ name: "window", type: "string", description: "Time window: week | month | year" }],
    flags: {
      days: { type: "integer", description: "Custom day count (overrides window)" },
    },
    output: "{period, notes: [{id, title, updated_at, ...}], count}",
    examples: [
      { description: "Weekly digest", request: { command: "digest", positional: ["week"] } },
    ],
  },

  lint: {
    description: "Graph quality checks (9 deterministic checks) with offender IDs.",
    readonly: true,
    flags: {
      summary: { type: "boolean", description: "Stats + health + user context instead of full checks" },
      audit: { type: "string", description: "Deep-dive one check: full offenders with context" },
      target: { type: "string", description: "Scope audit to one thesis (for edge-shaped checks)" },
      check: { type: "boolean", description: "Exit code 1 on failures (for CI)" },
      limit: { type: "integer", description: "Max offenders in --audit mode" },
      offset: { type: "integer", description: "Paginate --audit offenders" },
    },
    output: "Default: {checks: [{name, status, value, message, offenders?}]}\n--summary: stats\n--audit: full offender list",
    examples: [
      { description: "Quality scan", request: { command: "lint" } },
      { description: "Graph health", request: { command: "lint", flags: { summary: true } } },
      { description: "Deep-dive one check", request: { command: "lint", flags: { audit: "vague_reasons" } } },
    ],
  },

  write: {
    description: "Write notes, sources, tasks, links, updates, deletes. Supports batch via array input.",
    readonly: false,
    input_shape:
      "One of: " +
      '{type:"note", title, body?, source?, links?: [{to, rel, reason?}]}; ' +
      '{type:"source", title, url?, source_type?, inbox?, ...custom}; ' +
      '{type:"task", title, status?}; ' +
      '{type:"link", from, to, rel, reason?}; ' +
      '{type:"unlink", from, to, rel}; ' +
      '{type:"update", id, set?, body?}; ' +
      '{type:"delete", id}; ' +
      '{type:"retype", from, to, rel_from, rel_to}; ' +
      '{type:"merge", from, into}; ' +
      "array for batch — use $0/$1 to reference earlier items' IDs",
    output: "Single: written object or operation result.\nBatch: [{ok, ...per_item}]",
    examples: [
      { description: "Quick note", request: { command: "write", input: { type: "note", title: "Insight", body: "Details..." } } },
      { description: "Create link", request: { command: "write", input: { type: "link", from: "note_A", to: "note_B", rel: "supports", reason: "..." } } },
      { description: "Batch with $0 ref", request: { command: "write", input: [{ type: "source", title: "Paper" }, { type: "note", title: "Claim", source: "$0" }] } },
    ],
  },

  note: {
    description: "Quick note shortcut — no body or links. For richer notes use write.",
    readonly: false,
    positional: [{ name: "title", type: "string", description: "Note title", required: true }],
    output: "{id, type: 'note', title, created_at}",
    examples: [{ description: "Quick note", request: { command: "note", positional: ["My quick thought"] } }],
  },

  fetch: {
    description: "Extract web content. Returns parsed article; --save creates a source.",
    readonly: false,
    positional: [{ name: "url", type: "string", description: "URL to fetch", required: true }],
    flags: {
      save: { type: "boolean", description: "Save as a source object" },
    },
    output: "{url, title, author, body, word_count, source_id?}",
    examples: [{ description: "Save a URL", request: { command: "fetch", positional: ["https://..."], flags: { save: true } } }],
  },

  ingest: {
    description: "Save a source from URL or local markdown file (fetch --save alias).",
    readonly: false,
    positional: [{ name: "url_or_path", type: "string", description: "URL or .md file path", required: true }],
    output: "{id, type: 'source', title, url?, source_type}",
    examples: [{ description: "Save URL", request: { command: "ingest", positional: ["https://..."] } }],
  },

  feed: {
    description: "RSS/Atom subscriptions. Subcommands: add, list, check, remove, import.",
    readonly: false,
    positional: [{ name: "subcommand", type: "string", description: "add | list | check | remove | import", required: true }],
    flags: {
      "dry-run": { type: "boolean", description: "check: preview new items without saving" },
    },
    output: "Varies by subcommand. add: {id, url, title}. check: {new_items}. list: [{...}]",
    examples: [
      { description: "Subscribe", request: { command: "feed", positional: ["add", "https://example.com/rss"] } },
      { description: "Check new", request: { command: "feed", positional: ["check"] } },
    ],
  },

  index: {
    description: "Keyword entry points. List, show entries, add, remove. Max 3 entries per keyword.",
    readonly: false,
    positional: [{ name: "subcommand_or_keyword", type: "string", description: "add | remove | <keyword> | (empty to list all)" }],
    output: "List: [{keyword, entries}]. Show: [{id, title}].",
    examples: [
      { description: "All keywords", request: { command: "index" } },
      { description: "Register entry", request: { command: "index", positional: ["add", "distributed systems", "note_01ABC..."] } },
    ],
  },

  config: {
    description: "Read/write config.yaml (context.role, context.audience, context.language, context.style).",
    readonly: false,
    positional: [{ name: "subcommand", type: "string", description: "list | get | set", required: true }],
    output: "list: {path, context, ...}. get: {key, value}. set: {key, value, previous?}.",
    examples: [
      { description: "Show all", request: { command: "config", positional: ["list"] } },
      { description: "Set role", request: { command: "config", positional: ["set", "context.role", "product manager"] } },
    ],
  },

  init: {
    description: "First-time setup, also repairs half-initialized LENS_HOME. Creates directories, config, SQLite cache, git repo. Re-running on a complete install is a no-op; re-running on a partial install fills in missing pieces.",
    readonly: false,
    output: "{status: 'initialized' | 'repaired' | 'already_initialized', path, created?: string[]}",
    examples: [{ description: "Init or repair", request: { command: "init" } }],
  },

  "rebuild-index": {
    description: "Rebuild SQLite cache from markdown files. Safe after manual edits.",
    readonly: false,
    output: "{rebuilt: <count>}",
    examples: [{ description: "Rebuild", request: { command: "rebuild-index" } }],
  },

  schema: {
    description: "Emit this catalog — machine-readable description of all commands.",
    readonly: true,
    output: "{envelope_version, commands, data_types, enums}",
    examples: [{ description: "Fetch catalog", request: { command: "schema" } }],
  },

  doctor: {
    description: "Self-diagnostic: directory writability, git, SQLite integrity, schema version.",
    readonly: true,
    output: "{status, checks: [{name, status, message, hint?}]}",
    examples: [{ description: "Diagnose", request: { command: "doctor" } }],
  },
};

const DATA_TYPES = {
  note: {
    description: "A single idea or claim. Markdown body with optional YAML links[].",
    fields: {
      id: "note_<ULID>",
      type: "'note'",
      title: "string",
      body: "string (markdown)",
      source: "optional src_<ULID> reference",
      links: "optional [{to, rel, reason?}]",
      created_at: "ISO8601",
      updated_at: "ISO8601",
    },
  },
  source: {
    description: "Provenance: web article, paper, book, podcast, conversation, etc.",
    fields: {
      id: "src_<ULID>",
      type: "'source'",
      title: "string",
      url: "optional string",
      source_type: `one of ${SOURCE_TYPES.join(" | ")}`,
      author: "optional string",
      word_count: "optional integer",
      inbox: "optional boolean (clipper-set, cleared by processing agent)",
      created_at: "ISO8601",
    },
  },
  task: {
    description: "Action item. Status: open | done.",
    fields: {
      id: "task_<ULID>",
      type: "'task'",
      title: "string",
      status: `one of ${TASK_STATUSES.join(" | ")}`,
      created_at: "ISO8601",
    },
  },
};

export async function runSchema(_args: string[], opts: CommandOptions) {
  const data = {
    envelope_version: SCHEMA_VERSION,
    envelope: {
      success: '{"ok": true, "schema_version": 1, "data": {...}}',
      error: '{"ok": false, "schema_version": 1, "error": {"code", "message"}, "hint"?}',
    },
    id_format: "<prefix>_<26-char-ULID>, prefixes: src, note, task",
    enums: {
      link_rel: LINK_RELS,
      source_type: SOURCE_TYPES,
      task_status: TASK_STATUSES,
      object_type: OBJECT_TYPES,
    },
    data_types: DATA_TYPES,
    commands: COMMANDS,
    readonly_commands: Object.entries(COMMANDS)
      .filter(([, s]) => s.readonly)
      .map(([name]) => name),
    entry: {
      stdin: 'printf \'%s\' \'{"command":"...",...}\' | lens --stdin',
      cli: "lens <command> [args] [--flags] [--json]",
    },
  };

  if (opts.json) {
    respondSuccess(data);
  } else {
    // Human fallback: hint to use --json
    console.log("Use --json to get the full schema (this is a machine-readable catalog).");
    console.log(`\nCommands: ${Object.keys(COMMANDS).join(", ")}`);
    console.log(`Read-only commands: ${data.readonly_commands.join(", ")}`);
    console.log(`\nFor full details: lens schema --json`);
  }
}
