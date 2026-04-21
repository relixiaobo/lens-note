/**
 * lens board — Whiteboard workspace commands.
 *
 * Whiteboards are independent entities, stored in .lens/whiteboards/ as JSON.
 * They aggregate notes/sources/tasks spatially WITHOUT creating graph edges.
 * Adding a card to a whiteboard does NOT write any typed link; it's purely
 * a workspace-local reference.
 *
 *   lens board create --title "<title>" [--body "<body>"]   Create whiteboard
 *   lens board list [--json]                                 List all boards
 *   lens board show <wb-id> [--json]                         Show full state
 *   lens board add <wb-id> <card-id>...                      Add card(s) to board
 *   lens board remove <wb-id> <card-id>                      Remove a card
 *   lens board layout <wb-id> --positions '{...}'            Update card positions
 *   lens board update <wb-id> [--title X] [--body Y]         Update metadata
 *   lens board delete <wb-id>                                Delete whiteboard
 *   lens board find <card-id> [--json]                       Which boards have this card?
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
  updatePositions,
  updateWhiteboardMeta,
  findWhiteboardsContaining,
} from "../core/whiteboard-storage";

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

export async function handleBoard(
  sub: string | undefined,
  args: string[],
  opts: CommandOptions,
): Promise<void> {
  ensureInitialized();
  const { positional, flags } = parseCliArgs(args);

  switch (sub) {
    case "create":
      return createCmd(flags, opts);
    case "list":
      return listCmd(opts);
    case "show":
      return showCmd(positional[0], opts);
    case "add":
      return addCmd(positional[0], positional.slice(1), opts);
    case "remove":
      return removeCmd(positional[0], positional[1], opts);
    case "layout":
      return layoutCmd(positional[0], flags, opts);
    case "update":
      return updateCmd(positional[0], flags, opts);
    case "delete":
      return deleteCmd(positional[0], opts);
    case "find":
      return findCmd(positional[0], opts);
    default:
      throw new LensError(
        sub ? `Unknown subcommand: board ${sub}` : "Usage: lens board <subcommand>",
        {
          code: "unknown_subcommand",
          hint: "Subcommands: create, list, show, add, remove, layout, update, delete, find",
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

  const updated = updatePositions(id, parsed);
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
