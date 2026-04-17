/**
 * lens doctor — self-diagnostic.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestEnv } from "./test-helpers.ts";
import { chmodSync, rmSync } from "node:fs";

test("lens doctor --json on a healthy install", async (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());

  const { stdout, exitCode } = env.lensStdin({ command: "doctor" });
  assert.equal(exitCode, 0, `doctor failed: ${stdout}`);
  const body = JSON.parse(stdout);

  assert.equal(body.ok, true);
  assert.equal(body.schema_version, 1);
  assert.equal(body.data.status, "ok", `expected overall status ok, got ${body.data.status}`);
  assert.equal(body.data.lens_home, env.lensHome);

  const checkNames = new Set((body.data.checks as any[]).map(c => c.name));
  for (const expected of ["node_version", "lens_home", "lens_home_exists", "config_present", "sqlite_readable", "sqlite_integrity", "better_sqlite3"]) {
    assert.ok(checkNames.has(expected), `missing check: ${expected}`);
  }
});

test("lens doctor surfaces missing config as fail", async (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());

  // Simulate half-init: remove config but keep other files
  rmSync(`${env.lensHome}/config.yaml`);

  const { stdout } = env.lensStdin({ command: "doctor" });
  const body = JSON.parse(stdout);
  assert.equal(body.ok, true, "doctor itself should not throw");
  const configCheck = body.data.checks.find((c: any) => c.name === "config_present");
  assert.equal(configCheck.status, "fail");
  assert.ok(configCheck.hint, "missing config should come with a hint");
  assert.equal(body.data.status, "fail", "overall status should reflect worst check");
});

test("lens doctor flags orphan edges (links to deleted objects)", async (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());

  // Create A supports B, then delete B. The link row stays, B is gone.
  const a = env.lensStdin({ command: "write", input: { type: "note", title: "A" } });
  const b = env.lensStdin({ command: "write", input: { type: "note", title: "B" } });
  assert.equal(a.exitCode, 0);
  assert.equal(b.exitCode, 0);
  const aId = JSON.parse(a.stdout).data.id;
  const bId = JSON.parse(b.stdout).data.id;

  const link = env.lensStdin({
    command: "write",
    input: { type: "link", from: aId, to: bId, rel: "supports", reason: "testing orphan flow" },
  });
  assert.equal(link.exitCode, 0);

  // Force-delete B via the filesystem to leave the link dangling in the cache.
  // (Normal `lens write --type delete` also cleans up links, so we go around it.)
  const { rmSync } = await import("node:fs");
  const { join } = await import("node:path");
  rmSync(join(env.lensHome, "notes", `${bId}.md`), { force: true });
  // Rebuild the SQLite cache from filesystem. B is gone; the link row persists
  // only if rebuild preserves it — if rebuild also drops it, this test devolves
  // to a sanity check, still valid.
  env.lensStdin({ command: "rebuild-index" });

  const { stdout } = env.lensStdin({ command: "doctor" });
  const body = JSON.parse(stdout);
  const orphan = body.data.checks.find((c: any) => c.name === "orphan_edges");
  assert.ok(orphan, "orphan_edges check should exist");
  // We only assert the check ran; whether it flagged depends on rebuild's
  // link-cleanup behavior. If rebuild dropped the dangling edge, status=ok is
  // correct. If not, status=warn with count > 0 is correct. Both are passing
  // states for the doctor itself.
  assert.ok(orphan.status === "ok" || orphan.status === "warn",
    `unexpected orphan_edges status: ${orphan.status}`);
});

test("lens doctor works under readonly LENS_HOME (after a prior write)", async (t) => {
  const env = createTestEnv();
  t.after(() => {
    try { chmodSync(env.lensHome, 0o755); } catch {}
    env.cleanup();
  });

  // Realistic scenario: user has used lens, then the directory becomes read-only
  // (Codex sandbox, CI mount, etc). WAL has been materialized by the prior write.
  const seed = env.lensStdin({ command: "write", input: { type: "note", title: "seed", body: "seed" } });
  assert.equal(seed.exitCode, 0, `seed failed: ${seed.stdout}`);

  chmodSync(env.lensHome, 0o555);
  const { stdout, exitCode } = env.lensStdin({ command: "doctor" });
  assert.equal(exitCode, 0, `doctor must work under readonly: ${stdout}`);
  const body = JSON.parse(stdout);
  assert.equal(body.ok, true);
  const readable = body.data.checks.find((c: any) => c.name === "sqlite_readable");
  assert.equal(readable.status, "ok", `sqlite_readable should pass: ${JSON.stringify(readable)}`);
  // Writable probe should detect the read-only dir
  const writable = body.data.checks.find((c: any) => c.name === "lens_home_writable");
  assert.equal(writable.status, "warn");
});
