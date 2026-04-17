/**
 * Read-only DB mode: query commands must work when the entire LENS_HOME tree
 * is read-only (directory + SQLite file + WAL/SHM sidecars). Writes must fail
 * loudly in the same state. Simulates the Codex sandbox / CI mount scenario
 * the readonly mode was designed for.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createTestEnv } from "./test-helpers.ts";

function chmodRecursive(path: string, mode: number): void {
  const stat = statSync(path);
  chmodSync(path, mode);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      chmodRecursive(join(path, entry), mode);
    }
  }
}

function restorePerms(path: string): void {
  try {
    chmodRecursive(path, 0o755);
  } catch {
    /* best-effort cleanup */
  }
}

test("readonly DB mode — whole tree immutable", async (t) => {
  const env = createTestEnv();
  t.after(() => {
    restorePerms(env.lensHome);
    env.cleanup();
  });

  // Seed content while directory is still writable
  const seed1 = env.lensStdin({
    command: "write",
    input: { type: "note", title: "Readonly seed alpha", body: "first note for readonly tests" },
  });
  assert.equal(seed1.exitCode, 0, "seed note 1 should succeed");
  const note1Id = JSON.parse(seed1.stdout).data.id as string;
  assert.match(note1Id, /^note_[A-Z0-9]{26}$/);

  const seed2 = env.lensStdin({
    command: "write",
    input: { type: "note", title: "Readonly seed beta", body: "second note for readonly tests" },
  });
  assert.equal(seed2.exitCode, 0, "seed note 2 should succeed");
  const note2Id = JSON.parse(seed2.stdout).data.id as string;

  const linkRes = env.lensStdin({
    command: "write",
    input: { type: "link", from: note1Id, rel: "related", to: note2Id, reason: "both seeds" },
  });
  assert.equal(linkRes.exitCode, 0, "seed link should succeed");

  // Lock everything: dir, DB, WAL, SHM, subdirs, note files. This is closer to
  // a bind-mounted read-only cache than a simple `chmod 555` on just the root.
  chmodRecursive(env.lensHome, 0o555);
  // Plain files go to 444 to forbid even owner-write (some FS ignore dir
  // ACLs when the file itself is still writable).
  const relock = (p: string) => { if (existsSync(p)) chmodSync(p, 0o444); };
  relock(`${env.lensHome}/index.sqlite`);
  relock(`${env.lensHome}/index.sqlite-wal`);
  relock(`${env.lensHome}/index.sqlite-shm`);
  relock(`${env.lensHome}/config.yaml`);

  await t.test("search works under readonly", () => {
    const res = env.lensStdin({ command: "search", positional: ["seed"] });
    assert.equal(res.exitCode, 0, `search failed: ${res.stdout}`);
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, true);
    assert.ok(body.data.count >= 1, "expected at least one search hit");
  });

  await t.test("show works under readonly", () => {
    const res = env.lensStdin({ command: "show", positional: [note1Id] });
    assert.equal(res.exitCode, 0, `show failed: ${res.stdout}`);
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.id, note1Id);
  });

  await t.test("links works under readonly", () => {
    const res = env.lensStdin({ command: "links", positional: [note1Id] });
    assert.equal(res.exitCode, 0, `links failed: ${res.stdout}`);
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data.forward));
  });

  await t.test("list notes works under readonly", () => {
    const res = env.lensStdin({ command: "list", positional: ["notes"] });
    assert.equal(res.exitCode, 0, `list failed: ${res.stdout}`);
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, true);
    assert.ok(body.data.count >= 2);
  });

  await t.test("discover works under readonly", () => {
    const res = env.lensStdin({ command: "discover", positional: [note1Id], flags: { duplicates: true } });
    assert.equal(res.exitCode, 0, `discover failed: ${res.stdout}`);
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, true);
  });

  await t.test("lint --summary works under readonly", () => {
    const res = env.lensStdin({ command: "lint", flags: { summary: true } });
    assert.equal(res.exitCode, 0, `lint --summary failed: ${res.stdout}`);
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, true);
  });

  await t.test("write fails cleanly under full readonly lock", () => {
    const res = env.lensStdin({
      command: "write",
      input: { type: "note", title: "should not persist" },
    });
    assert.notEqual(res.exitCode, 0, "write must fail when the whole tree is read-only");
    const body = JSON.parse(res.stdout);
    assert.equal(body.ok, false);
    // Just assert envelope is structured — error code/hint may vary depending
    // on which filesystem call trips first (EACCES vs SQLite readonly).
    assert.ok(body.error, "expected error object in envelope");
  });
});
