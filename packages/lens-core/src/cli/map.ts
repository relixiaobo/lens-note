/**
 * lens map <id> — Structural overview of a note's cluster.
 *
 * Groups links by semantic role (subtopics, evidence, tensions, continuations, related)
 * instead of raw forward/backward. Includes cluster_size for depth awareness.
 *
 * This is the "open the drawer and see the cards" command — Luhmann's physical
 * overview of a filing area, digitized.
 */

import { getForwardLinks, getBacklinks, readObject, ensureInitialized, resolveIdOrTitle, setReadonly, getLinkNeighborhood } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

interface Entry { id: string; title: string; reason?: string }

function resolveTitle(linkId: string): string {
  const obj = readObject(linkId);
  if (!obj) return linkId;
  const title = obj.data.title;
  return typeof title === "string" ? title : linkId;
}

function toEntry(linkId: string, reason?: string): Entry {
  return { id: linkId, title: resolveTitle(linkId), ...(reason ? { reason } : {}) };
}

export async function runMap(input: string | undefined, opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  if (!input) throw new Error("Usage: lens map <id|title>");

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

  const rawForward = getForwardLinks(id);
  const rawBackward = getBacklinks(id);

  // Read source object's link reasons
  const sourceReasons: Record<string, string | undefined> = {};
  if (obj.data.links) {
    for (const l of obj.data.links) {
      sourceReasons[`${l.to}:${l.rel}`] = l.reason;
    }
  }

  // Group by semantic role
  const subtopics: Entry[] = [];    // backward refines
  const evidence: Entry[] = [];     // backward supports + forward supports
  const tensions: Entry[] = [];     // contradicts (deduplicated)
  const continuations: Entry[] = []; // continues (either direction)
  const related: Entry[] = [];      // related (deduplicated)
  const indexes: Entry[] = [];      // forward indexes (children this organizes)
  const indexed_by: Entry[] = [];   // backward indexes (parents that organize this)

  // Forward links (what this note links TO)
  for (const l of rawForward) {
    const reason = sourceReasons[`${l.to_id}:${l.rel}`];
    const entry = toEntry(l.to_id, reason);
    switch (l.rel) {
      case "refines": related.push(entry); break;
      case "supports": evidence.push(entry); break;
      case "contradicts": tensions.push(entry); break;
      case "continues": continuations.push(entry); break;
      case "indexes": indexes.push(entry); break;
      case "related": related.push(entry); break;
    }
  }

  // Backward links (what links TO this note)
  for (const l of rawBackward) {
    const source = readObject(l.from_id);
    const sourceLink = source?.data.links?.find(
      (sl: any) => sl.to === id && sl.rel === l.rel
    );
    const entry = toEntry(l.from_id, sourceLink?.reason);
    switch (l.rel) {
      case "refines": subtopics.push(entry); break;
      case "supports": evidence.push(entry); break;
      case "contradicts":
        if (!tensions.some(t => t.id === entry.id)) tensions.push(entry);
        break;
      case "continues": continuations.push(entry); break;
      case "indexes": indexed_by.push(entry); break;
      case "related":
        if (!related.some(r => r.id === entry.id)) related.push(entry);
        break;
    }
  }

  const neighborhood = getLinkNeighborhood(id, 2);
  const clusterSize = neighborhood.size;
  const title = obj.data.title || id;
  const directLinks = rawForward.length + rawBackward.length;

  if (opts.json) {
    const output: Record<string, any> = {
      id,
      title,
      cluster_size: clusterSize,
      direct_links: directLinks,
    };
    if (subtopics.length) output.subtopics = subtopics;
    if (evidence.length) output.evidence = evidence;
    if (tensions.length) output.tensions = tensions;
    if (continuations.length) output.continuations = continuations;
    if (indexes.length) output.indexes = indexes;
    if (indexed_by.length) output.indexed_by = indexed_by;
    if (related.length) output.related = related;
    respondSuccess(output);
  } else {
    console.log(`Map: "${typeof title === "string" ? title.substring(0, 60) : id}"`);
    console.log(`  ${directLinks} direct links, ${clusterSize} notes within 2 hops\n`);

    const printGroup = (label: string, items: Entry[]) => {
      if (!items.length) return;
      console.log(`  ${label} (${items.length}):`);
      for (const e of items) {
        console.log(`    ${e.title.substring(0, 65)}`);
      }
    };

    printGroup("Subtopics", subtopics);
    printGroup("Evidence", evidence);
    printGroup("Tensions", tensions);
    printGroup("Continuations", continuations);
    printGroup("Indexes", indexes);
    printGroup("Indexed by", indexed_by);
    printGroup("Related", related);
  }
}
