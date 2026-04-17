/**
 * LensError → envelope: errors thrown inside commands should preserve their
 * `code` and `hint` fields into the JSON envelope, so agents can recover
 * without parsing English error messages.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");

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

test("not_initialized error carries hint", async (t) => {
  // Fresh dir with no init — querying should fail with code + hint
  const lensHome = mkdtempSync(join(tmpdir(), "lens-uninit-"));
  t.after(() => rmSync(lensHome, { recursive: true, force: true }));
  const target = join(lensHome, "home");

  const { stdout, exitCode } = lensStdin(target, { command: "search", positional: ["anything"] });
  assert.notEqual(exitCode, 0);
  const body = JSON.parse(stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "not_initialized", `expected not_initialized code, got: ${JSON.stringify(body)}`);
  assert.ok(body.hint, "expected hint field in error envelope");
  assert.match(body.hint, /lens init/);
});

test("db_missing error (readonly query, no DB) carries hint", async (t) => {
  // Config exists but DB doesn't — simulates partial install where DB was deleted
  const lensHome = mkdtempSync(join(tmpdir(), "lens-nodb-"));
  t.after(() => rmSync(lensHome, { recursive: true, force: true }));
  const target = join(lensHome, "home");

  // Init fully first
  lensStdin(target, { command: "init" });
  // Remove just the DB file
  rmSync(join(target, "index.sqlite"));

  const { stdout, exitCode } = lensStdin(target, { command: "search", positional: ["anything"] });
  assert.notEqual(exitCode, 0);
  const body = JSON.parse(stdout);
  assert.equal(body.error.code, "db_missing", `expected db_missing, got: ${JSON.stringify(body)}`);
  assert.ok(body.hint);
  assert.match(body.hint, /rebuild-index|init/);
});
