/**
 * Lens core types.
 *
 * 3 types: Source, Note, Thread.
 * Note is the universal knowledge card — minimal frontmatter, rich body.
 * Structure emerges from links, not from categories.
 */

import { ulid } from "ulid";

// ============================================================
// Shared Types
// ============================================================

export type ISODate = string;

export type ObjectType = "source" | "note" | "thread";

export type SourceType = "web_article" | "markdown" | "plain_text" | "manual_note" | "note_batch";

export type LinkRel = "supports" | "contradicts" | "refines" | "related";

export interface NoteLink {
  to: string;
  rel: LinkRel;
  reason?: string;
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
}

// ============================================================
// Note — universal knowledge card
//
// Frontmatter: id, type, title, source, links, created_at, updated_at
// Body: everything else (evidence, reasoning, qualifier, scope, frames)
//
// One idea per card. Title is the thought in one sentence.
// Body elaborates. Links connect.
// ============================================================

export interface Note {
  id: string;
  type: "note";
  title: string;       // the thought in one sentence
  source?: string;     // source ID this note comes from
  links?: NoteLink[];  // all relationships (supports/contradicts/refines/related + reason)
  created_at: ISODate;
  updated_at: ISODate;
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
