#!/usr/bin/env node

/**
 * lens CLI entry point.
 */

import { commands, parseCliArgs } from "./cli/commands";

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  console.log(`
lens — Knowledge graph for humans and agents.

Usage:
  lens <command> [options]

Core (agent-facing):
  search "<query>" --json    Find knowledge (supports Chinese/CJK)
  show <id> --json           Read one object with full detail + links
  write '<json>' --json       Write anything (note/source/link/update/delete/batch)
  fetch <url> [--save] --json Extract web content as clean markdown
  status --json              Stats + health metrics

Read:
  list <type> [--since 7d]   Browse objects (notes, sources, threads)
  links <id>                 Show all relationships
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

System:
  init                       First-time setup
  rebuild-index              Rebuild SQLite cache

Options:
  --json                  Structured JSON output
  --help, -h              Show this help
  --version, -v           Show version
`);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("lens v1.0.2");
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
