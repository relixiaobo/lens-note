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
# See docs/schema.md for details

providers:
  llm:
    default: anthropic
    # API key is read from ANTHROPIC_API_KEY environment variable

  embedding:
    default: voyage
    # API key is read from VOYAGE_API_KEY environment variable (v0.2)
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
    console.log(`  ${paths.sources}/`);
    console.log(`  ${paths.claims}/`);
    console.log(`  ${paths.frames}/`);
    console.log(`  ${paths.questions}/`);
    console.log(`  ${paths.programmes}/`);
    console.log(`  ${paths.raw}/`);
    console.log(`  ${paths.db}`);
    console.log(`  ${paths.config}`);
    console.log(`\nNext: lens ingest <url> or lens note "<text>"`);
  }
}
