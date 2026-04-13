/**
 * lens links <id> — Show all relationships for an object.
 *
 * Returns forward and backward links with titles.
 * Titles are resolved so the LLM doesn't need follow-up show calls.
 */

import { getForwardLinks, getBacklinks, readObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

interface LabeledLink {
  id: string;
  rel: string;
  type?: string;
  title: string;
}

function resolveLink(linkId: string): { type?: string; title: string } {
  const obj = readObject(linkId);
  if (!obj) return { title: linkId };
  const data = obj.data;
  const title = data.title || linkId;
  return { type: data.type, title: typeof title === "string" ? title : linkId };
}

export async function showLinks(id: string, opts: CommandOptions) {
  ensureInitialized();

  if (!id) throw new Error("Usage: lens links <id>");

  // Verify object exists
  const obj = readObject(id);
  if (!obj) throw new Error(`Object not found: ${id}`);

  const rawForward = getForwardLinks(id);
  const rawBackward = getBacklinks(id);

  const forward: LabeledLink[] = rawForward.map((l) => {
    const { type, title } = resolveLink(l.to_id);
    return { id: l.to_id, rel: l.rel, type, title };
  });

  const backward: LabeledLink[] = rawBackward.map((l) => {
    const { type, title } = resolveLink(l.from_id);
    return { id: l.from_id, rel: l.rel, type, title };
  });

  if (opts.json) {
    console.log(JSON.stringify({ id, forward, backward }, null, 2));
  } else {
    const selfTitle = obj.data.title || id;
    console.log(`Links for: "${typeof selfTitle === "string" ? selfTitle.substring(0, 60) : id}"\n`);

    if (forward.length) {
      console.log(`Forward (${forward.length}):`);
      for (const l of forward) {
        const typeTag = l.type ? ` (${l.type})` : "";
        console.log(`  → [${l.rel}] ${l.title.substring(0, 70)}${typeTag}`);
      }
    }

    if (backward.length) {
      console.log(`\nBackward (${backward.length}):`);
      for (const l of backward) {
        const typeTag = l.type ? ` (${l.type})` : "";
        console.log(`  ← [${l.rel}] ${l.title.substring(0, 70)}${typeTag}`);
      }
    }

    if (!forward.length && !backward.length) {
      console.log("No links found.");
    }
  }
}
