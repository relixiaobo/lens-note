/**
 * lens digest — Show recent notes and their connections.
 *
 * Default: last 24 hours. Use --days N for longer range.
 */

import { ensureInitialized, listObjects, readObject } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { Note, NoteLink } from "../core/types";

export async function showDigest(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const period = positional[0];
  const periodDays: Record<string, number> = { week: 7, month: 30, year: 365 };
  const days = period ? (periodDays[period] || Number(period) || 1) : (Number(flags.days) || 1);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

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
  const withSupports = recentNotes.filter(n => n.links.some(l => l.rel === "supports"));
  const noLinks = recentNotes.filter(n => n.links.length === 0);
  const rest = recentNotes.filter(n => n.links.length > 0 && !withContradicts.includes(n));

  if (opts.json) {
    const compactLinks = (links: NoteLink[]) => {
      const rels: Record<string, number> = {};
      for (const l of links) rels[l.rel] = (rels[l.rel] || 0) + 1;
      return { count: links.length, rels };
    };
    const result: Record<string, any> = {
      period: period || `${days}d`,
      total: recentNotes.length,
      tensions: withContradicts.map(n => ({ id: n.id, title: n.title, links: compactLinks(n.links) })),
      connected: rest.map(n => ({ id: n.id, title: n.title, links: compactLinks(n.links) })),
      seeds: noLinks.map(n => ({ id: n.id, title: n.title })),
    };
    if (recentNotes.length === 0) {
      result.total_notes = noteIds.length;
      result.hint = noteIds.length === 0
        ? "No notes exist yet."
        : `No notes in the last ${days} day(s). Try a wider range: 'lens digest week' or 'lens digest month'.`;
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (recentNotes.length === 0) {
    console.log(`No new notes in the last ${days} day(s).`);
    return;
  }

  const label = period || (days === 1 ? "Today" : `Last ${days} days`);
  console.log(`${label}'s Digest`);
  console.log("━".repeat(50));

  if (withContradicts.length > 0) {
    console.log(`\nTensions (${withContradicts.length})`);
    for (const n of withContradicts) {
      console.log(`  ⚡ ${n.title}`);
    }
  }

  if (rest.length > 0) {
    console.log(`\nConnected (${rest.length})`);
    for (const n of rest) {
      const linkSummary = n.links.map(l => `${l.rel}→${l.to.substring(0, 15)}`).join(", ");
      console.log(`  → ${n.title}`);
    }
  }

  if (noLinks.length > 0) {
    console.log(`\nSeeds (${noLinks.length})`);
    for (const n of noLinks) {
      console.log(`  · ${n.title}`);
    }
  }

  console.log(`\n${recentNotes.length} note(s) total`);
}
