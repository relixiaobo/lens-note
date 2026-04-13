/**
 * lens write — Unified write entry point.
 *
 * Accepts JSON from stdin. Routes by `type` field:
 *   note    → create Note
 *   source  → create Source
 *   link    → add link between objects
 *   unlink  → remove link
 *   update  → modify existing object
 *   delete  → soft-delete (set status: superseded)
 *
 * Accepts single object or array (batch).
 * Batch supports $N references to earlier items by index.
 */

import { readFileSync } from "fs";
import { generateId, type Note, type Source, type NoteRole, type Qualifier, type Voice, type NoteScope, type SourceType, type ObjectStatus } from "../core/types";
import { saveObject, readObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

// ============================================================
// Validation
// ============================================================

const VALID_ROLES = new Set<NoteRole>(["claim", "frame", "question", "observation", "connection", "structure_note"]);
const VALID_QUALIFIERS = new Set<Qualifier>(["certain", "likely", "presumably", "tentative"]);
const VALID_VOICES = new Set<Voice>(["extracted", "restated", "synthesized", "experiential"]);
const VALID_SCOPES = new Set<NoteScope>(["big_picture", "detail"]);
const VALID_SOURCE_TYPES = new Set<SourceType>(["web_article", "markdown", "plain_text", "manual_note", "note_batch"]);
const VALID_RELS = new Set(["supports", "contradicts", "refines", "related"]);

function validateId(id: string, label: string): void {
  if (!id || typeof id !== "string") throw new Error(`${label}: ID is required`);
  if (!readObject(id)) throw new Error(`${label}: "${id}" not found. Use \`lens search\` to find the correct ID.`);
}

function validateOptionalId(id: string | undefined, label: string): void {
  if (id) validateId(id, label);
}

function validateEnum<T>(value: T | undefined, valid: Set<T>, label: string): void {
  if (value !== undefined && !valid.has(value)) {
    throw new Error(`${label}: "${value}" is invalid. Valid values: ${[...valid].join(", ")}`);
  }
}

function validateIdArray(ids: string[] | undefined, label: string): void {
  if (!ids) return;
  if (!Array.isArray(ids)) throw new Error(`${label}: must be an array`);
  for (const id of ids) validateId(id, `${label}[${id}]`);
}

// ============================================================
// Write handlers
// ============================================================

interface WriteResult {
  id?: string;
  type: string;
  action: string;
  object?: Record<string, any>; // full created/updated object for --json
}

function writeNote(input: any, batchIds?: Map<string, string>): WriteResult {
  const text = input.text;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("note: text is required");
  }

  validateEnum(input.role, VALID_ROLES, "role");
  validateEnum(input.qualifier, VALID_QUALIFIERS, "qualifier");
  validateEnum(input.voice, VALID_VOICES, "voice");
  validateEnum(input.scope, VALID_SCOPES, "scope");

  const resolveRef = (ref: string) => resolveReference(ref, batchIds);

  // Validate ID references (skip $N batch references)
  if (input.source && !input.source.startsWith("$")) validateOptionalId(input.source, "source");
  validateRefArray(input.supports, "supports", batchIds);
  validateRefArray(input.contradicts, "contradicts", batchIds);
  validateRefArray(input.refines, "refines", batchIds);
  validateRefArray(input.bridges, "bridges", batchIds);
  validateRefArray(input.entries, "entries", batchIds);

  const id = generateId("note");
  const now = new Date().toISOString();

  const note: Note = {
    id,
    type: "note",
    text: text.trim(),
    status: "active" as ObjectStatus,
    created_at: now,
  };

  if (input.role) note.role = input.role;
  if (input.qualifier) note.qualifier = input.qualifier;
  if (input.voice) note.voice = input.voice;
  if (input.scope) note.scope = input.scope;
  if (input.source) note.source = resolveRef(input.source);
  if (input.structure_type) note.structure_type = input.structure_type;
  if (input.sees) note.sees = input.sees;
  if (input.ignores) note.ignores = input.ignores;
  if (input.question_status) note.question_status = input.question_status;

  if (input.assumptions?.length) note.assumptions = input.assumptions;
  if (input.supports?.length) note.supports = input.supports.map(resolveRef);
  if (input.contradicts?.length) note.contradicts = input.contradicts.map(resolveRef);
  if (input.refines?.length) note.refines = input.refines.map(resolveRef);
  if (input.bridges?.length) note.bridges = input.bridges.map(resolveRef);
  if (input.entries?.length) note.entries = input.entries.map(resolveRef);

  if (input.related?.length) {
    note.related = input.related.map((r: any) => {
      if (typeof r === "string") return { id: resolveRef(r) };
      return { id: resolveRef(r.id), note: r.note };
    });
  }

  if (input.evidence?.length) {
    note.evidence = input.evidence.map((e: any) => ({
      text: e.text,
      source: e.source ? resolveRef(e.source) : undefined,
      locator: e.locator,
    }));
  }

  // Bidirectional contradicts
  if (note.contradicts?.length) {
    for (const targetId of note.contradicts) {
      addLinkToExisting(targetId, "contradicts", id);
    }
  }

  saveObject(note, text.trim());
  return { id, type: "note", action: "created", object: note };
}

function writeSource(input: any, batchIds?: Map<string, string>): WriteResult {
  const title = input.title;
  if (!title || typeof title !== "string") {
    throw new Error("source: title is required");
  }

  validateEnum(input.source_type, VALID_SOURCE_TYPES, "source_type");

  const id = generateId("source");
  const now = new Date().toISOString();

  const source: Source = {
    id,
    type: "source",
    source_type: input.source_type || "manual_note",
    title: title.trim(),
    word_count: input.word_count || 0,
    ingested_at: now,
    created_at: now,
    status: "active",
  };

  if (input.author) source.author = input.author;
  if (input.url) source.url = input.url;
  if (input.raw_file) source.raw_file = input.raw_file;

  const body = input.body || "";
  if (body && !source.word_count) {
    source.word_count = body.split(/\s+/).filter(Boolean).length;
  }

  saveObject(source, body);
  return { id, type: "source", action: "created", object: source };
}

function writeLink(input: any, batchIds?: Map<string, string>): WriteResult {
  const from = resolveReference(input.from, batchIds);
  const to = resolveReference(input.to, batchIds);
  const rel = input.rel;

  if (!from) throw new Error("link: 'from' is required");
  if (!to) throw new Error("link: 'to' is required");
  if (!rel) throw new Error("link: 'rel' is required");
  if (!VALID_RELS.has(rel)) throw new Error(`link: rel "${rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
  if (from === to) throw new Error("link: 'from' and 'to' must be different");

  if (!from.startsWith("$")) validateId(from, "link.from");
  if (!to.startsWith("$")) validateId(to, "link.to");

  addLinkToExisting(from, rel, to);
  if (rel === "contradicts") addLinkToExisting(to, "contradicts", from);

  return { type: "link", action: "created" };
}

function writeUnlink(input: any): WriteResult {
  const { from, to, rel } = input;
  if (!from || !to || !rel) throw new Error("unlink: from, to, and rel are required");
  if (!VALID_RELS.has(rel)) throw new Error(`unlink: rel "${rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
  validateId(from, "unlink.from");
  validateId(to, "unlink.to");

  removeLinkFromExisting(from, rel, to);
  if (rel === "contradicts") removeLinkFromExisting(to, "contradicts", from);

  return { type: "unlink", action: "removed" };
}

function writeUpdate(input: any): WriteResult {
  const id = input.id;
  if (!id) throw new Error("update: 'id' is required");
  validateId(id, "update.id");

  const existing = readObject(id);
  if (!existing) throw new Error(`update: "${id}" not found`);

  const data = { ...existing.data };

  // Set scalar fields
  if (input.set) {
    for (const [key, value] of Object.entries(input.set)) {
      if (key === "id" || key === "type" || key === "created_at") continue; // immutable
      data[key] = value;
    }
  }

  // Add to array fields
  if (input.add) {
    for (const [key, values] of Object.entries(input.add)) {
      if (!Array.isArray(values)) continue;
      const arr = data[key] || [];
      for (const v of values) {
        if (key === "related") {
          const ref = typeof v === "string" ? { id: v } : v;
          if (!arr.some((r: any) => (typeof r === "string" ? r : r.id) === ref.id)) arr.push(ref);
        } else if (key === "evidence") {
          arr.push(v);
        } else {
          if (!arr.includes(v)) arr.push(v);
        }
      }
      data[key] = arr;
    }
  }

  // Remove from array fields
  if (input.remove) {
    for (const [key, values] of Object.entries(input.remove)) {
      if (!Array.isArray(values) || !data[key]) continue;
      if (key === "related") {
        data[key] = data[key].filter((r: any) => !values.includes(typeof r === "string" ? r : r.id));
      } else {
        data[key] = data[key].filter((v: any) => !values.includes(v));
      }
    }
  }

  const obj = { ...data, id } as any;
  saveObject(obj, existing.content);

  return { id, type: data.type, action: "updated" };
}

function writeDelete(input: any): WriteResult {
  const id = input.id;
  if (!id) throw new Error("delete: 'id' is required");
  validateId(id, "delete.id");

  const existing = readObject(id);
  if (!existing) throw new Error(`delete: "${id}" not found`);

  const obj = { ...existing.data, id, status: "superseded" } as any;
  saveObject(obj, existing.content);

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

function validateRefArray(arr: string[] | undefined, label: string, batchIds?: Map<string, string>): void {
  if (!arr) return;
  for (const ref of arr) {
    if (ref.startsWith("$")) continue; // batch reference, resolved later
    validateId(ref, label);
  }
}

function addLinkToExisting(id: string, rel: string, targetId: string): void {
  const existing = readObject(id);
  if (!existing) return;

  const data = { ...existing.data };
  if (rel === "related") {
    const arr = data.related || [];
    if (!arr.some((r: any) => (typeof r === "string" ? r : r.id) === targetId)) {
      arr.push({ id: targetId });
      data.related = arr;
    }
  } else {
    const arr = data[rel] || [];
    if (!arr.includes(targetId)) {
      arr.push(targetId);
      data[rel] = arr;
    }
  }

  const obj = { ...data, id } as any;
  saveObject(obj, existing.content);
}

function removeLinkFromExisting(id: string, rel: string, targetId: string): void {
  const existing = readObject(id);
  if (!existing) return;

  const data = { ...existing.data };
  if (rel === "related") {
    data.related = (data.related || []).filter((r: any) => (typeof r === "string" ? r : r.id) !== targetId);
  } else {
    data[rel] = (data[rel] || []).filter((v: string) => v !== targetId);
  }

  const obj = { ...data, id } as any;
  saveObject(obj, existing.content);
}

// ============================================================
// Main entry point
// ============================================================

export async function handleWrite(args: string[], opts: CommandOptions) {
  ensureInitialized();

  // Accept JSON as argument or from stdin
  const { positional } = await import("./commands").then(m => m.parseCliArgs(args));
  let rawInput: string;

  if (positional.length > 0) {
    // JSON passed as argument: lens write '{"type":"note",...}' --json
    rawInput = positional.join(" ").trim();
  } else {
    // JSON from stdin: echo '...' | lens write --json
    try {
      rawInput = readFileSync("/dev/stdin", "utf-8").trim();
    } catch {
      throw new Error('Usage: lens write \'{"type":"note","text":"..."}\' --json\n   or: echo \'{"type":"note","text":"..."}\' | lens write --json');
    }
  }

  if (!rawInput) {
    throw new Error('Empty input. Pass JSON as argument or pipe to stdin.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    throw new Error("Invalid JSON input");
  }

  const isBatch = Array.isArray(parsed);
  const items = isBatch ? parsed : [parsed];

  if (items.length === 0) {
    throw new Error("Empty array. Provide at least one item.");
  }

  // Process items
  const results: WriteResult[] = [];
  const batchIds = new Map<string, string>(); // $0 → note_01..., $1 → src_01...

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const type = item.type;

    if (!type) throw new Error(`Item ${i}: "type" field is required. Valid types: note, source, link, unlink, update, delete`);

    let result: WriteResult;
    switch (type) {
      case "note":
        result = writeNote(item, batchIds);
        break;
      case "source":
        result = writeSource(item, batchIds);
        break;
      case "link":
        result = writeLink(item, batchIds);
        break;
      case "unlink":
        result = writeUnlink(item);
        break;
      case "update":
        result = writeUpdate(item);
        break;
      case "delete":
        result = writeDelete(item);
        break;
      default:
        throw new Error(`Item ${i}: unknown type "${type}". Valid types: note, source, link, unlink, update, delete`);
    }

    // Register batch reference
    if (result.id) {
      batchIds.set(`$${i}`, result.id);
    }

    results.push(result);
  }

  // Output — include full object so agents don't need a follow-up show call
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
