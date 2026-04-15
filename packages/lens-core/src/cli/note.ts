/**
 * lens note "<text>" — Quick note shortcut.
 *
 * Alias for: lens write '{"type":"note","title":"..."}'
 */

import { generateId, type Note } from "../core/types";
import { saveObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

export async function createNote(title: string, opts: CommandOptions) {
  ensureInitialized();

  const id = generateId("note");
  const now = new Date().toISOString();

  const note: Note = {
    id,
    type: "note",
    title,
    created_at: now,
    updated_at: now,
  };

  saveObject(note, "");

  if (opts.json) {
    respondSuccess({ ...note, action: "created" });
  } else {
    console.log(`Created note: ${id}`);
    console.log(`  "${title.length > 80 ? title.substring(0, 77) + "..." : title}"`);
  }
}
