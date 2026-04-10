/**
 * lens digest — Show today's new insights, connections, tensions, and questions.
 *
 * Default: last 24 hours. Use --days N for longer range.
 * Groups results by RELATIONSHIP TYPE:
 * - New Insights: notes with scope: big_picture
 * - New Connections: notes with role: connection (has bridges)
 * - New Tensions: notes with contradicts field
 * - New Questions: notes with question_status
 */

import { ensureInitialized, getDb } from "../core/storage";
import type { Note } from "../core/types";
import { parseCliArgs, type CommandOptions } from "./commands";

interface DigestGroups {
  insights: { id: string; text: string; qualifier?: string }[];
  connections: { id: string; text: string; bridges?: string[] }[];
  tensions: { id: string; text: string; contradicts: string[] }[];
  questions: { id: string; text: string; question_status?: string }[];
  sources: { id: string; title: string }[];
}

export async function showDigest(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const period = positional[0]; // "week", "month", "year" or undefined

  const periodDays: Record<string, number> = { week: 7, month: 30, year: 365 };
  const days = period ? (periodDays[period] || Number(period) || 1) : (Number(flags.days) || 1);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = getDb();

  // Find recently created objects (use created_at from object data, not cache updated_at)
  const all = db.prepare("SELECT id, type, data FROM objects").all() as { id: string; type: string; data: string }[];
  const recent = all.filter((row) => {
    try {
      const obj = JSON.parse(row.data);
      return (obj.created_at || obj.ingested_at || "") > since;
    } catch { return false; }
  });

  if (recent.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ period_days: days, insights: [], connections: [], tensions: [], questions: [], sources: [] }));
    } else {
      console.log(days === 1
        ? "Nothing new today. Ingest an article or check your feeds."
        : `Nothing new in the last ${days} days.`);
    }
    return;
  }

  const groups: DigestGroups = {
    insights: [],
    connections: [],
    tensions: [],
    questions: [],
    sources: [],
  };

  for (const row of recent) {
    const obj = JSON.parse(row.data);

    if (obj.type === "source") {
      groups.sources.push({ id: obj.id, title: obj.title });
      continue;
    }

    if (obj.type !== "note") continue;

    const note = obj as Note;

    // New Insights: notes with scope big_picture
    if (note.scope === "big_picture") {
      groups.insights.push({
        id: note.id,
        text: note.text,
        qualifier: note.qualifier,
      });
    }

    // New Connections: notes with role connection or bridges field
    if (note.role === "connection" || note.bridges?.length) {
      groups.connections.push({
        id: note.id,
        text: note.text,
        bridges: note.bridges,
      });
    }

    // New Tensions: notes with contradicts field
    if (note.contradicts?.length) {
      groups.tensions.push({
        id: note.id,
        text: note.text,
        contradicts: note.contradicts,
      });
    }

    // New Questions: notes with question_status
    if (note.question_status) {
      groups.questions.push({
        id: note.id,
        text: note.text,
        question_status: note.question_status,
      });
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ period_days: days, ...groups }, null, 2));
    return;
  }

  // Human-readable output
  const qualifierBar: Record<string, string> = {
    certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  ",
  };
  const periodLabels: Record<string, string> = {
    "1": "Today", "7": "This Week", "30": "This Month", "365": "This Year",
  };
  const periodLabel = periodLabels[String(days)] || `Last ${days} days`;

  // For longer periods, show compact view
  const isCompact = days > 7;

  console.log(`${periodLabel}'s Digest`);
  console.log(`${"━".repeat(40)}\n`);

  let hasContent = false;

  // New Insights
  if (groups.insights.length) {
    hasContent = true;
    console.log(`New Insights`);
    const shown = isCompact ? groups.insights.slice(0, 5) : groups.insights;
    for (const n of shown) {
      const bar = qualifierBar[n.qualifier || ""] || "   ";
      console.log(`  ${bar} ${n.text}`);
    }
    if (isCompact && groups.insights.length > 5) {
      console.log(`  +${groups.insights.length - 5} more insights`);
    }
    console.log();
  }

  // New Connections
  if (groups.connections.length) {
    hasContent = true;
    console.log(`New Connections`);
    if (isCompact) {
      console.log(`  ${groups.connections.length} connection(s) discovered`);
    } else {
      for (const n of groups.connections) {
        console.log(`  <-> ${n.text}`);
      }
    }
    console.log();
  }

  // New Tensions
  if (groups.tensions.length) {
    hasContent = true;
    console.log(`New Tensions`);
    if (isCompact) {
      console.log(`  ${groups.tensions.length} tension(s) detected`);
    } else {
      for (const n of groups.tensions) {
        console.log(`  ! ${n.text}`);
      }
    }
    console.log();
  }

  // New Questions
  if (groups.questions.length) {
    hasContent = true;
    console.log(`New Questions`);
    if (isCompact) {
      console.log(`  ${groups.questions.length} open question(s)`);
    } else {
      for (const n of groups.questions) {
        console.log(`  ? ${n.text} [${n.question_status}]`);
      }
    }
    console.log();
  }

  if (!hasContent) {
    console.log("No new insights. Sources were ingested but no notable notes extracted.\n");
  }

  // Sources summary
  if (groups.sources.length) {
    console.log(`From ${groups.sources.length} source(s):`);
    for (const s of groups.sources) {
      console.log(`  ${s.title}`);
    }
  }
}
