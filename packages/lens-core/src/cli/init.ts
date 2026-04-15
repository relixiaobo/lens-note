/**
 * lens init — First-time setup.
 * Creates ~/.lens/ directory structure and config.yaml.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { paths, objectDirs } from "../core/paths";
import { getDb, closeDb } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

export async function initLens(opts: CommandOptions) {
  if (existsSync(paths.config)) {
    const msg = "lens is already initialized at " + paths.root;
    if (opts.json) {
      respondSuccess({ status: "already_initialized", path: paths.root });
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

# User context — agents read this to adapt writing style.
# Set via: lens config set context.role "product manager"
# Or edit this file directly.
# context:
#   role: ""        # Your role (e.g., "product manager", "researcher", "student")
#   audience: ""    # Who reads your notes (e.g., "myself", "engineering team")
#   language: ""    # Primary language (e.g., "zh", "en")
#   style: ""       # Writing style guidance (e.g., "explain why it matters, not just what")
`;

  writeFileSync(paths.config, defaultConfig, "utf-8");

  // Initialize SQLite cache
  getDb();
  closeDb();

  // Initialize git for version tracking
  try {
    execFileSync("git", ["init"], { cwd: paths.root, stdio: "ignore" });
    writeFileSync(`${paths.root}/.gitignore`, "index.sqlite\nindex.sqlite-wal\nindex.sqlite-shm\n", "utf-8");
    execFileSync("git", ["add", "."], { cwd: paths.root, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "lens init", "--no-gpg-sign"], {
      cwd: paths.root,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_NAME: "lens", GIT_AUTHOR_EMAIL: "lens@local", GIT_COMMITTER_NAME: "lens", GIT_COMMITTER_EMAIL: "lens@local" },
    });
  } catch {
    // Git not available — continue without version tracking
  }

  if (opts.json) {
    respondSuccess({ status: "initialized", path: paths.root });
  } else {
    console.log(`Initialized lens at ${paths.root}`);
    console.log(`\nCreated:`);
    console.log(`  ${paths.notes}/`);
    console.log(`  ${paths.sources}/`);
    console.log(`  ${paths.tasks}/`);
    console.log(`  ${paths.raw}/`);
    console.log(`  ${paths.db}`);
    console.log(`  ${paths.config}`);
    console.log(`\nNext: lens ingest <url> or lens note "<text>"`);
  }
}
