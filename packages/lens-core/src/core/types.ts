/**
 * Lens core types.
 *
 * 4 types: Source, Note, Task, Whiteboard.
 * Note is the universal knowledge card — minimal frontmatter, rich body.
 * Task is a Note with status — the collaboration protocol between human and agent.
 * Whiteboard is a research workspace — aggregates cards with spatial layout,
 *   independent from the knowledge graph. Does NOT participate in link rels.
 * Structure emerges from links (between notes) and from whiteboards (between
 * cards in a workspace).
 */

import { ulid } from "ulid";

// ============================================================
// Shared Types
// ============================================================

export type ISODate = string;

export type ObjectType = "source" | "note" | "task" | "whiteboard";

export type SourceType =
  | "book" | "paper" | "report"                              // published works
  | "video" | "podcast" | "course"                           // media
  | "web_article" | "newsletter" | "social_post"             // digital
  | "conversation" | "manual_note" | "note_batch"            // input
  | "markdown" | "plain_text";                               // raw format

export type LinkRel = "supports" | "contradicts" | "refines" | "related" | "continues";

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
  links?: NoteLink[];  // all relationships (supports/contradicts/refines/related/continues + reason)
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
// Whiteboard — primary workspace
//
// Where a user arranges, connects, and annotates cards while thinking.
// The graph layer (note.links[]) captures committed universal knowledge;
// the whiteboard layer (this file) captures local, contextual, draft state:
// positions, groupings, sticky annotations, and board-local arrows.
//
// The two layers are independent — a whiteboard arrow is NOT a typed graph
// rel; a graph rel does NOT auto-render as a whiteboard arrow. Promotion
// from arrow → rel is an explicit operation. See docs/whiteboard-model.md.
//
// Data lives in .lens/whiteboards/wb_<ULID>.json — structured data, small
// optional prose body.
// ============================================================

export interface WhiteboardMember {
  id: string;              // note / source / task ID
  x: number;
  y: number;
  parent?: string;         // group ID if nested inside one
}

export interface WhiteboardGroup {
  id: string;              // grp_<ULID>
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

/**
 * Board-local arrow between two members. Endpoints must be existing member
 * IDs — never groups (ambiguous) and never note-to-note graph rels. The
 * label is free text; it is NOT a LinkRel. An arrow becomes a graph rel
 * only via explicit arrow-promote, which records the promotion here for
 * rendering purposes.
 */
export interface WhiteboardArrow {
  id: string;              // arr_<ULID>
  from: string;            // member ID
  to: string;              // member ID
  label?: string;
  color?: string;
  style?: "solid" | "dashed";
  promoted_to?: {
    rel: LinkRel;
    from_note: string;
    to_note: string;
  };
}

export interface WhiteboardCamera {
  x: number;
  y: number;
  scale: number;
}

export interface Whiteboard {
  id: string;
  type: "whiteboard";
  title: string;
  body?: string;
  members: WhiteboardMember[];
  groups: WhiteboardGroup[];
  arrows: WhiteboardArrow[];
  camera: WhiteboardCamera;
  created_at: ISODate;
  updated_at: ISODate;
}

// ============================================================
// Union type
// ============================================================

export type LensObject = Source | Note | Task | Whiteboard;

// ============================================================
// ID generation
//
// Top-level objects use ObjectType prefixes. Whiteboard-local children
// (groups, annotations, arrows) use their own prefixes — they are never
// indexed into the graph, never queried by `lens show`, and live only
// inside a single wb_*.json file.
// ============================================================

const prefixes: Record<ObjectType, string> = {
  source: "src",
  note: "note",
  task: "task",
  whiteboard: "wb",
};

export function generateId(type: ObjectType): string {
  return `${prefixes[type]}_${ulid()}`;
}

export type WhiteboardChildKind = "group" | "arrow";

const childPrefixes: Record<WhiteboardChildKind, string> = {
  group: "grp",
  arrow: "arr",
};

export function generateChildId(kind: WhiteboardChildKind): string {
  return `${childPrefixes[kind]}_${ulid()}`;
}

export const DEFAULT_CAMERA: WhiteboardCamera = { x: 0, y: 0, scale: 1 };
