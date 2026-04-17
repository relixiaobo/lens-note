/**
 * lens init — First-time setup, also repairs half-initialized directories.
 *
 * A half-init happens when a previous command (e.g., `lens search` before
 * init) implicitly created ~/.lens/ via mkdirSync but didn't write config.
 * Re-running `lens init` now detects which components are missing and fills
 * them in, instead of bailing out with "already_initialized".
 */

import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { paths, objectDirs } from "../core/paths";
import { getDb, closeDb } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess, LensError } from "./response";

const DEFAULT_CONFIG = `# lens configuration
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

interface ComponentStatus {
  config: boolean;
  dirs: boolean;
  db: boolean;
  git: boolean;
}

function inspect(): ComponentStatus {
  return {
    config: existsSync(paths.config),
    dirs: objectDirs.every((d) => existsSync(d)),
    db: existsSync(paths.db),
    git: existsSync(`${paths.root}/.git`),
  };
}

export async function initLens(opts: CommandOptions) {
  const before = inspect();
  const alreadyComplete = before.config && before.dirs && before.db && before.git;

  if (alreadyComplete) {
    if (opts.json) {
      respondSuccess({ status: "already_initialized", path: paths.root });
    } else {
      console.log("lens is already initialized at " + paths.root);
    }
    return;
  }

  const wasPartial = before.config || before.dirs || before.db || before.git;
  const created: string[] = [];

  // Subdirectories — mkdirSync recursive is idempotent
  for (const dir of objectDirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
  }

  // Config
  if (!before.config) {
    writeFileSync(paths.config, DEFAULT_CONFIG, "utf-8");
    created.push(paths.config);
  }

  // SQLite cache — always validate; recreate if empty/corrupt.
  // `getDb()` is idempotent on healthy DBs (initSchema uses IF NOT EXISTS),
  // but a zero-byte or otherwise invalid file must be removed first or
  // `new Database()` will not repair it for us.
  if (before.db && statSync(paths.db).size === 0) {
    unlinkSync(paths.db);
    created.push(`${paths.db} (empty file replaced)`);
  }
  try {
    getDb();
    closeDb();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new LensError(`failed to open SQLite cache at ${paths.db}: ${msg}`, {
      code: "db_corrupt",
      hint: "Remove the file and run: lens init   (or: lens rebuild-index to regenerate from markdown)",
    });
  }
  if (!before.db) {
    created.push(paths.db);
  }

  // Git version tracking — skip gracefully if git unavailable
  if (!before.git) {
    try {
      execFileSync("git", ["init"], { cwd: paths.root, stdio: "ignore" });
      const gitignore = `${paths.root}/.gitignore`;
      if (!existsSync(gitignore)) {
        writeFileSync(gitignore, "index.sqlite\nindex.sqlite-wal\nindex.sqlite-shm\n", "utf-8");
      }
      execFileSync("git", ["add", "."], { cwd: paths.root, stdio: "ignore" });
      execFileSync("git", ["commit", "-m", wasPartial ? "lens init (repair)" : "lens init", "--no-gpg-sign"], {
        cwd: paths.root,
        stdio: "ignore",
        env: { ...process.env, GIT_AUTHOR_NAME: "lens", GIT_AUTHOR_EMAIL: "lens@local", GIT_COMMITTER_NAME: "lens", GIT_COMMITTER_EMAIL: "lens@local" },
      });
      created.push(`${paths.root}/.git`);
    } catch {
      // Git not available — continue without version tracking
    }
  }

  const status = wasPartial ? "repaired" : "initialized";

  if (opts.json) {
    respondSuccess({ status, path: paths.root, created });
  } else {
    if (wasPartial) {
      console.log(`Repaired partial lens install at ${paths.root}`);
      console.log(`\nFilled in:`);
      for (const path of created) console.log(`  ${path}`);
    } else {
      console.log(`Initialized lens at ${paths.root}`);
      console.log(`\nCreated:`);
      console.log(`  ${paths.notes}/`);
      console.log(`  ${paths.sources}/`);
      console.log(`  ${paths.tasks}/`);
      console.log(`  ${paths.raw}/`);
      console.log(`  ${paths.db}`);
      console.log(`  ${paths.config}`);
    }
    console.log(`\nNext: lens ingest <url> or lens note "<text>"`);
  }
}
