/**
 * `lens list ... --fields <comma>` — field projection for external clients.
 *
 * Motivation: the Chrome clipper needs a URL-only manifest that fits under
 * the 1MB native-messaging cap for 10K-source graphs. This is that contract.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestEnv } from "./test-helpers.ts";

function seed(env: ReturnType<typeof createTestEnv>) {
  for (const [title, url] of [
    ["Article A", "https://example.com/a"],
    ["Article B", "https://example.com/b"],
    ["Article C", "https://example.com/c"],
    ["Article D", "https://example.com/d"],
  ] as const) {
    const r = env.lensStdin({
      command: "write",
      input: { type: "source", title, source_type: "web_article", url },
    });
    assert.equal(r.exitCode, 0, r.stdout);
  }
  const noUrl = env.lensStdin({
    command: "write",
    input: { type: "source", title: "Offline note", source_type: "manual_note" },
  });
  assert.equal(noUrl.exitCode, 0);
}

test("--fields url returns url-only rows, skips sources without url", (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());
  seed(env);

  const r = env.lens("list", "sources", "--fields", "url", "--json");
  assert.equal(r.exitCode, 0);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.count, 4, "5 total, 1 url-less dropped");
  assert.deepEqual(body.data.fields, ["url"]);
  for (const item of body.data.items) {
    assert.deepEqual(Object.keys(item), ["url"]);
    assert.equal(typeof item.url, "string");
    assert.ok(item.url.length > 0);
  }
});

test("--fields url,id keeps every source (id always present)", (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());
  seed(env);

  const r = env.lens("list", "sources", "--fields", "url,id", "--json");
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.count, 5);
  for (const item of body.data.items) {
    assert.deepEqual(Object.keys(item).sort(), ["id", "url"]);
    assert.equal(typeof item.id, "string");
  }
});

test("--fields with unknown field errors with valid-list hint", (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());
  seed(env);

  const r = env.lens("list", "sources", "--fields", "bogus", "--json");
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error.message, /unknown for source: bogus/);
  assert.match(body.error.message, /url/);
});

test("--fields rejects cross-type fields (status on source)", (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());
  seed(env);

  const r = env.lens("list", "sources", "--fields", "status", "--json");
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error.message, /unknown for source: status/);
});

test("--fields works for notes", (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());

  env.lensStdin({ command: "write", input: { type: "note", title: "A note" } });

  const r = env.lens("list", "notes", "--fields", "id,title", "--json");
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.ok(body.data.count > 0);
  for (const item of body.data.items) {
    assert.deepEqual(Object.keys(item).sort(), ["id", "title"]);
  }
});

test("no --fields preserves existing summary shape", (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());
  seed(env);

  const r = env.lens("list", "sources", "--json");
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.fields, undefined);
  const withUrl = body.data.items.find((x: any) => x.url);
  assert.ok(withUrl);
  assert.ok("title" in withUrl);
  assert.ok("source_type" in withUrl);
});
