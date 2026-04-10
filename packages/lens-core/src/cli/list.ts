/**
 * lens list <type> [--filters] — Browse objects by type with optional filters.
 *
 * lens list notes --json
 * lens list notes --role claim --json
 * lens list notes --scope big_picture --json
 * lens list notes --since 7d --json
 * lens list sources --json
 * lens list threads --json
 */

import { listObjects, readObject, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";
import type { ObjectType } from "../core/types";

const TYPE_MAP: Record<string, ObjectType> = {
  notes: "note",
  note: "note",
  sources: "source",
  source: "source",
  threads: "thread",
  thread: "thread",
};

export async function listCommand(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { positional, flags } = parseCliArgs(args);
  const typeName = positional[0];

  if (!typeName || !TYPE_MAP[typeName]) {
    throw new Error(
      `Usage: lens list <type> [--filters]\nTypes: notes, sources, threads\n\nFilters for notes:\n  --role <role>     Filter by role (claim, frame, question, observation, connection, structure_note)\n  --scope <scope>   Filter by scope (big_picture, detail)\n  --since <period>  Filter by age (e.g. 7d, 2w, 1m)`
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

  // Apply filters (derive effective role from fields if role hint is missing)
  const roleFilter = flags.role as string | undefined;
  if (roleFilter) {
    items = items.filter((item) => {
      const effectiveRole = item.role || inferRoleFromFields(item);
      return effectiveRole === roleFilter;
    });
  }

  const scopeFilter = flags.scope as string | undefined;
  if (scopeFilter) {
    items = items.filter((item) => item.scope === scopeFilter);
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
      filters: { role: roleFilter, scope: scopeFilter, since: sinceFilter },
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
        case "note": {
          const role = s.role || "observation";
          switch (role) {
            case "claim": {
              const bar = qualifierBar[s.qualifier] || "   ";
              const scope = s.scope === "big_picture" ? " *" : "";
              console.log(`  ${bar} ${s.text}${scope}`);
              break;
            }
            case "frame":
              console.log(`  [frame] ${s.text}`);
              if (s.sees) console.log(`    sees: ${s.sees}`);
              if (s.ignores) console.log(`    ignores: ${s.ignores}`);
              break;
            case "question":
              console.log(`  ? ${s.text} [${s.question_status || "open"}]`);
              break;
            case "connection":
              console.log(`  <-> ${s.text}`);
              break;
            case "structure_note":
              console.log(`  # ${s.text}`);
              break;
            default:
              console.log(`  - ${s.text}`);
              break;
          }
          break;
        }
        case "source":
          console.log(`  ${s.title} (${s.word_count} words, ${s.source_type})`);
          break;
        case "thread":
          console.log(`  ${s.title}`);
          break;
      }
    }
  }
}

/** Extract type-specific summary fields (not the full object) */
function summarize(item: Record<string, any>, type: ObjectType): Record<string, any> {
  const base = { id: item.id };
  switch (type) {
    case "note":
      return {
        ...base,
        text: item.text,
        role: item.role,
        qualifier: item.qualifier,
        scope: item.scope,
        sees: item.sees,
        ignores: item.ignores,
        question_status: item.question_status,
      };
    case "source":
      return {
        ...base, title: item.title, source_type: item.source_type,
        word_count: item.word_count, url: item.url,
      };
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

/** Derive role from which optional fields are present (fallback when role hint is missing) */
function inferRoleFromFields(item: Record<string, any>): string {
  if (item.evidence?.length) return "claim";
  if (item.sees || item.ignores) return "frame";
  if (item.question_status) return "question";
  if (item.bridges?.length) return "connection";
  if (item.entries?.length) return "structure_note";
  return "observation";
}
