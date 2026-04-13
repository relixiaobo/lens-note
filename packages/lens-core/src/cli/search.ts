/**
 * lens search "<query>" — Full-text search across all objects.
 *
 * JSON output includes type-specific fields so LLMs don't need follow-up show calls.
 */

import { searchIndex, getObjectFromCache, findByTitle, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function searchObjects(query: string, opts: CommandOptions) {
  ensureInitialized();

  // --resolve: conservative ID resolution
  if (opts.resolve) {
    // 1. Exact ID match
    if (/^(src|note|task)_[A-Z0-9]{26}$/.test(query)) {
      const obj = getObjectFromCache(query);
      if (obj) {
        console.log(JSON.stringify({ id: query, title: (obj.obj as any).title }));
        return;
      }
    }

    // 2. Exact title match (case-insensitive)
    const titleMatches = findByTitle(query);
    if (titleMatches.length === 1) {
      console.log(JSON.stringify({ id: titleMatches[0].id, title: titleMatches[0].title }));
      return;
    }
    if (titleMatches.length > 1) {
      console.log(JSON.stringify({ error: { code: "ambiguous_match", candidates: titleMatches.map(t => ({ id: t.id, title: t.title })) } }));
      return;
    }

    // 3. FTS5 ranked search — only resolve if single clear winner
    const ftsResults = searchIndex(query);
    if (ftsResults.length === 0) {
      console.log(JSON.stringify({ error: { code: "no_match", message: `No results for "${query}"` } }));
      return;
    }
    if (ftsResults.length === 1) {
      console.log(JSON.stringify({ id: ftsResults[0].id, title: ftsResults[0].title }));
      return;
    }
    console.log(JSON.stringify({ error: { code: "ambiguous_match", candidates: ftsResults.slice(0, 5).map(r => ({ id: r.id, title: r.title })) } }));
    return;
  }

  const results = searchIndex(query);

  if (opts.json) {
    // Enrich each result with type-specific key fields
    const enriched = results.map((r) => {
      const cached = getObjectFromCache(r.id);
      if (!cached) return { id: r.id, type: r.type };
      const obj = cached.obj as any;
      const base = { id: r.id, type: r.type };

      switch (r.type) {
        case "note":
          return {
            ...base,
            title: obj.title,
            links: obj.links || [],
          };
        case "source":
          return { ...base, title: obj.title, source_type: obj.source_type, word_count: obj.word_count };
        case "task":
          return { ...base, title: obj.title, status: obj.status };
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
