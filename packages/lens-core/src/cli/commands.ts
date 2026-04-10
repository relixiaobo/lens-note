/**
 * CLI command registry.
 *
 * Each command is a function: (args: string[], opts: CommandOptions) => Promise<void>
 */

export interface CommandOptions {
  json: boolean;
  [key: string]: string | boolean | undefined;
}

type CommandHandler = (args: string[], opts: CommandOptions) => Promise<void>;

/** Parse CLI arguments into positional args and flags */
export function parseCliArgs(rawArgs: string[]): { positional: string[]; flags: CommandOptions } {
  const positional: string[] = [];
  const flags: CommandOptions = { json: false };

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--json") {
      flags.json = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++; // skip next arg (it's the value)
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

// ============================================================
// Command Handlers
// ============================================================

async function initCommand(args: string[], opts: CommandOptions) {
  const { initLens } = await import("./init");
  await initLens(opts);
}

async function statusCommand(args: string[], opts: CommandOptions) {
  const { showStatus } = await import("./status");
  await showStatus(opts);
}

async function noteCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const text = positional.join(" ");
  if (!text) {
    throw new Error('Usage: lens note "<text>"');
  }
  const { createNote } = await import("./note");
  await createNote(text, opts);
}

async function listCommand(args: string[], opts: CommandOptions) {
  const { listCommand: listCmd } = await import("./list");
  await listCmd(args, opts);
}

async function linksCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const id = positional[0];
  if (!id) throw new Error("Usage: lens links <id>");
  const { showLinks } = await import("./links");
  await showLinks(id, opts);
}

async function showCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const id = positional[0];
  if (!id) {
    throw new Error("Usage: lens show <id>");
  }
  const { showObject } = await import("./show");
  await showObject(id, opts);
}

async function searchCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const query = positional.join(" ");
  if (!query) {
    throw new Error('Usage: lens search "<query>"');
  }
  const { searchObjects } = await import("./search");
  await searchObjects(query, opts);
}

async function ingestCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const target = positional[0];
  if (!target) {
    throw new Error("Usage: lens ingest <url|file>");
  }
  const { ingestSource } = await import("./ingest");
  await ingestSource(target, opts);
}

async function contextCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const query = positional.join(" ");
  if (!query) {
    throw new Error('Usage: lens context "<query>"');
  }
  const { assembleContext } = await import("./context");
  await assembleContext(query, { ...opts, json: true });
}

async function programmeCommand(args: string[], opts: CommandOptions) {
  const sub = args[0];
  const { handleProgramme } = await import("./programme");
  await handleProgramme(sub, args.slice(1), opts);
}

async function digestCommand(args: string[], opts: CommandOptions) {
  const { showDigest } = await import("./digest");
  await showDigest(args, opts);
}

async function feedCommand(args: string[], opts: CommandOptions) {
  const sub = args[0];
  const { handleFeed } = await import("./feed");
  await handleFeed(sub, args.slice(1), opts);
}

async function rebuildIndexCommand(args: string[], opts: CommandOptions) {
  const { rebuildIndex } = await import("./rebuild-index");
  await rebuildIndex(opts);
}

export const commands: Record<string, CommandHandler> = {
  init: initCommand,
  status: statusCommand,
  note: noteCommand,
  show: showCommand,
  search: searchCommand,
  ingest: ingestCommand,
  context: contextCommand,
  programme: programmeCommand,
  list: listCommand,
  links: linksCommand,
  digest: digestCommand,
  feed: feedCommand,
  "rebuild-index": rebuildIndexCommand,
};

