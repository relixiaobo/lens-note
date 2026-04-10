/**
 * Process Compilation Agent output into lens Note objects.
 *
 * Handles 4 relationship types from the Agent:
 * - "new": Create a new Note
 * - "duplicate": Add evidence to an existing Note (don't create new)
 * - "supports": Create new Note with supports link to existing
 * - "contradicts": Create new Note with contradicts link on both sides
 */

import { readFileSync, writeFileSync } from "fs";
import matter from "gray-matter";
import { generateId, type Note, type NoteRole } from "../core/types";
import { saveObject, readObject } from "../core/storage";
import { objectPath } from "../core/paths";
import type { CompilationResult, ExtractedNote } from "./compilation-agent";

export interface ProcessedObjects {
  notes_new: string[];
  notes_reinforced: string[];     // existing notes that got new evidence
  notes_contradicted: string[];   // pairs [new, existing]
  notes_skipped: number;          // duplicates where evidence was merged
}

/** Append evidence to an existing Note's markdown file */
function appendEvidenceToNote(noteId: string, newEvidence: { text: string; source: string; locator?: string }) {
  const filePath = objectPath(noteId);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);

  // Add to evidence array
  const evidence = parsed.data.evidence || [];
  evidence.push(newEvidence);
  parsed.data.evidence = evidence;

  // Rewrite file
  const content = matter.stringify(parsed.content, parsed.data);
  writeFileSync(filePath, content, "utf-8");
}

/** Add a contradicts reference to an existing Note */
function addContradictsToNote(noteId: string, contradictingId: string) {
  const filePath = objectPath(noteId);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);

  const contradicts = parsed.data.contradicts || [];
  if (!contradicts.includes(contradictingId)) {
    contradicts.push(contradictingId);
    parsed.data.contradicts = contradicts;
    const content = matter.stringify(parsed.content, parsed.data);
    writeFileSync(filePath, content, "utf-8");
  }
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
    const existingId = en.existing_claim_id;

    switch (relation) {
      case "duplicate": {
        // Merge evidence into existing note, don't create new
        if (existingId && en.evidence_text) {
          try {
            appendEvidenceToNote(existingId, {
              text: en.evidence_text,
              source: sourceId,
              locator: en.evidence_locator,
            });
            processed.notes_reinforced.push(existingId);
            log(`  Reinforced: ${existingId} -- added evidence`);
          } catch (e) {
            // If existing note not found, create as new
            createNewNote(en, sourceId, now, processed, log);
          }
        }
        processed.notes_skipped++;
        break;
      }

      case "supports": {
        // Create new note with supports field
        const id = createNewNote(en, sourceId, now, processed, log);
        if (existingId && id) {
          try {
            const filePath = objectPath(id);
            const raw = readFileSync(filePath, "utf-8");
            const parsed = matter(raw);
            parsed.data.supports = [existingId];
            writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
          } catch {}
          log(`  Supports: ${existingId}`);
        }
        break;
      }

      case "contradicts": {
        // Create new note + set contradicts on both sides
        const id = createNewNote(en, sourceId, now, processed, log);
        if (existingId && id) {
          try {
            // Mark new note as contradicting existing
            const filePath = objectPath(id);
            const raw = readFileSync(filePath, "utf-8");
            const parsed = matter(raw);
            parsed.data.contradicts = [existingId];
            writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");

            // Mark existing note as contradicted by new
            addContradictsToNote(existingId, id);
          } catch {}
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
