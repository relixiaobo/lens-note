/**
 * lens links <id> — Show all relationships for an object.
 *
 * Returns forward (outgoing) and backward (incoming) links with labels.
 * Labels are the text/title of the linked object so the LLM
 * doesn't need follow-up show calls.
 */

import { getForwardLinks, getBacklinks, readObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

interface LabeledLink {
  id: string;
  rel: string;
  type?: string;
  label: string;
}

function getLabel(id: string): { type?: string; label: string } {
  const obj = readObject(id);
  if (!obj) return { label: id };
  const data = obj.data;
  const type = data.type;
  const label = data.title || id;
  return { type, label: typeof label === "string" ? label : id };
}

export async function showLinks(id: string, opts: CommandOptions) {
  ensureInitialized();

  if (!id) throw new Error("Usage: lens links <id>");

  // Verify object exists
  const obj = readObject(id);
  if (!obj) throw new Error(`Object not found: ${id}`);

  const forward = getForwardLinks(id);
  const backward = getBacklinks(id);

  const outgoing: LabeledLink[] = forward.map((l) => {
    const { type, label } = getLabel(l.to_id);
    return { id: l.to_id, rel: l.rel, type, label };
  });

  const incoming: LabeledLink[] = backward.map((l) => {
    const { type, label } = getLabel(l.from_id);
    return { id: l.from_id, rel: l.rel, type, label };
  });

  if (opts.json) {
    console.log(JSON.stringify({ id, outgoing, incoming }, null, 2));
  } else {
    const selfLabel = obj.data.text || obj.data.title || id;
    console.log(`Links for: "${typeof selfLabel === "string" ? selfLabel.substring(0, 60) : id}"\n`);

    if (outgoing.length) {
      console.log(`Outgoing (${outgoing.length}):`);
      for (const l of outgoing) {
        const typeTag = l.type ? ` (${l.type})` : "";
        console.log(`  → [${l.rel}] ${l.label.substring(0, 70)}${typeTag}`);
      }
    }

    if (incoming.length) {
      console.log(`\nIncoming (${incoming.length}):`);
      for (const l of incoming) {
        const typeTag = l.type ? ` (${l.type})` : "";
        console.log(`  ← [${l.rel}] ${l.label.substring(0, 70)}${typeTag}`);
      }
    }

    if (!outgoing.length && !incoming.length) {
      console.log("No links found.");
    }
  }
}
