/**
 * lens list <type> [--since] — Browse objects by type.
 */

import { listObjects, readObject, getOrphanNotes, getForwardLinks, getBacklinks, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { ObjectType } from "../core/types";
import { respondSuccess } from "./response";

const TYPE_MAP: Record<string, ObjectType> = {
  notes: "note", note: "note",
  sources: "source", source: "source",
  tasks: "task", task: "task",
};

export async function listCommand(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const typeName = positional[0];

  if (!typeName || !TYPE_MAP[typeName]) {
    throw new Error("Usage: lens list <notes|sources|tasks> [--since 7d]");
  }

  const objType = TYPE_MAP[typeName];

  // --orphans: list notes with no note-to-note links
  if (flags.orphans) {
    if (objType !== "note") throw new Error("--orphans only works with notes");
    const limit = flags.limit ? parseInt(String(flags.limit)) : undefined;
    const offset = flags.offset ? parseInt(String(flags.offset)) : undefined;
    const orphans = getOrphanNotes(limit, offset);
    if (opts.json) {
      respondSuccess({ type: "notes", filter: "orphans", count: orphans.length, items: orphans });
    } else {
      if (orphans.length === 0) { console.log("No orphan notes."); return; }
      console.log(`${orphans.length} orphan notes:\n`);
      for (const item of orphans) {
        console.log(`  ${item.id} — ${item.title}`);
        if (item.preview) console.log(`    ${item.preview}`);
      }
    }
    return;
  }

  const ids = listObjects(objType);

  let items: Record<string, any>[] = [];
  for (const id of ids) {
    const obj = readObject(id);
    if (!obj) continue;
    items.push({ id, ...obj.data });
  }

  // Time filter
  const sinceFilter = flags.since as string | undefined;
  if (sinceFilter) {
    const days = parseDays(sinceFilter);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    items = items.filter((item) => (item.created_at || "") > cutoff);
  }

  // --min-links / --max-links: filter by total link count (forward + backward)
  const minLinks = flags["min-links"] !== undefined ? parseInt(String(flags["min-links"])) : undefined;
  const maxLinks = flags["max-links"] !== undefined ? parseInt(String(flags["max-links"])) : undefined;
  if (minLinks !== undefined && (!Number.isInteger(minLinks) || minLinks < 0)) throw new Error("--min-links must be a non-negative integer");
  if (maxLinks !== undefined && (!Number.isInteger(maxLinks) || maxLinks < 0)) throw new Error("--max-links must be a non-negative integer");
  if (minLinks !== undefined || maxLinks !== undefined) {
    items = items.filter((item) => {
      const fwd = getForwardLinks(item.id).length;
      const bwd = getBacklinks(item.id).length;
      const total = fwd + bwd;
      if (minLinks !== undefined && total < minLinks) return false;
      if (maxLinks !== undefined && total > maxLinks) return false;
      return true;
    });
  }

  // --source-type: filter sources by source_type
  if (flags["source-type"]) {
    if (objType !== "source") throw new Error("--source-type only works with sources");
    const st = String(flags["source-type"]);
    items = items.filter((item) => item.source_type === st);
  }

  // --inbox: filter sources awaiting agent processing (set by lens-clipper, cleared by agent)
  if (flags.inbox) {
    if (objType !== "source") throw new Error("--inbox only works with sources");
    items = items.filter((item) => item.inbox === true);
  }

  // --status: filter tasks by status
  if (flags.status) {
    if (objType !== "task") throw new Error("--status only works with tasks");
    const st = String(flags.status);
    if (st !== "open" && st !== "done") throw new Error(`--status "${st}" is invalid. Valid: open, done`);
    items = items.filter((item) => item.status === st);
  }

  const totalCount = items.length;

  // Pagination (works for all queries, not just orphans)
  const limit = flags.limit !== undefined ? parseInt(String(flags.limit)) : undefined;
  const offset = flags.offset !== undefined ? parseInt(String(flags.offset)) : 0;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) throw new Error("--limit must be a non-negative integer");
  if (!Number.isInteger(offset) || offset < 0) throw new Error("--offset must be a non-negative integer");
  if (offset > 0) items = items.slice(offset);
  if (limit !== undefined) items = items.slice(0, limit);

  if (opts.json) {
    const summaries = items.map(item => {
      const base: Record<string, any> = { id: item.id, title: item.title };
      if (item.links?.length) base.links = item.links.length;
      if (item.source) base.source = item.source;
      if (item.source_type) base.source_type = item.source_type;
      if (item.word_count) base.word_count = item.word_count;
      if (item.url) base.url = item.url;
      if (item.status) base.status = item.status;
      return base;
    });
    const result: Record<string, any> = { type: typeName, total: totalCount, count: summaries.length, items: summaries };
    if (flags.inbox) result.filter = "inbox";
    if (offset > 0) result.offset = offset;
    if (limit !== undefined) result.limit = limit;
    respondSuccess(result);
  } else {
    if (items.length === 0) {
      console.log(`No ${typeName} found.`);
      return;
    }
    console.log(`${items.length} ${typeName}${totalCount !== items.length ? ` (of ${totalCount})` : ""}:\n`);
    for (const item of items) {
      const title = item.title || "(untitled)";
      const linkCount = item.links?.length || 0;
      const linkInfo = linkCount > 0 ? ` (${linkCount} links)` : "";
      console.log(`  ${title}${linkInfo}`);
    }
  }
}

function parseDays(s: string): number {
  const match = s.match(/^(\d+)([dhwmy]?)$/);
  if (!match) return 1;
  const n = parseInt(match[1]);
  const unit = match[2] || "d";
  switch (unit) {
    case "h": return n / 24;
    case "d": return n;
    case "w": return n * 7;
    case "m": return n * 30;
    case "y": return n * 365;
    default: return n;
  }
}
