/**
 * lens index — Sparse keyword index (Schlagwortregister).
 *
 * A handful of curated entry points into the knowledge graph.
 * Each keyword maps to 1-3 note IDs — the best starting points
 * for exploring a topic by following links.
 *
 * lens index                          List all keywords
 * lens index "<keyword>"              Show entries for a keyword
 * lens index add "<keyword>" <id>     Register entry point (max 3)
 * lens index remove "<keyword>" [id]  Remove keyword or single entry
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { paths } from "../core/paths";
import { readObject, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";

// ============================================================
// Storage
// ============================================================

interface KeywordIndexFile {
  version: 1;
  keywords: Record<string, string[]>;
}

const MAX_ENTRIES_PER_KEYWORD = 3;
const RESERVED_KEYWORDS = new Set(["add", "remove"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function validateKeyword(keyword: string): string {
  keyword = keyword.trim();
  if (!keyword) throw new Error("Keyword cannot be empty");
  if (RESERVED_KEYWORDS.has(keyword)) throw new Error(`"${keyword}" is a reserved subcommand and cannot be used as a keyword`);
  if (DANGEROUS_KEYS.has(keyword)) throw new Error(`"${keyword}" cannot be used as a keyword`);
  if (/[\x00-\x1f]/.test(keyword)) throw new Error("Keyword cannot contain control characters");
  return keyword;
}

function load(): KeywordIndexFile {
  if (!existsSync(paths.keywordIndex)) return { version: 1, keywords: {} };
  try {
    const raw = readFileSync(paths.keywordIndex, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.keywords !== "object") {
      throw new Error("invalid structure");
    }
    return parsed as KeywordIndexFile;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to load ${paths.keywordIndex}: ${detail}. Delete or fix the file manually.`);
  }
}

function save(index: KeywordIndexFile): void {
  writeFileSync(paths.keywordIndex, JSON.stringify(index, null, 2), "utf-8");
}

const _gitEnv = { GIT_AUTHOR_NAME: "lens", GIT_AUTHOR_EMAIL: "lens@local", GIT_COMMITTER_NAME: "lens", GIT_COMMITTER_EMAIL: "lens@local" };

function gitCommitIndex(message: string): void {
  try {
    execFileSync("git", ["-C", paths.root, "add", paths.keywordIndex], { stdio: "ignore" });
    execFileSync("git", ["-C", paths.root, "commit", "-m", message, "--no-gpg-sign"], {
      stdio: "ignore",
      env: { ...process.env, ..._gitEnv },
    });
  } catch {
    // Git not initialized or nothing to commit
  }
}

// ============================================================
// Title resolution
// ============================================================

function resolveTitle(id: string): string {
  const obj = readObject(id);
  if (!obj) return "(deleted)";
  return (obj.data as any).title || "(untitled)";
}

// ============================================================
// Subcommand handlers
// ============================================================

function indexList(opts: CommandOptions): void {
  const { keywords } = load();
  const keys = Object.keys(keywords);

  if (opts.json) {
    const enriched: Record<string, { id: string; title: string }[]> = {};
    for (const kw of keys) {
      enriched[kw] = keywords[kw].map(id => ({ id, title: resolveTitle(id) }));
    }
    console.log(JSON.stringify({ count: keys.length, keywords: enriched }, null, 2));
  } else {
    if (keys.length === 0) {
      console.log("No keyword entries. Use: lens index add \"<keyword>\" <note_id>");
      return;
    }
    console.log(`${keys.length} keyword(s):\n`);
    for (const kw of keys) {
      console.log(`  ${kw}`);
      for (const id of keywords[kw]) {
        const title = resolveTitle(id);
        console.log(`    → ${id}  ${title}`);
      }
    }
  }
}

function indexShow(keyword: string, opts: CommandOptions): void {
  keyword = keyword.trim();
  const { keywords } = load();
  const entries = keywords[keyword];

  const enriched = (entries || []).map(id => ({ id, title: resolveTitle(id) }));

  if (opts.json) {
    console.log(JSON.stringify({ keyword, entries: enriched }, null, 2));
  } else {
    if (enriched.length === 0) {
      console.log(`No entries for "${keyword}". Use: lens index add "${keyword}" <note_id>`);
      return;
    }
    console.log(`${keyword}:`);
    for (const e of enriched) {
      console.log(`  → ${e.id}  ${e.title}`);
    }
  }
}

function indexAdd(keyword: string | undefined, noteId: string | undefined, opts: CommandOptions): void {
  if (!keyword || !noteId) throw new Error('Usage: lens index add "<keyword>" <note_id>');

  keyword = validateKeyword(keyword);

  // Validate note exists and is a note
  if (!noteId.startsWith("note_")) {
    const prefix = noteId.split("_")[0];
    throw new Error(`Only notes can be indexed, got ${prefix}`);
  }
  const obj = readObject(noteId);
  if (!obj) throw new Error(`Object not found: ${noteId}. Use \`lens search\` to find the correct ID.`);
  if (obj.data.type !== "note") throw new Error(`Only notes can be indexed, got ${obj.data.type}`);

  const index = load();
  const entries = index.keywords[keyword] || [];

  // Idempotent check
  if (entries.includes(noteId)) {
    if (opts.json) {
      console.log(JSON.stringify({ action: "already_exists", keyword, id: noteId }));
    } else {
      console.log(`Already registered: "${noteId}" under "${keyword}"`);
    }
    return;
  }

  // Cap check
  if (entries.length >= MAX_ENTRIES_PER_KEYWORD) {
    throw new Error(`Keyword "${keyword}" already has ${MAX_ENTRIES_PER_KEYWORD} entries (max). Remove one first.`);
  }

  entries.push(noteId);
  index.keywords[keyword] = entries;
  save(index);
  gitCommitIndex(`lens: index add "${keyword}" ${noteId}`);

  const title = (obj.data as any).title || "(untitled)";
  if (opts.json) {
    console.log(JSON.stringify({ action: "added", keyword, id: noteId, title, entry_count: entries.length }));
  } else {
    console.log(`Added "${noteId}" to keyword "${keyword}" (${entries.length}/${MAX_ENTRIES_PER_KEYWORD} entries)`);
  }
}

function indexRemove(keyword: string | undefined, noteId: string | undefined, opts: CommandOptions): void {
  if (!keyword) throw new Error('Usage: lens index remove "<keyword>" [note_id]');

  keyword = keyword.trim();
  const index = load();
  const entries = index.keywords[keyword];
  if (!entries) throw new Error(`Keyword not found: "${keyword}". Use \`lens index\` to list all keywords.`);

  if (noteId) {
    // Remove single entry
    const idx = entries.indexOf(noteId);
    if (idx === -1) throw new Error(`Note "${noteId}" not found under keyword "${keyword}". Use \`lens index "${keyword}"\` to see entries.`);

    entries.splice(idx, 1);
    if (entries.length === 0) {
      delete index.keywords[keyword];
    } else {
      index.keywords[keyword] = entries;
    }
    save(index);
    gitCommitIndex(`lens: index remove "${keyword}" ${noteId}`);

    if (opts.json) {
      console.log(JSON.stringify({ action: "removed_entry", keyword, id: noteId }));
    } else {
      console.log(`Removed "${noteId}" from keyword "${keyword}"`);
    }
  } else {
    // Remove entire keyword
    const removed = [...entries];
    delete index.keywords[keyword];
    save(index);
    gitCommitIndex(`lens: index remove "${keyword}"`);

    if (opts.json) {
      console.log(JSON.stringify({ action: "removed", keyword, removed_entries: removed }));
    } else {
      console.log(`Removed keyword "${keyword}" (was ${removed.length} entry/entries)`);
    }
  }
}

// ============================================================
// Main entry point
// ============================================================

export async function handleIndex(sub: string, args: string[], opts: CommandOptions) {
  ensureInitialized();

  const allArgs = sub ? [sub, ...args] : args;
  const { positional, flags } = parseCliArgs(allArgs);
  const mergedOpts: CommandOptions = { ...flags, json: opts.json || flags.json };
  const subcommand = positional[0];

  switch (subcommand) {
    case undefined:
      return indexList(mergedOpts);
    case "add":
      if (positional.length > 3) throw new Error('Usage: lens index add "<keyword>" <note_id>');
      return indexAdd(positional[1], positional[2], mergedOpts);
    case "remove":
      if (positional.length > 3) throw new Error('Usage: lens index remove "<keyword>" [note_id]');
      return indexRemove(positional[1], positional[2], mergedOpts);
    default:
      if (positional.length === 1) return indexShow(subcommand, mergedOpts);
      throw new Error('Usage: lens index [add|remove] or lens index "<keyword>"');
  }
}
