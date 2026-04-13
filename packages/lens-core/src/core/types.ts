/**
 * Lens core types.
 *
 * 3 types: Source, Note, Thread.
 * Note is the universal knowledge card with optional fields.
 * Structure emerges from links, not from categories.
 */

import { ulid } from "ulid";

// ============================================================
// Shared Types
// ============================================================

export type ISODate = string;

export type Qualifier = "certain" | "likely" | "presumably" | "tentative";

export type Voice = "extracted" | "restated" | "synthesized" | "experiential";

export type StructureType =
  | "taxonomy"
  | "causal"
  | "description"
  | "timeline"
  | "argument"
  | "content"
  | "story"
  | "process"
  | "relationships";

export type NoteScope = "big_picture" | "detail";

export type NoteRole =
  | "claim"
  | "frame"
  | "question"
  | "observation"
  | "connection"
  | "structure_note";

export type ObjectType = "source" | "note" | "thread";

export type SourceType = "web_article" | "markdown" | "plain_text" | "manual_note" | "note_batch";

export type ObjectStatus = "active" | "superseded";

export interface RelatedRef {
  id: string;
  note?: string;
}

export interface Evidence {
  text: string;
  source: string;
  locator?: string;
}

// ============================================================
// Source — provenance record
// ============================================================

export interface Source {
  id: string;
  type: "source";
  source_type: SourceType;
  title: string;
  author?: string;
  url?: string;
  word_count: number;
  raw_file?: string;
  ingested_at: ISODate;
  created_at: ISODate;
  status: ObjectStatus;
}

// ============================================================
// Note — universal knowledge card
//
// One idea per card. Optional fields express different roles:
//   evidence + qualifier → claim
//   sees + ignores → frame
//   question_status → question
//   bridges → connection
//   entries → structure note
//   (nothing extra) → observation
//
// Role is a soft hint for display, not a constraint.
// ============================================================

export interface Note {
  id: string;
  type: "note";
  text: string; // the thought itself (always present)

  // Optional: Role hint (for display)
  role?: NoteRole;

  // Optional: Claim fields (Toulmin structure)
  evidence?: Evidence[];
  qualifier?: Qualifier;
  voice?: Voice;

  // Optional: Hierarchy (Reif/Miller)
  scope?: NoteScope;

  // Optional: Structure type (Miller)
  structure_type?: StructureType;

  // Optional: Frame fields
  sees?: string;
  ignores?: string;
  assumptions?: string[];

  // Optional: Question field
  question_status?: "open" | "tentative_answer" | "resolved" | "superseded";

  // Optional: Bridge (connection note)
  bridges?: string[];

  // Optional: Structure note (index entry)
  entries?: string[];

  // Typed links
  supports?: string[];
  contradicts?: string[];
  refines?: string[];
  related?: RelatedRef[];

  // Provenance
  source?: string;
  status: ObjectStatus;
  created_at: ISODate;
}

// ============================================================
// Thread — conversation about Notes
// ============================================================

export interface Thread {
  id: string;
  type: "thread";
  title: string;
  references: string[];
  started_from?: string;
  status: ObjectStatus;
  created_at: ISODate;
}

// ============================================================
// Union type
// ============================================================

export type LensObject = Source | Note | Thread;

// ============================================================
// ID generation
// ============================================================

const prefixes: Record<ObjectType, string> = {
  source: "src",
  note: "note",
  thread: "thr",
};

export function generateId(type: ObjectType): string {
  return `${prefixes[type]}_${ulid()}`;
}
