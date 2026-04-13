/**
 * lens context "<query>" — Assemble agent-ready context pack.
 *
 * Searches for relevant Notes, returns structured JSON with titles, links, and body.
 */

import { searchIndex, getObjectFromCache, readObject, ensureInitialized } from "../core/storage";
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
    noteMap.set(note.id, {
      id: note.id,
      title: note.title,
      source: note.source,
      links: note.links || [],
      body: cached.body?.trim() || "",
    });
  }

  const pack = {
    query,
    timestamp: new Date().toISOString(),
    notes: Array.from(noteMap.values()),
    total_results: noteMap.size,
  };

  console.log(JSON.stringify(pack, null, 2));
}
