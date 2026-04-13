/**
 * lens list <type> [--since] — Browse objects by type.
 */

import { listObjects, readObject, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { ObjectType } from "../core/types";

const TYPE_MAP: Record<string, ObjectType> = {
  notes: "note", note: "note",
  sources: "source", source: "source",
  threads: "thread", thread: "thread",
};

export async function listCommand(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const typeName = positional[0];

  if (!typeName || !TYPE_MAP[typeName]) {
    throw new Error("Usage: lens list <notes|sources|threads> [--since 7d]");
  }

  const objType = TYPE_MAP[typeName];
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

  if (opts.json) {
    const summaries = items.map(item => {
      const base: Record<string, any> = { id: item.id, title: item.title };
      if (item.links?.length) base.links = item.links;
      if (item.source) base.source = item.source;
      if (item.source_type) base.source_type = item.source_type;
      if (item.word_count) base.word_count = item.word_count;
      if (item.url) base.url = item.url;
      return base;
    });
    console.log(JSON.stringify({ type: typeName, count: summaries.length, items: summaries }, null, 2));
  } else {
    if (items.length === 0) {
      console.log(`No ${typeName} found.`);
      return;
    }
    console.log(`${items.length} ${typeName}:\n`);
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
