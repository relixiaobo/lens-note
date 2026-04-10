/**
 * Process Compilation Agent output into lens Note objects.
 *
 * Handles 4 relationship types from the Agent:
 * - "new": Create a new Note
 * - "duplicate": Add evidence to an existing Note (don't create new)
 * - "supports": Create new Note with supports link to existing
 * - "contradicts": Create new Note with contradicts link on both sides
 */

import { generateId, type Note, type NoteRole } from "../core/types";
import { saveObject, readObject } from "../core/storage";
import type { CompilationResult, ExtractedNote } from "./compilation-agent";

export interface ProcessedObjects {
  notes_new: string[];
  notes_reinforced: string[];
  notes_contradicted: string[];
  notes_skipped: number;
}

/** Read an existing Note, mutate it, and re-save via saveObject (keeps file + cache in sync) */
function updateExistingNote(noteId: string, mutate: (data: Record<string, any>) => void): boolean {
  const existing = readObject(noteId);
  if (!existing) return false;

  mutate(existing.data);

  const obj = { ...existing.data, id: noteId } as Note;
  saveObject(obj, existing.content);
  return true;
}

/** Append evidence to an existing Note */
function appendEvidenceToNote(noteId: string, newEvidence: { text: string; source: string; locator?: string }): boolean {
  return updateExistingNote(noteId, (data) => {
    const evidence = data.evidence || [];
    evidence.push(newEvidence);
    data.evidence = evidence;
  });
}

/** Add a contradicts reference to an existing Note */
function addContradictsToNote(noteId: string, contradictingId: string): boolean {
  return updateExistingNote(noteId, (data) => {
    const contradicts = data.contradicts || [];
    if (!contradicts.includes(contradictingId)) {
      contradicts.push(contradictingId);
      data.contradicts = contradicts;
    }
  });
}

/** Infer NoteRole from which optional fields are present */
function inferRole(en: ExtractedNote): NoteRole {
  if (en.evidence_text) return "claim";
  if (en.sees || en.ignores) return "frame";
  if (en.question_status) return "question";
  if (en.bridges && en.bridges.length > 0) return "connection";
  return "observation";
}

export function processAgentOutput(
  result: CompilationResult,
  sourceId: string,
  onProgress?: (msg: string) => void,
): ProcessedObjects {
  const log = onProgress || (() => {});
  const now = new Date().toISOString();
  const processed: ProcessedObjects = {
    notes_new: [],
    notes_reinforced: [],
    notes_contradicted: [],
    notes_skipped: 0,
  };

  // Process all notes
  for (const en of result.notes) {
    const relation = en.relation_to_existing || "new";
    const existingId = en.existing_note_id;

    switch (relation) {
      case "duplicate": {
        // Merge evidence into existing note
        if (existingId && en.evidence_text) {
          const ok = appendEvidenceToNote(existingId, {
            text: en.evidence_text,
            source: sourceId,
            locator: en.evidence_locator,
          });
          if (ok) {
            processed.notes_reinforced.push(existingId);
            log(`  Reinforced: ${existingId} -- added evidence`);
            processed.notes_skipped++;
          } else {
            // Existing note not found — create as new instead of losing data
            log(`  Warning: existing note ${existingId} not found, creating new`);
            createNewNote(en, sourceId, now, processed, log);
          }
        } else {
          // Missing existingId or evidence — create as new instead of silently dropping
          log(`  Warning: duplicate missing required fields, creating as new`);
          createNewNote(en, sourceId, now, processed, log);
        }
        break;
      }

      case "supports": {
        const id = createNewNote(en, sourceId, now, processed, log);
        if (existingId && id) {
          updateExistingNote(id, (data) => { data.supports = [existingId]; });
          log(`  Supports: ${existingId}`);
        }
        break;
      }

      case "contradicts": {
        const id = createNewNote(en, sourceId, now, processed, log);
        if (existingId && id) {
          updateExistingNote(id, (data) => { data.contradicts = [existingId]; });
          addContradictsToNote(existingId, id);
          processed.notes_contradicted.push(id, existingId);
          log(`  Contradicts: ${existingId}`);
        }
        break;
      }

      case "new":
      default: {
        createNewNote(en, sourceId, now, processed, log);
        break;
      }
    }
  }

  log(`Notes: ${processed.notes_new.length} new, ${processed.notes_reinforced.length} reinforced, ${processed.notes_skipped} duplicates merged, ${processed.notes_contradicted.length / 2} contradictions`);

  return processed;
}

function createNewNote(
  en: ExtractedNote,
  sourceId: string,
  now: string,
  processed: ProcessedObjects,
  log: (msg: string) => void,
): string {
  const id = generateId("note");
  const role = en.role || inferRole(en);

  const note: Note = {
    id,
    type: "note",
    text: en.text,
    role,
    source: sourceId,
    status: "active",
    created_at: now,
  };

  // Claim fields
  if (en.evidence_text) {
    note.evidence = [{ text: en.evidence_text, source: sourceId, locator: en.evidence_locator }];
  }
  if (en.qualifier) note.qualifier = en.qualifier;
  if (en.voice) note.voice = en.voice;
  if (en.scope) note.scope = en.scope;
  if (en.structure_type) note.structure_type = en.structure_type as any;

  // Frame fields
  if (en.sees) note.sees = en.sees;
  if (en.ignores) note.ignores = en.ignores;
  if (en.assumptions && en.assumptions.length > 0) note.assumptions = en.assumptions;

  // Question field
  if (en.question_status) note.question_status = en.question_status;

  // Bridge field
  if (en.bridges && en.bridges.length > 0) note.bridges = en.bridges;

  saveObject(note, en.text);
  processed.notes_new.push(id);
  return id;
}
