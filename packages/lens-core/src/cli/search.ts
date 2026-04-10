/**
 * lens search "<query>" — Full-text search across all objects.
 */

import { searchIndex, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function searchObjects(query: string, opts: CommandOptions) {
  ensureInitialized();

  const results = searchIndex(query);

  if (opts.json) {
    console.log(JSON.stringify({ query, count: results.length, results }, null, 2));
  } else {
    if (results.length === 0) {
      console.log(`No results for "${query}"`);
      return;
    }
    console.log(`Found ${results.length} result(s) for "${query}":\n`);
    for (const r of results) {
      console.log(`  ${r.id} (${r.type})`);
      console.log(`    ${r.title}`);
      if (r.snippet) console.log(`    ${r.snippet}`);
      console.log();
    }
  }
}
