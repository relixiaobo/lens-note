/**
 * Lens core types.
 *
 * 3 types: Source, Note, Task.
 * Note is the universal knowledge card — minimal frontmatter, rich body.
 * Task is a Note with status — the collaboration protocol between human and agent.
 * Structure emerges from links, not from categories.
 */

import { ulid } from "ulid";

// ============================================================
// Shared Types
// ============================================================

export type ISODate = string;

export type ObjectType = "source" | "note" | "task";

export type SourceType =
  | "book" | "paper" | "report"                              // published works
  | "video" | "podcast" | "course"                           // media
  | "web_article" | "newsletter" | "social_post"             // digital
  | "conversation" | "manual_note" | "note_batch"            // input
  | "markdown" | "plain_text";                               // raw format

export type LinkRel = "supports" | "contradicts" | "refines" | "related" | "indexes";

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
  links?: NoteLink[];  // all relationships (supports/contradicts/refines/related/indexes + reason)
  created_at: ISODate;
  updated_at: ISODate;
}

// ============================================================
// Task — collaboration protocol between human and agent
//
// A Note with status. Doing things produces knowledge.
// ============================================================

export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  type: "task";
  title: string;       // what needs doing (imperative)
  status: TaskStatus;
  source?: string;     // optional source/note that prompted this task
  links?: NoteLink[];
  created_at: ISODate;
  updated_at: ISODate;
}

// ============================================================
// Union type
// ============================================================

export type LensObject = Source | Note | Task;

// ============================================================
// ID generation
// ============================================================

const prefixes: Record<ObjectType, string> = {
  source: "src",
  note: "note",
  task: "task",
};

export function generateId(type: ObjectType): string {
  return `${prefixes[type]}_${ulid()}`;
}
