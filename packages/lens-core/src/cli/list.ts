/**
 * lens list <type> [--filters] — Browse objects by type with optional filters.
 *
 * lens list claims --json
 * lens list claims --scope big_picture --json
 * lens list claims --programme pgm_01 --json
 * lens list claims --since 7d --json
 * lens list frames --json
 * lens list questions --json
 * lens list sources --json
 * lens list programmes --json
 */

import { listObjects, readObject, getBacklinks, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { ObjectType } from "../core/types";

const TYPE_MAP: Record<string, ObjectType> = {
  claims: "claim",
  claim: "claim",
  frames: "frame",
  frame: "frame",
  questions: "question",
  question: "question",
  sources: "source",
  source: "source",
  programmes: "programme",
  programme: "programme",
  threads: "thread",
  thread: "thread",
};

export async function listCommand(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const typeName = positional[0];

  if (!typeName || !TYPE_MAP[typeName]) {
    throw new Error(
      `Usage: lens list <type> [--filters]\nTypes: claims, frames, questions, sources, programmes, threads`
    );
  }

  const objType = TYPE_MAP[typeName];
  const ids = listObjects(objType);

  // Read all objects
  let items: Record<string, any>[] = [];
  for (const id of ids) {
    const obj = readObject(id);
    if (!obj) continue;
    items.push({ id, ...obj.data });
  }

  // Apply filters
  const scopeFilter = flags.scope as string | undefined;
  if (scopeFilter) {
    items = items.filter((item) => item.scope === scopeFilter);
  }

  const programmeFilter = flags.programme as string | undefined;
  if (programmeFilter) {
    items = items.filter((item) => item.programmes?.includes(programmeFilter));
  }

  const sinceFilter = flags.since as string | undefined;
  if (sinceFilter) {
    const days = parseDays(sinceFilter);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    items = items.filter((item) => (item.created_at || "") > cutoff);
  }

  // Build summary items (type-specific key fields, not full objects)
  const summaries = items.map((item) => summarize(item, objType));

  if (opts.json) {
    console.log(JSON.stringify({
      type: typeName,
      count: summaries.length,
      filters: { scope: scopeFilter, programme: programmeFilter, since: sinceFilter },
      items: summaries,
    }, null, 2));
  } else {
    if (summaries.length === 0) {
      console.log(`No ${typeName} found.`);
      return;
    }

    console.log(`${summaries.length} ${typeName}:\n`);

    const qualifierBar: Record<string, string> = {
      certain: "■■■", likely: "■■ ", presumably: "■  ", tentative: "·  ",
    };

    for (const s of summaries) {
      switch (objType) {
        case "claim": {
          const bar = qualifierBar[s.qualifier] || "   ";
          const tag = s.structure_type ? ` [${s.structure_type}]` : "";
          const scope = s.scope === "big_picture" ? " ★" : "";
          console.log(`  ${bar} ${s.statement}${tag}${scope}`);
          break;
        }
        case "frame":
          console.log(`  ◆ ${s.name}`);
          console.log(`    sees: ${s.sees}`);
          break;
        case "question":
          console.log(`  ? ${s.text}`);
          break;
        case "source":
          console.log(`  📄 ${s.title} (${s.word_count} words, ${s.source_type})`);
          break;
        case "programme": {
          const members = getBacklinks(s.id).filter((l) => l.rel === "programme");
          console.log(`  ${s.title} — ${members.length} members`);
          break;
        }
        case "thread":
          console.log(`  💬 ${s.title}`);
          break;
      }
    }
  }
}

/** Extract type-specific summary fields (not the full object) */
function summarize(item: Record<string, any>, type: ObjectType): Record<string, any> {
  const base = { id: item.id };
  switch (type) {
    case "claim":
      return {
        ...base, statement: item.statement, qualifier: item.qualifier,
        scope: item.scope || "detail", structure_type: item.structure_type,
        programmes: item.programmes,
      };
    case "frame":
      return {
        ...base, name: item.name, sees: item.sees, ignores: item.ignores,
        programmes: item.programmes,
      };
    case "question":
      return {
        ...base, text: item.text, status: item.question_status,
        programmes: item.programmes,
      };
    case "source":
      return {
        ...base, title: item.title, source_type: item.source_type,
        word_count: item.word_count, url: item.url,
      };
    case "programme":
      return { ...base, title: item.title, description: item.description };
    case "thread":
      return { ...base, title: item.title, references: item.references };
    default:
      return base;
  }
}

function parseDays(s: string): number {
  const match = s.match(/^(\d+)([dhwmy]?)$/);
  if (!match) return 1;
  const n = parseInt(match[1]);
  const unit = match[2] || "d";
  switch (unit) {
    case "h": return n / 24;
    case "d": return n;
    case "w": return n * 7;
    case "m": return n * 30;
    case "y": return n * 365;
    default: return n;
  }
}
