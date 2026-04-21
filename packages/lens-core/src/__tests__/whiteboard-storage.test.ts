/**
 * whiteboard-storage.ts — storage layer for whiteboard entities.
 * Independent from SQLite / graph; plain JSON files.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let lensHome: string;

beforeEach(() => {
  lensHome = mkdtempSync(join(tmpdir(), "lens-wb-test-"));
  process.env.LENS_HOME = lensHome;
});

afterEach(() => {
  rmSync(lensHome, { recursive: true, force: true });
  delete process.env.LENS_HOME;
});

async function loadStorage() {
  // Fresh import per test so the module picks up the new LENS_HOME from env.
  // (paths.ts captures env at import time.)
  const url = "../core/whiteboard-storage?" + Date.now();
  return await import(url);
}

describe("whiteboard-storage", () => {
  test("create → read roundtrip", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "Sider 交互研究" });
    assert.match(wb.id, /^wb_[A-Z0-9]{26}$/);
    assert.equal(wb.type, "whiteboard");
    assert.equal(wb.title, "Sider 交互研究");
    assert.deepEqual(wb.members, []);

    const read = storage.readWhiteboard(wb.id);
    assert.deepEqual(read, wb);
  });

  test("create with body and initial members", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({
      title: "Test board",
      body: "Research log: why does X happen?",
      members: [{ id: "note_01ABC00000000000000000000A", x: 10, y: 20 }],
    });
    assert.equal(wb.body, "Research log: why does X happen?");
    assert.equal(wb.members.length, 1);
  });

  test("list returns most-recently-updated first", async () => {
    const storage = await loadStorage();
    const a = storage.createWhiteboard({ title: "A" });
    await new Promise(r => setTimeout(r, 10));
    const b = storage.createWhiteboard({ title: "B" });
    const boards = storage.listWhiteboards();
    assert.equal(boards[0].id, b.id);
    assert.equal(boards[1].id, a.id);
  });

  test("addMembers is idempotent and appends only new IDs", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    const c2 = "note_01ABC00000000000000000000B";

    let updated = storage.addMembers(wb.id, [c1, c2]);
    assert.equal(updated.members.length, 2);

    // Adding same again — unchanged
    const same = storage.addMembers(wb.id, [c1]);
    assert.equal(same.members.length, 2);

    // Mixed: one new, one existing → only one added
    const c3 = "note_01ABC00000000000000000000C";
    updated = storage.addMembers(wb.id, [c2, c3]);
    assert.equal(updated.members.length, 3);
  });

  test("removeMember filters and persists", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    const c2 = "note_01ABC00000000000000000000B";
    storage.addMembers(wb.id, [c1, c2]);

    const after = storage.removeMember(wb.id, c1);
    assert.equal(after.members.length, 1);
    assert.equal(after.members[0].id, c2);

    // Re-read from disk
    const persisted = storage.readWhiteboard(wb.id);
    assert.equal(persisted.members.length, 1);
  });

  test("updatePositions updates coords for existing members only", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    storage.addMembers(wb.id, [c1]);

    const after = storage.updatePositions(wb.id, {
      [c1]: { x: 100, y: 200 },
      "note_01NONEXISTENT000000000000000": { x: 0, y: 0 }, // ignored
    });
    assert.equal(after.members[0].x, 100);
    assert.equal(after.members[0].y, 200);
    assert.equal(after.members.length, 1);
  });

  test("findWhiteboardsContaining returns boards that reference the card", async () => {
    const storage = await loadStorage();
    const a = storage.createWhiteboard({ title: "A" });
    const b = storage.createWhiteboard({ title: "B" });
    const c = storage.createWhiteboard({ title: "C" });
    const target = "note_01ABC00000000000000000000A";
    storage.addMembers(a.id, [target]);
    storage.addMembers(c.id, [target]);

    const found = storage.findWhiteboardsContaining(target);
    const ids = new Set(found.map((w: any) => w.id));
    assert.ok(ids.has(a.id));
    assert.ok(ids.has(c.id));
    assert.ok(!ids.has(b.id));
  });

  test("deleteWhiteboard removes file; other boards untouched", async () => {
    const storage = await loadStorage();
    const a = storage.createWhiteboard({ title: "A" });
    const b = storage.createWhiteboard({ title: "B" });
    assert.equal(storage.deleteWhiteboard(a.id), true);
    assert.equal(storage.readWhiteboard(a.id), null);
    assert.ok(storage.readWhiteboard(b.id));
    // Delete non-existent → false
    assert.equal(storage.deleteWhiteboard(a.id), false);
  });

  test("updateWhiteboardMeta patches title/body and bumps updated_at", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "old" });
    await new Promise(r => setTimeout(r, 10));
    const after = storage.updateWhiteboardMeta(wb.id, { title: "new", body: "about X" });
    assert.equal(after.title, "new");
    assert.equal(after.body, "about X");
    assert.ok(after.updated_at > wb.updated_at);
  });
});
