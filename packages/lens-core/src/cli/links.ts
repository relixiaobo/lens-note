/**
 * lens links <id> — Show all relationships for an object.
 *
 * Returns forward and backward links with titles.
 * Titles are resolved so the LLM doesn't need follow-up show calls.
 */

import { getForwardLinks, getBacklinks, readObject, ensureInitialized, resolveIdOrTitle, setReadonly } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

interface LabeledLink {
  id: string;
  rel: string;
  type?: string;
  title: string;
  reason?: string;
}

function resolveLink(linkId: string): { type?: string; title: string } {
  const obj = readObject(linkId);
  if (!obj) return { title: linkId };
  const data = obj.data;
  const title = data.title || linkId;
  return { type: data.type, title: typeof title === "string" ? title : linkId };
}

export async function showLinks(input: string, opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  if (!input) throw new Error("Usage: lens links <id>");

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
  const obj = readObject(id);
  if (!obj) throw new Error(`Object not found: ${id}.`);

  // --rel filter: only show links of a specific relationship type
  const relFilter = opts.rel ? String(opts.rel) : undefined;
  const validRels = new Set(["supports", "contradicts", "refines", "related", "indexes", "continues"]);
  if (relFilter && !validRels.has(relFilter)) {
    throw new Error(`--rel "${relFilter}" is invalid. Valid: ${[...validRels].join(", ")}`);
  }
  // --direction filter: "forward", "backward", or both (default)
  const dirFilter = opts.direction ? String(opts.direction) : undefined;
  if (dirFilter && dirFilter !== "forward" && dirFilter !== "backward") {
    throw new Error('--direction must be "forward" or "backward"');
  }

  const showForward = !dirFilter || dirFilter === "forward";
  const showBackward = !dirFilter || dirFilter === "backward";

  let forward: LabeledLink[] = [];
  let backward: LabeledLink[] = [];

  if (showForward) {
    const rawForward = getForwardLinks(id);
    // Read source object's links[] to get reasons
    const sourceLinks: Record<string, string | undefined> = {};
    if (obj.data.links) {
      for (const l of obj.data.links) {
        sourceLinks[`${l.to}:${l.rel}`] = l.reason;
      }
    }
    forward = rawForward
      .filter((l) => !relFilter || l.rel === relFilter)
      .map((l) => {
        const { type, title } = resolveLink(l.to_id);
        const reason = sourceLinks[`${l.to_id}:${l.rel}`];
        return { id: l.to_id, rel: l.rel, type, title, ...(reason ? { reason } : {}) };
      });
  }

  if (showBackward) {
    const rawBackward = getBacklinks(id);
    backward = rawBackward
      .filter((l) => !relFilter || l.rel === relFilter)
      .map((l) => {
        const { type, title } = resolveLink(l.from_id);
        // Reason is stored in the source note's links[] (frontmatter), not in the links table.
        // Read the source to extract the matching link's reason.
        const source = readObject(l.from_id);
        const sourceLink = source?.data.links?.find(
          (sl: any) => sl.to === id && sl.rel === l.rel
        );
        const reason = sourceLink?.reason;
        return { id: l.from_id, rel: l.rel, type, title, ...(reason ? { reason } : {}) };
      });
  }

  if (opts.json) {
    const output: Record<string, any> = { id };
    if (showForward) output.forward = forward;
    if (showBackward) output.backward = backward;
    respondSuccess(output);
  } else {
    const selfTitle = obj.data.title || id;
    console.log(`Links for: "${typeof selfTitle === "string" ? selfTitle.substring(0, 60) : id}"\n`);

    if (showForward && forward.length) {
      console.log(`Forward (${forward.length}):`);
      for (const l of forward) {
        const typeTag = l.type ? ` (${l.type})` : "";
        const reasonTag = l.reason ? ` — ${l.reason}` : "";
        console.log(`  → [${l.rel}] ${l.title.substring(0, 70)}${typeTag}${reasonTag}`);
      }
    }

    if (showBackward && backward.length) {
      console.log(`\nBackward (${backward.length}):`);
      for (const l of backward) {
        const typeTag = l.type ? ` (${l.type})` : "";
        const reasonTag = l.reason ? ` — ${l.reason}` : "";
        console.log(`  ← [${l.rel}] ${l.title.substring(0, 70)}${typeTag}${reasonTag}`);
      }
    }

    if (!forward.length && !backward.length) {
      console.log("No links found.");
    }
  }
}

