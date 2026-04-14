/**
 * lens show <id> — Show any lens object with links.
 */

import { readObject, getBacklinks, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showObject(id: string, opts: CommandOptions) {
  ensureInitialized();

  const result = readObject(id);
  if (!result) throw new Error(`Object not found: ${id}. Use \`lens search\` to find the correct ID.`);

  const { data, content } = result;

  if (opts.json) {
    const enrichLink = (linkId: string) => {
      const linked = readObject(linkId);
      return linked ? (linked.data.title || "").substring(0, 120) : "";
    };

    // Forward links from note's own links array (preserves reason)
    const forwardLinks = (data.links || []).map((l: any) => ({
      id: l.to,
      rel: l.rel,
      ...(l.reason ? { reason: l.reason } : {}),
      title: enrichLink(l.to),
    }));

    // Backward links from SQLite cache
    const backwardLinks = getBacklinks(id).map(l => ({
      id: l.from_id,
      rel: l.rel,
      title: enrichLink(l.from_id),
    }));

    // Explicit field selection — no ...data spread
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

    output.body = content.trim();
    output.forward_links = forwardLinks;
    output.backward_links = backwardLinks;

    console.log(JSON.stringify(output, null, 2));
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
      console.log(`\n${content.trim()}`);
    }
    console.log();
  }
}
