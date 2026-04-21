/**
 * lens show <id> [id2...] — Show any lens object(s) with links.
 * Supports batch mode: multiple IDs return {count, items} array.
 */

import { readObject, getBacklinks, ensureInitialized, extractBodyRefs, resolveBodyRefs, resolveIdOrTitle, setReadonly, findSimilarExcluding, getDb, previewOf } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

/** Read multiple objects at once. Returns array of results. */
export async function readObjects(inputs: string[], opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  if (inputs.length === 1) {
    return showObject(inputs[0], opts);
  }

  // Batch mode: resolve and read each, collect results
  const results: any[] = [];
  const errors: any[] = [];

  for (const input of inputs) {
    const resolved = resolveIdOrTitle(input);
    if ("error" in resolved) {
      errors.push({ input, error: resolved.error });
      continue;
    }
    const result = readObject(resolved.id);
    if (!result) {
      errors.push({ input, error: `Object not found: ${resolved.id}` });
      continue;
    }
    results.push(buildJsonOutput(resolved.id, result));
  }

  if (opts.json) {
    const output: Record<string, any> = { count: results.length, items: results };
    if (errors.length > 0) output.errors = errors;
    respondSuccess(output);
  } else {
    for (const input of inputs) {
      await showObject(input, opts);
    }
  }
}

/** Build JSON output for a single object (shared by single and batch modes). */
function buildJsonOutput(id: string, result: { data: any; content: string }) {
  const { data, content } = result;

  const enrichLink = (linkId: string) => {
    const linked = readObject(linkId);
    return linked ? (linked.data.title || "").substring(0, 120) : "";
  };

  const forwardLinks = (data.links || []).map((l: any) => ({
    id: l.to,
    rel: l.rel,
    ...(l.reason ? { reason: l.reason } : {}),
    title: enrichLink(l.to),
  }));

  const backwardLinks = getBacklinks(id).map(l => ({
    id: l.from_id,
    rel: l.rel,
    title: enrichLink(l.from_id),
  }));

  const output: Record<string, any> = {
    id: data.id,
    type: data.type,
    title: data.title,
  };
  if (data.status) output.status = data.status;
  if (data.source) output.source = data.source;
  if (data.source_type) output.source_type = data.source_type;
  if (data.url) output.url = data.url;
  if (data.author) output.author = data.author;
  if (data.word_count) output.word_count = data.word_count;
  if (data.created_at) output.created_at = data.created_at;
  if (data.updated_at) output.updated_at = data.updated_at;

  // Forward remaining custom frontmatter (e.g. inbox, annotations, raw_file).
  // links handled separately as forward_links/backward_links below.
  const HANDLED_FIELDS = new Set([
    "id", "type", "title", "status", "source", "source_type",
    "url", "author", "word_count", "created_at", "updated_at", "links",
  ]);
  for (const [key, value] of Object.entries(data)) {
    if (!HANDLED_FIELDS.has(key) && value !== undefined) {
      output[key] = value;
    }
  }

  const bodyText = content.trim();
  output.body = bodyText;
  const bodyRefs = extractBodyRefs(bodyText);
  if (bodyRefs.length > 0) output.body_refs = bodyRefs;
  output.forward_links = forwardLinks;
  output.backward_links = backwardLinks;

  // Provenance extras (notes only) — mirror what the view layer surfaces so
  // agents using CLI see the same signal as humans using the GUI (P4).
  if (data.type === "note") {
    // Same-day siblings: other notes created the same calendar day
    const createdAt: string | undefined = data.created_at;
    if (createdAt) {
      const dayPrefix = createdAt.slice(0, 10);
      const rows = getDb().prepare(
        `SELECT id, data, body FROM objects
         WHERE type = 'note' AND id != ?
           AND json_extract(data, '$.created_at') LIKE ?
         ORDER BY json_extract(data, '$.created_at') ASC
         LIMIT 10`,
      ).all(id, dayPrefix + "%") as { id: string; data: string; body: string }[];
      if (rows.length > 0) {
        output.same_day_siblings = rows.map(r => {
          const d = JSON.parse(r.data);
          const preview = previewOf(r.body);
          return {
            id: r.id,
            title: (d.title || "").toString().slice(0, 120),
            ...(preview ? { preview } : {}),
          };
        });
      }
    }

    // Related but unlinked: top 3 TF-IDF neighbors excluding 1-hop links
    const exclude = new Set<string>([id]);
    for (const l of data.links || []) exclude.add(l.to);
    for (const l of getBacklinks(id)) exclude.add(l.from_id);
    const similar = findSimilarExcluding(id, exclude, 3, 0.15);
    if (similar.length > 0) {
      output.related_unlinked = similar.map(s => {
        const target = readObject(s.id);
        const preview = previewOf(target?.content);
        return {
          id: s.id,
          title: s.title,
          similarity: s.similarity,
          ...(preview ? { preview } : {}),
        };
      });
    }
  }

  return output;
}

export async function showObject(input: string, opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  // Accept ID or title — auto-resolve
  const resolved = resolveIdOrTitle(input);
  if ("error" in resolved) {
    if (opts.json && resolved.candidates) {
      const { respondError } = await import("./response");
      respondError("ambiguous_match", resolved.error, undefined, { candidates: resolved.candidates });
      return;
    }
    throw new Error(resolved.error);
  }

  const id = resolved.id;
  const result = readObject(id);
  if (!result) throw new Error(`Object not found: ${id}.`);

  const { data, content } = result;

  if (opts.json) {
    respondSuccess(buildJsonOutput(id, result));
  } else {
    // Human-readable display
    const title = data.title || "(untitled)";
    console.log(`"${title}"\n`);

    if (data.status) console.log(`Status: ${data.status}`);
    if (data.source) console.log(`Source: ${data.source}`);
    if (data.source_type) console.log(`Type: ${data.source_type}`);
    if (data.url) console.log(`URL: ${data.url}`);
    if (data.author) console.log(`Author: ${data.author}`);
    if (data.word_count) console.log(`Words: ${data.word_count}`);

    // Links
    const noteLinks = data.links || [];
    if (noteLinks.length > 0) {
      console.log(`\nLinks:`);
      for (const l of noteLinks) {
        const linked = readObject(l.to);
        const linkedTitle = linked ? (linked.data.title || "").substring(0, 60) : l.to;
        const reason = l.reason ? ` — ${l.reason}` : "";
        console.log(`  ${l.rel} → ${linkedTitle}${reason}`);
      }
    }

    const backward = getBacklinks(id).filter(l => l.from_id.startsWith("note_") || l.from_id.startsWith("task_"));
    if (backward.length > 0) {
      console.log(`\nReferenced by:`);
      for (const l of backward) {
        const linked = readObject(l.from_id);
        const linkedTitle = linked ? (linked.data.title || "").substring(0, 60) : l.from_id;
        console.log(`  ${l.rel} ← ${linkedTitle}`);
      }
    }

    if (content.trim()) {
      console.log(`\n${resolveBodyRefs(content.trim())}`);
    }
    console.log();
  }
}
