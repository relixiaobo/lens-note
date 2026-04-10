/**
 * lens show <id> — Show any lens object.
 *
 * For Sources: shows what the source contributed (claims, frames, questions).
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

  // Claim-specific: show evidence inline
  if (data.type === "claim" && !opts.json) {
    return showClaim(id, data, content, opts);
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

/** Show a Source with its contributions */
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

  // Find all objects sourced from this source
  const backlinks = getBacklinks(id);
  const claims = backlinks
    .filter((l) => l.rel === "source" && l.from_id.startsWith("clm_"))
    .map((l) => {
      const obj = readObject(l.from_id);
      return obj ? {
        statement: obj.data.statement,
        qualifier: obj.data.qualifier,
        scope: obj.data.scope || "detail",
        structure_type: obj.data.structure_type,
      } : null;
    })
    .filter(Boolean) as any[];

  const frames = backlinks
    .filter((l) => l.rel === "source" && l.from_id.startsWith("frm_"))
    .map((l) => {
      const obj = readObject(l.from_id);
      return obj ? { name: obj.data.name, sees: obj.data.sees } : null;
    })
    .filter(Boolean) as any[];

  const questions = backlinks
    .filter((l) => l.rel === "source" && l.from_id.startsWith("q_"))
    .map((l) => {
      const obj = readObject(l.from_id);
      return obj ? { text: obj.data.text } : null;
    })
    .filter(Boolean) as any[];

  if (claims.length === 0 && frames.length === 0 && questions.length === 0) {
    console.log("No structured knowledge extracted yet.");
    return;
  }

  console.log(`Contributed:`);

  // Big picture first
  const bigPicture = claims.filter((c: any) => c.scope === "big_picture");
  const details = claims.filter((c: any) => c.scope !== "big_picture");

  if (bigPicture.length) {
    console.log(`\n  Key Insights`);
    for (const c of bigPicture) {
      const bar = qualifierBar[c.qualifier] || "   ";
      const tag = c.structure_type ? ` [${c.structure_type}]` : "";
      console.log(`    ${bar} ${c.statement}${tag}`);
    }
  }

  if (details.length) {
    console.log(`\n  Supporting (${details.length} claims)`);
    for (const c of details) {
      const bar = qualifierBar[c.qualifier] || "   ";
      console.log(`    ${bar} ${c.statement}`);
    }
  }

  if (frames.length) {
    console.log(`\n  Perspectives`);
    for (const f of frames) {
      console.log(`    ◆ ${f.name} — sees: ${f.sees}`);
    }
  }

  if (questions.length) {
    console.log(`\n  Questions Raised`);
    for (const q of questions) {
      console.log(`    ? ${q.text}`);
    }
  }

  console.log();
}

/** Show a Claim with readable evidence */
function showClaim(
  id: string,
  data: Record<string, any>,
  content: string,
  opts: CommandOptions,
) {
  const qualifierBar: Record<string, string> = {
    certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  ",
  };

  const bar = qualifierBar[data.qualifier] || "   ";
  console.log(`${bar} "${data.statement}"\n`);

  if (data.scope) console.log(`Scope: ${data.scope}`);
  if (data.structure_type) console.log(`Type: ${data.structure_type}`);
  console.log(`Voice: ${data.voice}`);

  if (data.evidence?.length) {
    console.log(`\nEvidence:`);
    for (const e of data.evidence) {
      console.log(`  > "${e.text}"`);
      if (e.source) console.log(`    — ${e.source}${e.locator ? `, ${e.locator}` : ""}`);
    }
  }

  if (content.trim()) {
    console.log(`\n${content.trim()}`);
  }

  console.log();
}
