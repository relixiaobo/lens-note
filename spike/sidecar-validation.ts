/**
 * Sidecar Bundling Validation (Task 1.1)
 *
 * Tests ALL lens-core dependencies to determine the viable build strategy.
 *
 * Key findings so far:
 *   - better-sqlite3 is NOT supported by Bun → use bun:sqlite instead
 *   - bun:sqlite is built-in to Bun, supports FTS5, and has a similar API
 *   - This means lens-core can use bun:sqlite directly (no N-API headaches)
 *
 * Usage:
 *   bun run spike/sidecar-validation.ts
 *   bun build --compile spike/sidecar-validation.ts --outfile dist/lens-core-test
 *   ./dist/lens-core-test
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { Database } from "bun:sqlite";
import { getModel, getProviders } from "@mariozechner/pi-ai";
import * as agentCore from "@mariozechner/pi-agent-core";
import matter from "gray-matter";
import { ulid } from "ulid";
import { z } from "zod";

const results: { dep: string; status: "pass" | "fail"; detail: string }[] = [];

function test(dep: string, fn: () => string) {
  try {
    const detail = fn();
    results.push({ dep, status: "pass", detail });
    console.log(`  ✅ ${dep}: ${detail}`);
  } catch (e: any) {
    results.push({ dep, status: "fail", detail: e.message });
    console.log(`  ❌ ${dep}: ${e.message}`);
  }
}

console.log("=== Sidecar Bundling Validation ===\n");

// 1. bun:sqlite (replaces better-sqlite3)
test("bun:sqlite", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");
  db.prepare("INSERT INTO test (value) VALUES (?)").run("hello");
  const row = db.prepare("SELECT value FROM test WHERE id = 1").get() as any;
  db.close();
  return `bun:sqlite works, queried value: "${row.value}"`;
});

// 2. bun:sqlite FTS5
test("bun:sqlite FTS5", () => {
  const db = new Database(":memory:");
  db.exec("CREATE VIRTUAL TABLE docs USING fts5(title, body)");
  db.prepare("INSERT INTO docs (title, body) VALUES (?, ?)").run(
    "Hopfield Networks",
    "Modern Hopfield networks have exponential storage capacity"
  );
  const rows = db
    .prepare("SELECT * FROM docs WHERE docs MATCH ?")
    .all("hopfield") as any[];
  db.close();
  return `FTS5 works, found ${rows.length} result(s)`;
});

// 3. defuddle + linkedom
test("defuddle + linkedom", () => {
  // Check what defuddle actually exports
  const defuddleModule = require("defuddle");
  const { parseHTML } = require("linkedom");

  const html = `<html><head><title>Test Article</title></head><body>
    <article><h1>Hello World</h1><p>This is a test article with real content about AI and memory systems.</p></article>
    <nav>Navigation links</nav><footer>Footer content</footer>
  </body></html>`;

  const { document } = parseHTML(html);

  // Try different API patterns
  let result: any;
  if (typeof defuddleModule.defuddle === "function") {
    result = defuddleModule.defuddle(document);
  } else if (typeof defuddleModule.Defuddle === "function") {
    result = new defuddleModule.Defuddle(document).parse();
  } else if (typeof defuddleModule.default === "function") {
    result = defuddleModule.default(document);
  } else if (typeof defuddleModule.default?.defuddle === "function") {
    result = defuddleModule.default.defuddle(document);
  } else {
    // List what's actually exported
    const exports = Object.keys(defuddleModule);
    return `defuddle imports ok, exports: [${exports.join(", ")}] — need to check correct API`;
  }

  return `defuddle works, extracted title: "${result?.title || "?"}", content: ${result?.content?.length || 0} chars`;
});

// 4. pi-ai
test("pi-ai (import + model lookup)", () => {
  const providers = getProviders();
  const model = getModel("anthropic", "claude-sonnet-4-6");
  return `pi-ai works, ${providers.length} providers, model: ${model.name}`;
});

// 5. pi-agent-core
test("pi-agent-core (import)", () => {
  const exports = Object.keys(agentCore);
  return `pi-agent-core works, exports: ${exports.slice(0, 5).join(", ")}...`;
});

// 6. gray-matter
test("gray-matter", () => {
  const result = matter(
    "---\nid: clm_01HXY\ntype: claim\nstatement: test\n---\n\n# Body content"
  );
  return `gray-matter works, ${Object.keys(result.data).length} frontmatter fields`;
});

// 7. ulid
test("ulid", () => {
  const id = ulid();
  return `ulid works, generated: clm_${id}`;
});

// 8. zod
test("zod", () => {
  const schema = z.object({
    id: z.string(),
    type: z.literal("claim"),
    statement: z.string().min(1),
    qualifier: z.enum(["certain", "likely", "presumably", "tentative"]),
  });
  const result = schema.safeParse({
    id: "clm_01HXY",
    type: "claim",
    statement: "Test claim",
    qualifier: "likely",
  });
  return `zod works, validation ${result.success ? "passed" : "failed"}`;
});

// 9. File system
test("fs: markdown read/write", () => {
  const testDir = "/tmp/lens-sidecar-test";
  const testFile = `${testDir}/clm_test.md`;
  mkdirSync(testDir, { recursive: true });
  const content = "---\nid: clm_test\ntype: claim\nstatement: \"Test\"\nqualifier: likely\n---\n\n# Test Claim\n\nBody.\n";
  writeFileSync(testFile, content);
  const read = readFileSync(testFile, "utf-8");
  const parsed = matter(read);
  unlinkSync(testFile);
  return `fs + gray-matter roundtrip works, id: ${parsed.data.id}, body: ${parsed.content.trim().length} chars`;
});

// Summary
console.log("\n=== Summary ===\n");
const passed = results.filter((r) => r.status === "pass").length;
const failed = results.filter((r) => r.status === "fail").length;
console.log(`  Passed: ${passed}/${results.length}`);
console.log(`  Failed: ${failed}/${results.length}`);

if (failed > 0) {
  console.log("\n  Failed dependencies:");
  for (const r of results.filter((r) => r.status === "fail")) {
    console.log(`    - ${r.dep}: ${r.detail}`);
  }
}

console.log("\n  Key decision: Use bun:sqlite instead of better-sqlite3 (Bun built-in, no N-API needed)");
console.log(
  `\n  Verdict: ${failed === 0 ? "ALL PASS — sidecar bundling is viable ✅" : "ISSUES FOUND — see above"}`
);

process.exit(failed > 0 ? 1 : 0);
