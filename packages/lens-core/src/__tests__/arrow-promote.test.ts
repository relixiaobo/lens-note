/**
 * arrow-promote crossing: the ONE place where a whiteboard operation writes
 * into the graph layer. These tests exercise the CLI path (`lens board
 * arrow-promote`), which routes through the shared `promoteArrow` helper
 * also used by the view server. Covers:
 *
 *   1. Happy path — creates the graph rel + records promotion on the arrow.
 *   2. Conflict — re-promoting with a different rel is rejected and the
 *      original graph rel is not touched.
 *   3. Invalid endpoints — source/task endpoints can't promote.
 *   4. Idempotent re-promote with same rel.
 */

import { test, describe, afterEach, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { createTestEnv } from "./test-helpers";

type Env = ReturnType<typeof createTestEnv>;
let env: Env;

beforeEach(() => { env = createTestEnv(); });
afterEach(() => env.cleanup());

function parseOk(res: { stdout: string; exitCode: number } | string): any {
  const stdout = typeof res === "string" ? res : res.stdout;
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, true, `expected ok envelope, got: ${stdout}`);
  return parsed.data;
}

function parseErr(res: { stdout: string; exitCode: number } | string): { code: string; message: string } {
  const stdout = typeof res === "string" ? res : res.stdout;
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, false, `expected error envelope, got: ${stdout}`);
  return parsed.error;
}

describe("arrow-promote crossing", () => {
  test("happy path: promotes to graph rel and records promotion", () => {
    const a = parseOk(env.lensStdin({
      command: "write",
      input: { type: "note", title: "Note A", body: "A" },
    }));
    const b = parseOk(env.lensStdin({
      command: "write",
      input: { type: "note", title: "Note B", body: "B" },
    }));

    const wb = parseOk(env.lensStdin({
      command: "board",
      positional: ["create"],
      flags: { title: "promo-test" },
    }));
    parseOk(env.lensStdin({
      command: "board",
      positional: ["add", wb.id, a.id, b.id],
    }));
    const arrowRes = parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow", wb.id],
      flags: { from: a.id, to: b.id, label: "draft" },
    }));
    const arrowId = arrowRes.arrow.id;

    const out = parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrowId],
      flags: { rel: "supports", reason: "evidence chain" },
    }));
    assert.equal(out.rel, "supports");
    assert.equal(out.arrow.promoted_to.rel, "supports");
    assert.equal(out.arrow.promoted_to.from_note, a.id);
    assert.equal(out.arrow.promoted_to.to_note, b.id);

    // Graph rel is now readable via `links`.
    const links = parseOk(env.lensStdin({
      command: "links",
      positional: [a.id],
      flags: { rel: "supports" },
    }));
    const match = links.forward.find((l: any) => l.id === b.id);
    assert.ok(match, "expected supports link in graph after promotion");
  });

  test("conflict: re-promoting with different rel is rejected, original link untouched", () => {
    const a = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "A", body: "a" } }));
    const b = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "B", body: "b" } }));
    const wb = parseOk(env.lensStdin({ command: "board", positional: ["create"], flags: { title: "x" } }));
    parseOk(env.lensStdin({ command: "board", positional: ["add", wb.id, a.id, b.id] }));
    const { arrow } = parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow", wb.id],
      flags: { from: a.id, to: b.id },
    }));

    parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrow.id],
      flags: { rel: "supports" },
    }));
    const second = env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrow.id],
      flags: { rel: "contradicts" },
    });
    assert.notEqual(second.exitCode, 0);
    const err = parseErr(second.stdout);
    assert.equal(err.code, "promotion_conflict");

    // Original `supports` graph rel must still be present and no spurious
    // `contradicts` link should have been created.
    const links = parseOk(env.lensStdin({ command: "links", positional: [a.id] }));
    const fwd = links.forward.filter((l: any) => l.id === b.id);
    assert.equal(fwd.length, 1);
    assert.equal(fwd[0].rel, "supports");
  });

  test("idempotent: promoting twice with same rel is a no-op", () => {
    const a = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "A", body: "a" } }));
    const b = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "B", body: "b" } }));
    const wb = parseOk(env.lensStdin({ command: "board", positional: ["create"], flags: { title: "x" } }));
    parseOk(env.lensStdin({ command: "board", positional: ["add", wb.id, a.id, b.id] }));
    const { arrow } = parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow", wb.id],
      flags: { from: a.id, to: b.id },
    }));

    parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrow.id],
      flags: { rel: "refines" },
    }));
    const again = env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrow.id],
      flags: { rel: "refines" },
    });
    assert.equal(again.exitCode, 0, `expected idempotent success, got stdout: ${again.stdout}`);
    const out = parseOk(again.stdout);
    assert.equal(out.arrow.promoted_to.rel, "refines");
  });

  test("rejects non-note endpoints", () => {
    const note = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "N" } }));
    const src = parseOk(env.lensStdin({ command: "write", input: { type: "source", title: "S", url: "https://x" } }));
    const wb = parseOk(env.lensStdin({ command: "board", positional: ["create"], flags: { title: "x" } }));
    parseOk(env.lensStdin({ command: "board", positional: ["add", wb.id, note.id, src.id] }));
    const { arrow } = parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow", wb.id],
      flags: { from: note.id, to: src.id },
    }));

    const out = env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrow.id],
      flags: { rel: "supports" },
    });
    assert.notEqual(out.exitCode, 0);
    const err = parseErr(out.stdout);
    assert.equal(err.code, "invalid_arg");
    assert.match(err.message, /both endpoints to be notes/);
  });

  test("rejects invalid rel (e.g., 'indexes' is not user-promotable)", () => {
    const a = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "A" } }));
    const b = parseOk(env.lensStdin({ command: "write", input: { type: "note", title: "B" } }));
    const wb = parseOk(env.lensStdin({ command: "board", positional: ["create"], flags: { title: "x" } }));
    parseOk(env.lensStdin({ command: "board", positional: ["add", wb.id, a.id, b.id] }));
    const { arrow } = parseOk(env.lensStdin({
      command: "board",
      positional: ["arrow", wb.id],
      flags: { from: a.id, to: b.id },
    }));

    const out = env.lensStdin({
      command: "board",
      positional: ["arrow-promote", wb.id, arrow.id],
      flags: { rel: "indexes" },
    });
    assert.notEqual(out.exitCode, 0);
    const err = parseErr(out.stdout);
    assert.equal(err.code, "invalid_arg");
  });
});
