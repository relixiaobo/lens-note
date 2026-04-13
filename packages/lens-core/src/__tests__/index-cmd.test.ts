/**
 * Tests for lens index command (Schlagwortregister).
 *
 * Runs via: node --import tsx/esm --test src/__tests__/index-cmd.test.ts
 */

import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";

const ROOT = join(import.meta.dirname, "../..");
const TSX = "npx";
const KEYWORD_INDEX_PATH = join(process.env.LENS_HOME || join(homedir(), ".lens"), "keyword-index.json");

function lens(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(TSX, ["tsx", join(ROOT, "src/main.ts"), ...args], {
      encoding: "utf-8",
      cwd: ROOT,
      timeout: 15_000,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status ?? 1 };
  }
}

function lensStdin(envelope: object): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(TSX, ["tsx", join(ROOT, "src/main.ts"), "--stdin"], {
      encoding: "utf-8",
      cwd: ROOT,
      input: JSON.stringify(envelope),
      timeout: 15_000,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status ?? 1 };
  }
}

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
  const createdIds: string[] = [];
  let savedIndex: string | null = null;

  before(() => {
    // Back up existing index if any
    if (existsSync(KEYWORD_INDEX_PATH)) {
      savedIndex = readFileSync(KEYWORD_INDEX_PATH, "utf-8");
    }
  });

  after(() => {
    // Clean up test notes
    for (const id of createdIds) {
      try { lensStdin({ command: "write", input: { type: "delete", id } }); } catch {}
    }
    // Restore original index
    if (savedIndex !== null) {
      writeFileSync(KEYWORD_INDEX_PATH, savedIndex, "utf-8");
    } else if (existsSync(KEYWORD_INDEX_PATH)) {
      unlinkSync(KEYWORD_INDEX_PATH);
    }
  });

  afterEach(() => {
    // Clean index between tests
    if (existsSync(KEYWORD_INDEX_PATH)) {
      writeFileSync(KEYWORD_INDEX_PATH, JSON.stringify({ version: 1, keywords: {} }, null, 2), "utf-8");
    }
  });

  it("lists empty index", () => {
    const { stdout, exitCode } = lens("index", "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.count, 0);
    assert.deepEqual(out.keywords, {});
  });

  it("adds a note to a keyword", () => {
    const noteId = createTestNote("Test index add");
    createdIds.push(noteId);

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
    createdIds.push(noteId);
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
    const noteId = createTestNote("Test index list");
    createdIds.push(noteId);
    lens("index", "add", "ListKW", noteId, "--json");

    const { stdout } = lens("index", "--json");
    const out = JSON.parse(stdout);
    assert.equal(out.count, 1);
    assert.ok(out.keywords["ListKW"]);
    assert.equal(out.keywords["ListKW"][0].id, noteId);
  });

  it("idempotent add returns already_exists", () => {
    const noteId = createTestNote("Test idempotent");
    createdIds.push(noteId);
    lens("index", "add", "IdempKW", noteId, "--json");

    const { stdout, exitCode } = lens("index", "add", "IdempKW", noteId, "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.action, "already_exists");
  });

  it("allows multiple entries per keyword", () => {
    const id1 = createTestNote("Multi entry 1");
    const id2 = createTestNote("Multi entry 2");
    createdIds.push(id1, id2);

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
    createdIds.push(...ids);

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
    createdIds.push(srcId);

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
    createdIds.push(noteId);
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
    createdIds.push(id1, id2);
    lens("index", "add", "SRemKW", id1, "--json");
    lens("index", "add", "SRemKW", id2, "--json");

    const { stdout, exitCode } = lens("index", "remove", "SRemKW", id1, "--json");
    assert.equal(exitCode, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.action, "removed_entry");
    assert.equal(out.id, id1);

    // Keyword still exists with remaining entry
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

  it("works via --stdin dispatch", () => {
    const noteId = createTestNote("Stdin test");
    createdIds.push(noteId);

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
