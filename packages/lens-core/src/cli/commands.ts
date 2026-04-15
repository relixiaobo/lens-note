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

async function statusCommand(_args: string[], opts: CommandOptions) {
  const { respondDeprecation } = await import("./response");
  if (opts.json) {
    respondDeprecation("status", "lint --summary", "Use: lens lint --summary --json");
  } else {
    console.error("Error: status is deprecated. Use: lens lint --summary --json");
    process.exitCode = 1;
  }
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
  if (positional.length === 0) {
    throw new Error("Usage: lens show <id> [id2] [id3]");
  }
  if (positional.length === 1) {
    const { showObject } = await import("./show");
    await showObject(positional[0], opts);
  } else {
    const { readObjects } = await import("./show");
    await readObjects(positional, opts);
  }
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

async function contextCommand(_args: string[], opts: CommandOptions) {
  const { respondDeprecation } = await import("./response");
  if (opts.json) {
    respondDeprecation("context", "search --expand", 'Use: lens search "<query>" --expand --json');
  } else {
    console.error('Error: context is deprecated. Use: lens search "<query>" --expand --json');
    process.exitCode = 1;
  }
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



async function writeCommand(args: string[], opts: CommandOptions) {
  const { handleWrite } = await import("./write");
  await handleWrite(args, opts);
}

async function fetchCommand(args: string[], opts: CommandOptions) {
  const { positional, flags } = parseCliArgs(args);
  const url = positional[0];
  if (!url) throw new Error("Usage: lens fetch <url> [--save] [--json]");
  const { fetchUrl } = await import("./fetch");
  await fetchUrl(url, { ...opts, ...flags });
}

async function rebuildIndexCommand(args: string[], opts: CommandOptions) {
  const { rebuildIndex } = await import("./rebuild-index");
  await rebuildIndex(opts);
}

async function tasksCommand(_args: string[], opts: CommandOptions) {
  const { respondDeprecation } = await import("./response");
  if (opts.json) {
    respondDeprecation("tasks", "list tasks", "Use: lens list tasks --status open --json");
  } else {
    console.error("Error: tasks is deprecated. Use: lens list tasks --status open --json");
    process.exitCode = 1;
  }
}

async function similarCommand(args: string[], opts: CommandOptions) {
  const { positional } = parseCliArgs(args);
  const id = positional[0];
  if (!id && !opts.all) throw new Error("Usage: lens similar <id> [--threshold 0.3]  or  lens similar --all");
  const { showSimilar } = await import("./similar");
  await showSimilar(id, opts);
}

async function indexCommand(args: string[], opts: CommandOptions) {
  const sub = args[0];
  const { handleIndex } = await import("./index-cmd");
  await handleIndex(sub, args.slice(1), opts);
}

async function lintCommand(args: string[], opts: CommandOptions) {
  const { runLint } = await import("./lint");
  await runLint(args, opts);
}

async function configCommand(args: string[], opts: CommandOptions) {
  const { handleConfig } = await import("./config");
  await handleConfig(args, opts);
}

export const commands: Record<string, CommandHandler> = {
  init: initCommand,
  status: statusCommand,
  note: noteCommand,
  show: showCommand,
  search: searchCommand,
  ingest: ingestCommand,
  context: contextCommand,
  list: listCommand,
  links: linksCommand,
  digest: digestCommand,
  feed: feedCommand,
  write: writeCommand,
  fetch: fetchCommand,
  tasks: tasksCommand,
  similar: similarCommand,
  index: indexCommand,
  lint: lintCommand,
  config: configCommand,
  "rebuild-index": rebuildIndexCommand,
};

// ============================================================
// Structured dispatch (--stdin mode, future MCP)
// ============================================================

/**
 * Request envelope for structured agent input.
 * Content goes through JSON, never through the shell.
 */
export interface RequestEnvelope {
  command: string;
  positional?: string[];
  flags?: Record<string, string | number | boolean>;
  input?: unknown;
}

/**
 * Convert RequestEnvelope to argv for commands that still use string[] handlers.
 */
function toArgv(req: RequestEnvelope): string[] {
  const argv: string[] = [...(req.positional || [])];
  if (req.flags) {
    for (const [key, value] of Object.entries(req.flags)) {
      if (key === "json") continue; // handled separately
      if (value === true) {
        argv.push(`--${key}`);
      } else if (typeof value === "string" || typeof value === "number") {
        argv.push(`--${key}`, String(value));
      }
    }
  }
  return argv;
}

/**
 * Dispatch a structured request to the appropriate handler.
 * Used by --stdin mode. Designed to be shared with a future MCP server.
 */
export async function dispatchRequest(req: RequestEnvelope): Promise<void> {
  // Validate envelope shape
  if (req.positional !== undefined && !Array.isArray(req.positional)) {
    throw new Error('"positional" must be a string array');
  }
  if (req.positional && !req.positional.every((p: unknown) => typeof p === "string")) {
    throw new Error('"positional" must be a string array');
  }

  // Force json:true — stdin mode is always structured output
  const opts: CommandOptions = { ...(req.flags || {}), json: true };

  switch (req.command) {
    case "search": {
      const query = (req.positional || []).join(" ");
      if (!query) throw new Error('search: "positional" with query text is required');
      const { searchObjects } = await import("./search");
      return searchObjects(query, opts);
    }
    case "show": {
      const ids = req.positional || [];
      if (ids.length === 0) throw new Error('show: "positional" with object ID(s) is required');
      if (ids.length === 1) {
        const { showObject } = await import("./show");
        return showObject(ids[0], opts);
      }
      const { readObjects } = await import("./show");
      return readObjects(ids, opts);
    }
    case "status": {
      const { respondDeprecation } = await import("./response");
      respondDeprecation("status", "lint --summary", 'Use: {"command":"lint","flags":{"summary":true}}');
      return;
    }
    case "write": {
      const { handleWriteInput } = await import("./write");
      return handleWriteInput(req.input, opts);
    }
    case "tasks": {
      const { respondDeprecation } = await import("./response");
      respondDeprecation("tasks", "list tasks", 'Use: {"command":"list","positional":["tasks"],"flags":{"status":"open"}}');
      return;
    }
    case "note": {
      const title = (req.positional || []).join(" ");
      if (!title) throw new Error('note: "positional" with title text is required');
      const { createNote } = await import("./note");
      return createNote(title, opts);
    }
    case "fetch": {
      const url = req.positional?.[0];
      if (!url) throw new Error('fetch: "positional" with URL is required');
      const { fetchUrl } = await import("./fetch");
      return fetchUrl(url, opts); // opts already includes flags like save:true
    }
    case "links": {
      const id = req.positional?.[0];
      if (!id) throw new Error('links: "positional" with object ID is required');
      const { showLinks } = await import("./links");
      return showLinks(id, opts);
    }
    case "similar": {
      const id = req.positional?.[0];
      if (!id && !opts.all) throw new Error('similar: "positional" with object ID is required, or use "flags": {"all": true}');
      const { showSimilar } = await import("./similar");
      return showSimilar(id, opts);
    }
    case "context": {
      const { respondDeprecation } = await import("./response");
      respondDeprecation("context", "search --expand", 'Use: {"command":"search","positional":["<query>"],"flags":{"expand":true}}');
      return;
    }
    case "lint": {
      const { runLint } = await import("./lint");
      return runLint(toArgv(req), opts);
    }
    case "config": {
      const { handleConfigInput } = await import("./config");
      return handleConfigInput(req.input, opts);
    }
    default: {
      // Compatibility path: reconstruct argv for remaining commands
      const handler = commands[req.command];
      if (!handler) {
        const available = Object.keys(commands).join(", ");
        throw new Error(`Unknown command: "${req.command}". Available: ${available}`);
      }
      return handler(toArgv(req), opts);
    }
  }
}
