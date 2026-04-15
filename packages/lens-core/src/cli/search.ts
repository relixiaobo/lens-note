/**
 * lens search "<query>" — Full-text search across all objects.
 *
 * JSON output includes type-specific fields so LLMs don't need follow-up show calls.
 */

import { searchIndex, getObjectFromCache, ensureInitialized, resolveIdOrTitle } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function searchObjects(query: string, opts: CommandOptions) {
  ensureInitialized();

  // --resolve: conservative ID resolution (delegates to shared helper)
  if (opts.resolve) {
    const resolved = resolveIdOrTitle(query);
    if ("id" in resolved) {
      const obj = getObjectFromCache(resolved.id);
      const title = obj ? (obj.obj as any).title : resolved.id;
      console.log(JSON.stringify({ id: resolved.id, title }));
    } else if (resolved.candidates) {
      console.log(JSON.stringify({ error: { code: "ambiguous_match", candidates: resolved.candidates } }));
    } else {
      console.log(JSON.stringify({ error: { code: "no_match", message: resolved.error, hint: "Try a broader query with 'lens search' (without --resolve), or check 'lens index' for keyword entry points." } }));
    }
    return;
  }

  let results = searchIndex(query);
  const totalCount = results.length;

  // --limit: cap results
  const limit = opts.limit !== undefined ? parseInt(String(opts.limit)) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) throw new Error("--limit must be a non-negative integer");
  if (limit !== undefined) results = results.slice(0, limit);

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
            links: (obj.links || []).length,
          };
        case "source":
          return { ...base, title: obj.title, source_type: obj.source_type, word_count: obj.word_count };
        case "task":
          return { ...base, title: obj.title, status: obj.status };
        default:
          return base;
      }
    });

    const result: Record<string, any> = { query, total: totalCount, count: enriched.length, results: enriched };
    if (limit !== undefined) result.limit = limit;
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (results.length === 0) {
      console.log(`No results for "${query}"`);
      return;
    }
    console.log(`Found ${results.length} result(s) for "${query}"${totalCount !== results.length ? ` (of ${totalCount})` : ""}:\n`);
    for (const r of results) {
      console.log(`  ${r.id} (${r.type})`);
      console.log(`    ${r.title}`);
      if (r.snippet) console.log(`    ${r.snippet}`);
      console.log();
    }
  }
}
