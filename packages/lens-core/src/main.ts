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
lens — Knowledge graph for humans and agents.

Usage:
  lens <command> [options]

Core (agent-facing):
  search "<query>" --json    Find knowledge (supports Chinese/CJK)
  search "<query>" --resolve --json  Resolve title → ID
  show <id> --json           Read one object with body + forward/backward links
  write --file <path> --json   Write anything (note/source/task/link/unlink/update/delete/batch)
  fetch <url> [--save] --json Extract web content as clean markdown
  status --json              Stats + health metrics

Read:
  list <type> [--since 7d]   Browse objects (notes, sources, tasks)
  list notes --orphans       List unlinked notes (+ --limit/--offset)
  links <id>                 Show all relationships (forward + backward)
  similar <id> [--threshold] Find near-duplicate notes
  similar --all [--threshold] Scan all notes, group duplicates
  tasks [--all|--done]       List tasks (default: open)
  context "<query>"          Assemble context pack (JSON)
  digest [week|month|year]   Recent insights summary

Write shortcuts:
  note "<title>"             Quick note (alias for write)
  ingest <url|file>          Save source (alias for fetch --save)

RSS:
  feed add <url>             Subscribe
  feed import <opml>         Import subscriptions
  feed list                  List subscriptions
  feed check [--dry-run]     Check for new articles
  feed remove <id|url>       Unsubscribe

Index (Schlagwortregister):
  index                      List all keyword entries
  index "<keyword>"          Show entries for a keyword
  index add "<kw>" <id>      Register entry point (max 3 per keyword)
  index remove "<kw>" [id]   Remove keyword or single entry

System:
  init                       First-time setup
  rebuild-index              Rebuild SQLite cache

Agent mode:
  --stdin                 Read JSON request from stdin (shell-safe)
                          {"command":"...", "positional":[], "flags":{}, "input":{}}

Options:
  --json                  Structured JSON output
  --help, -h              Show this help
  --version, -v           Show version
`);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("lens v1.7.0");
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
