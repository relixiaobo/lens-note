/**
 * Whiteboard storage — JSON files in .lens/whiteboards/.
 *
 * Whiteboards are the primary workspace layer. They reference notes/sources/
 * tasks as members but do NOT participate in typed graph links. A whiteboard
 * carries its own local semantics: groups, annotations, arrows (with free-text
 * labels), and a default camera. See docs/whiteboard-model.md for the two-layer
 * invariant between graph rels and whiteboard arrows.
 *
 * All CRUD operations here are idempotent and return the current whiteboard
 * (unchanged or updated) or `null` if the whiteboard doesn't exist.
 *
 * File format: JSON, one file per whiteboard, name = wb_<ULID>.json.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, renameSync } from "fs";
import { paths, objectPath } from "./paths";
import type {
  Whiteboard,
  WhiteboardMember,
  WhiteboardGroup,
  WhiteboardArrow,
  WhiteboardCamera,
  LinkRel,
} from "./types";
import { generateId, generateChildId, DEFAULT_CAMERA } from "./types";

function ensureDir() {
  if (!existsSync(paths.whiteboards)) {
    mkdirSync(paths.whiteboards, { recursive: true });
  }
}

function now(): string { return new Date().toISOString(); }

/** Read a whiteboard by ID. Returns null if not found. */
export function readWhiteboard(id: string): Whiteboard | null {
  const filePath = objectPath(id);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Whiteboard;
  } catch {
    return null;
  }
}

/**
 * Write a whiteboard (create or overwrite). Validates shape.
 *
 * Uses a temp-file + rename so readers never observe a half-written file even
 * if the process crashes mid-write. Within a single Node process the event
 * loop already serializes synchronous storage ops, so interleaving between
 * concurrent handlers is impossible. Cross-process races (CLI running while
 * view server is up) can still cause last-writer-wins on the whole file; we
 * accept that for now — lens is single-user.
 */
export function writeWhiteboard(wb: Whiteboard): void {
  if (!wb.id || !wb.id.startsWith("wb_")) {
    throw new Error(`Invalid whiteboard id: "${wb.id}" (expected wb_<ULID>)`);
  }
  ensureDir();
  const finalPath = objectPath(wb.id);
  const tmpPath = `${finalPath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(wb, null, 2), "utf-8");
  renameSync(tmpPath, finalPath);
}

/** Create a new whiteboard with a generated ID. Returns the new whiteboard. */
export function createWhiteboard(opts: {
  title: string;
  body?: string;
  members?: WhiteboardMember[];
}): Whiteboard {
  const ts = now();
  const wb: Whiteboard = {
    id: generateId("whiteboard"),
    type: "whiteboard",
    title: opts.title,
    ...(opts.body ? { body: opts.body } : {}),
    members: opts.members ?? [],
    groups: [],
    arrows: [],
    camera: { ...DEFAULT_CAMERA },
    created_at: ts,
    updated_at: ts,
  };
  writeWhiteboard(wb);
  return wb;
}

/** List all whiteboards, newest first by update time. */
export function listWhiteboards(): Whiteboard[] {
  if (!existsSync(paths.whiteboards)) return [];
  const files = readdirSync(paths.whiteboards).filter(f => f.endsWith(".json"));
  const boards: Whiteboard[] = [];
  for (const f of files) {
    const wb = readWhiteboard(f.replace(/\.json$/, ""));
    if (wb) boards.push(wb);
  }
  boards.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return boards;
}

/** Delete a whiteboard file. Does not affect referenced cards. */
export function deleteWhiteboard(id: string): boolean {
  const filePath = objectPath(id);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

/** Whiteboards containing the given card ID. Linear scan. */
export function findWhiteboardsContaining(cardId: string): Whiteboard[] {
  return listWhiteboards().filter(wb => wb.members.some(m => m.id === cardId));
}

// ── Members ──────────────────────────────────────────────────

/**
 * Add one or more members. Idempotent — existing members are skipped. New
 * members land at (0, 0) by default; follow up with move() to position them.
 */
export function addMembers(id: string, cardIds: string[]): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const existing = new Set(wb.members.map(m => m.id));
  const added: WhiteboardMember[] = [];
  for (const cid of cardIds) {
    if (existing.has(cid)) continue;
    existing.add(cid);
    added.push({ id: cid, x: 0, y: 0 });
  }
  if (added.length === 0) return wb;
  wb.members = [...wb.members, ...added];
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

/** Remove a member and any arrows that reference it. Idempotent. */
export function removeMember(id: string, cardId: string): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const before = wb.members.length;
  wb.members = wb.members.filter(m => m.id !== cardId);
  if (wb.members.length === before) return wb;
  wb.arrows = wb.arrows.filter(a => a.from !== cardId && a.to !== cardId);
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

/**
 * Update member position + parent. Partial map: IDs not present keep their
 * values. IDs in `updates` that aren't members are ignored. Passing
 * `parent: null` clears the parent assignment.
 */
export function updateMembers(
  id: string,
  updates: Record<string, { x?: number; y?: number; parent?: string | null }>,
): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  let changed = false;
  wb.members = wb.members.map(m => {
    const u = updates[m.id];
    if (!u) return m;
    const next: WhiteboardMember = { ...m };
    if (typeof u.x === "number" && u.x !== m.x) { next.x = u.x; changed = true; }
    if (typeof u.y === "number" && u.y !== m.y) { next.y = u.y; changed = true; }
    if (u.parent === null) {
      if (m.parent !== undefined) { delete next.parent; changed = true; }
    } else if (typeof u.parent === "string" && u.parent !== m.parent) {
      next.parent = u.parent; changed = true;
    }
    return next;
  });
  if (!changed) return wb;
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

// ── Groups ───────────────────────────────────────────────────

/** Create a new group. Optionally nest a set of members under it. */
export function addGroup(
  id: string,
  opts: {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    members?: string[];
  },
): { whiteboard: Whiteboard; group: WhiteboardGroup } | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const group: WhiteboardGroup = {
    id: generateChildId("group"),
    label: opts.label,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    ...(opts.color ? { color: opts.color } : {}),
  };
  wb.groups = [...wb.groups, group];
  if (opts.members && opts.members.length > 0) {
    const memberSet = new Set(opts.members);
    wb.members = wb.members.map(m =>
      memberSet.has(m.id) ? { ...m, parent: group.id } : m,
    );
  }
  wb.updated_at = now();
  writeWhiteboard(wb);
  return { whiteboard: wb, group };
}

/** Remove a group and clear parent refs from its members. Members stay. */
export function removeGroup(id: string, groupId: string): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const before = wb.groups.length;
  wb.groups = wb.groups.filter(g => g.id !== groupId);
  if (wb.groups.length === before) return wb;
  wb.members = wb.members.map(m => {
    if (m.parent !== groupId) return m;
    const { parent: _parent, ...rest } = m;
    return rest;
  });
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

/** Update group fields. Undefined fields are left alone. */
export function updateGroup(
  id: string,
  groupId: string,
  patch: { label?: string; x?: number; y?: number; width?: number; height?: number; color?: string | null },
): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  let changed = false;
  wb.groups = wb.groups.map(g => {
    if (g.id !== groupId) return g;
    const next: WhiteboardGroup = { ...g };
    if (patch.label !== undefined && patch.label !== g.label) { next.label = patch.label; changed = true; }
    if (typeof patch.x === "number" && patch.x !== g.x) { next.x = patch.x; changed = true; }
    if (typeof patch.y === "number" && patch.y !== g.y) { next.y = patch.y; changed = true; }
    if (typeof patch.width === "number" && patch.width !== g.width) { next.width = patch.width; changed = true; }
    if (typeof patch.height === "number" && patch.height !== g.height) { next.height = patch.height; changed = true; }
    if (patch.color === null) {
      if (g.color !== undefined) { delete next.color; changed = true; }
    } else if (typeof patch.color === "string" && patch.color !== g.color) {
      next.color = patch.color; changed = true;
    }
    return next;
  });
  if (!changed) return wb;
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

// ── Arrows ───────────────────────────────────────────────────

/**
 * Create a board-local arrow between two members. Both endpoints must be
 * existing member IDs — arrows cannot dangle, target groups, or target
 * non-existent cards. The label is free text and is NOT a graph rel.
 */
export function addArrow(
  id: string,
  opts: {
    from: string;
    to: string;
    label?: string;
    color?: string;
    style?: WhiteboardArrow["style"];
  },
): { whiteboard: Whiteboard; arrow: WhiteboardArrow } | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const members = new Set(wb.members.map(m => m.id));
  if (!members.has(opts.from) || !members.has(opts.to)) {
    throw new Error(
      `arrow endpoints must be existing whiteboard members (from=${opts.from}, to=${opts.to})`,
    );
  }
  if (opts.from === opts.to) {
    throw new Error(`arrow cannot loop to itself (${opts.from})`);
  }
  const arrow: WhiteboardArrow = {
    id: generateChildId("arrow"),
    from: opts.from,
    to: opts.to,
    ...(opts.label ? { label: opts.label } : {}),
    ...(opts.color ? { color: opts.color } : {}),
    ...(opts.style ? { style: opts.style } : {}),
  };
  wb.arrows = [...wb.arrows, arrow];
  wb.updated_at = now();
  writeWhiteboard(wb);
  return { whiteboard: wb, arrow };
}

/** Remove an arrow. Idempotent. */
export function removeArrow(id: string, arrowId: string): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const before = wb.arrows.length;
  wb.arrows = wb.arrows.filter(a => a.id !== arrowId);
  if (wb.arrows.length === before) return wb;
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

/** Update arrow label/color/style. `label: null` clears the label. */
export function updateArrow(
  id: string,
  arrowId: string,
  patch: {
    label?: string | null;
    color?: string | null;
    style?: WhiteboardArrow["style"] | null;
  },
): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  let changed = false;
  wb.arrows = wb.arrows.map(a => {
    if (a.id !== arrowId) return a;
    const next: WhiteboardArrow = { ...a };
    if (patch.label === null) {
      if (a.label !== undefined) { delete next.label; changed = true; }
    } else if (typeof patch.label === "string" && patch.label !== a.label) {
      next.label = patch.label; changed = true;
    }
    if (patch.color === null) {
      if (a.color !== undefined) { delete next.color; changed = true; }
    } else if (typeof patch.color === "string" && patch.color !== a.color) {
      next.color = patch.color; changed = true;
    }
    if (patch.style === null) {
      if (a.style !== undefined) { delete next.style; changed = true; }
    } else if (patch.style && patch.style !== a.style) {
      next.style = patch.style; changed = true;
    }
    return next;
  });
  if (!changed) return wb;
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

/**
 * Record that an arrow has been promoted to a graph rel. The actual graph
 * link must be created separately (e.g., by the CLI handler calling
 * note-storage). This function only updates the arrow's `promoted_to`.
 *
 * Idempotent: re-promoting with the SAME rel/endpoints is a no-op. Calling
 * with a DIFFERENT rel on an already-promoted arrow throws — silently
 * overwriting would leave the previous graph link orphaned in `note.links[]`.
 * The caller is responsible for demoting first (unlink old rel) if they
 * really want to re-promote.
 */
export class ArrowPromotionConflict extends Error {
  readonly code = "promotion_conflict";
  readonly existing: { rel: LinkRel; from_note: string; to_note: string };
  constructor(existing: { rel: LinkRel; from_note: string; to_note: string }) {
    super(
      `arrow is already promoted to ${existing.rel} (${existing.from_note} → ${existing.to_note}); demote it first before re-promoting with a different rel`,
    );
    this.name = "ArrowPromotionConflict";
    this.existing = existing;
  }
}

export function setArrowPromotion(
  id: string,
  arrowId: string,
  promoted: { rel: LinkRel; from_note: string; to_note: string },
): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const target = wb.arrows.find(a => a.id === arrowId);
  if (!target) return wb; // arrow gone — nothing to record; caller decides how to react
  const existing = target.promoted_to;
  if (existing) {
    const same =
      existing.rel === promoted.rel
      && existing.from_note === promoted.from_note
      && existing.to_note === promoted.to_note;
    if (same) return wb; // idempotent no-op
    throw new ArrowPromotionConflict(existing);
  }
  wb.arrows = wb.arrows.map(a =>
    a.id === arrowId ? { ...a, promoted_to: { ...promoted } } : a,
  );
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

// ── Camera ───────────────────────────────────────────────────

/** Overwrite the saved viewport. */
export function setCamera(id: string, camera: WhiteboardCamera): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  if (
    wb.camera.x === camera.x
    && wb.camera.y === camera.y
    && wb.camera.scale === camera.scale
  ) {
    return wb;
  }
  wb.camera = { ...camera };
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

// ── Metadata ─────────────────────────────────────────────────

/** Update title / body. Undefined fields are left alone. */
export function updateWhiteboardMeta(
  id: string,
  patch: { title?: string; body?: string },
): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  let changed = false;
  if (patch.title !== undefined && patch.title !== wb.title) {
    wb.title = patch.title;
    changed = true;
  }
  if (patch.body !== undefined && patch.body !== (wb.body || "")) {
    if (patch.body) wb.body = patch.body;
    else delete wb.body;
    changed = true;
  }
  if (!changed) return wb;
  wb.updated_at = now();
  writeWhiteboard(wb);
  return wb;
}

// ── Dangling members (for lint / doctor) ─────────────────────

/**
 * Find member IDs on a whiteboard that no longer resolve to any object in
 * the graph. Caller supplies the set of live IDs (typically union of note,
 * source, and task IDs) — this function is a pure filter.
 */
export function findDanglingMembers(wb: Whiteboard, liveIds: Set<string>): string[] {
  return wb.members.filter(m => !liveIds.has(m.id)).map(m => m.id);
}
