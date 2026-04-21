/**
 * lens board — Whiteboard workspace commands.
 *
 * Whiteboards are the primary workspace layer. They reference graph objects
 * (notes/sources/tasks) as members but do NOT create graph edges. Adding a
 * card to a board is local; drawing an arrow between cards is local; arrows
 * only become graph rels via the explicit `arrow-promote` subcommand. See
 * docs/whiteboard-model.md for the two-layer invariant.
 *
 * Members / metadata:
 *   lens board create --title "<title>" [--body "<body>"]
 *   lens board list | show <wb> | delete <wb> | update <wb> [--title|--body]
 *   lens board add <wb> <card-id>... | remove <wb> <card-id>
 *   lens board move <wb> <card-id> --x N --y N [--parent <grp>]
 *   lens board layout <wb> --positions '{"note_X":{"x":0,"y":0},...}'
 *   lens board find <card-id>            → which boards contain this card?
 *   lens board camera <wb> --x N --y N --scale N
 *
 * Groups:
 *   lens board group <wb> --label "..." --x N --y N --width N --height N
 *                         [--color X] [--members id,id,...]
 *   lens board ungroup <wb> <grp-id>
 *
 * Arrows (board-local, not graph rels):
 *   lens board arrow <wb> --from <member-id> --to <member-id>
 *                         [--label "..." --style solid|dashed --color X]
 *   lens board arrow-remove <wb> <arr-id>
 *   lens board arrow-promote <wb> <arr-id> --rel <supports|contradicts|...>
 *                            [--reason "..."]
 */

import { ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import { respondSuccess, LensError } from "./response";
import {
  createWhiteboard,
  readWhiteboard,
  listWhiteboards,
  deleteWhiteboard,
  addMembers,
  removeMember,
  updateMembers,
  updateWhiteboardMeta,
  findWhiteboardsContaining,
  addGroup,
  removeGroup,
  addArrow,
  removeArrow,
  setCamera,
} from "../core/whiteboard-storage";
import { promoteArrow } from "./arrow-promote";
import type { WhiteboardArrow } from "../core/types";

const VALID_GRP_ID = /^grp_[A-Z0-9]{26}$/;
const VALID_ARR_ID = /^arr_[A-Z0-9]{26}$/;

const VALID_CARD_PREFIX = /^(note|src|task)_[A-Z0-9]{26}$/;
const VALID_WB_ID = /^wb_[A-Z0-9]{26}$/;

function assertWbId(id: string | undefined): asserts id is string {
  if (!id || !VALID_WB_ID.test(id)) {
    throw new LensError(
      `Invalid whiteboard ID: "${id}"`,
      { code: "invalid_id", hint: "Expected format: wb_<ULID>" },
    );
  }
}

function assertCardId(id: string): void {
  if (!VALID_CARD_PREFIX.test(id)) {
    throw new LensError(
      `Invalid card ID: "${id}"`,
      { code: "invalid_id", hint: "Expected format: note_<ULID>, src_<ULID>, or task_<ULID>" },
    );
  }
}

/** CLI flag values arrive as strings; parse numeric ones with validation. */
function numFlag(flags: CommandOptions, name: string): number | undefined {
  const v = flags[name];
  if (v === undefined || typeof v === "boolean") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new LensError(`--${name} must be a number, got "${v}"`, { code: "invalid_arg" });
  }
  return n;
}

function requireNum(flags: CommandOptions, name: string): number {
  const v = numFlag(flags, name);
  if (v === undefined) {
    throw new LensError(`Missing --${name}`, { code: "missing_arg" });
  }
  return v;
}

export async function handleBoard(
  sub: string | undefined,
  args: string[],
  opts: CommandOptions,
): Promise<void> {
  ensureInitialized();
  const { positional, flags } = parseCliArgs(args);

  switch (sub) {
    case "create":            return createCmd(flags, opts);
    case "list":              return listCmd(opts);
    case "show":              return showCmd(positional[0], opts);
    case "add":               return addCmd(positional[0], positional.slice(1), opts);
    case "remove":            return removeCmd(positional[0], positional[1], opts);
    case "move":              return moveCmd(positional[0], positional[1], flags, opts);
    case "layout":            return layoutCmd(positional[0], flags, opts);
    case "update":            return updateCmd(positional[0], flags, opts);
    case "delete":            return deleteCmd(positional[0], opts);
    case "find":              return findCmd(positional[0], opts);
    case "camera":            return cameraCmd(positional[0], flags, opts);
    case "group":             return groupCmd(positional[0], flags, opts);
    case "ungroup":           return ungroupCmd(positional[0], positional[1], opts);
    case "arrow":             return arrowCmd(positional[0], flags, opts);
    case "arrow-remove":      return arrowRemoveCmd(positional[0], positional[1], opts);
    case "arrow-promote":     return arrowPromoteCmd(positional[0], positional[1], flags, opts);
    default:
      throw new LensError(
        sub ? `Unknown subcommand: board ${sub}` : "Usage: lens board <subcommand>",
        {
          code: "unknown_subcommand",
          hint: "Subcommands: create list show add remove move layout update delete find camera "
            + "group ungroup arrow arrow-remove arrow-promote",
        },
      );
  }
}

async function createCmd(flags: CommandOptions, opts: CommandOptions): Promise<void> {
  const title = flags.title;
  if (typeof title !== "string" || !title.trim()) {
    throw new LensError("Missing --title", {
      code: "missing_arg",
      hint: 'Usage: lens board create --title "<title>" [--body "<body>"]',
    });
  }
  const body = typeof flags.body === "string" ? flags.body : undefined;
  const wb = createWhiteboard({ title: title.trim(), ...(body ? { body } : {}) });
  if (opts.json) {
    respondSuccess({ id: wb.id, title: wb.title, created_at: wb.created_at });
  } else {
    console.log(`Created whiteboard ${wb.id}: "${wb.title}"`);
  }
}

async function listCmd(opts: CommandOptions): Promise<void> {
  const boards = listWhiteboards();
  const items = boards.map(wb => ({
    id: wb.id,
    title: wb.title,
    member_count: wb.members.length,
    updated_at: wb.updated_at,
    created_at: wb.created_at,
  }));
  if (opts.json) {
    respondSuccess({ count: items.length, items });
  } else if (items.length === 0) {
    console.log("No whiteboards yet. Create one: lens board create --title \"...\"");
  } else {
    console.log(`${items.length} whiteboard(s):`);
    for (const w of items) {
      console.log(`  ${w.id}  (${w.member_count} cards)  ${w.title}`);
    }
  }
}

async function showCmd(id: string | undefined, opts: CommandOptions): Promise<void> {
  assertWbId(id);
  const wb = readWhiteboard(id);
  if (!wb) {
    throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  }
  if (opts.json) {
    respondSuccess(wb);
  } else {
    console.log(`${wb.id}: "${wb.title}"`);
    if (wb.body) console.log(`\n${wb.body}\n`);
    console.log(`${wb.members.length} member(s):`);
    for (const m of wb.members) {
      console.log(`  ${m.id}  @ (${m.x}, ${m.y})`);
    }
  }
}

async function addCmd(id: string | undefined, cardIds: string[], opts: CommandOptions): Promise<void> {
  assertWbId(id);
  if (cardIds.length === 0) {
    throw new LensError("No cards to add", {
      code: "missing_arg",
      hint: "Usage: lens board add <wb-id> <card-id>...",
    });
  }
  for (const cid of cardIds) assertCardId(cid);
  const wb = readWhiteboard(id);
  if (!wb) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });

  const before = wb.members.length;
  const updated = addMembers(id, cardIds);
  const added = (updated?.members.length ?? before) - before;
  if (opts.json) {
    respondSuccess({ id, added, member_count: updated?.members.length ?? before });
  } else {
    console.log(`Added ${added} card(s) to ${id} (total ${updated?.members.length ?? before}).`);
  }
}

async function removeCmd(id: string | undefined, cardId: string | undefined, opts: CommandOptions): Promise<void> {
  assertWbId(id);
  if (!cardId) {
    throw new LensError("Missing card ID", {
      code: "missing_arg",
      hint: "Usage: lens board remove <wb-id> <card-id>",
    });
  }
  assertCardId(cardId);
  const wb = readWhiteboard(id);
  if (!wb) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });

  const before = wb.members.length;
  const updated = removeMember(id, cardId);
  const removed = before - (updated?.members.length ?? before);
  if (opts.json) {
    respondSuccess({ id, removed, member_count: updated?.members.length ?? before });
  } else {
    console.log(`Removed ${removed} card from ${id}.`);
  }
}

async function layoutCmd(id: string | undefined, flags: CommandOptions, opts: CommandOptions): Promise<void> {
  assertWbId(id);
  const rawPositions = flags.positions;
  if (typeof rawPositions !== "string") {
    throw new LensError("Missing --positions", {
      code: "missing_arg",
      hint: 'Usage: lens board layout <wb-id> --positions \'{"note_X":{"x":0,"y":0},...}\'',
    });
  }
  let parsed: Record<string, { x: number; y: number }>;
  try {
    parsed = JSON.parse(rawPositions);
  } catch {
    throw new LensError("Invalid --positions JSON", { code: "invalid_json" });
  }
  // Validate each entry
  for (const [key, val] of Object.entries(parsed)) {
    if (!VALID_CARD_PREFIX.test(key)) {
      throw new LensError(`Invalid card ID in positions: "${key}"`, { code: "invalid_id" });
    }
    if (!val || typeof val.x !== "number" || typeof val.y !== "number") {
      throw new LensError(`Invalid position for ${key} (need {x: number, y: number})`, { code: "invalid_position" });
    }
  }
  const wb = readWhiteboard(id);
  if (!wb) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });

  const updated = updateMembers(id, parsed);
  if (opts.json) {
    respondSuccess({ id, member_count: updated?.members.length ?? 0 });
  } else {
    console.log(`Updated positions for ${id}.`);
  }
}

async function updateCmd(id: string | undefined, flags: CommandOptions, opts: CommandOptions): Promise<void> {
  assertWbId(id);
  const patch: { title?: string; body?: string } = {};
  if (typeof flags.title === "string") patch.title = flags.title;
  if (typeof flags.body === "string") patch.body = flags.body;
  if (Object.keys(patch).length === 0) {
    throw new LensError("Nothing to update", {
      code: "missing_arg",
      hint: "Usage: lens board update <wb-id> [--title <title>] [--body <body>]",
    });
  }
  const wb = readWhiteboard(id);
  if (!wb) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });

  const updated = updateWhiteboardMeta(id, patch);
  if (opts.json) {
    respondSuccess({
      id,
      title: updated?.title,
      body: updated?.body,
      updated_at: updated?.updated_at,
    });
  } else {
    console.log(`Updated ${id}.`);
  }
}

async function deleteCmd(id: string | undefined, opts: CommandOptions): Promise<void> {
  assertWbId(id);
  const ok = deleteWhiteboard(id);
  if (!ok) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  if (opts.json) {
    respondSuccess({ id, deleted: true });
  } else {
    console.log(`Deleted ${id}.`);
  }
}

async function findCmd(cardId: string | undefined, opts: CommandOptions): Promise<void> {
  if (!cardId || !VALID_CARD_PREFIX.test(cardId)) {
    throw new LensError("Missing or invalid card ID", {
      code: "invalid_id",
      hint: "Usage: lens board find <card-id>",
    });
  }
  const boards = findWhiteboardsContaining(cardId);
  const items = boards.map(wb => ({
    id: wb.id,
    title: wb.title,
    member_count: wb.members.length,
    updated_at: wb.updated_at,
  }));
  if (opts.json) {
    respondSuccess({ card_id: cardId, count: items.length, items });
  } else if (items.length === 0) {
    console.log(`${cardId} is not on any whiteboard.`);
  } else {
    console.log(`${cardId} appears on ${items.length} whiteboard(s):`);
    for (const b of items) console.log(`  ${b.id}  "${b.title}"`);
  }
}

// ── Movement ──────────────────────────────────────────────────

async function moveCmd(
  id: string | undefined,
  cardId: string | undefined,
  flags: CommandOptions,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  if (!cardId) {
    throw new LensError("Missing card ID", {
      code: "missing_arg",
      hint: "Usage: lens board move <wb-id> <card-id> --x N --y N [--parent <grp-id>]",
    });
  }
  assertCardId(cardId);
  const update: { x?: number; y?: number; parent?: string | null } = {};
  const x = numFlag(flags, "x");
  const y = numFlag(flags, "y");
  if (x !== undefined) update.x = x;
  if (y !== undefined) update.y = y;
  if (typeof flags.parent === "string") {
    if (!VALID_GRP_ID.test(flags.parent)) {
      throw new LensError(`Invalid group ID: "${flags.parent}"`, { code: "invalid_id" });
    }
    update.parent = flags.parent;
  } else if (flags["no-parent"] === true || flags.parent === null) {
    update.parent = null;
  }
  if (update.x === undefined && update.y === undefined && update.parent === undefined) {
    throw new LensError("Nothing to move", {
      code: "missing_arg",
      hint: "Provide at least one of --x, --y, --parent, --no-parent",
    });
  }
  const updated = updateMembers(id, { [cardId]: update });
  if (!updated) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  if (opts.json) {
    respondSuccess({ id, card_id: cardId });
  } else {
    console.log(`Moved ${cardId} on ${id}.`);
  }
}

// ── Camera ────────────────────────────────────────────────────

async function cameraCmd(
  id: string | undefined,
  flags: CommandOptions,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  const x = requireNum(flags, "x");
  const y = requireNum(flags, "y");
  const scale = requireNum(flags, "scale");
  const updated = setCamera(id, { x, y, scale });
  if (!updated) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  if (opts.json) {
    respondSuccess({ id, camera: updated.camera });
  } else {
    console.log(`Camera for ${id} set to (${x}, ${y}) @ ${scale}x.`);
  }
}

// ── Groups ────────────────────────────────────────────────────

async function groupCmd(
  id: string | undefined,
  flags: CommandOptions,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  const label = typeof flags.label === "string" ? flags.label.trim() : "";
  if (!label) {
    throw new LensError("Missing --label", {
      code: "missing_arg",
      hint: "Usage: lens board group <wb-id> --label \"...\" --x N --y N --width N --height N [--color X] [--members id,id,...]",
    });
  }
  const x = requireNum(flags, "x");
  const y = requireNum(flags, "y");
  const width = requireNum(flags, "width");
  const height = requireNum(flags, "height");
  const members = typeof flags.members === "string"
    ? flags.members.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  for (const cid of members) assertCardId(cid);
  const color = typeof flags.color === "string" ? flags.color : undefined;
  const result = addGroup(id, {
    label,
    x, y, width, height,
    ...(color ? { color } : {}),
    ...(members.length > 0 ? { members } : {}),
  });
  if (!result) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  if (opts.json) {
    respondSuccess({ id, group: result.group });
  } else {
    console.log(`Created group ${result.group.id} on ${id}: "${label}"`);
  }
}

async function ungroupCmd(
  id: string | undefined,
  grpId: string | undefined,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  if (!grpId || !VALID_GRP_ID.test(grpId)) {
    throw new LensError(`Invalid group ID: "${grpId}"`, {
      code: "invalid_id",
      hint: "Usage: lens board ungroup <wb-id> <grp-id>",
    });
  }
  const updated = removeGroup(id, grpId);
  if (!updated) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  if (opts.json) {
    respondSuccess({ id, removed: grpId });
  } else {
    console.log(`Removed group ${grpId} from ${id}.`);
  }
}

// ── Arrows ────────────────────────────────────────────────────

function assertArrowEndpoint(v: string, flag: string): void {
  if (!/^(note|src|task)_[A-Z0-9]{26}$/.test(v)) {
    throw new LensError(
      `Invalid arrow ${flag}: "${v}" — must be a whiteboard member (note_/src_/task_)`,
      { code: "invalid_id" },
    );
  }
}

async function arrowCmd(
  id: string | undefined,
  flags: CommandOptions,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  const from = typeof flags.from === "string" ? flags.from : "";
  const to = typeof flags.to === "string" ? flags.to : "";
  if (!from || !to) {
    throw new LensError("Missing --from and/or --to", {
      code: "missing_arg",
      hint: "Usage: lens board arrow <wb-id> --from <id> --to <id> [--label \"...\" --style solid|dashed --color X]",
    });
  }
  assertArrowEndpoint(from, "--from");
  assertArrowEndpoint(to, "--to");
  const styleStr = typeof flags.style === "string" ? flags.style : undefined;
  if (styleStr && styleStr !== "solid" && styleStr !== "dashed") {
    throw new LensError(`Invalid --style "${styleStr}" (expected solid or dashed)`, { code: "invalid_arg" });
  }
  const payload: Parameters<typeof addArrow>[1] = { from, to };
  if (typeof flags.label === "string") payload.label = flags.label;
  if (typeof flags.color === "string") payload.color = flags.color;
  if (styleStr) payload.style = styleStr as WhiteboardArrow["style"];
  try {
    const result = addArrow(id, payload);
    if (!result) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
    if (opts.json) {
      respondSuccess({ id, arrow: result.arrow });
    } else {
      console.log(`Drew arrow ${result.arrow.id}: ${from} → ${to}${payload.label ? ` "${payload.label}"` : ""}`);
    }
  } catch (e: any) {
    if (e instanceof LensError) throw e;
    throw new LensError(e.message || String(e), { code: "invalid_arg" });
  }
}

async function arrowRemoveCmd(
  id: string | undefined,
  arrId: string | undefined,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  if (!arrId || !VALID_ARR_ID.test(arrId)) {
    throw new LensError(`Invalid arrow ID: "${arrId}"`, {
      code: "invalid_id",
      hint: "Usage: lens board arrow-remove <wb-id> <arr-id>",
    });
  }
  const updated = removeArrow(id, arrId);
  if (!updated) throw new LensError(`Whiteboard not found: ${id}`, { code: "not_found" });
  if (opts.json) {
    respondSuccess({ id, removed: arrId });
  } else {
    console.log(`Removed arrow ${arrId} from ${id}.`);
  }
}

async function arrowPromoteCmd(
  id: string | undefined,
  arrId: string | undefined,
  flags: CommandOptions,
  opts: CommandOptions,
): Promise<void> {
  assertWbId(id);
  if (!arrId || !VALID_ARR_ID.test(arrId)) {
    throw new LensError(`Invalid arrow ID: "${arrId}"`, {
      code: "invalid_id",
      hint: "Usage: lens board arrow-promote <wb-id> <arr-id> --rel <supports|contradicts|refines|related|continues> [--reason \"...\"]",
    });
  }
  const rel = typeof flags.rel === "string" ? flags.rel : "";
  const reason = typeof flags.reason === "string" ? flags.reason : undefined;

  const { arrow, link } = promoteArrow(id, arrId, rel, reason);

  if (opts.json) {
    respondSuccess({
      id,
      arrow_id: arrId,
      rel,
      from_note: arrow.from,
      to_note: arrow.to,
      link,
      arrow,
    });
  } else {
    console.log(`Promoted arrow ${arrId} → graph rel ${arrow.from} --${rel}--> ${arrow.to}`);
  }
}
