/**
 * lens note "<text>" — Record a quick note as an observation.
 */

import { generateId, type Note } from "../core/types";
import { saveObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function createNote(text: string, opts: CommandOptions) {
  ensureInitialized();

  const id = generateId("note");
  const now = new Date().toISOString();

  const note: Note = {
    id,
    type: "note",
    text,
    role: "observation",
    status: "active",
    created_at: now,
  };

  const filePath = saveObject(note, text);

  if (opts.json) {
    console.log(JSON.stringify({ id: note.id, path: filePath }));
  } else {
    console.log(`Created note: ${note.id}`);
    console.log(`  "${text.length > 80 ? text.substring(0, 77) + "..." : text}"`);
  }
}
