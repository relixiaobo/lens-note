/**
 * Tests for lens index command (Schlagwortregister).
 *
 * Runs via: node --import tsx/esm --test src/__tests__/index-cmd.test.ts
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createTestEnv } from "./test-helpers";

const { lens, lensStdin, cleanup } = createTestEnv();

after(() => cleanup());

// Helper: create a test note and return its ID
function createTestNote(title: string): string {
  const tmpFile = join(tmpdir(), `lens-test-idx-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(tmpFile, JSON.stringify({ type: "note", title, body: "test" }));
  try {
    const { stdout } = lens("write", "--file", tmpFile, "--json");
    return JSON.parse(stdout).id;
  } finally {
    unlinkSync(tmpFile);
  }
}

// Helper: create a test source and return its ID
function createTestSource(title: string): string {
  const tmpFile = join(tmpdir(), `lens-test-idx-src-${Date.now()}.json`);
  writeFileSync(tmpFile, JSON.stringify({ type: "source", title, source_type: "manual_note" }));
  try {
    const { stdout } = lens("write", "--file", tmpFile, "--json");
    return JSON.parse(stdout).id;
  } finally {
    unlinkSync(tmpFile);
  }
}

describe("lens index (Schlagwortregister)", () => {
  it("lists empty index", () => {
    const { stdout, exitCode } = lens("index", "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.count, 0);
    assert.deepEqual(out.keywords, {});
  });

  it("adds a note to a keyword", () => {
    const noteId = createTestNote("Test index add");

    const { stdout, exitCode } = lens("index", "add", "TestKW", noteId, "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.action, "added");
    assert.equal(out.keyword, "TestKW");
    assert.equal(out.id, noteId);
    assert.equal(out.entry_count, 1);
    assert.equal(out.title, "Test index add");
  });

  it("shows entries for a keyword after add", () => {
    const noteId = createTestNote("Test index show");
    lens("index", "add", "ShowKW", noteId, "--json");

    const { stdout, exitCode } = lens("index", "ShowKW", "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.keyword, "ShowKW");
    assert.equal(out.entries.length, 1);
    assert.equal(out.entries[0].id, noteId);
    assert.equal(out.entries[0].title, "Test index show");
  });

  it("lists keywords after add", () => {
    const { stdout } = lens("index", "--json");
    const out = JSON.parse(stdout);
    assert.ok(out.count >= 2); // TestKW + ShowKW from prior tests
  });

  it("idempotent add returns already_exists", () => {
    const noteId = createTestNote("Test idempotent");
    lens("index", "add", "IdempKW", noteId, "--json");

    const { stdout, exitCode } = lens("index", "add", "IdempKW", noteId, "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.action, "already_exists");
  });

  it("allows multiple entries per keyword", () => {
    const id1 = createTestNote("Multi entry 1");
    const id2 = createTestNote("Multi entry 2");

    lens("index", "add", "MultiKW", id1, "--json");
    const { stdout } = lens("index", "add", "MultiKW", id2, "--json");
    const out = JSON.parse(stdout);
    assert.equal(out.entry_count, 2);
  });

  it("rejects 4th entry (max 3)", () => {
    const ids = [
      createTestNote("Cap test 1"),
      createTestNote("Cap test 2"),
      createTestNote("Cap test 3"),
      createTestNote("Cap test 4"),
    ];

    lens("index", "add", "CapKW", ids[0], "--json");
    lens("index", "add", "CapKW", ids[1], "--json");
    lens("index", "add", "CapKW", ids[2], "--json");

    const { stdout, exitCode } = lens("index", "add", "CapKW", ids[3], "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /already has 3 entries/);
  });

  it("rejects non-note IDs", () => {
    const srcId = createTestSource("Test source");

    const { stdout, exitCode } = lens("index", "add", "SrcKW", srcId, "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /Only notes can be indexed/);
  });

  it("rejects non-existent note", () => {
    const { stdout, exitCode } = lens("index", "add", "BadKW", "note_01ZZZZZZZZZZZZZZZZZZZZZZZZ", "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /not found/i);
  });

  it("removes entire keyword", () => {
    const noteId = createTestNote("Test remove");
    lens("index", "add", "RemKW", noteId, "--json");

    const { stdout, exitCode } = lens("index", "remove", "RemKW", "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.action, "removed");
    assert.equal(out.keyword, "RemKW");
    assert.deepEqual(out.removed_entries, [noteId]);
  });

  it("removes single entry from keyword", () => {
    const id1 = createTestNote("Single remove 1");
    const id2 = createTestNote("Single remove 2");
    lens("index", "add", "SRemKW", id1, "--json");
    lens("index", "add", "SRemKW", id2, "--json");

    const { stdout, exitCode } = lens("index", "remove", "SRemKW", id1, "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.action, "removed_entry");
    assert.equal(out.id, id1);

    const { stdout: listOut } = lens("index", "SRemKW", "--json");
    const show = JSON.parse(listOut);
    assert.equal(show.entries.length, 1);
    assert.equal(show.entries[0].id, id2);
  });

  it("errors on removing non-existent keyword", () => {
    const { exitCode, stdout } = lens("index", "remove", "NoSuchKW", "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /Keyword not found/);
  });

  it("errors on showing non-existent keyword", () => {
    const { exitCode, stdout } = lens("index", "NoSuchKW", "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /Keyword not found/);
  });

  it("errors on too many positional args", () => {
    const { exitCode, stdout } = lens("index", "foo", "bar", "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /Usage/);
  });

  it("rejects reserved keyword 'add'", () => {
    const noteId = createTestNote("Reserved test");
    const { exitCode, stdout } = lens("index", "add", "add", noteId, "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /reserved subcommand/);
  });

  it("rejects __proto__ keyword", () => {
    const noteId = createTestNote("Proto test");
    const { exitCode, stdout } = lens("index", "add", "__proto__", noteId, "--json");
    assert.equal(exitCode, 1);
    const out = JSON.parse(stdout);
    assert.match(out.error.message, /cannot be used/);
  });

  it("works via --stdin dispatch", () => {
    const noteId = createTestNote("Stdin test");

    // Add
    const addResult = lensStdin({ command: "index", positional: ["add", "StdinKW", noteId] });
    assert.equal(addResult.exitCode, 0);
    const addOut = JSON.parse(addResult.stdout);
    assert.equal(addOut.action, "added");

    // Show
    const showResult = lensStdin({ command: "index", positional: ["StdinKW"] });
    assert.equal(showResult.exitCode, 0);
    const showOut = JSON.parse(showResult.stdout);
    assert.equal(showOut.keyword, "StdinKW");

    // List
    const listResult = lensStdin({ command: "index" });
    assert.equal(listResult.exitCode, 0);
    const listOut = JSON.parse(listResult.stdout);
    assert.ok(listOut.keywords["StdinKW"]);

    // Remove
    const removeResult = lensStdin({ command: "index", positional: ["remove", "StdinKW"] });
    assert.equal(removeResult.exitCode, 0);
    const removeOut = JSON.parse(removeResult.stdout);
    assert.equal(removeOut.action, "removed");
  });
});
