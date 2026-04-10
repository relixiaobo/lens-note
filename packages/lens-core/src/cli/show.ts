/**
 * lens show <id> — Show any lens object.
 *
 * For Sources: shows what the source contributed (backlinked notes).
 * For Notes: adapts display based on role (claim/frame/question/etc).
 * For other types: shows the object with its fields.
 */

import { readObject, getBacklinks, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showObject(id: string, opts: CommandOptions) {
  ensureInitialized();

  const result = readObject(id);
  if (!result) throw new Error(`Object not found: ${id}`);

  const { data, content } = result;

  // Source-specific: show contributions
  if (data.type === "source" && !opts.json) {
    return showSourceContributions(id, data, content, opts);
  }

  // Note-specific: role-based display
  if (data.type === "note" && !opts.json) {
    return showNote(id, data, content, opts);
  }

  // Generic display for other types or --json
  if (opts.json) {
    console.log(JSON.stringify({ ...data, body: content.trim() }, null, 2));
  } else {
    console.log(`--- ${data.type}: ${id} ---`);
    for (const [key, value] of Object.entries(data)) {
      if (key === "type" || key === "id") continue;
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        if (typeof value[0] === "object") {
          console.log(`${key}:`);
          for (const item of value) console.log(`  - ${JSON.stringify(item)}`);
        } else {
          console.log(`${key}: ${value.join(", ")}`);
        }
      } else if (typeof value === "object") {
        console.log(`${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    if (content.trim()) console.log(`\n${content.trim()}`);
  }
}

/** Show a Note with role-adapted display */
function showNote(
  id: string,
  data: Record<string, any>,
  content: string,
  opts: CommandOptions,
) {
  const qualifierBar: Record<string, string> = {
    certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  ",
  };

  const role = data.role || "observation";
  const text = data.text || "";

  // Header
  if (role === "claim" || data.evidence?.length) {
    // Toulmin-style display
    const bar = qualifierBar[data.qualifier] || "   ";
    console.log(`${bar} "${text}"\n`);
    if (data.scope) console.log(`Scope: ${data.scope}`);
    if (data.structure_type) console.log(`Type: ${data.structure_type}`);
    if (data.voice) console.log(`Voice: ${data.voice}`);

    if (data.evidence?.length) {
      console.log(`\nEvidence:`);
      for (const e of data.evidence) {
        console.log(`  > "${e.text}"`);
        if (e.source) console.log(`    -- ${e.source}${e.locator ? `, ${e.locator}` : ""}`);
      }
    }
  } else if (role === "frame" || data.sees || data.ignores) {
    // Frame display
    console.log(`[frame] "${text}"\n`);
    if (data.sees) console.log(`Sees: ${data.sees}`);
    if (data.ignores) console.log(`Ignores: ${data.ignores}`);
    if (data.assumptions?.length) {
      console.log(`Assumptions:`);
      for (const a of data.assumptions) {
        console.log(`  - ${a}`);
      }
    }
  } else if (role === "question" || data.question_status) {
    // Question display
    console.log(`? "${text}"\n`);
    console.log(`Status: ${data.question_status || "open"}`);
  } else if (role === "connection" || data.bridges?.length) {
    // Connection display
    console.log(`<-> "${text}"\n`);
    if (data.bridges?.length) {
      console.log(`Bridges:`);
      for (const b of data.bridges) console.log(`  - ${b}`);
    }
  } else if (role === "structure_note" || data.entries?.length) {
    // Structure note display
    console.log(`# "${text}"\n`);
    if (data.entries?.length) {
      console.log(`Entries:`);
      for (const e of data.entries) console.log(`  - ${e}`);
    }
  } else {
    // Observation (default)
    console.log(`"${text}"\n`);
  }

  // Typed links (common to all roles)
  if (data.supports?.length) {
    console.log(`\nSupports: ${data.supports.join(", ")}`);
  }
  if (data.contradicts?.length) {
    console.log(`Contradicts: ${data.contradicts.join(", ")}`);
  }
  if (data.refines?.length) {
    console.log(`Refines: ${data.refines.join(", ")}`);
  }
  if (data.related?.length) {
    console.log(`Related:`);
    for (const r of data.related) {
      const note = typeof r === "object" && r.note ? ` (${r.note})` : "";
      const rid = typeof r === "object" ? r.id : r;
      console.log(`  - ${rid}${note}`);
    }
  }

  if (data.source) {
    console.log(`\nSource: ${data.source}`);
  }

  if (content.trim()) {
    console.log(`\n${content.trim()}`);
  }

  console.log();
}

/** Show a Source with its contributions (backlinked notes) */
function showSourceContributions(
  id: string,
  data: Record<string, any>,
  content: string,
  opts: CommandOptions,
) {
  const qualifierBar: Record<string, string> = {
    certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  ",
  };

  console.log(`"${data.title}"`);
  if (data.author) console.log(`by ${data.author}`);
  if (data.url) console.log(`${data.url}`);
  console.log(`${data.word_count} words · ${data.source_type} · ${data.ingested_at?.substring(0, 10)}`);
  console.log(`${"━".repeat(50)}\n`);

  // Find all notes sourced from this source
  const backlinks = getBacklinks(id);
  const notes = backlinks
    .filter((l) => l.rel === "source" && l.from_id.startsWith("note_"))
    .map((l) => {
      const obj = readObject(l.from_id);
      return obj ? {
        id: l.from_id,
        text: obj.data.text,
        role: obj.data.role || "observation",
        qualifier: obj.data.qualifier,
        scope: obj.data.scope,
        sees: obj.data.sees,
        question_status: obj.data.question_status,
      } : null;
    })
    .filter(Boolean) as any[];

  if (notes.length === 0) {
    console.log("No structured knowledge extracted yet.");
    return;
  }

  console.log(`Contributed ${notes.length} note(s):\n`);

  // Group by role for display
  const claims = notes.filter((n: any) => n.role === "claim");
  const frames = notes.filter((n: any) => n.role === "frame");
  const questions = notes.filter((n: any) => n.role === "question");
  const others = notes.filter((n: any) => !["claim", "frame", "question"].includes(n.role));

  // Big picture claims first
  const bigPicture = claims.filter((c: any) => c.scope === "big_picture");
  const details = claims.filter((c: any) => c.scope !== "big_picture");

  if (bigPicture.length) {
    console.log(`  Key Insights`);
    for (const c of bigPicture) {
      const bar = qualifierBar[c.qualifier] || "   ";
      console.log(`    ${bar} ${c.text}`);
    }
  }

  if (details.length) {
    console.log(`\n  Supporting (${details.length} notes)`);
    for (const c of details) {
      const bar = qualifierBar[c.qualifier] || "   ";
      console.log(`    ${bar} ${c.text}`);
    }
  }

  if (frames.length) {
    console.log(`\n  Perspectives`);
    for (const f of frames) {
      console.log(`    [frame] ${f.text}${f.sees ? ` -- sees: ${f.sees}` : ""}`);
    }
  }

  if (questions.length) {
    console.log(`\n  Questions Raised`);
    for (const q of questions) {
      console.log(`    ? ${q.text} [${q.question_status || "open"}]`);
    }
  }

  if (others.length) {
    console.log(`\n  Other Notes`);
    for (const o of others) {
      console.log(`    - ${o.text}`);
    }
  }

  console.log();
}
