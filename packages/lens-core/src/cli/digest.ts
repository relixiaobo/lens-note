/**
 * lens digest — Show recent notes and their connections.
 *
 * Default: last 24 hours. Use --days N for longer range.
 * Enhanced output: new notes grouped by category, new links formed,
 * orphan notes (written but unlinked), and existing notes that gained evidence.
 *
 * --html writes a self-contained snapshot to ~/.lens/digest-<period>-<date>.html
 * so users can read, archive, or share the week without running the view server.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { ensureInitialized, listObjects, readObject, getDb, setReadonly } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { NoteLink } from "../core/types";
import { respondSuccess } from "./response";
import { paths } from "../core/paths";

export interface DigestData {
  days: number;
  periodLabel: string;
  tensions: Array<{ id: string; title: string; links: NoteLink[]; created_at: string }>;
  connected: Array<{ id: string; title: string; links: NoteLink[]; created_at: string }>;
  seeds: Array<{ id: string; title: string; links: NoteLink[]; created_at: string }>;
  newLinks: Array<{ from_id: string; from_title: string; rel: string; to_id: string; to_title: string }>;
  gainedEvidence: Array<{ id: string; title: string; new_supports: number }>;
}

/**
 * Compute digest data for a time window. Reused by the CLI and the view server.
 * Caller is responsible for setReadonly() + ensureInitialized() — both entry
 * points do this at startup, and calling them twice throws.
 */
export function computeDigest(days: number, periodLabel?: string): DigestData {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();

  // New notes created in the period
  const noteIds = listObjects("note");
  const recentNotes: DigestData["tensions"] = [];
  for (const id of noteIds) {
    const obj = readObject(id);
    if (!obj) continue;
    const created = obj.data.created_at || "";
    if (created > cutoff) {
      recentNotes.push({ id, title: obj.data.title || "", links: obj.data.links || [], created_at: created });
    }
  }

  const tensions = recentNotes.filter(n => n.links.some(l => l.rel === "contradicts"));
  const seeds = recentNotes.filter(n => n.links.length === 0);
  const connected = recentNotes.filter(n => n.links.length > 0 && !tensions.includes(n));
  const recentIds = new Set(recentNotes.map(n => n.id));

  // New links formed on older notes during the period
  const newLinks: DigestData["newLinks"] = [];
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

  // Gained evidence: older notes whose supporters were created in the period
  const gainedEvidence: DigestData["gainedEvidence"] = [];
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
      if (obj) gainedEvidence.push({ id: targetId, title: obj.data.title || targetId, new_supports: count });
    }
    gainedEvidence.sort((a, b) => b.new_supports - a.new_supports);
  }

  return { days, periodLabel: periodLabel || `${days}d`, tensions, connected, seeds, newLinks, gainedEvidence };
}

export async function showDigest(args: string[], opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const period = positional[0];
  const periodDays: Record<string, number> = { week: 7, month: 30, year: 365 };
  const days = period ? (periodDays[period] || Number(period) || 1) : (Number(flags.days) || 1);
  const data = computeDigest(days, period);
  const { tensions: withContradicts, connected: rest, seeds: noLinks, newLinks, gainedEvidence } = data;
  const recentNotes = [...withContradicts, ...rest, ...noLinks];
  const noteIds = listObjects("note");

  const compactLinks = (links: NoteLink[]) => {
    const rels: Record<string, number> = {};
    for (const l of links) rels[l.rel] = (rels[l.rel] || 0) + 1;
    return { count: links.length, rels };
  };

  const periodLabel = period || `${days}d`;

  // --html: write self-contained report file. Works with or without --json.
  if (flags.html) {
    const today = new Date().toISOString().slice(0, 10);
    const defaultPath = join(paths.root, `digest-${periodLabel}-${today}.html`);
    const outPath = typeof flags.html === "string" ? flags.html : defaultPath;
    const html = renderDigestHtml({
      periodLabel,
      days,
      tensions: withContradicts,
      connected: rest,
      seeds: noLinks,
      newLinks,
      gainedEvidence,
    });
    writeFileSync(outPath, html, "utf-8");
    if (opts.json) {
      respondSuccess({
        period: periodLabel,
        path: outPath,
        bytes: Buffer.byteLength(html, "utf-8"),
        total: recentNotes.length,
        new_links: newLinks.length,
        gained_evidence: gainedEvidence.length,
      });
    } else {
      console.log(`Wrote ${outPath}`);
      console.log(`Open with: open "${outPath}"`);
    }
    return;
  }

  if (opts.json) {
    const result: Record<string, any> = {
      period: periodLabel,
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

// ============================================================
// HTML renderer — self-contained, no server, no fetch, no JS required.
// ============================================================

interface DigestHtmlInput {
  periodLabel: string;
  days: number;
  tensions: Array<{ id: string; title: string; links: NoteLink[] }>;
  connected: Array<{ id: string; title: string; links: NoteLink[] }>;
  seeds: Array<{ id: string; title: string }>;
  newLinks: Array<{ from_id: string; from_title: string; rel: string; to_id: string; to_title: string }>;
  gainedEvidence: Array<{ id: string; title: string; new_supports: number }>;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderDigestHtml(d: DigestHtmlInput): string {
  const now = new Date();
  const generated = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const periodTitle = d.periodLabel === "week" ? "This Week"
    : d.periodLabel === "month" ? "This Month"
    : d.periodLabel === "year" ? "This Year"
    : `Last ${d.days} day(s)`;

  const total = d.tensions.length + d.connected.length + d.seeds.length;

  const idBadge = (id: string) => `<code class="id">${escapeHtml(id)}</code>`;
  const linkSummary = (links: NoteLink[]) => {
    const rels: Record<string, number> = {};
    for (const l of links) rels[l.rel] = (rels[l.rel] || 0) + 1;
    return Object.entries(rels).map(([r, c]) => `<span class="rel rel-${r}">${r}·${c}</span>`).join(" ");
  };

  const tensionItems = d.tensions.map(n => `
    <li class="item item-tension">
      <div class="item-title">${escapeHtml(n.title || "(untitled)")}</div>
      <div class="item-meta">${idBadge(n.id)} ${linkSummary(n.links)}</div>
    </li>`).join("");

  const connectedItems = d.connected.map(n => `
    <li class="item">
      <div class="item-title">${escapeHtml(n.title || "(untitled)")}</div>
      <div class="item-meta">${idBadge(n.id)} ${linkSummary(n.links)}</div>
    </li>`).join("");

  const seedItems = d.seeds.map(n => `
    <li class="item item-seed">
      <div class="item-title">${escapeHtml(n.title || "(untitled)")}</div>
      <div class="item-meta">${idBadge(n.id)} <span class="hint">unlinked — awaiting placement</span></div>
    </li>`).join("");

  const linkItems = d.newLinks.map(l => `
    <li class="edge">
      <span class="edge-from">${escapeHtml(l.from_title)}</span>
      <span class="edge-rel rel-${l.rel}">${l.rel}</span>
      <span class="edge-to">${escapeHtml(l.to_title)}</span>
    </li>`).join("");

  const evidenceItems = d.gainedEvidence.map(g => `
    <li class="item">
      <div class="item-title">${escapeHtml(g.title)}</div>
      <div class="item-meta">${idBadge(g.id)} <span class="badge badge-supports">+${g.new_supports} supports</span></div>
    </li>`).join("");

  const section = (title: string, count: number, body: string, cls = "") =>
    count === 0 ? "" : `
    <section class="section ${cls}">
      <h2>${escapeHtml(title)} <span class="count">${count}</span></h2>
      <ul class="list">${body}</ul>
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>lens digest — ${escapeHtml(periodTitle)}</title>
<meta name="generator" content="lens digest --html">
<style>
  :root {
    --fg: #1a1a1a; --bg: #fafafa; --muted: #6b7280;
    --border: #e5e7eb; --card: #fff;
    --tension: #dc2626; --tension-bg: #fef2f2;
    --accent: #4f46e5;
    --seed: #9ca3af;
  }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #e5e7eb; --bg: #111; --muted: #9ca3af; --border: #2a2a2a;
            --card: #1a1a1a; --tension: #f87171; --tension-bg: #2a1515; --seed: #6b7280; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
         color: var(--fg); background: var(--bg); padding: 32px 20px 80px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  header { border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
  header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }
  header .sub { color: var(--muted); font-size: 13px; }
  .stats { display: flex; gap: 24px; margin-top: 12px; font-size: 13px; color: var(--muted); }
  .stats b { color: var(--fg); font-weight: 600; font-size: 18px; display: block; }
  .section { margin: 28px 0; }
  .section h2 { font-size: 14px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
                color: var(--muted); margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
  .section.tensions h2 { color: var(--tension); }
  .count { background: var(--border); color: var(--fg); border-radius: 9px; padding: 2px 8px;
           font-size: 11px; text-transform: none; letter-spacing: 0; }
  .list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .item { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; }
  .item-tension { border-color: var(--tension); background: var(--tension-bg); }
  .item-title { font-weight: 500; }
  .item-meta { margin-top: 4px; font-size: 12px; color: var(--muted); display: flex; gap: 8px;
               align-items: center; flex-wrap: wrap; }
  .item-seed { border-style: dashed; }
  .id { font: 11px ui-monospace, Menlo, monospace; color: var(--muted); }
  .hint { font-style: italic; }
  .rel { font: 11px ui-monospace, Menlo, monospace; padding: 1px 6px; border-radius: 4px;
         background: var(--border); color: var(--fg); }
  .rel-supports { background: #dcfce7; color: #166534; }
  .rel-contradicts { background: #fee2e2; color: #991b1b; }
  .rel-refines { background: #e0e7ff; color: #3730a3; }
  .rel-continues { background: #fef3c7; color: #92400e; }
  .rel-related { background: #f3f4f6; color: #4b5563; }
  @media (prefers-color-scheme: dark) {
    .rel-supports { background: #14532d; color: #bbf7d0; }
    .rel-contradicts { background: #7f1d1d; color: #fecaca; }
    .rel-refines { background: #312e81; color: #c7d2fe; }
    .rel-continues { background: #78350f; color: #fde68a; }
    .rel-related { background: #374151; color: #d1d5db; }
  }
  .edge { display: flex; gap: 8px; align-items: center; padding: 8px 12px;
          border-bottom: 1px solid var(--border); font-size: 14px; }
  .edge:last-child { border-bottom: none; }
  .edge-from, .edge-to { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .edge-to { text-align: right; color: var(--muted); }
  .edge-rel { flex: 0 0 auto; font: 11px ui-monospace, Menlo, monospace; padding: 1px 6px; border-radius: 4px; }
  .badge { font: 11px ui-monospace, Menlo, monospace; padding: 1px 6px; border-radius: 4px; }
  .badge-supports { background: #dcfce7; color: #166534; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border);
           color: var(--muted); font-size: 12px; }
  .empty { color: var(--muted); padding: 24px 0; text-align: center; font-style: italic; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${escapeHtml(periodTitle)}</h1>
    <div class="sub">lens digest · generated ${escapeHtml(generated)}</div>
    <div class="stats">
      <div><b>${total}</b>notes</div>
      <div><b>${d.tensions.length}</b>tensions</div>
      <div><b>${d.newLinks.length}</b>new links</div>
      <div><b>${d.gainedEvidence.length}</b>gained evidence</div>
    </div>
  </header>
  ${total === 0 && d.newLinks.length === 0 && d.gainedEvidence.length === 0
    ? `<div class="empty">No activity in this window.</div>`
    : ""}
  ${section("Tensions", d.tensions.length, tensionItems, "tensions")}
  ${section("Connected", d.connected.length, connectedItems)}
  ${section("Seeds", d.seeds.length, seedItems)}
  ${section("New connections", d.newLinks.length, linkItems)}
  ${section("Gained evidence", d.gainedEvidence.length, evidenceItems)}
  <footer>
    Static snapshot. To explore: <code>lens view</code> then paste an ID into the URL bar.
  </footer>
</div>
</body>
</html>`;
}
