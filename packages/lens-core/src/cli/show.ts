/**
 * lens show <id> — Show any lens object with links.
 */

import { readObject, getBacklinks, getForwardLinks, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showObject(id: string, opts: CommandOptions) {
  ensureInitialized();

  const result = readObject(id);
  if (!result) throw new Error(`Object not found: ${id}`);

  const { data, content } = result;

  if (opts.json) {
    const enrichLink = (linkId: string) => {
      const linked = readObject(linkId);
      return linked ? (linked.data.title || "").substring(0, 120) : "";
    };

    // Forward links from note's own links array (preserves reason)
    const noteLinks = (data.links || []).map((l: any) => ({
      to: l.to,
      rel: l.rel,
      ...(l.reason ? { reason: l.reason } : {}),
      title: enrichLink(l.to),
    }));

    // Backward links from SQLite cache
    const backward = getBacklinks(id).map(l => ({
      from: l.from_id,
      rel: l.rel,
      title: enrichLink(l.from_id),
    }));

    console.log(JSON.stringify({
      ...data,
      body: content.trim(),
      forward_link_count: noteLinks.length,
      backward_link_count: backward.length,
      links: { forward: noteLinks, backward },
    }, null, 2));
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
