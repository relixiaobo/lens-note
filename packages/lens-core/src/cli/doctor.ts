/**
 * lens doctor — self-diagnostic.
 *
 * Reports the state of the lens install so users and agents can diagnose
 * issues without reading SQLite or filesystem error messages raw.
 *
 * Each check returns {name, status: ok|warn|fail, message, hint?}. The
 * top-level status is the worst status across all checks.
 */

import { existsSync, accessSync, constants, statSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";
import Database from "better-sqlite3";
import { paths, LENS_HOME } from "../core/paths";
import type { CommandOptions } from "./commands";
import { respondSuccess, SCHEMA_VERSION } from "./response";

type CheckStatus = "ok" | "warn" | "fail";

interface Check {
  name: string;
  status: CheckStatus;
  message: string;
  hint?: string;
}

function worstStatus(checks: Check[]): CheckStatus {
  if (checks.some(c => c.status === "fail")) return "fail";
  if (checks.some(c => c.status === "warn")) return "warn";
  return "ok";
}

function isWritable(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function canCreateFile(dir: string): boolean {
  const probe = join(dir, `.lens-doctor-probe-${process.pid}`);
  try {
    writeFileSync(probe, "");
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor(_args: string[], opts: CommandOptions) {
  // --errors: show recent diagnostics only
  if (opts.errors) {
    if (!existsSync(paths.diagnostics)) {
      respondSuccess({ count: 0, entries: [], message: "No diagnostics recorded." });
      return;
    }
    const raw = readFileSync(paths.diagnostics, "utf-8").trim();
    const lines = raw ? raw.split("\n").filter(Boolean) : [];
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 20;
    const recent = lines.slice(-limit);
    const entries = recent.map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } });
    respondSuccess({ count: entries.length, total: lines.length, entries });
    return;
  }

  // --clear-errors: truncate diagnostics log
  if (opts["clear-errors"]) {
    try {
      writeFileSync(paths.diagnostics, "");
      respondSuccess({ action: "cleared", message: "Diagnostics log cleared." });
    } catch {
      respondSuccess({ action: "skipped", message: "No diagnostics file to clear." });
    }
    return;
  }

  const checks: Check[] = [];

  // 1. Node version
  const nodeVer = process.versions.node;
  const nodeMajor = parseInt(nodeVer.split(".")[0], 10);
  checks.push({
    name: "node_version",
    status: nodeMajor >= 18 ? "ok" : "fail",
    message: `node ${nodeVer}`,
    ...(nodeMajor < 18 ? { hint: "Upgrade to Node 18 or newer." } : {}),
  });

  // 2. LENS_HOME resolved
  checks.push({
    name: "lens_home",
    status: "ok",
    message: `${LENS_HOME} (${process.env.LENS_HOME ? "from LENS_HOME env" : "default"})`,
  });

  // 3. LENS_HOME exists
  const rootExists = existsSync(paths.root);
  checks.push({
    name: "lens_home_exists",
    status: rootExists ? "ok" : "warn",
    message: rootExists ? `${paths.root} exists` : `${paths.root} does not exist`,
    hint: rootExists ? undefined : "Run: lens init",
  });

  // 4. Directory writable (attempt probe — accessSync can lie on some filesystems)
  if (rootExists) {
    const writable = canCreateFile(paths.root);
    checks.push({
      name: "lens_home_writable",
      status: writable ? "ok" : "warn",
      message: writable ? "directory is writable" : "directory is read-only",
      hint: writable ? undefined : "Read-only is OK for query commands. Writes require a writable LENS_HOME.",
    });
  }

  // 5. Config present
  const configPresent = existsSync(paths.config);
  checks.push({
    name: "config_present",
    status: configPresent ? "ok" : "fail",
    message: configPresent ? `${paths.config} exists` : "config.yaml missing",
    hint: configPresent ? undefined : "Run: lens init (or lens init will repair a half-initialized directory)",
  });

  // 6. SQLite readable
  const dbExists = existsSync(paths.db);
  if (dbExists) {
    try {
      const db = new Database(paths.db, { readonly: true, fileMustExist: true });
      const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string } | undefined;
      db.close();
      const ok = integrity?.integrity_check === "ok";
      checks.push({
        name: "sqlite_readable",
        status: "ok",
        message: `opened readonly at ${paths.db}`,
      });
      checks.push({
        name: "sqlite_integrity",
        status: ok ? "ok" : "fail",
        message: ok ? "integrity_check passed" : `integrity_check: ${integrity?.integrity_check}`,
        hint: ok ? undefined : "Run: lens rebuild-index",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({
        name: "sqlite_readable",
        status: "fail",
        message: `cannot open readonly: ${msg}`,
        hint: "File may be corrupted. Try: lens rebuild-index",
      });
    }

    // 7. SQLite writable — only probe if directory appears writable, to avoid
    // creating WAL/SHM sidecars in read-only sandboxes.
    if (rootExists && isWritable(paths.root)) {
      try {
        const db = new Database(paths.db);
        db.exec("PRAGMA journal_mode=WAL");
        db.close();
        checks.push({
          name: "sqlite_writable",
          status: "ok",
          message: "opened read-write",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        checks.push({
          name: "sqlite_writable",
          status: "fail",
          message: `cannot open read-write: ${msg}`,
          hint: "Write commands will fail. Check LENS_HOME permissions.",
        });
      }
    }

    // 7.5 Orphan edges — links pointing to objects that no longer exist.
    // These can't be rendered in lens view and may indicate incomplete cleanup.
    try {
      const db = new Database(paths.db, { readonly: true, fileMustExist: true });
      const orphans = db.prepare(
        `SELECT l.from_id, l.to_id, l.rel
         FROM links l
         LEFT JOIN objects o_from ON o_from.id = l.from_id
         LEFT JOIN objects o_to   ON o_to.id   = l.to_id
         WHERE o_from.id IS NULL OR o_to.id IS NULL
         LIMIT 20`,
      ).all() as { from_id: string; to_id: string; rel: string }[];
      db.close();
      if (orphans.length === 0) {
        checks.push({ name: "orphan_edges", status: "ok", message: "none" });
      } else {
        const sample = orphans.slice(0, 3).map(o => `${o.from_id.slice(0, 14)}…→${o.to_id.slice(0, 14)}…(${o.rel})`).join(", ");
        checks.push({
          name: "orphan_edges",
          status: "warn",
          message: `${orphans.length}${orphans.length === 20 ? "+" : ""} edge(s) point to deleted objects`,
          hint: `Sample: ${sample}. Clean up with: lens rebuild-index`,
        });
      }
    } catch {
      /* non-critical; skip if DB state is already flagged by earlier checks */
    }
  } else {
    checks.push({
      name: "sqlite_readable",
      status: configPresent ? "warn" : "fail",
      message: "database file missing",
      hint: "Run: lens init (or: lens rebuild-index to regenerate from markdown)",
    });
  }

  // 8. Git available
  let gitVersion: string | null = null;
  try {
    gitVersion = execFileSync("git", ["--version"], { encoding: "utf-8", timeout: 3000 }).trim();
  } catch {
    gitVersion = null;
  }
  checks.push({
    name: "git_available",
    status: gitVersion ? "ok" : "warn",
    message: gitVersion || "git not found on PATH",
    hint: gitVersion ? undefined : "lens works without git, but version history is disabled.",
  });

  // 9. Git repo in LENS_HOME
  if (rootExists && gitVersion) {
    const hasGit = existsSync(join(paths.root, ".git"));
    checks.push({
      name: "git_repo",
      status: hasGit ? "ok" : "warn",
      message: hasGit ? `${paths.root}/.git present` : "LENS_HOME is not a git repo",
      hint: hasGit ? undefined : "Run: lens init (creates .git); or manually: cd LENS_HOME && git init",
    });
  }

  // 10. better-sqlite3 native binding
  try {
    const probe = new Database(":memory:");
    probe.close();
    checks.push({
      name: "better_sqlite3",
      status: "ok",
      message: "native binding loaded",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({
      name: "better_sqlite3",
      status: "fail",
      message: `native binding failed: ${msg}`,
      hint: "Reinstall: npm install -g lens-note --force",
    });
  }

  // 11. LENS_HOME size (info only, no status impact)
  if (dbExists) {
    try {
      const size = statSync(paths.db).size;
      checks.push({
        name: "cache_size",
        status: "ok",
        message: `${(size / 1024).toFixed(1)} KB`,
      });
    } catch {
      /* skip if stat fails */
    }
  }

  // 12. Recent diagnostics (error log)
  if (existsSync(paths.diagnostics)) {
    try {
      const raw = readFileSync(paths.diagnostics, "utf-8").trim();
      if (raw) {
        const lines = raw.split("\n").filter(Boolean);
        const recent = lines.slice(-20); // last 20 entries
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const last24h = recent.filter(l => {
          try { return JSON.parse(l).timestamp > cutoff24h; } catch { return false; }
        });
        const parsed = last24h.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        checks.push({
          name: "recent_errors",
          status: parsed.length > 5 ? "warn" : parsed.length > 0 ? "ok" : "ok",
          message: `${parsed.length} error(s) in last 24h, ${lines.length} total`,
          ...(parsed.length > 0 ? { hint: `Recent: ${parsed.slice(-3).map((e: any) => `${e.code}: ${e.message?.slice(0, 50)}`).join("; ")}` } : {}),
        });
      }
    } catch {
      // skip if unreadable
    }
  }

  const overall = worstStatus(checks);

  if (opts.json) {
    respondSuccess({
      status: overall,
      envelope_version: SCHEMA_VERSION,
      lens_home: LENS_HOME,
      checks,
    });
  } else {
    console.log(`lens doctor — ${overall.toUpperCase()}`);
    console.log(`  lens_home: ${LENS_HOME}\n`);
    const symbol = (s: CheckStatus) => (s === "ok" ? "✓" : s === "warn" ? "!" : "✗");
    for (const c of checks) {
      console.log(`  ${symbol(c.status)} ${c.name}: ${c.message}`);
      if (c.hint) console.log(`      → ${c.hint}`);
    }
  }
}
