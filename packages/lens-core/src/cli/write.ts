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
import { generateId, type Note, type Source, type Task, type TaskStatus, type NoteLink, type LinkRel, type SourceType } from "../core/types";
import { saveObject, readObject, ensureInitialized, getDb } from "../core/storage";
import { objectPath, paths } from "../core/paths";
import { join } from "path";
import { parseCliArgs, type CommandOptions } from "./commands";

// ============================================================
// Validation
// ============================================================

const VALID_RELS = new Set<LinkRel>(["supports", "contradicts", "refines", "related", "indexes"]);
const VALID_SOURCE_TYPES = new Set<SourceType>(["book", "paper", "report", "video", "podcast", "course", "web_article", "newsletter", "social_post", "conversation", "manual_note", "note_batch", "markdown", "plain_text"]);
const VALID_STATUSES = new Set<TaskStatus>(["open", "done"]);

function validateLinkReason(rel: string, reason: string | undefined, context: string): void {
  if (rel === "related" && (!reason || !reason.trim())) {
    throw new Error(
      `${context}: rel "related" requires a reason explaining HOW they're related. ` +
      `If you can describe the relationship, consider a more precise rel: ` +
      `supports (A strengthens B), refines (A is more specific than B), or contradicts (A opposes B).`
    );
  }
}

const RELATED_HINT = 'Consider a more precise rel: supports (A strengthens B), refines (A is more specific than B), contradicts (A opposes B). "related" should be last resort.';

/** Pattern-match reason text to suggest a more precise rel. Returns null if no strong signal. */
function suggestRel(reason: string | undefined): "supports" | "refines" | "contradicts" | null {
  if (!reason) return null;
  // contradicts — explicit opposition indicators only
  if (/对立|相反|相悖|反驳|(?:两个|不同)视角|opposes?|contradicts?|conflicts? with/i.test(reason)) return "contradicts";
  // refines — A is more concrete/specific than B
  if (/具体实现|具体化|细化|更精确|正式版本|工程实现|延伸应用|核心提炼|具体应用|具体方法|implementat|concret|specific.*version/i.test(reason)) return "refines";
  // supports — A strengthens/validates B
  if (/支持|支撑|强化|补充|佐证|验证|论证|印证|提供了.*基础|理论基础|呼应|证实|互补|互为|相互印证|前置条件|strengthen|evidence|validates?|reinforc/i.test(reason)) return "supports";
  return null;
}

function validateId(id: string, label: string): void {
  if (!id || typeof id !== "string") throw new Error(`${label}: ID is required`);
  if (!readObject(id)) throw new Error(`${label}: "${id}" not found. Use \`lens search\` to find the correct ID.`);
}

// Secret patterns — prefix-based tokens and PEM private keys
const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9_-]{20,}/,              // OpenAI
  /sk-ant-[a-zA-Z0-9_-]{20,}/,          // Anthropic
  /ghp_[a-zA-Z0-9]{36,}/,               // GitHub PAT
  /gho_[a-zA-Z0-9]{36,}/,               // GitHub OAuth
  /ghs_[a-zA-Z0-9]{36,}/,               // GitHub App
  /github_pat_[a-zA-Z0-9_]{20,}/,       // GitHub fine-grained PAT
  /xoxb-[a-zA-Z0-9-]+/,                 // Slack bot
  /xoxp-[a-zA-Z0-9-]+/,                 // Slack user
  /AKIA[A-Z0-9]{16}/,                   // AWS access key
  /-----BEGIN[\s\S]*?PRIVATE KEY-----/,  // PEM private key
];

function checkForSecrets(input: any): void {
  const texts: string[] = [];
  if (typeof input.title === "string") texts.push(input.title);
  if (typeof input.body === "string") texts.push(input.body);
  if (typeof input.url === "string") texts.push(input.url);

  const combined = texts.join("\n");
  if (!combined) return;

  for (const pat of SECRET_PATTERNS) {
    if (pat.test(combined)) {
      throw new Error(
        "Content appears to contain an API key or secret. " +
        "lens is git-tracked and stores content in plain text — secrets will be permanently recorded in history. " +
        "Use environment variables, a keychain, or a secrets manager instead."
      );
    }
  }
}

// ============================================================
// Write handlers
// ============================================================

interface WriteResult {
  index?: number;
  id?: string;
  type: string;
  action: string;
  message?: string;
  hint?: string;
  suggested_rel?: string;
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
    if (!Array.isArray(input.links)) throw new Error("note.links must be an array of {to, rel, reason?}");
    for (const link of input.links) {
      if (!link.to || !link.rel) throw new Error("note.links: each link needs 'to' and 'rel'");
      if (!VALID_RELS.has(link.rel)) throw new Error(`note.links: rel "${link.rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
      validateLinkReason(link.rel, link.reason, "note.links");
      const resolvedTo = resolveRef(link.to);
      validateId(resolvedTo, "note.links.to");
      links.push({
        to: resolvedTo,
        rel: link.rel,
        ...(link.reason ? { reason: link.reason } : {}),
      });
    }
  }

  // Legacy support: supports/contradicts/refines/related arrays → unified links
  for (const rel of ["supports", "contradicts", "refines"] as const) {
    if (input[rel]) {
      for (const to of input[rel]) {
        const resolvedTo = resolveRef(to);
        validateId(resolvedTo, `note.${rel}`);
        links.push({ to: resolvedTo, rel });
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
  const hasRelated = links.some(l => l.rel === "related");
  return { id, type: "note", action: "created", object: { ...note, body }, ...(hasRelated ? { hint: RELATED_HINT } : {}) };
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

function writeTask(input: any, batchIds?: Map<string, string>): WriteResult {
  const title = input.title;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    throw new Error("task: title is required");
  }

  const status = input.status || "open";
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`task: status "${status}" is invalid. Valid: ${[...VALID_STATUSES].join(", ")}`);
  }

  const resolveRef = (ref: string) => resolveReference(ref, batchIds);

  const id = generateId("task");
  const now = new Date().toISOString();

  // Build links array (same logic as notes)
  const links: NoteLink[] = [];
  if (input.links) {
    if (!Array.isArray(input.links)) throw new Error("task.links must be an array of {to, rel, reason?}");
    for (const link of input.links) {
      if (!link.to || !link.rel) throw new Error("task.links: each link needs 'to' and 'rel'");
      if (!VALID_RELS.has(link.rel)) throw new Error(`task.links: rel "${link.rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
      validateLinkReason(link.rel, link.reason, "task.links");
      const resolvedTo = resolveRef(link.to);
      validateId(resolvedTo, "task.links.to");
      links.push({
        to: resolvedTo,
        rel: link.rel,
        ...(link.reason ? { reason: link.reason } : {}),
      });
    }
  }

  const task: Task = {
    id,
    type: "task",
    title: title.trim(),
    status,
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
  saveObject(task, body);
  return { id, type: "task", action: "created", object: { ...task, body } };
}

function writeLink(input: any, batchIds?: Map<string, string>): WriteResult {
  const from = resolveReference(input.from, batchIds);
  const to = resolveReference(input.to, batchIds);
  const rel = input.rel as LinkRel;
  const reason = input.reason;

  if (!from) throw new Error("link: 'from' is required");
  if (!to) throw new Error("link: 'to' is required");
  if (from.startsWith("$")) throw new Error(`link: unresolved batch reference "${from}". Batch refs ($0, $1...) only work inside array batches.`);
  if (to.startsWith("$")) throw new Error(`link: unresolved batch reference "${to}". Batch refs ($0, $1...) only work inside array batches.`);
  if (!rel) throw new Error("link: 'rel' is required");
  if (!VALID_RELS.has(rel)) throw new Error(`link: rel "${rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
  if (from === to) throw new Error("link: 'from' and 'to' must be different");
  validateLinkReason(rel, reason, "link");

  validateId(from, "link.from");
  validateId(to, "link.to");

  // Idempotency: check existing links before creating
  const fromObj = readObject(from);
  const existingLinks: NoteLink[] = fromObj?.data.links || [];
  const existing = existingLinks.find((l: NoteLink) => l.to === to && l.rel === rel);

  // Advisory feedback for "related" links
  const relatedExtra: Record<string, any> = {};
  if (rel === "related") {
    relatedExtra.hint = RELATED_HINT;
    const suggested = suggestRel(reason);
    if (suggested) relatedExtra.suggested_rel = suggested;
  }

  if (existing) {
    const sameReason = (existing.reason || undefined) === (reason || undefined);

    if (!sameReason) {
      updateLinkReason(from, rel, to, reason);
      return { type: "link", action: "updated", object: { from, rel, to, reason }, ...relatedExtra };
    }

    // Same link, same reason — check for contradicts repair
    if (rel === "contradicts") {
      const toObj = readObject(to);
      const toLinks: NoteLink[] = toObj?.data.links || [];
      if (!toLinks.some((l: NoteLink) => l.to === from && l.rel === "contradicts")) {
        addLinkToExisting(to, "contradicts", from, reason);
        return { type: "link", action: "repaired", object: { from, rel, to, reason } };
      }
    }

    return { type: "link", action: "unchanged", object: { from, rel, to, reason }, ...relatedExtra };
  }

  // New link
  addLinkToExisting(from, rel, to, reason);
  if (rel === "contradicts") addLinkToExisting(to, "contradicts", from, reason);

  return { type: "link", action: "created", object: { from, rel, to, reason }, ...relatedExtra };
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
  if (!existing) throw new Error(`update: "${id}" not found. Use \`lens search\` to find the correct ID.`);

  const data = { ...existing.data };
  const now = new Date().toISOString();
  data.updated_at = now;

  // Support top-level title for convenience (mirrors top-level body)
  if (input.title !== undefined) {
    data.title = String(input.title);
  }

  // Set scalar fields via set.{field}
  if (input.set) {
    for (const [key, value] of Object.entries(input.set)) {
      if (key === "id" || key === "type" || key === "created_at") continue;
      if (key === "status") {
        if (data.type !== "task") throw new Error(`update: status can only be set on tasks, not ${data.type}`);
        if (!VALID_STATUSES.has(value as TaskStatus)) throw new Error(`update: status "${value}" is invalid. Valid: ${[...VALID_STATUSES].join(", ")}`);
      }
      data[key] = value;
    }
  }

  // Add links — validate ALL first, then persist (atomic)
  if (input.add?.links) {
    if (!Array.isArray(input.add.links)) throw new Error("update.add.links must be an array of {to, rel, reason?}");
    // Validation pass
    for (const newLink of input.add.links) {
      if (!newLink.to || !newLink.rel) throw new Error("update.add.links: each link needs 'to' and 'rel'");
      if (!VALID_RELS.has(newLink.rel)) throw new Error(`update.add.links: rel "${newLink.rel}" is invalid. Valid: ${[...VALID_RELS].join(", ")}`);
      if (newLink.to === id) throw new Error("update.add.links: cannot link to self");
      validateLinkReason(newLink.rel, newLink.reason, "update.add.links");
      validateId(newLink.to, "update.add.links.to");
    }
    // Persist pass (only after all validation succeeds)
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
  if (!existing) throw new Error(`delete: "${id}" not found. Use \`lens search\` to find the correct ID.`);

  const db = getDb();

  // Clean up YAML frontmatter in all notes/tasks that link to this object.
  // Must happen before file deletion so SQLite inbound link data is still queryable.
  // Group by from_id so each referring file is read and saved exactly once.
  const inbound = db.prepare("SELECT from_id, rel FROM links WHERE to_id = ?").all(id) as { from_id: string; rel: string }[];
  const byRef = new Map<string, { rels: string[]; clearSource: boolean }>();
  for (const { from_id, rel } of inbound) {
    if (!byRef.has(from_id)) byRef.set(from_id, { rels: [], clearSource: false });
    const entry = byRef.get(from_id)!;
    entry.rels.push(rel);
  }

  // Also find objects whose `source` field references the deleted object
  const sourceRefs = db.prepare("SELECT id, data FROM objects WHERE json_extract(data, '$.source') = ?").all(id) as { id: string }[];
  for (const { id: refId } of sourceRefs) {
    if (!byRef.has(refId)) byRef.set(refId, { rels: [], clearSource: false });
    byRef.get(refId)!.clearSource = true;
  }

  for (const [from_id, { rels, clearSource }] of byRef) {
    cleanReferringObject(from_id, id, rels, clearSource);
  }

  // Remove the file and re-index
  try { unlinkSync(objectPath(id)); } catch {}

  // Clean up raw file if it exists (e.g., HTML saved by fetch --save)
  const rawPath = join(paths.raw, `${id}.html`);
  try { unlinkSync(rawPath); } catch {}

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

/** Handle all cleanup for one referring object in a single saveObject() call. */
function cleanReferringObject(id: string, deletedId: string, linkRels: string[], clearSource: boolean): void {
  const existing = readObject(id);
  if (!existing) return;
  const data = { ...existing.data };
  let changed = false;

  if (linkRels.length > 0 && Array.isArray(data.links)) {
    const before = data.links.length;
    data.links = data.links.filter((l: NoteLink) => !(l.to === deletedId && linkRels.includes(l.rel)));
    if (data.links.length !== before) changed = true;
  }

  if (clearSource && data.source === deletedId) {
    delete data.source;
    changed = true;
  }

  if (changed) {
    data.updated_at = new Date().toISOString();
    saveObject({ ...data, id } as any, existing.content);
  }
}

function updateLinkReason(id: string, rel: LinkRel, targetId: string, reason?: string): void {
  const existing = readObject(id);
  if (!existing) return;
  const data = { ...existing.data };
  const links: NoteLink[] = [...(data.links || [])];
  const idx = links.findIndex((l: NoteLink) => l.to === targetId && l.rel === rel);
  if (idx >= 0) {
    links[idx] = { to: targetId, rel, ...(reason ? { reason } : {}) };
    data.links = links;
    data.updated_at = new Date().toISOString();
    const obj = { ...data, id } as any;
    saveObject(obj, existing.content);
  }
}

// ============================================================
// Main entry point
// ============================================================

// ============================================================
// Shared write execution (used by both CLI and --stdin paths)
// ============================================================

/** Scan a JSON value for $N batch references, return the referenced indices. */
function getReferencedIndices(item: any): number[] {
  const refs: number[] = [];
  const visit = (val: any) => {
    if (typeof val === "string" && /^\$\d+$/.test(val)) {
      refs.push(parseInt(val.slice(1)));
    } else if (Array.isArray(val)) {
      for (const v of val) visit(v);
    } else if (val && typeof val === "object") {
      for (const v of Object.values(val)) visit(v);
    }
  };
  visit(item);
  return refs;
}

function executeWrite(parsed: any, opts: CommandOptions) {
  // LLMs sometimes wrap batch arrays as {"type":"batch","items":[...]} — unwrap it
  if (parsed && !Array.isArray(parsed) && parsed.type === "batch" && Array.isArray(parsed.items)) {
    parsed = parsed.items;
  }
  const isBatch = Array.isArray(parsed);
  const items = isBatch ? parsed : [parsed];
  if (items.length === 0) throw new Error("Empty array.");

  const results: WriteResult[] = [];
  const batchIds = new Map<string, string>();
  const failedIndices = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const type = item.type || "unknown";

    // In batch mode, check dependencies on failed items
    if (isBatch) {
      const deps = getReferencedIndices(item);
      const failedDep = deps.find(d => failedIndices.has(d));
      if (failedDep !== undefined) {
        failedIndices.add(i);
        results.push({ index: i, type, action: "error", message: `Depends on failed $${failedDep}` });
        continue;
      }
    }

    try {
      if (!item.type) throw new Error(`"type" field is required. Valid: note, source, task, link, unlink, update, delete`);
      checkForSecrets(item);

      let result: WriteResult;
      switch (type) {
        case "note": result = writeNote(item, batchIds); break;
        case "source": result = writeSource(item); break;
        case "task": result = writeTask(item, batchIds); break;
        case "link": result = writeLink(item, batchIds); break;
        case "unlink": result = writeUnlink(item); break;
        case "update": result = writeUpdate(item); break;
        case "delete": result = writeDelete(item); break;
        default: throw new Error(`Unknown type "${type}". Valid: note, source, task, link, unlink, update, delete`);
      }

      if (result.id) batchIds.set(`$${i}`, result.id);
      if (isBatch) result.index = i;
      results.push(result);
    } catch (err) {
      if (!isBatch) throw err; // Single writes: propagate error as before
      failedIndices.add(i);
      const message = err instanceof Error ? err.message : String(err);
      results.push({ index: i, type, action: "error", message });
    }
  }

  if (isBatch && failedIndices.size > 0) {
    process.exitCode = 1;
  }

  if (opts.json) {
    const output = isBatch
      ? { results: results.map(r => {
          const base: Record<string, any> = { index: r.index, type: r.type, action: r.action };
          if (r.id) base.id = r.id;
          if ((r.type === "link" || r.type === "unlink") && r.object) {
            if (r.object.from) base.from = r.object.from;
            if (r.object.to) base.to = r.object.to;
            if (r.object.rel) base.rel = r.object.rel;
          }
          if (r.message) base.message = r.message;
          return base;
        }) }
      : { id: results[0].id, type: results[0].type, action: results[0].action, ...(results[0].object || {}), ...(results[0].hint ? { hint: results[0].hint } : {}), ...(results[0].suggested_rel ? { suggested_rel: results[0].suggested_rel } : {}) };
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const r of results) {
      if (r.action === "error") {
        const idx = r.index !== undefined ? `[${r.index}] ` : "";
        console.error(`${idx}error: ${r.type} — ${r.message}`);
      } else {
        const id = r.id ? ` ${r.id}` : "";
        console.log(`${r.action}: ${r.type}${id}`);
      }
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
  } catch (e) {
    // Fallback: try NDJSON (newline-delimited JSON) — agents sometimes write
    // multiple objects separated by newlines instead of wrapping in an array.
    const lines = rawInput.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 1) {
      try {
        parsed = lines.map(l => JSON.parse(l));
      } catch {
        // Not NDJSON either — fall through to original error
      }
    }
    if (parsed === undefined) {
      const detail = e instanceof SyntaxError ? `: ${e.message}` : "";
      throw new Error(`Invalid JSON input${detail}`);
    }
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
