/**
 * lens context "<query>" — Assemble agent-ready context pack.
 *
 * Searches for relevant Notes, inlines evidence,
 * returns structured JSON. This is THE primary agent interface.
 */

import { searchIndex, getObjectFromCache, ensureInitialized } from "../core/storage";
import type { Note } from "../core/types";
import type { CommandOptions } from "./commands";

interface ContextNote {
  id: string;
  text: string;
  role?: string;
  qualifier?: string;
  voice?: string;
  scope?: string;
  sees?: string;
  ignores?: string;
  assumptions?: string[];
  question_status?: string;
  bridges?: string[];
  entries?: string[];
  evidence?: { text: string; source: string; locator?: string }[];
  supports?: string[];
  contradicts?: string[];
  refines?: string[];
  related?: { id: string; note?: string }[];
  source?: string;
}

/** Hydrate a Note into a ContextNote */
function hydrateNote(note: Note): ContextNote {
  const ctx: ContextNote = {
    id: note.id,
    text: note.text,
  };

  if (note.role) ctx.role = note.role;
  if (note.qualifier) ctx.qualifier = note.qualifier;
  if (note.voice) ctx.voice = note.voice;
  if (note.scope) ctx.scope = note.scope;
  if (note.sees) ctx.sees = note.sees;
  if (note.ignores) ctx.ignores = note.ignores;
  if (note.assumptions?.length) ctx.assumptions = note.assumptions;
  if (note.question_status) ctx.question_status = note.question_status;
  if (note.bridges?.length) ctx.bridges = note.bridges;
  if (note.entries?.length) ctx.entries = note.entries;
  if (note.evidence?.length) ctx.evidence = note.evidence;
  if (note.supports?.length) ctx.supports = note.supports;
  if (note.contradicts?.length) ctx.contradicts = note.contradicts;
  if (note.refines?.length) ctx.refines = note.refines;
  if (note.related?.length) ctx.related = note.related;
  if (note.source) ctx.source = note.source;

  return ctx;
}

export async function assembleContext(query: string, opts: CommandOptions) {
  ensureInitialized();

  const results = searchIndex(query);

  // Dedup by note ID
  const noteMap = new Map<string, ContextNote>();

  /** Add a note if not already seen */
  function addNote(note: Note) {
    if (noteMap.has(note.id)) return;
    noteMap.set(note.id, hydrateNote(note));
  }

  // Process search results
  for (const r of results) {
    const cached = getObjectFromCache(r.id);
    if (!cached) continue;

    switch (cached.obj.type) {
      case "note":
        addNote(cached.obj as Note);
        break;
      case "source":
        break; // sources contribute through their notes
    }
  }

  // Apply --scope filter if provided
  const scopeFilter = opts.scope as string | undefined;
  let filteredNotes = Array.from(noteMap.values());
  if (scopeFilter) {
    filteredNotes = filteredNotes.filter((n) => n.scope === scopeFilter);
  }

  const pack = {
    query,
    scope: scopeFilter || "all",
    timestamp: new Date().toISOString(),
    notes: filteredNotes,
    total_results: filteredNotes.length,
  };

  console.log(JSON.stringify(pack, null, 2));
}
