/**
 * lens digest — Show recent notes and their connections.
 *
 * Default: last 24 hours. Use --days N for longer range.
 * Enhanced output: new notes grouped by category, new links formed,
 * orphan notes (written but unlinked), and existing notes that gained evidence.
 */

import { ensureInitialized, listObjects, readObject, getDb, setReadonly } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { NoteLink } from "../core/types";
import { respondSuccess } from "./response";

export async function showDigest(args: string[], opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const period = positional[0];
  const periodDays: Record<string, number> = { week: 7, month: 30, year: 365 };
  const days = period ? (periodDays[period] || Number(period) || 1) : (Number(flags.days) || 1);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = getDb();

  // --- New notes created in the period ---
  const noteIds = listObjects("note");
  const recentNotes: Array<{ id: string; title: string; links: NoteLink[]; created_at: string }> = [];

  for (const id of noteIds) {
    const obj = readObject(id);
    if (!obj) continue;
    const created = obj.data.created_at || "";
    if (created > cutoff) {
      recentNotes.push({
        id,
        title: obj.data.title || "",
        links: obj.data.links || [],
        created_at: created,
      });
    }
  }

  // Group by link type
  const withContradicts = recentNotes.filter(n => n.links.some(l => l.rel === "contradicts"));
  const noLinks = recentNotes.filter(n => n.links.length === 0);
  const rest = recentNotes.filter(n => n.links.length > 0 && !withContradicts.includes(n));
  const recentIds = new Set(recentNotes.map(n => n.id));

  // --- New links formed in the period (on notes updated but not created in the period) ---
  const newLinks: Array<{ from_id: string; from_title: string; rel: string; to_id: string; to_title: string }> = [];
  const rows = db.prepare(
    `SELECT l.from_id, l.rel, l.to_id FROM links l
     JOIN objects o ON o.id = l.from_id
     WHERE json_extract(o.data, '$.updated_at') > ? AND json_extract(o.data, '$.created_at') <= ?`
  ).all(cutoff, cutoff) as { from_id: string; rel: string; to_id: string }[];

  for (const row of rows) {
    const fromObj = readObject(row.from_id);
    const toObj = readObject(row.to_id);
    if (fromObj && toObj) {
      newLinks.push({
        from_id: row.from_id,
        from_title: fromObj.data.title || row.from_id,
        rel: row.rel,
        to_id: row.to_id,
        to_title: toObj.data.title || row.to_id,
      });
    }
  }

  // --- Gained evidence: existing notes that received new `supports` inbound during the period ---
  // These are notes NOT created in the period but whose supporters were created in the period
  const gainedEvidence: Array<{ id: string; title: string; new_supports: number }> = [];
  if (recentIds.size > 0) {
    const supportTargets = new Map<string, number>();
    for (const note of recentNotes) {
      for (const link of note.links) {
        if (link.rel === "supports" && !recentIds.has(link.to)) {
          supportTargets.set(link.to, (supportTargets.get(link.to) || 0) + 1);
        }
      }
    }
    for (const [targetId, count] of supportTargets) {
      const obj = readObject(targetId);
      if (obj) {
        gainedEvidence.push({ id: targetId, title: obj.data.title || targetId, new_supports: count });
      }
    }
    gainedEvidence.sort((a, b) => b.new_supports - a.new_supports);
  }

  const compactLinks = (links: NoteLink[]) => {
    const rels: Record<string, number> = {};
    for (const l of links) rels[l.rel] = (rels[l.rel] || 0) + 1;
    return { count: links.length, rels };
  };

  if (opts.json) {
    const result: Record<string, any> = {
      period: period || `${days}d`,
      total: recentNotes.length,
      tensions: withContradicts.map(n => ({ id: n.id, title: n.title, links: compactLinks(n.links) })),
      connected: rest.map(n => ({ id: n.id, title: n.title, links: compactLinks(n.links) })),
      seeds: noLinks.map(n => ({ id: n.id, title: n.title })),
    };
    if (newLinks.length > 0) result.new_links = newLinks;
    if (gainedEvidence.length > 0) result.gained_evidence = gainedEvidence;
    if (recentNotes.length === 0) {
      result.total_notes = noteIds.length;
      result.hint = noteIds.length === 0
        ? "No notes exist yet."
        : `No notes in the last ${days} day(s). Try a wider range: 'lens digest week' or 'lens digest month'.`;
    }
    respondSuccess(result);
    return;
  }

  if (recentNotes.length === 0 && newLinks.length === 0 && gainedEvidence.length === 0) {
    console.log(`No activity in the last ${days} day(s).`);
    return;
  }

  const label = period || (days === 1 ? "Today" : `Last ${days} days`);
  console.log(`${label}'s Digest`);
  console.log("━".repeat(50));

  if (withContradicts.length > 0) {
    console.log(`\nTensions (${withContradicts.length})`);
    for (const n of withContradicts) {
      console.log(`  ! ${n.title}`);
    }
  }

  if (rest.length > 0) {
    console.log(`\nConnected (${rest.length})`);
    for (const n of rest) {
      console.log(`  > ${n.title}`);
    }
  }

  if (noLinks.length > 0) {
    console.log(`\nSeeds (${noLinks.length})`);
    for (const n of noLinks) {
      console.log(`  . ${n.title}`);
    }
  }

  if (newLinks.length > 0) {
    console.log(`\nNew connections (${newLinks.length})`);
    for (const l of newLinks.slice(0, 10)) {
      console.log(`  ${l.from_title} -[${l.rel}]-> ${l.to_title}`);
    }
    if (newLinks.length > 10) console.log(`  ... and ${newLinks.length - 10} more`);
  }

  if (gainedEvidence.length > 0) {
    console.log(`\nGained evidence (${gainedEvidence.length})`);
    for (const g of gainedEvidence.slice(0, 5)) {
      console.log(`  +${g.new_supports} ${g.title}`);
    }
  }

  console.log(`\n${recentNotes.length} note(s), ${newLinks.length} new link(s)`);
}
