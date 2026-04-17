/**
 * `lens init` should repair half-initialized LENS_HOME directories.
 *
 * A half-init occurs when getDb() implicitly created the SQLite file before
 * `init` ran (for example via a write command on a fresh system). Previously,
 * running `init` later would see config.yaml missing and create it, but the
 * same logic returned "already_initialized" whenever config.yaml was present,
 * even if subdirs or .git were missing. The new behavior inspects each
 * component and only reports already_initialized when all are present.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");

function runLens(lensHome: string, args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", join(ROOT, "src/main.ts"), ...args], {
      encoding: "utf-8",
      cwd: ROOT,
      env: { ...process.env, LENS_HOME: lensHome },
      timeout: 15_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || "", exitCode: err.status ?? 1 };
  }
}

function lensStdin(lensHome: string, envelope: object): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", join(ROOT, "src/main.ts"), "--stdin"], {
      encoding: "utf-8",
      cwd: ROOT,
      env: { ...process.env, LENS_HOME: lensHome },
      input: JSON.stringify(envelope),
      timeout: 15_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || "", exitCode: err.status ?? 1 };
  }
}

test("init on fresh directory reports initialized", async (t) => {
  const lensHome = mkdtempSync(join(tmpdir(), "lens-init-fresh-"));
  t.after(() => rmSync(lensHome, { recursive: true, force: true }));

  // Use fresh nested subdir so the tmp dir itself doesn't count as half-init
  const target = join(lensHome, "home");
  const { stdout, exitCode } = lensStdin(target, { command: "init" });
  assert.equal(exitCode, 0, stdout);
  const body = JSON.parse(stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.status, "initialized");
});

test("init on complete directory reports already_initialized", async (t) => {
  const lensHome = mkdtempSync(join(tmpdir(), "lens-init-complete-"));
  const target = join(lensHome, "home");
  t.after(() => rmSync(lensHome, { recursive: true, force: true }));

  const first = lensStdin(target, { command: "init" });
  assert.equal(first.exitCode, 0);
  assert.equal(JSON.parse(first.stdout).data.status, "initialized");

  const second = lensStdin(target, { command: "init" });
  assert.equal(second.exitCode, 0);
  assert.equal(JSON.parse(second.stdout).data.status, "already_initialized");
});

test("init repairs a half-init where only SQLite and bare dir exist", async (t) => {
  const lensHome = mkdtempSync(join(tmpdir(), "lens-init-halfdb-"));
  const target = join(lensHome, "home");
  t.after(() => rmSync(lensHome, { recursive: true, force: true }));

  // Simulate the half-init state: directory exists with just a stub (zero-byte)
  // DB file and a single subdir. No config.yaml, no git, most subdirs missing.
  mkdirSync(target, { recursive: true });
  mkdirSync(join(target, "notes"));
  writeFileSync(join(target, "index.sqlite"), ""); // zero-byte — must be recognized as corrupt and replaced

  const { stdout, exitCode } = lensStdin(target, { command: "init" });
  assert.equal(exitCode, 0, stdout);
  const body = JSON.parse(stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.status, "repaired", `expected repair, got ${body.data.status}`);

  // Verify the previously missing pieces are now present
  assert.ok(existsSync(join(target, "config.yaml")), "config.yaml should exist after repair");
  assert.ok(existsSync(join(target, "sources")), "sources/ should exist after repair");
  assert.ok(existsSync(join(target, "tasks")), "tasks/ should exist after repair");
  assert.ok(existsSync(join(target, "raw")), "raw/ should exist after repair");

  // Empty DB file must have been replaced with a valid SQLite file — verify by
  // running a downstream command that opens it.
  const sizeAfter = statSync(join(target, "index.sqlite")).size;
  assert.ok(sizeAfter > 0, "DB file must be non-empty after repair");
  const search = lensStdin(target, { command: "search", positional: ["anything"] });
  assert.equal(search.exitCode, 0, `readonly search failed on repaired DB: ${search.stdout}`);
  const sbody = JSON.parse(search.stdout);
  assert.equal(sbody.ok, true, "repaired DB must be queryable");

  assert.ok(Array.isArray(body.data.created));
  assert.ok(body.data.created.length > 0);
});

test("init repairs a half-init where only config is missing", async (t) => {
  const lensHome = mkdtempSync(join(tmpdir(), "lens-init-noconfig-"));
  const target = join(lensHome, "home");
  t.after(() => rmSync(lensHome, { recursive: true, force: true }));

  // Full init, then delete config — simulates accidental corruption
  lensStdin(target, { command: "init" });
  rmSync(join(target, "config.yaml"));

  const { stdout, exitCode } = lensStdin(target, { command: "init" });
  assert.equal(exitCode, 0, stdout);
  const body = JSON.parse(stdout);
  assert.equal(body.data.status, "repaired");
  assert.ok(existsSync(join(target, "config.yaml")));
});
