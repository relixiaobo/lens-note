/**
 * Lens core types.
 *
 * Design decisions:
 * - Typed fields for relationships (not universal edges) — validated by research
 * - Evidence inline in Claim (no separate Excerpt type) — v0.1 simplicity
 * - Programme doesn't store member lists — reverse-query from members
 * - Thread is a peer object, not owned by any other object
 * - All objects have status + superseded_by for merge/split lifecycle
 * - "related" field as escape hatch for untyped associations
 */

import { ulid } from "ulid";

// ============================================================
// Shared Types
// ============================================================

export type ISODate = string; // ISO 8601 UTC

export type Qualifier = "certain" | "likely" | "presumably" | "tentative";

export type Voice = "extracted" | "restated" | "synthesized";

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

export type ObjectType = "source" | "claim" | "frame" | "question" | "programme" | "thread";

export type SourceType = "web_article" | "markdown" | "plain_text" | "manual_note";

export type ObjectStatus = "active" | "superseded";

// Weak/untyped association
export interface RelatedRef {
  id: string;
  note?: string; // optional context for why this is related
}

// ============================================================
// Evidence (inline in Claim)
// ============================================================

export interface Evidence {
  text: string; // verbatim quote from source (50-300 chars)
  source: string; // Source ID
  locator?: string; // where in the source (section, paragraph, etc.)
}

// ============================================================
// Source
// ============================================================

export interface Source {
  id: string;
  type: "source";
  source_type: SourceType;
  title: string;
  author?: string;
  url?: string;
  word_count: number;
  raw_file?: string; // e.g. "raw/src_01.html"
  ingested_at: ISODate;
  created_at: ISODate;
  status: ObjectStatus;
}

// ============================================================
// Claim
// ============================================================

export interface Claim {
  id: string;
  type: "claim";
  statement: string;
  qualifier: Qualifier;
  voice: Voice;
  evidence: Evidence[];
  structure_type?: StructureType;

  // Typed relationship fields
  warrant_frame?: string; // Frame ID: which perspective makes this claim valid
  supports?: string[]; // Claim IDs this claim supports
  contradicts?: string[]; // Claim IDs this claim contradicts
  refines?: string[]; // Claim IDs this claim refines
  programmes?: string[]; // Programme IDs this is relevant to
  source: string; // Source ID: provenance

  // Lifecycle
  status: ObjectStatus;
  superseded_by?: string[]; // Claim IDs that replaced this (merge/split)

  // Escape hatch for untyped associations
  related?: RelatedRef[];

  created_at: ISODate;
}

// ============================================================
// Frame
// ============================================================

export interface Frame {
  id: string;
  type: "frame";
  name: string;
  sees: string;
  ignores: string;
  assumptions: string[];
  useful_when?: string[];
  failure_modes?: string[];

  // Typed relationship fields
  programmes?: string[];
  contradicts_frames?: string[]; // Frame IDs
  refines?: string[]; // Frame IDs
  source: string;

  status: ObjectStatus;
  superseded_by?: string[];
  related?: RelatedRef[];
  created_at: ISODate;
}

// ============================================================
// Question
// ============================================================

export interface Question {
  id: string;
  type: "question";
  text: string;
  question_status: "open" | "tentative_answer" | "resolved" | "superseded";
  current_position?: string;

  // Typed relationship fields
  parent_question?: string; // Question ID
  candidate_answers?: string[]; // Claim IDs that might answer this
  programmes?: string[];
  source: string;

  status: ObjectStatus;
  superseded_by?: string[];
  related?: RelatedRef[];
  created_at: ISODate;
}

// ============================================================
// Programme (doesn't store member lists — reverse-query)
// ============================================================

export interface Programme {
  id: string;
  type: "programme";
  title: string;
  description: string;

  // Typed relationship fields
  root_question?: string; // Question ID: the Programme's driving question

  status: ObjectStatus;
  related?: RelatedRef[];
  created_at: ISODate;
  updated_at: ISODate;
}

// ============================================================
// Thread (peer object, not owned by anyone)
// ============================================================

export interface Thread {
  id: string;
  type: "thread";
  title: string;

  // Typed relationship fields
  references: string[]; // IDs of any objects discussed in this thread
  started_from?: string; // ID of the object that triggered this thread

  status: ObjectStatus;
  created_at: ISODate;
  // Body (markdown) contains the conversation messages
}

// ============================================================
// Union type
// ============================================================

export type LensObject = Source | Claim | Frame | Question | Programme | Thread;

// ============================================================
// ID generation
// ============================================================

const prefixes: Record<ObjectType, string> = {
  source: "src",
  claim: "clm",
  frame: "frm",
  question: "q",
  programme: "pgm",
  thread: "thr",
};

export function generateId(type: ObjectType): string {
  return `${prefixes[type]}_${ulid()}`;
}
