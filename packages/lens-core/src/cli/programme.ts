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
    return c ? { id: cid, statement: c.data.statement, qualifier: c.data.qualifier } : null;
  }).filter(Boolean);

  const frames = frameIds.map((fid) => {
    const f = readObject(fid);
    return f ? { id: fid, name: f.data.name, sees: f.data.sees } : null;
  }).filter(Boolean);

  const questions = questionIds.map((qid) => {
    const q = readObject(qid);
    return q ? { id: qid, text: q.data.text, status: q.data.question_status } : null;
  }).filter(Boolean);

  if (opts.json) {
    console.log(JSON.stringify({
      ...obj.data,
      members: { claims, frames, questions },
    }, null, 2));
  } else {
    console.log(`--- Programme: ${id} ---`);
    console.log(`Title: ${obj.data.title}`);
    console.log(`Description: ${obj.data.description || "(none)"}\n`);

    if (claims.length) {
      console.log(`Claims (${claims.length}):`);
      for (const c of claims) {
        console.log(`  [${c!.qualifier}] ${c!.statement}`);
      }
    }

    if (frames.length) {
      console.log(`\nFrames (${frames.length}):`);
      for (const f of frames) {
        console.log(`  ${f!.name} — sees: ${f!.sees}`);
      }
    }

    if (questions.length) {
      console.log(`\nQuestions (${questions.length}):`);
      for (const q of questions) {
        console.log(`  [${q!.status}] ${q!.text}`);
      }
    }
  }
}
