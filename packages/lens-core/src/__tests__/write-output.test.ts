/**
 * Tests for write command output — JSON error messages and batch result format.
 *
 * Runs via: node --import tsx/esm --test src/__tests__/write-output.test.ts
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "../..");
const TSX = "npx";

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

// ================================================================
// 1. JSON parse error messages include position info
// ================================================================

describe("JSON parse error messages", () => {
  it("includes position for unterminated string", () => {
    const tmpFile = join(tmpdir(), `lens-test-bad-${Date.now()}.json`);
    writeFileSync(tmpFile, '{"bad json');
    try {
      const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
      assert.equal(exitCode, 1);
      const out = JSON.parse(stdout);
      assert.match(out.error.message, /Invalid JSON input: /);
      assert.match(out.error.message, /position/i);
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("includes position for unexpected token", () => {
    const tmpFile = join(tmpdir(), `lens-test-bad2-${Date.now()}.json`);
    writeFileSync(tmpFile, "{not: valid}");
    try {
      const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
      assert.equal(exitCode, 1);
      const out = JSON.parse(stdout);
      assert.match(out.error.message, /Invalid JSON input: /);
      assert.match(out.error.message, /position/i);
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("reports via --stdin envelope too", () => {
    // --stdin parses the envelope JSON itself (in main.ts), not in write.ts
    // but --file parsing is in write.ts — verify that path specifically
    const tmpFile = join(tmpdir(), `lens-test-bad3-${Date.now()}.json`);
    writeFileSync(tmpFile, '["missing bracket"');
    try {
      const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
      assert.equal(exitCode, 1);
      const out = JSON.parse(stdout);
      assert.match(out.error.message, /Invalid JSON input: /);
    } finally {
      unlinkSync(tmpFile);
    }
  });
});

// ================================================================
// 2. Batch link results include from/to/rel
// ================================================================

describe("batch write link results", () => {
  const createdIds: string[] = [];

  after(() => {
    // Clean up created test objects
    for (const id of createdIds) {
      try {
        lensStdin({ command: "write", input: { type: "delete", id } });
      } catch { /* best effort */ }
    }
  });

  it("link result includes from, to, rel fields", () => {
    const batch = [
      { type: "note", title: "Test link output A", body: "a" },
      { type: "note", title: "Test link output B", body: "b" },
      { type: "link", from: "$1", rel: "supports", to: "$0", reason: "test reason" },
    ];
    const tmpFile = join(tmpdir(), `lens-test-batch-${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify(batch));
    try {
      const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
      assert.equal(exitCode, 0);
      const out = JSON.parse(stdout);

      assert.equal(out.results.length, 3);

      // Notes have id but no from/to
      assert.ok(out.results[0].id);
      assert.ok(out.results[1].id);
      createdIds.push(out.results[0].id, out.results[1].id);

      // Link result has from/to/rel
      const linkResult = out.results[2];
      assert.equal(linkResult.type, "link");
      assert.equal(linkResult.action, "created");
      assert.equal(linkResult.from, out.results[1].id);
      assert.equal(linkResult.to, out.results[0].id);
      assert.equal(linkResult.rel, "supports");
      // id should NOT be present for link results
      assert.equal(linkResult.id, undefined);
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("unlink result includes from, to, rel fields", () => {
    // First create two notes with a link
    const batch1 = [
      { type: "note", title: "Test unlink output A", body: "a" },
      { type: "note", title: "Test unlink output B", body: "b", links: [{ to: "$0", rel: "related" }] },
    ];
    const tmpFile1 = join(tmpdir(), `lens-test-unlink1-${Date.now()}.json`);
    writeFileSync(tmpFile1, JSON.stringify(batch1));
    let noteA: string, noteB: string;
    try {
      const { stdout } = lens("write", "--file", tmpFile1, "--json");
      const out = JSON.parse(stdout);
      noteA = out.results[0].id;
      noteB = out.results[1].id;
      createdIds.push(noteA, noteB);
    } finally {
      unlinkSync(tmpFile1);
    }

    // Now unlink in a batch
    const batch2 = [{ type: "unlink", from: noteB!, to: noteA!, rel: "related" }];
    const tmpFile2 = join(tmpdir(), `lens-test-unlink2-${Date.now()}.json`);
    writeFileSync(tmpFile2, JSON.stringify(batch2));
    try {
      const { stdout } = lens("write", "--file", tmpFile2, "--json");
      const out = JSON.parse(stdout);

      const unlinkResult = out.results[0];
      assert.equal(unlinkResult.type, "unlink");
      assert.equal(unlinkResult.action, "removed");
      assert.equal(unlinkResult.from, noteB);
      assert.equal(unlinkResult.to, noteA);
      assert.equal(unlinkResult.rel, "related");
    } finally {
      unlinkSync(tmpFile2);
    }
  });

  it("note results do NOT leak full object into batch output", () => {
    const batch = [
      { type: "note", title: "Test no-leak", body: "This body should NOT appear in batch output" },
    ];
    const tmpFile = join(tmpdir(), `lens-test-noleak-${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify(batch));
    try {
      const { stdout } = lens("write", "--file", tmpFile, "--json");
      const out = JSON.parse(stdout);

      const result = out.results[0];
      createdIds.push(result.id);
      // Should have index, type, action, id — but NOT body, title, etc.
      assert.equal(result.type, "note");
      assert.ok(result.id);
      assert.equal(result.body, undefined);
      assert.equal(result.title, undefined);
      assert.equal(result.created_at, undefined);
    } finally {
      unlinkSync(tmpFile);
    }
  });
});

// ================================================================
// 3. Secret detection rejects API keys
// ================================================================

describe("secret detection", () => {
  const secretCases = [
    { name: "OpenAI key in body", input: { type: "note", title: "Config", body: "key: sk-proj-abc123def456ghi789jkl012mno" } },
    { name: "Anthropic key in body", input: { type: "note", title: "Config", body: "sk-ant-api03-abcdefghijklmnopqrstuvwxyz" } },
    { name: "GitHub PAT in title", input: { type: "note", title: "Token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl" } },
    { name: "AWS access key in body", input: { type: "note", title: "AWS", body: "access_key=AKIAIOSFODNN7EXAMPLE" } },
    { name: "Slack token in body", input: { type: "note", title: "Slack", body: "xoxb-123456789-123456789-abc" } },
    { name: "PEM private key in body", input: { type: "note", title: "Cert", body: "-----BEGIN RSA PRIVATE KEY-----\nMIIE..." } },
    { name: "secret in source url", input: { type: "source", title: "API", url: "https://api.example.com?key=sk-proj-abc123def456ghi789jkl012mno", source_type: "web_article" } },
  ];

  for (const { name, input } of secretCases) {
    it(`rejects ${name}`, () => {
      const tmpFile = join(tmpdir(), `lens-test-secret-${Date.now()}.json`);
      writeFileSync(tmpFile, JSON.stringify(input));
      try {
        const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
        assert.equal(exitCode, 1);
        const out = JSON.parse(stdout);
        assert.match(out.error.message, /API key or secret/);
      } finally {
        unlinkSync(tmpFile);
      }
    });
  }

  it("allows normal content without false positives", () => {
    const input = { type: "note", title: "The sk-ill of writing", body: "Discussion about skills and techniques" };
    const tmpFile = join(tmpdir(), `lens-test-nosecret-${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify(input));
    try {
      const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
      assert.equal(exitCode, 0);
      const out = JSON.parse(stdout);
      assert.equal(out.action, "created");
      // Clean up
      lensStdin({ command: "write", input: { type: "delete", id: out.id } });
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("rejects secret in batch and marks dependents as failed", () => {
    const batch = [
      { type: "note", title: "Good note", body: "fine" },
      { type: "note", title: "Bad note", body: "key: sk-proj-abc123def456ghi789jkl012mno" },
      { type: "note", title: "Depends on bad", body: "ok", links: [{ to: "$1", rel: "supports" }] },
    ];
    const tmpFile = join(tmpdir(), `lens-test-secret-batch-${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify(batch));
    try {
      const { stdout, exitCode } = lens("write", "--file", tmpFile, "--json");
      assert.equal(exitCode, 1);
      const out = JSON.parse(stdout);

      // First note succeeds
      assert.equal(out.results[0].action, "created");
      // Second note rejected
      assert.equal(out.results[1].action, "error");
      assert.match(out.results[1].message, /API key or secret/);
      // Third note fails because it depends on $1
      assert.equal(out.results[2].action, "error");
      assert.match(out.results[2].message, /failed \$1/);

      // Clean up the first note
      lensStdin({ command: "write", input: { type: "delete", id: out.results[0].id } });
    } finally {
      unlinkSync(tmpFile);
    }
  });
});
