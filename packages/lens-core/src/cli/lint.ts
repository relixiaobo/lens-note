/**
 * lens lint — Deterministic graph quality checks with offender IDs.
 *
 * Checks:
 *   related_dominance  — related links as % of total (threshold: < 50%)
 *   contradicts_count  — number of contradicts links (0 = problem)
 *   super_connectors   — notes with > 30 inbound links
 *   missing_reasons    — links without a reason field
 *   duplicate_links    — same from→to pair with multiple rels
 *   dead_links         — links pointing to non-existent objects
 */

import { getDb, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import { respondSuccess } from "./response";

interface LintOffender {
  id: string;
  title?: string;
  detail?: string;
}

interface LintCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  value: number;
  threshold?: number;
  message: string;
  offenders?: LintOffender[];
}

const SUPER_CONNECTOR_THRESHOLD = 30;
const RELATED_THRESHOLD = 50; // percent

export async function runLint(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { flags } = parseCliArgs(args);

  // --summary: quick stats + user context (replaces `status` command)
  if (flags.summary || opts.summary) {
    const { showStatus } = await import("./status");
    return showStatus(opts);
  }

  const db = getDb();
  const checks: LintCheck[] = [];

  // ── 1. Related dominance ──────────────────────────────────
  const relCounts = db.prepare(
    "SELECT rel, COUNT(*) as cnt FROM links GROUP BY rel"
  ).all() as { rel: string; cnt: number }[];

  const totalLinks = relCounts.reduce((s, r) => s + r.cnt, 0);
  const relatedCount = relCounts.find(r => r.rel === "related")?.cnt || 0;
  const relatedPct = totalLinks > 0 ? parseFloat((relatedCount / totalLinks * 100).toFixed(1)) : 0;

  checks.push({
    name: "related_dominance",
    status: relatedPct > RELATED_THRESHOLD ? "fail" : "ok",
    value: relatedPct,
    threshold: RELATED_THRESHOLD,
    message: relatedPct > RELATED_THRESHOLD
      ? `related is ${relatedPct}% of all links (threshold: < ${RELATED_THRESHOLD}%). ${relatedCount} related out of ${totalLinks} total.`
      : `related is ${relatedPct}% of all links (${relatedCount}/${totalLinks}). OK.`,
  });

  // ── 2. Contradicts count ──────────────────────────────────
  const contradictsCount = relCounts.find(r => r.rel === "contradicts")?.cnt || 0;
  // contradicts is bidirectional, so actual pairs = count / 2
  const contradictsPairs = Math.floor(contradictsCount / 2);
  const contradictsAsymmetric = contradictsCount % 2 !== 0;

  checks.push({
    name: "contradicts_count",
    status: contradictsAsymmetric ? "fail" : contradictsPairs === 0 ? "fail" : contradictsPairs < 5 ? "warn" : "ok",
    value: contradictsPairs,
    message: contradictsAsymmetric
      ? `${contradictsCount} contradicts links (odd count — asymmetric pair detected). Run repair by re-writing the contradicts link.`
      : contradictsPairs === 0
        ? "Zero contradicts pairs. Tensions are the most valuable links — have your agent actively look for opposing viewpoints."
        : contradictsPairs < 5
          ? `${contradictsPairs} contradicts pairs. Consider searching for more tensions in key topic areas.`
          : `${contradictsPairs} contradicts pairs. Healthy tension level.`,
  });

  // ── 3. Super-connectors ───────────────────────────────────
  const hubs = db.prepare(`
    SELECT l.to_id as id, COUNT(*) as cnt,
      json_extract(o.data, '$.title') as title
    FROM links l
    JOIN objects o ON o.id = l.to_id
    WHERE l.to_id LIKE 'note_%'
    GROUP BY l.to_id
    HAVING cnt > ?
    ORDER BY cnt DESC
  `).all(SUPER_CONNECTOR_THRESHOLD) as { id: string; cnt: number; title: string }[];

  checks.push({
    name: "super_connectors",
    status: hubs.length > 0 ? "warn" : "ok",
    value: hubs.length,
    threshold: SUPER_CONNECTOR_THRESHOLD,
    message: hubs.length > 0
      ? `${hubs.length} notes with > ${SUPER_CONNECTOR_THRESHOLD} inbound links. Consider splitting into sub-topic index notes.`
      : `No super-connectors (all notes have ≤ ${SUPER_CONNECTOR_THRESHOLD} inbound links).`,
    ...(hubs.length > 0 ? {
      offenders: hubs.map(h => ({
        id: h.id,
        title: h.title,
        detail: `${h.cnt} inbound links`,
      })),
    } : {}),
  });

  // ── 4. Missing reasons ────────────────────────────────────
  // Check note files via the objects table (data column has JSON frontmatter)
  const allLinkedObjects = db.prepare(
    "SELECT id, data FROM objects WHERE type IN ('note', 'task')"
  ).all() as { id: string; data: string }[];

  let missingReasonCount = 0;
  const missingReasonSamples: LintOffender[] = [];

  for (const obj of allLinkedObjects) {
    try {
      const parsed = JSON.parse(obj.data);
      if (!Array.isArray(parsed.links)) continue;
      for (const link of parsed.links) {
        if (!link.reason || !link.reason.trim()) {
          missingReasonCount++;
          if (missingReasonSamples.length < 10) {
            missingReasonSamples.push({
              id: obj.id,
              title: parsed.title,
              detail: `${link.rel} → ${link.to} (no reason)`,
            });
          }
        }
      }
    } catch {
      missingReasonSamples.push({
        id: obj.id,
        detail: "failed to parse frontmatter — possible data corruption",
      });
    }
  }

  checks.push({
    name: "missing_reasons",
    status: missingReasonCount > 20 ? "warn" : "ok",
    value: missingReasonCount,
    message: missingReasonCount > 0
      ? `${missingReasonCount} links without a reason field. Reasons help agents (and you) understand link intent.`
      : "All links have reasons.",
    ...(missingReasonSamples.length > 0 ? { offenders: missingReasonSamples } : {}),
  });

  // ── 5. Duplicate links ────────────────────────────────────
  const dupes = db.prepare(`
    SELECT from_id, to_id, GROUP_CONCAT(rel) as rels, COUNT(*) as cnt
    FROM links
    GROUP BY from_id, to_id
    HAVING cnt > 1
  `).all() as { from_id: string; to_id: string; rels: string; cnt: number }[];

  checks.push({
    name: "duplicate_links",
    status: dupes.length > 0 ? "warn" : "ok",
    value: dupes.length,
    message: dupes.length > 0
      ? `${dupes.length} note pairs with multiple rels (e.g., both related + supports). The weaker rel is usually redundant.`
      : "No duplicate link pairs.",
    ...(dupes.length > 0 ? {
      offenders: dupes.slice(0, 10).map(d => ({
        id: d.from_id,
        detail: `→ ${d.to_id} [${d.rels}]`,
      })),
    } : {}),
  });

  // ── 6. Dead links ─────────────────────────────────────────
  const deadLinks = db.prepare(`
    SELECT l.from_id, l.to_id, l.rel
    FROM links l
    LEFT JOIN objects o ON o.id = l.to_id
    WHERE o.id IS NULL
  `).all() as { from_id: string; to_id: string; rel: string }[];

  checks.push({
    name: "dead_links",
    status: deadLinks.length > 0 ? "fail" : "ok",
    value: deadLinks.length,
    message: deadLinks.length > 0
      ? `${deadLinks.length} links point to non-existent objects. These should be removed.`
      : "All link targets exist.",
    ...(deadLinks.length > 0 ? {
      offenders: deadLinks.slice(0, 10).map(d => ({
        id: d.from_id,
        detail: `${d.rel} → ${d.to_id} (target missing)`,
      })),
    } : {}),
  });

  // ── Summary ───────────────────────────────────────────────
  const passed = checks.filter(c => c.status === "ok").length;
  const warnings = checks.filter(c => c.status === "warn").length;
  const failures = checks.filter(c => c.status === "fail").length;

  if (opts.json) {
    respondSuccess({
      checks,
      summary: {
        total_checks: checks.length,
        passed,
        warnings,
        failures,
      },
      ...(failures > 0 ? {
        hint: "Use offender IDs to fix issues: `lens show <id>`, `lens links <id>`, or `lens write --file` for batch updates.",
      } : {}),
    });
  } else {
    const icon = (s: string) => s === "ok" ? "✓" : s === "warn" ? "⚠" : "✗";
    console.log("lens lint\n");
    for (const check of checks) {
      console.log(`  ${icon(check.status)} ${check.message}`);
      if (check.offenders) {
        for (const o of check.offenders) {
          const title = o.title ? ` "${o.title}"` : "";
          console.log(`    - ${o.id}${title} — ${o.detail}`);
        }
      }
    }
    console.log();
    console.log(`  ${passed}/${checks.length} passed, ${warnings} warnings, ${failures} failures`);
  }
}
