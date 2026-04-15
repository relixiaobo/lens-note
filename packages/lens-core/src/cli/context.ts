/**
 * lens context "<query>" — Assemble agent-ready context pack.
 *
 * Searches for relevant Notes, returns structured JSON with titles, links, and body.
 */

import { searchIndex, getObjectFromCache, listObjects, ensureInitialized, extractBodyRefs } from "../core/storage";
import type { Note } from "../core/types";
import type { CommandOptions } from "./commands";

export async function assembleContext(query: string, opts: CommandOptions) {
  ensureInitialized();

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

  console.log(JSON.stringify(pack, null, 2));
}
