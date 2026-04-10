/**
 * lens search "<query>" — Full-text search across all objects.
 *
 * JSON output includes type-specific fields so LLMs don't need follow-up show calls.
 */

import { searchIndex, getObjectFromCache, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function searchObjects(query: string, opts: CommandOptions) {
  ensureInitialized();

  const results = searchIndex(query);

  if (opts.json) {
    // Enrich each result with type-specific key fields
    const enriched = results.map((r) => {
      const cached = getObjectFromCache(r.id);
      if (!cached) return { id: r.id, type: r.type };
      const obj = cached.obj as any;
      const base = { id: r.id, type: r.type };

      switch (r.type) {
        case "claim":
          return { ...base, statement: obj.statement, qualifier: obj.qualifier, scope: obj.scope || "detail", structure_type: obj.structure_type, programmes: obj.programmes };
        case "frame":
          return { ...base, name: obj.name, sees: obj.sees, ignores: obj.ignores };
        case "question":
          return { ...base, text: obj.text, status: obj.question_status };
        case "source":
          return { ...base, title: obj.title, source_type: obj.source_type, word_count: obj.word_count };
        case "programme":
          return { ...base, title: obj.title };
        case "thread":
          return { ...base, title: obj.title };
        default:
          return base;
      }
    });

    console.log(JSON.stringify({ query, count: enriched.length, results: enriched }, null, 2));
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
