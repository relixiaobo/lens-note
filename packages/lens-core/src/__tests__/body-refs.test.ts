/**
 * Tests for body reference extraction: [[note_ID]] → body_refs with titles
 *
 * Runs via: node --import tsx/esm --test src/__tests__/body-refs.test.ts
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createTestEnv } from "./test-helpers";

const { lensStdin, cleanup } = createTestEnv();

after(() => cleanup());

function write(input: object) {
  const { stdout } = lensStdin({ command: "write", input });
  return JSON.parse(stdout).data;
}

function show(id: string) {
  const { stdout } = lensStdin({ command: "show", positional: [id], flags: { json: true } });
  return JSON.parse(stdout).data;
}

describe("body reference extraction", () => {
  it("returns raw body with [[ID]] and body_refs with resolved titles", () => {
    const noteA = write({ type: "note", title: "First Note", body: "Hello world" });
    const noteB = write({
      type: "note",
      title: "Second Note",
      body: `This references [[${noteA.id}]] inline.`,
    });

    const shown = show(noteB.id);
    // Body stays raw
    assert.ok(shown.body.includes(`[[${noteA.id}]]`), "body should contain raw [[ID]]");
    // body_refs provides title mapping
    assert.ok(Array.isArray(shown.body_refs), "should have body_refs array");
    assert.equal(shown.body_refs.length, 1);
    assert.equal(shown.body_refs[0].id, noteA.id);
    assert.equal(shown.body_refs[0].title, "First Note");
  });

  it("deduplicates multiple refs to same ID", () => {
    const a = write({ type: "note", title: "Alpha", body: "a" });
    const b = write({
      type: "note",
      title: "Dup Ref",
      body: `See [[${a.id}]] and again [[${a.id}]].`,
    });

    const shown = show(b.id);
    assert.equal(shown.body_refs.length, 1, "should deduplicate same ID");
  });

  it("extracts multiple distinct refs", () => {
    const a = write({ type: "note", title: "Alpha", body: "a" });
    const b = write({ type: "note", title: "Beta", body: "b" });
    const c = write({
      type: "note",
      title: "Multi Ref",
      body: `See [[${a.id}]] and [[${b.id}]].`,
    });

    const shown = show(c.id);
    assert.equal(shown.body_refs.length, 2);
    const titles = shown.body_refs.map((r: any) => r.title);
    assert.ok(titles.includes("Alpha"));
    assert.ok(titles.includes("Beta"));
  });

  it("handles missing ID with warning marker", () => {
    const n = write({
      type: "note",
      title: "Bad Ref",
      body: "See [[note_01NONEXISTENT0000000000000]].",
    });

    const shown = show(n.id);
    assert.equal(shown.body_refs.length, 1);
    assert.equal(shown.body_refs[0].title, "⚠ not found");
    assert.match(shown.body_refs[0].id, /note_01NONEXISTENT/);
  });

  it("extracts src_ and task_ refs", () => {
    const src = write({ type: "source", title: "My Source", source_type: "web_article", url: "https://example.com" });
    const task = write({ type: "task", title: "My Task", status: "open" });
    const n = write({
      type: "note",
      title: "Cross Type Refs",
      body: `Source: [[${src.id}]], Task: [[${task.id}]].`,
    });

    const shown = show(n.id);
    assert.equal(shown.body_refs.length, 2);
    const titles = shown.body_refs.map((r: any) => r.title);
    assert.ok(titles.includes("My Source"));
    assert.ok(titles.includes("My Task"));
  });

  it("omits body_refs when no refs in body", () => {
    const n = write({
      type: "note",
      title: "No Refs",
      body: "Just plain text with no references.",
    });

    const shown = show(n.id);
    assert.equal(shown.body, "Just plain text with no references.");
    assert.equal(shown.body_refs, undefined, "should not have body_refs when none found");
  });

  it("extracts refs in search --expand output", () => {
    const a = write({ type: "note", title: "Context Target", body: "important content" });
    const b = write({
      type: "note",
      title: "Context Source",
      body: `Refers to [[${a.id}]] here.`,
    });

    const { stdout } = lensStdin({ command: "search", positional: ["Context Source"], flags: { expand: true } });
    const ctx = JSON.parse(stdout).data;
    const found = ctx.results.find((n: any) => n.id === b.id);
    assert.ok(found, "should find the note in search --expand");
    // Body stays raw
    assert.ok(found.body.includes(`[[${a.id}]]`), "expanded body should contain raw [[ID]]");
    // body_refs provides title
    assert.ok(Array.isArray(found.body_refs));
    assert.equal(found.body_refs[0].title, "Context Target");
  });
});
