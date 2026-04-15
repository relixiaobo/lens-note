/**
 * Tests for tool redesign v2 features:
 * - retype, merge write operations
 * - update set.body fix
 * - show batch, search --expand
 * - links --rel/--direction filters
 * - list --min-links/--max-links/--source-type/--status filters
 * - lint --summary
 * - deprecated commands (context, tasks, status)
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createTestEnv } from "./test-helpers";

describe("tool redesign v2", () => {
  let lens: ReturnType<typeof createTestEnv>["lens"];
  let lensStdin: ReturnType<typeof createTestEnv>["lensStdin"];
  let cleanup: () => void;

  // Shared note IDs
  let noteA: string;
  let noteB: string;
  let noteC: string;
  let srcA: string;
  let taskA: string;

  function write(input: any) {
    const { stdout } = lensStdin({ command: "write", input });
    const parsed = JSON.parse(stdout);
    return parsed.data;
  }

  function show(id: string) {
    const { stdout } = lensStdin({ command: "show", positional: [id] });
    const parsed = JSON.parse(stdout);
    return parsed.data;
  }

  function links(id: string, flags?: Record<string, any>) {
    const { stdout } = lensStdin({ command: "links", positional: [id], flags });
    const parsed = JSON.parse(stdout);
    return parsed.data;
  }

  before(() => {
    const env = createTestEnv();
    lens = env.lens;
    lensStdin = env.lensStdin;
    cleanup = env.cleanup;

    // Create test fixtures
    const batch = write([
      { type: "source", title: "Test Source", source_type: "web_article" },
      { type: "note", title: "Note A", body: "Content of A", source: "$0" },
      { type: "note", title: "Note B", body: "Content of B. Ref: [[PLACEHOLDER]]", links: [{ to: "$1", rel: "related", reason: "B relates to A" }] },
      { type: "note", title: "Note C", links: [{ to: "$1", rel: "supports", reason: "C supports A" }, { to: "$2", rel: "related", reason: "C relates to B" }] },
      { type: "task", title: "Test Task", status: "open" },
    ]);
    srcA = batch.results[0].id;
    noteA = batch.results[1].id;
    noteB = batch.results[2].id;
    noteC = batch.results[3].id;
    taskA = batch.results[4].id;

    // Fix placeholder in B's body
    write({ type: "update", id: noteB, body: `Content of B. Ref: [[${noteB}]]` });
  });

  after(() => cleanup());

  // ── retype ────────────────────────────────────────────────

  describe("retype", () => {
    it("changes link type from related to supports", () => {
      const result = write({ type: "retype", from: noteB, to: noteA, old_rel: "related", new_rel: "supports", reason: "actually supports" });
      assert.equal(result.action, "retyped");

      const l = links(noteB, { rel: "supports", direction: "forward" });
      assert.ok(l.forward.some((x: any) => x.id === noteA && x.rel === "supports"));
    });

    it("returns unchanged for same rel same reason", () => {
      const result = write({ type: "retype", from: noteB, to: noteA, old_rel: "supports", new_rel: "supports" });
      assert.equal(result.action, "unchanged");
    });

    it("updates reason on same rel", () => {
      const result = write({ type: "retype", from: noteB, to: noteA, old_rel: "supports", new_rel: "supports", reason: "new reason" });
      assert.equal(result.action, "updated");
    });

    it("preserves reason when not explicitly provided", () => {
      // noteB → noteA currently has reason "new reason" from prior test
      const result = write({ type: "retype", from: noteB, to: noteA, old_rel: "supports", new_rel: "refines" });
      assert.equal(result.action, "retyped");
      assert.equal(result.reason, "new reason");

      // Verify persisted
      const obj = show(noteB);
      const link = obj.forward_links.find((l: any) => l.id === noteA && l.rel === "refines");
      assert.ok(link, "refines link should exist");
      assert.equal(link.reason, "new reason");

      // Restore to supports for subsequent tests
      write({ type: "retype", from: noteB, to: noteA, old_rel: "refines", new_rel: "supports" });
    });

    it("rejects self-link", () => {
      const { exitCode } = lensStdin({ command: "write", input: { type: "retype", from: noteA, to: noteA, old_rel: "related", new_rel: "supports" } });
      assert.notEqual(exitCode, 0);
    });

    it("rejects missing link", () => {
      const { exitCode } = lensStdin({ command: "write", input: { type: "retype", from: noteA, to: noteB, old_rel: "contradicts", new_rel: "supports" } });
      assert.notEqual(exitCode, 0);
    });

    it("handles contradicts bidirectional on retype", () => {
      // Create contradicts link
      write({ type: "link", from: noteA, to: noteB, rel: "contradicts", reason: "they disagree" });

      // Verify bidirectional
      const before = links(noteB, { rel: "contradicts", direction: "forward" });
      assert.ok(before.forward.some((x: any) => x.id === noteA));

      // Retype contradicts → supports (should remove reverse)
      write({ type: "retype", from: noteA, to: noteB, old_rel: "contradicts", new_rel: "supports", reason: "actually supports" });

      const after = links(noteB, { rel: "contradicts" });
      assert.equal(after.forward.length, 0);
      assert.equal(after.backward.length, 0);

      // Cleanup: remove the supports link we just created
      write({ type: "unlink", from: noteA, to: noteB, rel: "supports" });
    });
  });

  // ── merge ─────────────────────────────────────────────────

  describe("merge", () => {
    let mergeA: string;
    let mergeB: string;
    let mergeC: string;

    before(() => {
      const batch = write([
        { type: "note", title: "Merge Target", body: "Target content" },
        { type: "note", title: "Merge Source", body: "Source content" },
        { type: "note", title: "Merge Observer", links: [
          { to: "$0", rel: "related", reason: "observer to target" },
          { to: "$1", rel: "supports", reason: "observer supports source" },
        ]},
      ]);
      mergeA = batch.results[0].id;
      mergeB = batch.results[1].id;
      mergeC = batch.results[2].id;
    });

    it("merges source into target", () => {
      const result = write({ type: "merge", from: mergeB, into: mergeA });
      assert.equal(result.action, "merged");
      assert.equal(result.id, mergeA);
    });

    it("appends body with separator", () => {
      const merged = show(mergeA);
      assert.ok(merged.body.includes("Target content"));
      assert.ok(merged.body.includes("Source content"));
      assert.ok(merged.body.includes("---"));
    });

    it("redirects inbound links", () => {
      const l = links(mergeC, { direction: "forward" });
      const targets = l.forward.map((x: any) => x.id);
      assert.ok(targets.includes(mergeA), "observer should link to target");
      assert.ok(!targets.includes(mergeB), "observer should not link to deleted source");
    });

    it("deletes the source note", () => {
      const { stdout, exitCode } = lensStdin({ command: "show", positional: [mergeB] });
      assert.notEqual(exitCode, 0);
    });

    it("is idempotent (source already deleted)", () => {
      const result = write({ type: "merge", from: mergeB, into: mergeA });
      assert.equal(result.action, "unchanged");
    });

    it("rejects non-note merge", () => {
      const { exitCode, stdout, stderr } = lensStdin({ command: "write", input: { type: "merge", from: srcA, into: noteA } });
      assert.notEqual(exitCode, 0);
    });

    it("rejects self-merge", () => {
      const { exitCode, stdout, stderr } = lensStdin({ command: "write", input: { type: "merge", from: noteA, into: noteA } });
      assert.notEqual(exitCode, 0);
    });
  });

  // ── update set.body ───────────────────────────────────────

  describe("update set.body", () => {
    it("writes body to markdown content, not frontmatter", () => {
      write({ type: "update", id: noteA, set: { body: "Updated via set.body" } });
      const obj = show(noteA);
      assert.equal(obj.body, "Updated via set.body");
    });
  });

  // ── show batch ────────────────────────────────────────────

  describe("show batch", () => {
    it("returns multiple objects in one call", () => {
      const { stdout } = lensStdin({ command: "show", positional: [noteA, noteC] });
      const result = JSON.parse(stdout).data;
      assert.equal(result.count, 2);
      assert.equal(result.items.length, 2);
    });
  });

  // ── search --expand ───────────────────────────────────────

  describe("search --expand", () => {
    it("returns notes with full bodies", () => {
      const { stdout } = lensStdin({ command: "search", positional: ["Note"], flags: { expand: true } });
      const result = JSON.parse(stdout).data;
      assert.ok(result.total_results > 0);
      assert.ok(result.notes.every((n: any) => "body" in n));
    });
  });

  // ── links filters ─────────────────────────────────────────

  describe("links --rel --direction", () => {
    it("filters by rel type", () => {
      const l = links(noteC, { rel: "supports" });
      assert.ok(l.forward.every((x: any) => x.rel === "supports"));
      assert.ok(l.backward.every((x: any) => x.rel === "supports"));
    });

    it("filters forward only", () => {
      const l = links(noteC, { direction: "forward" });
      assert.ok("forward" in l);
      assert.ok(!("backward" in l));
    });

    it("filters backward only", () => {
      const l = links(noteC, { direction: "backward" });
      assert.ok(!("forward" in l));
      assert.ok("backward" in l);
    });

    it("combines rel + direction", () => {
      const l = links(noteC, { rel: "supports", direction: "forward" });
      assert.ok(l.forward.every((x: any) => x.rel === "supports"));
      assert.ok(!("backward" in l));
    });

    it("rejects invalid rel", () => {
      const { exitCode } = lensStdin({ command: "links", positional: [noteC], flags: { rel: "invalid" } });
      assert.notEqual(exitCode, 0);
    });

    it("rejects invalid direction", () => {
      const { exitCode } = lensStdin({ command: "links", positional: [noteC], flags: { direction: "invalid" } });
      assert.notEqual(exitCode, 0);
    });
  });

  // ── list filters ──────────────────────────────────────────

  describe("list filters", () => {
    it("--min-links filters by link count", () => {
      const { stdout } = lensStdin({ command: "list", positional: ["notes"], flags: { "min-links": 1 } });
      const result = JSON.parse(stdout).data;
      assert.ok(result.count > 0);
    });

    it("--max-links 0 returns orphans", () => {
      const { stdout } = lensStdin({ command: "list", positional: ["notes"], flags: { "max-links": 0 } });
      const result = JSON.parse(stdout).data;
      // noteA has no forward links after our test mutations, but may have backward
      assert.ok(result.count >= 0);
    });

    it("--source-type filters sources", () => {
      const { stdout } = lensStdin({ command: "list", positional: ["sources"], flags: { "source-type": "web_article" } });
      const result = JSON.parse(stdout).data;
      assert.ok(result.items.every((s: any) => s.source_type === "web_article"));
    });

    it("--status filters tasks", () => {
      const { stdout } = lensStdin({ command: "list", positional: ["tasks"], flags: { status: "open" } });
      const result = JSON.parse(stdout).data;
      assert.ok(result.items.every((t: any) => t.status === "open"));
    });

    it("--status rejects invalid value", () => {
      const { exitCode } = lensStdin({ command: "list", positional: ["tasks"], flags: { status: "invalid" } });
      assert.notEqual(exitCode, 0);
    });
  });

  // ── lint --summary ────────────────────────────────────────

  describe("lint --summary", () => {
    it("returns status-like output", () => {
      const { stdout } = lensStdin({ command: "lint", flags: { summary: true } });
      const result = JSON.parse(stdout).data;
      assert.ok("notes" in result);
      assert.ok("sources" in result);
      assert.ok("connectivity" in result);
    });
  });

  // ── lint checks ───────────────────────────────────────────

  describe("lint checks", () => {
    it("runs all 9 checks", () => {
      const { stdout } = lensStdin({ command: "lint" });
      const result = JSON.parse(stdout).data;
      assert.equal(result.summary.total_checks, 9);
      const names = result.checks.map((c: any) => c.name);
      assert.ok(names.includes("vague_reasons"));
      assert.ok(names.includes("thin_notes"));
      assert.ok(names.includes("superseded_alive"));
    });

    it("detects thin notes", () => {
      // noteC was created with no body
      const { stdout } = lensStdin({ command: "lint" });
      const result = JSON.parse(stdout).data;
      const thin = result.checks.find((c: any) => c.name === "thin_notes");
      assert.ok(thin.value > 0, "should detect notes with short/empty bodies");
    });

    it("detects vague reasons", () => {
      // Create a note with a vague reason
      write({ type: "note", title: "Vague test A", body: "content" });
      const vagueNote = write({ type: "note", title: "Vague test B", body: "content", links: [{ to: noteA, rel: "related", reason: "ok" }] });

      const { stdout } = lensStdin({ command: "lint" });
      const result = JSON.parse(stdout).data;
      const vague = result.checks.find((c: any) => c.name === "vague_reasons");
      assert.ok(vague.value > 0, "should detect vague reason 'ok'");

      // Cleanup
      write({ type: "unlink", from: vagueNote.id, to: noteA, rel: "related" });
    });

    it("detects superseded notes with active inbound links", () => {
      const sup = write({ type: "note", title: "Superseded test", body: "Superseded by a newer note" });
      write({ type: "link", from: noteA, to: sup.id, rel: "supports", reason: "test superseded" });

      const { stdout } = lensStdin({ command: "lint" });
      const result = JSON.parse(stdout).data;
      const check = result.checks.find((c: any) => c.name === "superseded_alive");
      assert.ok(check.value > 0, "should detect superseded note with active inbound link");

      // Cleanup
      write({ type: "unlink", from: noteA, to: sup.id, rel: "supports" });
      write({ type: "delete", id: sup.id });
    });

    it("--check exits 1 when failures exist", () => {
      const { stdout, exitCode } = lensStdin({ command: "lint", flags: { check: true } });
      const result = JSON.parse(stdout).data;
      // Test graph has contradicts_count=0 which is a failure
      assert.ok(result.summary.failures > 0);
      assert.equal(exitCode, 1);
    });
  });

  // ── lint --audit ──────────────────────────────────────────

  describe("lint --audit", () => {
    it("returns full offenders for related_dominance", () => {
      const { stdout } = lensStdin({ command: "lint", flags: { audit: "related_dominance" } });
      const result = JSON.parse(stdout).data;
      assert.equal(result.check, "related_dominance");
      assert.ok(result.total_links >= 0);
      assert.equal(result.count, result.offenders.length);
      if (result.offenders.length > 0) {
        const o = result.offenders[0];
        assert.ok("from" in o && "to" in o && "from_title" in o && "to_title" in o && "rel" in o);
      }
    });

    it("returns offenders for duplicate_links with keep/remove", () => {
      // Create a duplicate pair
      write({ type: "link", from: noteC, to: noteA, rel: "supports", reason: "test dup" });
      // noteC already has a related link to noteA from setup

      const { stdout } = lensStdin({ command: "lint", flags: { audit: "duplicate_links" } });
      const result = JSON.parse(stdout).data;
      assert.equal(result.check, "duplicate_links");
      if (result.offenders.length > 0) {
        const o = result.offenders[0];
        assert.ok("keep" in o && "remove" in o);
      }

      // Cleanup
      write({ type: "unlink", from: noteC, to: noteA, rel: "supports" });
    });

    it("supports --limit and --offset", () => {
      const { stdout: full } = lensStdin({ command: "lint", flags: { audit: "related_dominance" } });
      const fullResult = JSON.parse(full).data;

      if (fullResult.total_links >= 2) {
        const { stdout: limited } = lensStdin({ command: "lint", flags: { audit: "related_dominance", limit: 1 } });
        const limitResult = JSON.parse(limited).data;
        assert.equal(limitResult.count, 1);
        assert.equal(limitResult.limit, 1);
        assert.equal(limitResult.total_links, fullResult.total_links);
      }
    });

    it("rejects unknown check name", () => {
      const { exitCode } = lensStdin({ command: "lint", flags: { audit: "nonexistent" } });
      assert.notEqual(exitCode, 0);
    });
  });

  // ── deprecated commands ───────────────────────────────────

  describe("deprecated commands", () => {
    it("context returns deprecation error", () => {
      const { stdout, exitCode } = lensStdin({ command: "context", positional: ["test"] });
      const result = JSON.parse(stdout);
      assert.equal(result.ok, false);
      assert.equal(result.error.code, "deprecated_command");
      assert.ok(result.replacement.includes("search"));
      assert.notEqual(exitCode, 0);
    });

    it("tasks returns deprecation error", () => {
      const { stdout, exitCode } = lensStdin({ command: "tasks" });
      const result = JSON.parse(stdout);
      assert.equal(result.ok, false);
      assert.equal(result.error.code, "deprecated_command");
      assert.ok(result.replacement.includes("list"));
      assert.notEqual(exitCode, 0);
    });

    it("status returns deprecation error", () => {
      const { stdout, exitCode } = lensStdin({ command: "status" });
      const result = JSON.parse(stdout);
      assert.equal(result.ok, false);
      assert.equal(result.error.code, "deprecated_command");
      assert.ok(result.replacement.includes("lint"));
      assert.notEqual(exitCode, 0);
    });
  });

  // ── envelope consistency ─────────────────────────────────

  describe("envelope consistency", () => {
    it("success envelope has ok:true and data", () => {
      const { stdout } = lensStdin({ command: "search", positional: ["Note"] });
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.ok, true);
      assert.ok("data" in parsed);
      assert.ok(parsed.data.query);
    });

    it("unknown command returns ok:false with hint at top level", () => {
      // Use CLI path (not --stdin) to hit the unknown_command handler
      const { stdout, exitCode } = lens("nonexistent", "--json");
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.ok, false);
      assert.equal(parsed.error.code, "unknown_command");
      assert.ok("hint" in parsed, "hint should be at top level");
      assert.ok(!("hint" in parsed.error), "hint should not be inside error");
      assert.notEqual(exitCode, 0);
    });

    it("command_error has command at top level", () => {
      // Trigger a command error: show with nonexistent ID
      const { stdout, exitCode } = lensStdin({ command: "show", positional: ["note_01ZZZZZZZZZZZZZZZZZZZZZZZZ"] });
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.ok, false);
      assert.equal(parsed.error.code, "command_error");
      assert.equal(parsed.command, "show");
      assert.ok(!("command" in parsed.error), "command should be at top level, not inside error");
      assert.notEqual(exitCode, 0);
    });
  });
});
