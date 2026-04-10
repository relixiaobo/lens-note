#!/usr/bin/env bun

/**
 * lens CLI entry point.
 */

import { commands, parseCliArgs } from "./cli/commands";

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  console.log(`
lens — Structured cognition compiler for humans and agents.

Usage:
  lens <command> [options]

Commands:
  init                  First-time setup (~/.lens/ directory + config)
  ingest <url|file>     Ingest and compile a web article or markdown file
  note "<text>"         Record a quick note
  show <id>             Show any object (claim, frame, question, source, programme)
  search "<query>"      Search across all objects
  context "<query>"     Assemble agent-ready context pack (JSON)
  programme list|show   Programme management
  status                System status
  rebuild-index         Rebuild SQLite cache from markdown files

Options:
  --json                Output as structured JSON (for agent consumption)
  --help, -h            Show this help message
  --version, -v         Show version
`);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("lens v0.1.0-dev");
  process.exit(0);
}

const handler = commands[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'lens --help' for usage.`);
  process.exit(1);
}

const commandArgs = args.slice(1);
const { flags } = parseCliArgs(commandArgs);
const jsonFlag = flags.json === true;

try {
  await handler(commandArgs, { ...flags, json: jsonFlag });
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (jsonFlag) {
    console.log(JSON.stringify({ error: message }, null, 2));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
