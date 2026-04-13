/**
 * Shared test helpers — isolated LENS_HOME for each test suite.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "../..");

/** Create an isolated LENS_HOME, run `lens init`, return path + helpers. */
export function createTestEnv() {
  const lensHome = mkdtempSync(join(tmpdir(), "lens-test-"));
  const env = { ...process.env, LENS_HOME: lensHome };

  // Initialize
  execFileSync("npx", ["tsx", join(ROOT, "src/main.ts"), "init"], {
    encoding: "utf-8",
    cwd: ROOT,
    env,
    timeout: 15_000,
  });

  function lens(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
    try {
      const stdout = execFileSync("npx", ["tsx", join(ROOT, "src/main.ts"), ...args], {
        encoding: "utf-8",
        cwd: ROOT,
        env,
        timeout: 15_000,
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (err: any) {
      return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status ?? 1 };
    }
  }

  function lensStdin(envelope: object): { stdout: string; stderr: string; exitCode: number } {
    try {
      const stdout = execFileSync("npx", ["tsx", join(ROOT, "src/main.ts"), "--stdin"], {
        encoding: "utf-8",
        cwd: ROOT,
        env,
        input: JSON.stringify(envelope),
        timeout: 15_000,
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (err: any) {
      return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status ?? 1 };
    }
  }

  function cleanup() {
    rmSync(lensHome, { recursive: true, force: true });
  }

  return { lensHome, lens, lensStdin, cleanup };
}
