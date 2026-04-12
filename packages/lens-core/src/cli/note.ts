/**
 * lens note "<text>" — Quick note shortcut.
 *
 * Alias for: echo '{"type":"note","text":"..."}' | lens write
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

  saveObject(note, text);

  if (opts.json) {
    console.log(JSON.stringify({ id, type: "note", action: "created" }));
  } else {
    console.log(`Created note: ${id}`);
    console.log(`  "${text.length > 80 ? text.substring(0, 77) + "..." : text}"`);
  }
}
