/**
 * lens digest — Show today's new insights, tensions, and perspectives.
 *
 * Default: last 24 hours. Use --days N for longer range.
 * Groups results by Programme. Shows only the interesting stuff:
 * - Big picture claims (not details)
 * - New frames (perspectives)
 * - Contradictions (tensions)
 * - New open questions
 */

import { Database } from "bun:sqlite";
import { ensureInitialized, getDb, getObjectFromCache } from "../core/storage";
import type { Claim, Frame, Question, Source, Programme } from "../core/types";
import { parseCliArgs, type CommandOptions } from "./commands";

interface DigestItem {
  programme: { id: string; title: string } | null;
  claims: { id: string; statement: string; qualifier: string; scope: string }[];
  frames: { id: string; name: string; sees: string }[];
  questions: { id: string; text: string }[];
  tensions: { a: string; b: string }[];
  sources: { id: string; title: string }[];
}

export async function showDigest(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { flags } = parseCliArgs(args);
  const days = Number(flags.days) || 1;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = getDb();

  // Find all recently created objects
  const recent = db
    .prepare("SELECT id, type, data FROM objects WHERE updated_at > ? ORDER BY updated_at DESC")
    .all(since) as { id: string; type: string; data: string }[];

  if (recent.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ period_days: days, items: [] }));
    } else {
      console.log(days === 1
        ? "Nothing new today. Ingest an article or check your feeds."
        : `Nothing new in the last ${days} days.`);
    }
    return;
  }

  // Group by programme
  const programmeMap = new Map<string, DigestItem>();
  const noProgramme: DigestItem = {
    programme: null, claims: [], frames: [], questions: [], tensions: [], sources: [],
  };

  for (const row of recent) {
    const obj = JSON.parse(row.data);

    if (obj.type === "source") {
      // Track sources but don't display them as top-level items
      const pgmKey = "_sources";
      if (!programmeMap.has(pgmKey)) {
        programmeMap.set(pgmKey, { ...noProgramme, programme: null, claims: [], frames: [], questions: [], tensions: [], sources: [] });
      }
      programmeMap.get(pgmKey)!.sources.push({ id: obj.id, title: obj.title });
      continue;
    }

    // Determine programme
    const pgmIds: string[] = obj.programmes || [];
    const pgmId = pgmIds[0] || "_none";

    if (!programmeMap.has(pgmId)) {
      let pgmInfo: DigestItem["programme"] = null;
      if (pgmId !== "_none") {
        const pgm = getObjectFromCache(pgmId);
        if (pgm && pgm.obj.type === "programme") {
          pgmInfo = { id: pgmId, title: (pgm.obj as Programme).title };
        }
      }
      programmeMap.set(pgmId, {
        programme: pgmInfo,
        claims: [], frames: [], questions: [], tensions: [], sources: [],
      });
    }

    const bucket = programmeMap.get(pgmId)!;

    switch (obj.type) {
      case "claim": {
        bucket.claims.push({
          id: obj.id,
          statement: obj.statement,
          qualifier: obj.qualifier,
          scope: obj.scope || "detail",
        });
        // Check for tensions
        if (obj.contradicts?.length) {
          for (const cid of obj.contradicts) {
            const other = getObjectFromCache(cid);
            if (other && other.obj.type === "claim") {
              bucket.tensions.push({
                a: obj.statement,
                b: (other.obj as Claim).statement,
              });
            }
          }
        }
        break;
      }
      case "frame":
        bucket.frames.push({ id: obj.id, name: obj.name, sees: obj.sees });
        break;
      case "question":
        bucket.questions.push({ id: obj.id, text: obj.text });
        break;
    }
  }

  // Collect sources
  const allSources = programmeMap.get("_sources")?.sources || [];
  programmeMap.delete("_sources");

  if (opts.json) {
    const items = Array.from(programmeMap.values()).filter(
      (d) => d.claims.length || d.frames.length || d.questions.length || d.tensions.length
    );
    console.log(JSON.stringify({ period_days: days, items, sources: allSources }, null, 2));
    return;
  }

  // Human-readable output
  const qualifierBar: Record<string, string> = {
    certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  ",
  };
  const periodLabel = days === 1 ? "Today" : `Last ${days} days`;

  console.log(`${periodLabel}'s Digest`);
  console.log(`${"━".repeat(40)}\n`);

  let hasContent = false;

  for (const [, item] of programmeMap) {
    if (!item.claims.length && !item.frames.length && !item.questions.length) continue;
    hasContent = true;

    if (item.programme) {
      console.log(`${item.programme.title}`);
    } else {
      console.log(`Unassigned`);
    }

    // Show big_picture claims first (these are the "new insights")
    const bigPicture = item.claims.filter((c) => c.scope === "big_picture");
    const detailCount = item.claims.length - bigPicture.length;

    if (bigPicture.length) {
      for (const c of bigPicture) {
        const bar = qualifierBar[c.qualifier] || "   ";
        console.log(`  ${bar} ${c.statement}`);
      }
    }

    if (detailCount > 0) {
      console.log(`  +${detailCount} supporting details`);
    }

    // Tensions
    for (const t of item.tensions) {
      console.log(`  🔥 "${t.a}" ↔ "${t.b}"`);
    }

    // New frames
    for (const f of item.frames) {
      console.log(`  ◆ ${f.name} — sees: ${f.sees}`);
    }

    // New questions
    for (const q of item.questions) {
      console.log(`  ? ${q.text}`);
    }

    console.log();
  }

  if (!hasContent) {
    console.log("No new insights. Sources were ingested but no claims extracted.\n");
  }

  // Sources summary
  if (allSources.length) {
    console.log(`From ${allSources.length} source(s):`);
    for (const s of allSources) {
      console.log(`  📄 ${s.title}`);
    }
  }
}
