/**
 * lens init — First-time setup.
 * Creates ~/.lens/ directory structure and config.yaml.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { paths, objectDirs } from "../core/paths";
import { getDb, closeDb } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function initLens(opts: CommandOptions) {
  if (existsSync(paths.config)) {
    const msg = "lens is already initialized at " + paths.root;
    if (opts.json) {
      console.log(JSON.stringify({ status: "already_initialized", path: paths.root }));
    } else {
      console.log(msg);
    }
    return;
  }

  // Create directories
  for (const dir of objectDirs) {
    mkdirSync(dir, { recursive: true });
  }

  // Create default config
  const defaultConfig = `# lens configuration
# lens is a pure storage+query tool. No API keys required.
# Agents (Claude Code, Cursor, etc.) provide the intelligence.
`;

  writeFileSync(paths.config, defaultConfig, "utf-8");

  // Initialize SQLite cache
  getDb();
  closeDb();

  if (opts.json) {
    console.log(JSON.stringify({ status: "initialized", path: paths.root }));
  } else {
    console.log(`Initialized lens at ${paths.root}`);
    console.log(`\nCreated:`);
    console.log(`  ${paths.notes}/`);
    console.log(`  ${paths.sources}/`);
    console.log(`  ${paths.threads}/`);
    console.log(`  ${paths.raw}/`);
    console.log(`  ${paths.db}`);
    console.log(`  ${paths.config}`);
    console.log(`\nNext: lens ingest <url> or lens note "<text>"`);
  }
}
