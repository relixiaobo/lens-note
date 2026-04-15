#!/usr/bin/env node

/**
 * lens CLI entry point.
 */

import { commands, parseCliArgs, dispatchRequest, type RequestEnvelope } from "./cli/commands";
import { readFileSync } from "fs";

const args = process.argv.slice(2);
const command = args[0];

// --stdin mode: structured JSON input, bypasses shell escaping entirely.
// Used by AI agents. Content never touches the shell parser.
if (command === "--stdin") {
  if (process.stdin.isTTY) {
    console.log(JSON.stringify({ error: { code: "no_input", message: "No piped input. Usage: printf '%s' '{\"command\":\"...\"}' | lens --stdin" } }));
    process.exit(1);
  }

  let raw: string;
  try {
    raw = readFileSync(0, "utf-8").trim();
  } catch {
    console.log(JSON.stringify({ error: { code: "empty_stdin", message: "Expected JSON request on stdin" } }));
    process.exit(1);
  }

  if (!raw) {
    console.log(JSON.stringify({ error: { code: "empty_stdin", message: "Expected JSON request on stdin" } }));
    process.exit(1);
  }

  let req: RequestEnvelope;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.command !== "string") {
      throw new Error('Expected object with string "command" field');
    }
    req = parsed as RequestEnvelope;
  } catch (e: any) {
    console.log(JSON.stringify({ error: { code: "invalid_request", message: e.message } }));
    process.exit(1);
  }

  try {
    await dispatchRequest(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify({ error: { code: "command_error", message, command: req.command } }, null, 2));
    process.exit(1);
  }
  process.exit(process.exitCode || 0);
}

if (!command || command === "--help" || command === "-h") {
  console.log(`
lens — Knowledge graph CLI. 3 types, typed links, full-text search.

Data model:
  Types:    note (one idea), source (provenance), task (action item)
  IDs:      note_<ULID>, src_<ULID>, task_<ULID>   (26 uppercase chars)
  Links:    supports, contradicts, refines, related, indexes
  Storage:  ~/.lens/  (markdown files + SQLite cache + git history)

Agent mode (recommended for programmatic use):
  printf '%s' '<json>' | lens --stdin

  Envelope: {"command":"<cmd>", "positional":[], "flags":{}, "input":{}}
  Always returns JSON. No --json flag needed.

  Examples:
    printf '%s' '{"command":"search","positional":["distributed systems"]}' | lens --stdin
    printf '%s' '{"command":"show","positional":["note_01ABC..."]}' | lens --stdin
    printf '%s' '{"command":"write","input":{"type":"note","title":"My insight","body":"..."}}' | lens --stdin
    printf '%s' '{"command":"write","input":{"type":"link","from":"note_A","rel":"supports","to":"note_B","reason":"..."}}' | lens --stdin
    printf '%s' '{"command":"fetch","positional":["https://..."],"flags":{"save":true}}' | lens --stdin
    printf '%s' '{"command":"status"}' | lens --stdin

  Write input types:
    {"type":"note",   "title":"...", "body":"...", "links":[{"to":"ID","rel":"supports","reason":"..."}]}
    {"type":"source", "title":"...", "url":"...", "source_type":"web_article"}
    {"type":"task",   "title":"...", "status":"open"}
    {"type":"link",   "from":"ID", "rel":"supports", "to":"ID", "reason":"..."}
    {"type":"unlink", "from":"ID", "rel":"supports", "to":"ID"}
    {"type":"update", "id":"ID", "set":{"title":"..."}, "body":"..."}
    {"type":"delete", "id":"ID"}
    [{...}, {...}]   batch — use $0/$1 to reference earlier items' IDs

Shell mode:
  Search & Read:
    search "<query>" --json          Full-text search (CJK-aware, + --limit N)
    search "<query>" --resolve --json  Resolve title → ID (exact match first)
    show <id> --json                 Full object with body + forward/backward links
    links <id> --json                All relationships (forward + backward)
    context "<query>" --json         Context pack with full note bodies
    list notes|sources --json        Browse by type (+ --orphans, --since 7d, --limit N, --offset N)
    tasks [--all|--done] --json      List tasks (default: open)
    similar <id> --json              Near-duplicates (+ --threshold 0.0-1.0)
    similar --all --json             Scan all notes, group duplicates
    digest [week|month|year] --json  Recent insights (+ --days N)
    status --json                    Stats + graph health + user context

  Write:
    write --file <path> --json       Write note/source/task/link/unlink/update/delete/batch
    fetch <url> [--save] --json      Extract web content (--save creates source)
    note "<title>" --json            Quick note (no body/links)
    ingest <url|file> --json         Save source (fetch --save alias, auto-detects .md files)

  RSS:
    feed add <url> --json            Subscribe (auto-discovers RSS from HTML)
    feed import <opml> --json        Import OPML subscriptions
    feed list --json                 List subscriptions
    feed check [--dry-run] --json    Check for new articles
    feed remove <id|url> --json      Unsubscribe

  Index:
    index --json                     List all keyword entry points
    index "<keyword>" --json         Show entries for a keyword
    index add "<kw>" <id> --json     Register entry point (max 3 per keyword)
    index remove "<kw>" [id] --json  Remove keyword or single entry

  Config:
    config list --json               Show all config
    config get <key> --json          Get value (e.g., context.role)
    config set <key> <value> --json  Set value

  System:
    init                             First-time setup
    rebuild-index --json             Rebuild SQLite cache from markdown files

Options:
  --json         Structured JSON output (always on in --stdin mode)
  --help, -h     Show this help
  --version, -v  Show version

Errors: {"error": {"code": "...", "message": "..."}}
`);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("lens v1.7.5");
  process.exit(0);
}

const commandArgs = args.slice(1);
const { flags } = parseCliArgs(commandArgs);
const jsonFlag = flags.json === true;

const handler = commands[command];
if (!handler) {
  const available = Object.keys(commands).join(", ");
  if (jsonFlag) {
    console.log(JSON.stringify({ error: { code: "unknown_command", message: `Unknown command: ${command}`, hint: `Available commands: ${available}` } }));
  } else {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${available}`);
    console.error(`Run 'lens --help' for usage.`);
  }
  process.exit(1);
}

try {
  await handler(commandArgs, { ...flags, json: jsonFlag });
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (jsonFlag) {
    console.log(JSON.stringify({ error: { code: "command_error", message, command } }, null, 2));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
