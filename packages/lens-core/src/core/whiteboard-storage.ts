/**
 * Whiteboard storage — JSON files in .lens/whiteboards/.
 *
 * Whiteboards are independent from the knowledge graph: they reference notes /
 * sources / tasks by ID but do NOT participate in typed link rels. A card being
 * on a whiteboard is a whiteboard-local fact (stored here), not a graph edge.
 *
 * Deletion semantics:
 *   - Deleting a referenced card leaves a dangling member; callers should
 *     filter dangling IDs on read (e.g., when rendering).
 *   - Deleting a whiteboard does NOT affect the referenced cards.
 *   - Removing a member only updates this whiteboard; the card stays in graph.
 *
 * File format: JSON, one file per whiteboard, name = wb_<ULID>.json.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { paths, objectPath } from "./paths";
import type { Whiteboard, WhiteboardMember } from "./types";
import { generateId } from "./types";

function ensureDir() {
  if (!existsSync(paths.whiteboards)) {
    mkdirSync(paths.whiteboards, { recursive: true });
  }
}

/** Read a whiteboard by ID. Returns null if not found. */
export function readWhiteboard(id: string): Whiteboard | null {
  const filePath = objectPath(id);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    const wb = JSON.parse(raw) as Whiteboard;
    return wb;
  } catch {
    return null;
  }
}

/** Write a whiteboard (create or overwrite). Validates shape. */
export function writeWhiteboard(wb: Whiteboard): void {
  if (!wb.id || !wb.id.startsWith("wb_")) {
    throw new Error(`Invalid whiteboard id: "${wb.id}" (expected wb_<ULID>)`);
  }
  ensureDir();
  const filePath = objectPath(wb.id);
  writeFileSync(filePath, JSON.stringify(wb, null, 2), "utf-8");
}

/** Create a new whiteboard with a generated ID. Returns the new whiteboard. */
export function createWhiteboard(opts: {
  title: string;
  body?: string;
  members?: WhiteboardMember[];
}): Whiteboard {
  const now = new Date().toISOString();
  const wb: Whiteboard = {
    id: generateId("whiteboard"),
    type: "whiteboard",
    title: opts.title,
    ...(opts.body ? { body: opts.body } : {}),
    members: opts.members || [],
    created_at: now,
    updated_at: now,
  };
  writeWhiteboard(wb);
  return wb;
}

/** List all whiteboard IDs, newest first. */
export function listWhiteboards(): Whiteboard[] {
  if (!existsSync(paths.whiteboards)) return [];
  const files = readdirSync(paths.whiteboards).filter(f => f.endsWith(".json"));
  const boards: Whiteboard[] = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, "");
    const wb = readWhiteboard(id);
    if (wb) boards.push(wb);
  }
  boards.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return boards;
}

/** Delete a whiteboard (irreversible). Does not affect referenced cards. */
export function deleteWhiteboard(id: string): boolean {
  const filePath = objectPath(id);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

/** Find all whiteboards that reference a given card ID. Linear scan. */
export function findWhiteboardsContaining(cardId: string): Whiteboard[] {
  return listWhiteboards().filter(wb =>
    wb.members.some(m => m.id === cardId)
  );
}

/**
 * Add one or more members to a whiteboard. Idempotent — members already present
 * are skipped silently. New members are placed at (0, 0) by default; callers
 * typically follow up with a layout write to position them properly.
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
  if (added.length === 0) return wb; // unchanged
  wb.members = [...wb.members, ...added];
  wb.updated_at = new Date().toISOString();
  writeWhiteboard(wb);
  return wb;
}

/** Remove a member from a whiteboard. Returns false if member not present. */
export function removeMember(id: string, cardId: string): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  const before = wb.members.length;
  wb.members = wb.members.filter(m => m.id !== cardId);
  if (wb.members.length === before) return wb; // unchanged
  wb.updated_at = new Date().toISOString();
  writeWhiteboard(wb);
  return wb;
}

/**
 * Update member positions. Accepts a partial map; IDs not present in `positions`
 * keep their existing coords. IDs in `positions` that aren't members are ignored.
 */
export function updatePositions(
  id: string,
  positions: Record<string, { x: number; y: number }>,
): Whiteboard | null {
  const wb = readWhiteboard(id);
  if (!wb) return null;
  let changed = false;
  wb.members = wb.members.map(m => {
    const p = positions[m.id];
    if (!p) return m;
    if (p.x === m.x && p.y === m.y) return m;
    changed = true;
    return { ...m, x: p.x, y: p.y };
  });
  if (!changed) return wb;
  wb.updated_at = new Date().toISOString();
  writeWhiteboard(wb);
  return wb;
}

/**
 * Update whiteboard metadata (title, body). Undefined fields are left unchanged.
 */
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
  wb.updated_at = new Date().toISOString();
  writeWhiteboard(wb);
  return wb;
}
