/**
 * lens search "<query>" — Full-text search across all objects.
 *
 * JSON output includes type-specific fields so LLMs don't need follow-up show calls.
 */

import { searchIndex, getObjectFromCache, listObjects, ensureInitialized, resolveIdOrTitle, extractBodyRefs } from "../core/storage";
import type { Note } from "../core/types";
import type { CommandOptions } from "./commands";
import { respondSuccess, respondError } from "./response";

export async function searchObjects(query: string, opts: CommandOptions) {
  ensureInitialized();

  // --resolve: conservative ID resolution (delegates to shared helper)
  if (opts.resolve) {
    const resolved = resolveIdOrTitle(query);
    if ("id" in resolved) {
      const obj = getObjectFromCache(resolved.id);
      const title = obj ? (obj.obj as any).title : resolved.id;
      respondSuccess({ id: resolved.id, title });
    } else if (resolved.candidates) {
      respondError("ambiguous_match", resolved.error || "Multiple matches", "Narrow your query or use an exact ID.", { candidates: resolved.candidates });
    } else {
      respondError("no_match", resolved.error || "No match found", "Try a broader query with 'lens search' (without --resolve), or check 'lens index' for keyword entry points.");
    }
    return;
  }

  // --expand: delegate to expanded search (replaces `context` command)
  if (opts.expand) {
    return searchExpanded(query, opts);
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
    respondSuccess(result);
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

/**
 * search --expand: return search results with full bodies and links.
 * Replaces the `context` command. Same output format for compatibility.
 */
async function searchExpanded(query: string, opts: CommandOptions) {
  const results = searchIndex(query);
  const noteMap = new Map<string, any>();

  for (const r of results) {
    if (noteMap.has(r.id)) continue;
    const cached = getObjectFromCache(r.id);
    if (!cached || cached.obj.type !== "note") continue;

    const note = cached.obj as Note;
    const bodyText = cached.body?.trim() || "";
    const bodyRefs = extractBodyRefs(bodyText);
    noteMap.set(note.id, {
      id: note.id,
      title: note.title,
      source: note.source,
      forward_links: note.links || [],
      body: bodyText,
      ...(bodyRefs.length > 0 ? { body_refs: bodyRefs } : {}),
    });
  }

  const notes = Array.from(noteMap.values());
  const pack: Record<string, any> = {
    query,
    timestamp: new Date().toISOString(),
    notes,
    total_results: notes.length,
  };

  if (notes.length === 0) {
    pack.total_notes = listObjects("note").length;
    pack.hint = pack.total_notes === 0
      ? "No notes exist yet. Create notes with 'lens write'."
      : "No notes matched this query. Try different keywords, or use 'lens search' to explore, or 'lens index' for entry points.";
  }

  respondSuccess(pack);
}
