/**
 * lens write — Unified write entry point.
 *
 * Accepts JSON from argument or stdin. Routes by `type` field:
 *   note    → create Note (title + body + links)
 *   source  → create Source
 *   link    → add link between notes
 *   unlink  → remove link
 *   update  → modify existing object
 *   delete  → remove file and deindex
 *
 * Accepts single object or array (batch).
 * Batch supports $N references to earlier items by index.
 */

import { readFileSync, unlinkSync } from "fs";
import { generateId, type Note, type Source, type NoteLink, type LinkRel, type SourceType } from "../core/types";
import { saveObject, readObject, ensureInitialized, getDb } from "../core/storage";
import { objectPath } from "../core/paths";
import { parseCliArgs, type CommandOptions } from "./commands";

// ============================================================
// Validation
// ============================================================

const VALID_RELS = new Set<LinkRel>(["supports", "contradicts", "refines", "related"]);
const VALID_SOURCE_TYPES = new Set<SourceType>(["web_article", "markdown", "plain_text", "manual_note", "note_batch"]);

function validateId(id: string, label: string): void {
  if (!id || typeof id !== "string") throw new Error(`${label}: ID is required`);
  if (!readObject(id)) throw new Error(`${label}: "${id}" not found. Use \`lens search\` to find the correct ID.`);
}

// ============================================================
// Write handlers
// ============================================================

interface WriteResult {
  id?: string;
  type: string;
  action: string;
  object?: Record<string, any>;
}

function writeNote(input: any, batchIds?: Map<string, string>): WriteResult {
  const title = input.title;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    throw new Error("note: title is required");
  }

  const resolveRef = (ref: string) => resolveReference(ref, batchIds);

  const id = generateId("note");
  const now = new Date().toISOString();

  // Build links array
  const links: NoteLink[] = [];
  if (input.links) {
    for (const link of input.links) {
      if (!link.to || !link.rel) throw new Error("note.links: each link needs 'to' and 'rel'");
      if (!VALID_RELS.has(link.rel)) throw new Error(`note.links: rel "${link.rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
      links.push({
        to: resolveRef(link.to),
        rel: link.rel,
        ...(link.reason ? { reason: link.reason } : {}),
      });
    }
  }

  // Legacy support: supports/contradicts/refines/related arrays → unified links
  for (const rel of ["supports", "contradicts", "refines"] as const) {
    if (input[rel]) {
      for (const to of input[rel]) {
        links.push({ to: resolveRef(to), rel });
      }
    }
  }

  const note: Note = {
    id,
    type: "note",
    title: title.trim(),
    created_at: now,
    updated_at: now,
    ...(input.source ? { source: resolveRef(input.source) } : {}),
    ...(links.length > 0 ? { links } : {}),
  };

  // Bidirectional contradicts
  for (const link of links) {
    if (link.rel === "contradicts") {
      addLinkToExisting(link.to, "contradicts", id, link.reason);
    }
  }

  const body = input.body || "";
  saveObject(note, body);
  return { id, type: "note", action: "created", object: { ...note, body } };
}

function writeSource(input: any): WriteResult {
  const title = input.title;
  if (!title || typeof title !== "string") throw new Error("source: title is required");

  if (input.source_type && !VALID_SOURCE_TYPES.has(input.source_type)) {
    throw new Error(`source: source_type "${input.source_type}" is invalid. Valid: ${[...VALID_SOURCE_TYPES].join(", ")}`);
  }

  const id = generateId("source");
  const now = new Date().toISOString();
  const body = input.body || "";

  const source: Source = {
    id,
    type: "source",
    source_type: input.source_type || "manual_note",
    title: title.trim(),
    word_count: input.word_count || (body ? body.split(/\s+/).filter(Boolean).length : 0),
    ingested_at: now,
    created_at: now,
    ...(input.author ? { author: input.author } : {}),
    ...(input.url ? { url: input.url } : {}),
  };

  saveObject(source, body);
  return { id, type: "source", action: "created", object: source };
}

function writeLink(input: any, batchIds?: Map<string, string>): WriteResult {
  const from = resolveReference(input.from, batchIds);
  const to = resolveReference(input.to, batchIds);
  const rel = input.rel as LinkRel;
  const reason = input.reason;

  if (!from) throw new Error("link: 'from' is required");
  if (!to) throw new Error("link: 'to' is required");
  if (!rel) throw new Error("link: 'rel' is required");
  if (!VALID_RELS.has(rel)) throw new Error(`link: rel "${rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
  if (from === to) throw new Error("link: 'from' and 'to' must be different");

  if (!from.startsWith("$")) validateId(from, "link.from");
  if (!to.startsWith("$")) validateId(to, "link.to");

  addLinkToExisting(from, rel, to, reason);
  if (rel === "contradicts") addLinkToExisting(to, "contradicts", from, reason);

  return { type: "link", action: "created", object: { from, rel, to, reason } };
}

function writeUnlink(input: any): WriteResult {
  const { from, to, rel } = input;
  if (!from || !to || !rel) throw new Error("unlink: from, to, and rel are required");
  if (!VALID_RELS.has(rel)) throw new Error(`unlink: rel "${rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
  validateId(from, "unlink.from");
  validateId(to, "unlink.to");

  removeLinkFromExisting(from, rel, to);
  if (rel === "contradicts") removeLinkFromExisting(to, "contradicts", from);

  return { type: "unlink", action: "removed", object: { from, rel, to } };
}

function writeUpdate(input: any): WriteResult {
  const id = input.id;
  if (!id) throw new Error("update: 'id' is required");
  validateId(id, "update.id");

  const existing = readObject(id);
  if (!existing) throw new Error(`update: "${id}" not found`);

  const data = { ...existing.data };
  const now = new Date().toISOString();
  data.updated_at = now;

  // Set scalar fields
  if (input.set) {
    for (const [key, value] of Object.entries(input.set)) {
      if (key === "id" || key === "type" || key === "created_at") continue;
      data[key] = value;
    }
  }

  // Add links
  if (input.add?.links) {
    const links: NoteLink[] = data.links || [];
    for (const newLink of input.add.links) {
      if (!links.some((l: NoteLink) => l.to === newLink.to && l.rel === newLink.rel)) {
        links.push(newLink);
        if (newLink.rel === "contradicts") {
          addLinkToExisting(newLink.to, "contradicts", id, newLink.reason);
        }
      }
    }
    data.links = links;
  }

  // Remove links
  if (input.remove?.links) {
    if (data.links) {
      for (const rmLink of input.remove.links) {
        data.links = data.links.filter((l: NoteLink) => !(l.to === rmLink.to && l.rel === rmLink.rel));
        if (rmLink.rel === "contradicts") {
          removeLinkFromExisting(rmLink.to, "contradicts", id);
        }
      }
    }
  }

  // Update body if provided
  const body = input.body !== undefined ? input.body : existing.content;

  const obj = { ...data, id } as any;
  saveObject(obj, body);
  return { id, type: data.type, action: "updated", object: { ...obj, body } };
}

function writeDelete(input: any): WriteResult {
  const id = input.id;
  if (!id) throw new Error("delete: 'id' is required");
  validateId(id, "delete.id");

  const existing = readObject(id);
  if (!existing) throw new Error(`delete: "${id}" not found`);

  // Remove the file and re-index
  try { unlinkSync(objectPath(id)); } catch {}

  const db = getDb();
  db.prepare("DELETE FROM objects WHERE id = ?").run(id);
  db.prepare("DELETE FROM search_index WHERE id = ?").run(id);
  db.prepare("DELETE FROM links WHERE from_id = ? OR to_id = ?").run(id, id);

  return { id, type: existing.data.type, action: "deleted" };
}

// ============================================================
// Helpers
// ============================================================

function resolveReference(ref: string, batchIds?: Map<string, string>): string {
  if (!ref) return ref;
  if (ref.startsWith("$") && batchIds) {
    const resolved = batchIds.get(ref);
    if (!resolved) throw new Error(`Batch reference "${ref}" not resolved. Check array index.`);
    return resolved;
  }
  return ref;
}

function addLinkToExisting(id: string, rel: LinkRel, targetId: string, reason?: string): void {
  const existing = readObject(id);
  if (!existing) return;

  const data = { ...existing.data };
  const links: NoteLink[] = data.links || [];
  if (!links.some((l: NoteLink) => l.to === targetId && l.rel === rel)) {
    links.push({ to: targetId, rel, ...(reason ? { reason } : {}) });
    data.links = links;
    data.updated_at = new Date().toISOString();
  }

  const obj = { ...data, id } as any;
  saveObject(obj, existing.content);
}

function removeLinkFromExisting(id: string, rel: string, targetId: string): void {
  const existing = readObject(id);
  if (!existing) return;

  const data = { ...existing.data };
  if (data.links) {
    data.links = data.links.filter((l: NoteLink) => !(l.to === targetId && l.rel === rel));
    data.updated_at = new Date().toISOString();
  }

  const obj = { ...data, id } as any;
  saveObject(obj, existing.content);
}

// ============================================================
// Main entry point
// ============================================================

// ============================================================
// Shared write execution (used by both CLI and --stdin paths)
// ============================================================

function executeWrite(parsed: any, opts: CommandOptions) {
  const isBatch = Array.isArray(parsed);
  const items = isBatch ? parsed : [parsed];
  if (items.length === 0) throw new Error("Empty array.");

  const results: WriteResult[] = [];
  const batchIds = new Map<string, string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const type = item.type;

    if (!type) throw new Error(`Item ${i}: "type" field is required. Valid: note, source, link, unlink, update, delete`);

    let result: WriteResult;
    switch (type) {
      case "note": result = writeNote(item, batchIds); break;
      case "source": result = writeSource(item); break;
      case "link": result = writeLink(item, batchIds); break;
      case "unlink": result = writeUnlink(item); break;
      case "update": result = writeUpdate(item); break;
      case "delete": result = writeDelete(item); break;
      default: throw new Error(`Item ${i}: unknown type "${type}". Valid: note, source, link, unlink, update, delete`);
    }

    if (result.id) batchIds.set(`$${i}`, result.id);
    results.push(result);
  }

  if (opts.json) {
    const output = isBatch
      ? { created: results.map(r => ({ id: r.id, type: r.type, action: r.action, ...(r.object || {}) })) }
      : { id: results[0].id, type: results[0].type, action: results[0].action, ...(results[0].object || {}) };
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const r of results) {
      const id = r.id ? ` ${r.id}` : "";
      console.log(`${r.action}: ${r.type}${id}`);
    }
  }
}

/** CLI entry: parse JSON from --file, argument, or stdin, then execute. */
export async function handleWrite(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  let rawInput: string;

  if (flags.file === true) {
    throw new Error("--file requires a path: lens write --file <path> --json");
  }

  if (flags.file && typeof flags.file === "string") {
    try {
      rawInput = readFileSync(flags.file, "utf-8").trim();
    } catch (e: any) {
      throw new Error(`Cannot read file: ${flags.file} (${e.message})`);
    }
  } else if (positional.length > 0) {
    rawInput = positional.join(" ").trim();
  } else {
    try {
      rawInput = readFileSync(0, "utf-8").trim();
    } catch {
      throw new Error('Usage: lens write --file <path> --json\n   or: lens write \'{"type":"note","title":"..."}\' --json');
    }
  }

  if (!rawInput) throw new Error("Empty input.");

  let parsed: any;
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    throw new Error("Invalid JSON input");
  }

  executeWrite(parsed, opts);
}

/** Structured entry: accepts parsed payload directly (used by --stdin dispatch). */
export async function handleWriteInput(input: unknown, opts: CommandOptions) {
  ensureInitialized();

  if (!input || typeof input !== "object") {
    throw new Error("write: input must be a JSON object or array");
  }

  executeWrite(input, opts);
}
