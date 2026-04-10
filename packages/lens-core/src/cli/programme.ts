/**
 * lens programme <subcommand> — Programme management.
 */

import { listObjects, readObject, getBacklinks, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";

export async function handleProgramme(sub: string, args: string[], opts: CommandOptions) {
  ensureInitialized();

  // Re-parse to handle flags before subcommand (e.g. `lens programme --json list`)
  const allArgs = sub ? [sub, ...args] : args;
  const { positional, flags } = parseCliArgs(allArgs);
  const mergedOpts = { ...opts, ...flags };
  const subcommand = positional[0];

  switch (subcommand) {
    case "list":
      return listProgrammes(mergedOpts);
    case "show":
      return showProgramme(positional[1], mergedOpts);
    default:
      throw new Error(`Unknown programme subcommand: ${subcommand}\nUsage: lens programme list|show <id>`);
  }
}

async function listProgrammes(opts: CommandOptions) {
  const ids = listObjects("programme");

  if (ids.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ count: 0, programmes: [] }));
    } else {
      console.log("No programmes yet. Ingest articles to let the Compilation Agent create them.");
    }
    return;
  }

  const programmes = ids.map((id) => {
    const obj = readObject(id);
    if (!obj) return null;
    const backlinks = getBacklinks(id);
    const claimCount = backlinks.filter((l) => l.rel === "programme" && l.from_id.startsWith("clm_")).length;
    const frameCount = backlinks.filter((l) => l.rel === "programme" && l.from_id.startsWith("frm_")).length;
    const questionCount = backlinks.filter((l) => l.rel === "programme" && l.from_id.startsWith("q_")).length;
    return {
      id,
      title: obj.data.title,
      claims: claimCount,
      frames: frameCount,
      questions: questionCount,
    };
  }).filter(Boolean);

  if (opts.json) {
    console.log(JSON.stringify({ count: programmes.length, programmes }, null, 2));
  } else {
    console.log(`${programmes.length} programme(s):\n`);
    for (const p of programmes) {
      console.log(`  ${p!.id}`);
      console.log(`    "${p!.title}"`);
      console.log(`    ${p!.claims} claims · ${p!.frames} frames · ${p!.questions} questions\n`);
    }
  }
}

async function showProgramme(id: string, opts: CommandOptions) {
  if (!id) throw new Error("Usage: lens programme show <id>");

  const obj = readObject(id);
  if (!obj) throw new Error(`Programme not found: ${id}`);
  if (obj.data.type !== "programme") throw new Error(`${id} is a ${obj.data.type}, not a programme`);

  const backlinks = getBacklinks(id);
  const claimIds = backlinks.filter((l) => l.rel === "programme" && l.from_id.startsWith("clm_")).map((l) => l.from_id);
  const frameIds = backlinks.filter((l) => l.rel === "programme" && l.from_id.startsWith("frm_")).map((l) => l.from_id);
  const questionIds = backlinks.filter((l) => l.rel === "programme" && l.from_id.startsWith("q_")).map((l) => l.from_id);

  // Read each member's key data
  const claims = claimIds.map((cid) => {
    const c = readObject(cid);
    return c ? { id: cid, statement: c.data.statement, qualifier: c.data.qualifier, scope: c.data.scope || "detail", structure_type: c.data.structure_type } : null;
  }).filter(Boolean) as { id: string; statement: string; qualifier: string; scope: string; structure_type?: string }[];

  const frames = frameIds.map((fid) => {
    const f = readObject(fid);
    return f ? { id: fid, name: f.data.name, sees: f.data.sees, ignores: f.data.ignores } : null;
  }).filter(Boolean) as { id: string; name: string; sees: string; ignores: string }[];

  const questions = questionIds.map((qid) => {
    const q = readObject(qid);
    return q ? { id: qid, text: q.data.text, status: q.data.question_status } : null;
  }).filter(Boolean) as { id: string; text: string; status: string }[];

  // Sort claims: big_picture first, then by qualifier
  const qualifierOrder: Record<string, number> = { certain: 0, likely: 1, presumably: 2, tentative: 3 };
  claims.sort((a, b) => {
    const scopeA = a.scope === "big_picture" ? 0 : 1;
    const scopeB = b.scope === "big_picture" ? 0 : 1;
    if (scopeA !== scopeB) return scopeA - scopeB;
    return (qualifierOrder[a.qualifier] ?? 9) - (qualifierOrder[b.qualifier] ?? 9);
  });

  const bigPicture = claims.filter((c) => c.scope === "big_picture");
  const details = claims.filter((c) => c.scope !== "big_picture");

  if (opts.json) {
    console.log(JSON.stringify({
      ...obj.data,
      members: { claims, frames, questions },
    }, null, 2));
  } else {
    const qualifierBar: Record<string, string> = { certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  " };

    console.log(`${obj.data.title}`);
    console.log(`${"━".repeat(Math.min(obj.data.title.length, 60))}\n`);

    if (bigPicture.length) {
      console.log(`Overview`);
      for (const c of bigPicture) {
        const bar = qualifierBar[c.qualifier] || "   ";
        const tag = c.structure_type ? ` [${c.structure_type}]` : "";
        console.log(`  ${bar} ${c.statement}${tag}`);
      }
      console.log();
    }

    if (details.length) {
      const showDetails = opts["full"] === true;
      if (showDetails) {
        console.log(`Details`);
        for (const c of details) {
          const bar = qualifierBar[c.qualifier] || "   ";
          const tag = c.structure_type ? ` [${c.structure_type}]` : "";
          console.log(`  ${bar} ${c.statement}${tag}`);
        }
        console.log();
      } else {
        console.log(`Details: ${details.length} claims (use --full to show)\n`);
      }
    }

    if (frames.length) {
      console.log(`Perspectives`);
      for (const f of frames) {
        console.log(`  ◆ ${f.name}`);
        console.log(`    sees: ${f.sees}`);
        if (f.ignores) console.log(`    ignores: ${f.ignores}`);
      }
      console.log();
    }

    if (questions.length) {
      console.log(`Open Questions`);
      for (const q of questions) {
        console.log(`  ? ${q.text}`);
      }
      console.log();
    }

    console.log(`${claimIds.length} claims · ${frameIds.length} frames · ${questionIds.length} questions`);
  }
}
