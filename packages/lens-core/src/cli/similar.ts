/**
 * lens similar <id> — Find notes similar to a given note.
 *
 * Uses character trigrams + Dice coefficient for language-agnostic
 * near-duplicate detection. Works for all scripts (Latin, CJK, Arabic, etc).
 */

import { readObject, findSimilarNotes, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showSimilar(id: string, opts: CommandOptions) {
  ensureInitialized();

  const target = readObject(id);
  if (!target) throw new Error(`Object not found: ${id}`);

  const threshold = opts.threshold ? parseFloat(String(opts.threshold)) : 0.3;
  if (isNaN(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("--threshold must be a number between 0 and 1");
  }

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
