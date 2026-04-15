/**
 * lens similar <id> — Find notes similar to a given note.
 * lens similar --all — Scan all notes and group near-duplicates.
 *
 * Uses character trigrams + Dice coefficient for language-agnostic
 * near-duplicate detection. Works for all scripts (Latin, CJK, Arabic, etc).
 */

import { readObject, findSimilarNotes, findAllSimilarGroups, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showSimilar(id: string | undefined, opts: CommandOptions) {
  ensureInitialized();

  const threshold = opts.threshold ? parseFloat(String(opts.threshold)) : 0.3;
  if (isNaN(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("--threshold must be a number between 0 and 1");
  }

  if (id && opts.all) {
    throw new Error("Cannot use both <id> and --all. Use one or the other.");
  }

  // --all mode: global scan
  if (opts.all) {
    const result = findAllSimilarGroups(threshold);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.count === 0) {
        console.log(`No similar groups found (threshold: ${threshold})`);
        return;
      }
      console.log(`${result.count} group(s) of similar notes:\n`);
      for (let i = 0; i < result.groups.length; i++) {
        const g = result.groups[i];
        console.log(`Group ${i + 1} (${g.notes.length} notes):`);
        for (const n of g.notes) {
          console.log(`  ${n.id}  ${n.title}`);
        }
        for (const p of g.pairs) {
          const pct = (p.similarity * 100).toFixed(0);
          console.log(`    ${pct}%  ${p.a} ↔ ${p.b}`);
        }
        console.log();
      }
    }
    return;
  }

  // Single-note mode — id is guaranteed defined here (--all returned above)
  if (!id) throw new Error("Usage: lens similar <id> [--threshold 0.3]  or  lens similar --all");
  const target = readObject(id);
  if (!target) throw new Error(`Object not found: ${id}. Use 'lens search' to find by title, or 'lens list notes' to browse.`);
  if (target.data.type !== "note") throw new Error(`similar only works with notes, got ${target.data.type}. Use 'lens list notes' to find a note ID.`);

  const results = findSimilarNotes(id, threshold);

  if (opts.json) {
    console.log(JSON.stringify({ id, count: results.length, results }, null, 2));
  } else {
    if (results.length === 0) {
      console.log(`No similar notes found (threshold: ${threshold})`);
      return;
    }
    console.log(`${results.length} similar note(s):\n`);
    for (const r of results) {
      const pct = (r.similarity * 100).toFixed(0);
      console.log(`  ${pct}%  ${r.title}`);
      console.log(`      ${r.id}`);
    }
  }
}
