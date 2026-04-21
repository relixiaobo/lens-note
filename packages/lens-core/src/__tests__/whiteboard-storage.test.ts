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
  test("create → read roundtrip with required collections", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "Sider 交互研究" });
    assert.match(wb.id, /^wb_[A-Z0-9]{26}$/);
    assert.equal(wb.type, "whiteboard");
    assert.equal(wb.title, "Sider 交互研究");
    assert.deepEqual(wb.members, []);
    assert.deepEqual(wb.groups, []);
    assert.deepEqual(wb.arrows, []);
    assert.deepEqual(wb.camera, { x: 0, y: 0, scale: 1 });

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

  test("updateMembers updates coords for existing members only", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    storage.addMembers(wb.id, [c1]);

    const after = storage.updateMembers(wb.id, {
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

  // ── Groups ─────────────────────────────────────────────────

  test("addGroup creates group and optionally nests members", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    const c2 = "note_01ABC00000000000000000000B";
    storage.addMembers(wb.id, [c1, c2]);

    const res = storage.addGroup(wb.id, {
      label: "Evidence", x: 0, y: 0, width: 400, height: 200,
      members: [c1],
    });
    assert.match(res.group.id, /^grp_[A-Z0-9]{26}$/);
    assert.equal(res.group.label, "Evidence");

    const read = storage.readWhiteboard(wb.id);
    const member1 = read.members.find((m: any) => m.id === c1);
    const member2 = read.members.find((m: any) => m.id === c2);
    assert.equal(member1.parent, res.group.id);
    assert.equal(member2.parent, undefined);
  });

  test("removeGroup clears parent refs but keeps members", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    storage.addMembers(wb.id, [c1]);
    const { group } = storage.addGroup(wb.id, {
      label: "g", x: 0, y: 0, width: 100, height: 100, members: [c1],
    });

    const after = storage.removeGroup(wb.id, group.id);
    assert.equal(after.groups.length, 0);
    assert.equal(after.members.length, 1);
    assert.equal(after.members[0].parent, undefined);
  });

  // ── Arrows ─────────────────────────────────────────────────

  test("addArrow validates endpoints exist on the board", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    storage.addMembers(wb.id, [c1]);

    assert.throws(() => storage.addArrow(wb.id, {
      from: c1,
      to: "note_01ABC00000000000000000000Z", // not a member
    }), /must be existing whiteboard members/);
  });

  test("addArrow rejects self-loop", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    storage.addMembers(wb.id, [c1]);

    assert.throws(() => storage.addArrow(wb.id, { from: c1, to: c1 }), /loop/);
  });

  test("removeMember cascades to arrows touching it", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    const c2 = "note_01ABC00000000000000000000B";
    storage.addMembers(wb.id, [c1, c2]);
    storage.addArrow(wb.id, { from: c1, to: c2, label: "rebuts" });

    const after = storage.removeMember(wb.id, c1);
    assert.equal(after.arrows.length, 0);
  });

  test("setArrowPromotion records promotion; idempotent", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    const c2 = "note_01ABC00000000000000000000B";
    storage.addMembers(wb.id, [c1, c2]);
    const { arrow } = storage.addArrow(wb.id, { from: c1, to: c2 });

    const promo = { rel: "contradicts", from_note: c1, to_note: c2 };
    const once = storage.setArrowPromotion(wb.id, arrow.id, promo);
    const promoted = once.arrows.find((a: any) => a.id === arrow.id);
    assert.deepEqual(promoted.promoted_to, promo);

    // Second call with identical values — unchanged, not doubled.
    const beforeTs = once.updated_at;
    await new Promise(r => setTimeout(r, 5));
    const twice = storage.setArrowPromotion(wb.id, arrow.id, promo);
    assert.equal(twice.updated_at, beforeTs, "idempotent promotion must not bump updated_at");
  });

  test("setArrowPromotion throws on conflicting rel (already promoted)", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const c1 = "note_01ABC00000000000000000000A";
    const c2 = "note_01ABC00000000000000000000B";
    storage.addMembers(wb.id, [c1, c2]);
    const { arrow } = storage.addArrow(wb.id, { from: c1, to: c2 });

    storage.setArrowPromotion(wb.id, arrow.id, { rel: "contradicts", from_note: c1, to_note: c2 });
    assert.throws(
      () => storage.setArrowPromotion(wb.id, arrow.id, { rel: "supports", from_note: c1, to_note: c2 }),
      /already promoted/,
      "silent overwrite would leave the old graph link orphaned",
    );
    // And the recorded promotion stays at the first value.
    const after = storage.readWhiteboard(wb.id);
    const stored = after.arrows.find((a: any) => a.id === arrow.id);
    assert.equal(stored.promoted_to.rel, "contradicts");
  });

  test("setArrowPromotion on missing arrow is a no-op (not a throw)", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    // No arrow exists — caller may race. Storage should return the board
    // unchanged so the crossing helper can detect the mismatch and compensate.
    const out = storage.setArrowPromotion(wb.id, "arr_01NONEXISTENT00000000000000", {
      rel: "supports",
      from_note: "note_01ABC00000000000000000000A",
      to_note: "note_01ABC00000000000000000000B",
    });
    assert.ok(out, "returns the whiteboard, not null");
    assert.equal(out.arrows.length, 0);
  });

  // ── Camera ─────────────────────────────────────────────────

  test("setCamera persists viewport and is idempotent", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    await new Promise(r => setTimeout(r, 5));
    const once = storage.setCamera(wb.id, { x: 100, y: 200, scale: 1.5 });
    assert.deepEqual(once.camera, { x: 100, y: 200, scale: 1.5 });
    assert.ok(once.updated_at > wb.updated_at);

    const ts = once.updated_at;
    await new Promise(r => setTimeout(r, 5));
    const twice = storage.setCamera(wb.id, { x: 100, y: 200, scale: 1.5 });
    assert.equal(twice.updated_at, ts, "unchanged camera must not bump updated_at");
  });

  // ── Dangling members helper ────────────────────────────────

  test("findDanglingMembers flags members absent from live set", async () => {
    const storage = await loadStorage();
    const wb = storage.createWhiteboard({ title: "x" });
    const live = "note_01LIVE0000000000000000000A";
    const gone = "note_01GONE0000000000000000000A";
    storage.addMembers(wb.id, [live, gone]);

    const dangling = storage.findDanglingMembers(
      storage.readWhiteboard(wb.id),
      new Set([live]),
    );
    assert.deepEqual(dangling, [gone]);
  });
});
