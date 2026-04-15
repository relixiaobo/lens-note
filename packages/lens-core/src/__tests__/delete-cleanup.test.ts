/**
 * Regression tests for zombie link cleanup on delete and rebuild-index.
 *
 * Runs via: node --import tsx/esm --test src/__tests__/delete-cleanup.test.ts
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createTestEnv } from "./test-helpers";

const { lensHome, lens, cleanup } = createTestEnv();

after(() => cleanup());

function tmpJson(obj: object): string {
  const p = join(tmpdir(), `lens-del-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

function writeAndClean(obj: object): any {
  const p = tmpJson(obj);
  try {
    const { stdout } = lens("write", "--file", p, "--json");
    const out = JSON.parse(stdout);
    if (!out.ok) throw new Error(out.error?.message || "Unknown error");
    return out.data;
  } finally {
    unlinkSync(p);
  }
}

describe("delete: YAML cleanup of referring objects", () => {
  it("removes dead links[] entry from referring note when target is deleted", () => {
    const noteA = writeAndClean({ type: "note", title: "Note A — links cleanup", body: "test" }).id;
    const noteB = writeAndClean({ type: "note", title: "Note B — to be deleted", body: "test" }).id;

    // Link A → B
    writeAndClean({ type: "link", from: noteA, rel: "supports", to: noteB, reason: "test link" });

    // Confirm link exists
    const before = JSON.parse(lens("show", noteA, "--json").stdout).data;
    assert.ok(before.forward_links.some((l: any) => l.id === noteB), "link should exist before delete");

    // Delete note B
    const del = writeAndClean({ type: "delete", id: noteB });
    assert.equal(del.action, "deleted");

    // Note A's forward_links must no longer reference deleted note B
    const after = JSON.parse(lens("show", noteA, "--json").stdout).data;
    assert.ok(!after.forward_links.some((l: any) => l.id === noteB), "dead link should be removed from note A");
  });

  it("clears source: field from referring note when source is deleted", () => {
    const srcId = writeAndClean({ type: "source", title: "Source to delete", source_type: "manual_note" }).id;
    const noteId = writeAndClean({ type: "note", title: "Note referencing source", source: srcId, body: "body" }).id;

    // Delete the source
    writeAndClean({ type: "delete", id: srcId });

    // Note's source field must not point to the deleted source
    const after = JSON.parse(lens("show", noteId, "--json").stdout).data;
    assert.notEqual(after.source, srcId, "dead source reference should be cleared from note");
  });

  it("handles multiple referring notes cleaned in a single delete", () => {
    const target = writeAndClean({ type: "note", title: "Target — multiple referrers", body: "test" }).id;
    const ref1 = writeAndClean({ type: "note", title: "Referrer 1", body: "test" }).id;
    const ref2 = writeAndClean({ type: "note", title: "Referrer 2", body: "test" }).id;

    writeAndClean({ type: "link", from: ref1, rel: "supports", to: target });
    writeAndClean({ type: "link", from: ref2, rel: "refines", to: target });

    // Delete the target
    writeAndClean({ type: "delete", id: target });

    // Both referrers must have the dead link removed
    const after1 = JSON.parse(lens("show", ref1, "--json").stdout).data;
    const after2 = JSON.parse(lens("show", ref2, "--json").stdout).data;
    assert.ok(!after1.forward_links.some((l: any) => l.id === target), "ref1 dead link should be gone");
    assert.ok(!after2.forward_links.some((l: any) => l.id === target), "ref2 dead link should be gone");
  });
});

describe("rebuild-index: zombie link pruning", () => {
  it("removes zombie links from YAML and SQLite after rebuild-index", () => {
    const noteA = writeAndClean({ type: "note", title: "Note A — zombie test", body: "test" }).id;
    const noteB = writeAndClean({ type: "note", title: "Note B — to be orphaned", body: "test" }).id;

    writeAndClean({ type: "link", from: noteA, rel: "refines", to: noteB });

    // Confirm link exists
    const before = JSON.parse(lens("show", noteA, "--json").stdout).data;
    assert.ok(before.forward_links.some((l: any) => l.id === noteB), "link should exist before bypass delete");

    // Bypass CLI: manually delete note B's file to simulate pre-fix zombie scenario
    const noteBFile = join(lensHome, "notes", `${noteB}.md`);
    unlinkSync(noteBFile);

    // Run rebuild-index — should detect and clean the zombie link
    const rebuild = JSON.parse(lens("rebuild-index", "--json").stdout).data;
    assert.ok(typeof rebuild.indexed === "number", "rebuild-index should return indexed count");

    // Note A's forward_links must no longer reference note B
    const after = JSON.parse(lens("show", noteA, "--json").stdout).data;
    assert.ok(!after.forward_links.some((l: any) => l.id === noteB), "zombie link should be pruned after rebuild-index");
  });
});
