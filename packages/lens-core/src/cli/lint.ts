/**
 * lens lint — Deterministic graph quality checks with offender IDs.
 *
 * Checks:
 *   related_dominance  — related links as % of total (threshold: < 50%)
 *   contradicts_count  — number of contradicts links (0 = problem)
 *   super_connectors   — notes with > 30 inbound links
 *   missing_reasons    — links without a reason field
 *   vague_reasons      — links with generic/trivial reasons
 *   duplicate_links    — same from→to pair with multiple rels
 *   dead_links         — links pointing to non-existent objects
 *   thin_notes         — notes with empty or very short bodies
 *   superseded_alive   — notes marked superseded but still referenced
 *
 * --check: exit code 1 if any failures exist (for CI/automation)
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
const THIN_BODY_THRESHOLD = 20; // characters
const VAGUE_REASON_MIN_LENGTH = 5;
const VAGUE_REASON_PATTERNS = /^(related|related to|supports|contradicts|refines|see also|similar|同上|相关|参见|参考|类似)\s*\.?$/i;

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

  // ── 5. Vague reasons ──────────────────────────────────────
  let vagueReasonCount = 0;
  const vagueReasonSamples: LintOffender[] = [];

  for (const obj of allLinkedObjects) {
    try {
      const parsed = JSON.parse(obj.data);
      if (!Array.isArray(parsed.links)) continue;
      for (const link of parsed.links) {
        if (!link.reason) continue; // missing_reasons catches these
        const reason = link.reason.trim();
        if (reason.length < VAGUE_REASON_MIN_LENGTH || VAGUE_REASON_PATTERNS.test(reason)) {
          vagueReasonCount++;
          if (vagueReasonSamples.length < 10) {
            vagueReasonSamples.push({
              id: obj.id,
              title: parsed.title,
              detail: `${link.rel} → ${link.to}: "${reason}"`,
            });
          }
        }
      }
    } catch { /* parse errors handled by missing_reasons */ }
  }

  checks.push({
    name: "vague_reasons",
    status: vagueReasonCount > 10 ? "warn" : "ok",
    value: vagueReasonCount,
    message: vagueReasonCount > 0
      ? `${vagueReasonCount} links with vague reasons (< ${VAGUE_REASON_MIN_LENGTH} chars or generic phrases). Reasons should explain HOW, not just restate the rel.`
      : "All link reasons are specific.",
    ...(vagueReasonSamples.length > 0 ? { offenders: vagueReasonSamples } : {}),
  });

  // ── 6. Duplicate links ────────────────────────────────────
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

  // ── 7. Dead links ─────────────────────────────────────────
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

  // ── 8. Thin notes ─────────────────────────────────────────
  const allNotes = db.prepare(
    "SELECT id, data, body FROM objects WHERE type = 'note'"
  ).all() as { id: string; data: string; body: string }[];

  const thinNotes: LintOffender[] = [];
  for (const obj of allNotes) {
    const body = (obj.body || "").trim();
    if (body.length < THIN_BODY_THRESHOLD) {
      try {
        const parsed = JSON.parse(obj.data);
        thinNotes.push({
          id: obj.id,
          title: parsed.title,
          detail: body.length === 0 ? "empty body" : `${body.length} chars`,
        });
      } catch {
        thinNotes.push({ id: obj.id, detail: "empty body" });
      }
    }
  }

  checks.push({
    name: "thin_notes",
    status: thinNotes.length > allNotes.length * 0.3 ? "warn" : "ok",
    value: thinNotes.length,
    message: thinNotes.length > 0
      ? `${thinNotes.length} notes with body < ${THIN_BODY_THRESHOLD} chars. Notes without evidence or reasoning are harder to collide with later.`
      : "All notes have substantive bodies.",
    ...(thinNotes.length > 0 ? { offenders: thinNotes.slice(0, 10) } : {}),
  });

  // ── 9. Superseded alive ──────────────────────────────────
  const SUPERSEDED_PATTERNS = /superseded|已被替代|已过时|outdated|deprecated|replaced by/i;
  const supersededAlive: LintOffender[] = [];

  for (const obj of allNotes) {
    const body = (obj.body || "").trim();
    if (!SUPERSEDED_PATTERNS.test(body)) continue;

    // This note is marked as superseded — check if it still has inbound links
    const inbound = db.prepare(
      "SELECT from_id, rel FROM links WHERE to_id = ? AND from_id LIKE 'note_%'"
    ).all(obj.id) as { from_id: string; rel: string }[];

    // Inbound links that treat this note as current (not just referencing it)
    const activeInbound = inbound.filter(l => l.rel === "supports" || l.rel === "refines");
    if (activeInbound.length > 0) {
      try {
        const parsed = JSON.parse(obj.data);
        supersededAlive.push({
          id: obj.id,
          title: parsed.title,
          detail: `${activeInbound.length} active inbound link(s) (${activeInbound.map(l => `${l.rel} ← ${l.from_id}`).slice(0, 3).join(", ")})`,
        });
      } catch {
        supersededAlive.push({ id: obj.id, detail: `${activeInbound.length} active inbound link(s)` });
      }
    }
  }

  checks.push({
    name: "superseded_alive",
    status: supersededAlive.length > 0 ? "warn" : "ok",
    value: supersededAlive.length,
    message: supersededAlive.length > 0
      ? `${supersededAlive.length} notes marked superseded but still actively referenced. Redirect inbound links to the replacement note.`
      : "No superseded notes with stale references.",
    ...(supersededAlive.length > 0 ? { offenders: supersededAlive } : {}),
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

  // --check: exit with non-zero if any failures (for CI/automation)
  if (flags.check || opts.check) {
    if (failures > 0) {
      process.exitCode = 1;
    }
  }
}
