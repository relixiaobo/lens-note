/**
 * lens note "<text>" — Record a quick note as a manual_note source.
 */

import { generateId, type Source } from "../core/types";
import { saveObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function createNote(text: string, opts: CommandOptions) {
  ensureInitialized();

  const id = generateId("source");
  const now = new Date().toISOString();

  const source: Source = {
    id,
    type: "source",
    source_type: "manual_note",
    title: text.length > 80 ? text.substring(0, 77) + "..." : text,
    word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
    ingested_at: now,
    created_at: now,
    status: "active",
  };

  const filePath = saveObject(source, text);

  if (opts.json) {
    console.log(JSON.stringify({ id: source.id, path: filePath }));
  } else {
    console.log(`Created note: ${source.id}`);
    console.log(`  "${source.title}"`);
  }
}
