/**
 * `lens schema --json` — machine-readable command catalog.
 *
 * Every command registered in the CLI must appear in the schema so agents
 * can't accidentally use an undocumented command.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestEnv } from "./test-helpers.ts";
import { commands } from "../cli/commands.ts";

test("lens schema --json", async (t) => {
  const env = createTestEnv();
  t.after(() => env.cleanup());

  const { stdout, exitCode } = env.lensStdin({ command: "schema" });
  assert.equal(exitCode, 0, `schema failed: ${stdout}`);
  const body = JSON.parse(stdout);

  await t.test("envelope is wellformed", () => {
    assert.equal(body.ok, true);
    assert.equal(body.schema_version, 1);
    assert.ok(body.data);
  });

  await t.test("exposes envelope_version, enums, data_types, commands", () => {
    const d = body.data;
    assert.equal(d.envelope_version, 1);
    assert.ok(d.enums.link_rel.includes("supports"));
    assert.ok(d.enums.source_type.includes("web_article"));
    assert.ok(d.data_types.note);
    assert.ok(d.data_types.source);
    assert.ok(d.data_types.task);
    assert.ok(d.commands.search);
    assert.ok(d.commands.write);
  });

  await t.test("every registered command is in the catalog", () => {
    // Ignore deprecated commands that still exist for backward-compat errors
    const DEPRECATED = new Set(["status", "tasks", "context", "similar"]);
    const registered = Object.keys(commands).filter((c) => !DEPRECATED.has(c));
    const documented = Object.keys(body.data.commands);
    for (const cmd of registered) {
      assert.ok(documented.includes(cmd), `command '${cmd}' is registered but missing from schema`);
    }
  });

  await t.test("readonly_commands list is consistent with per-command readonly flag", () => {
    const d = body.data;
    const listed = new Set(d.readonly_commands);
    for (const [name, spec] of Object.entries(d.commands) as [string, { readonly: boolean }][]) {
      if (spec.readonly) {
        assert.ok(listed.has(name), `command '${name}' marked readonly but not in readonly_commands`);
      }
    }
  });

  await t.test("each command has description, output, and at least one example", () => {
    for (const [name, spec] of Object.entries(body.data.commands) as [string, any][]) {
      assert.ok(spec.description, `${name}: missing description`);
      assert.ok(spec.output, `${name}: missing output shape`);
      assert.ok(Array.isArray(spec.examples) && spec.examples.length > 0, `${name}: needs at least one example`);
    }
  });
});
