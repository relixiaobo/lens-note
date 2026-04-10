/**
 * Storage layer.
 *
 * Two concerns:
 * 1. Markdown files (source of truth) — read/write objects as .md with YAML frontmatter
 * 2. SQLite cache (derived) — FTS5 full-text search, rebuildable from files
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, statSync } from "fs";
import { dirname, join } from "path";
import matter from "gray-matter";
import { paths, objectDirs, objectPath } from "./paths";
import type { LensObject, ObjectType } from "./types";

// ============================================================
// Initialization check
// ============================================================

/** Ensure lens is initialized. Throws if not. */
export function ensureInitialized() {
  if (!existsSync(paths.config)) {
    throw new Error("lens is not initialized. Run: lens init");
  }
}

// ============================================================
// File Operations (Source of Truth)
// ============================================================

/**
 * Write a lens object to its markdown file.
 * Uses atomic write (write to unique temp file, then rename) to prevent corruption.
 */
export function writeObject(obj: LensObject, body: string = ""): string {
  const filePath = objectPath(obj.id);
  mkdirSync(dirname(filePath), { recursive: true });

  // Strip undefined values (gray-matter/YAML can't serialize undefined)
  const clean = JSON.parse(JSON.stringify(obj));
  const content = matter.stringify(body, clean);

  // Atomic write: unique temp file per write, then rename
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, filePath);

  return filePath;
}

/**
 * Write a lens object AND update the SQLite cache atomically.
 * This is the primary write API — use this instead of calling writeObject + indexObject separately.
 */
export function saveObject(obj: LensObject, body: string = ""): string {
  const filePath = writeObject(obj, body);
  indexObject(obj, body);
  return filePath;
}

/** Read a lens object from its markdown file */
export function readObject(id: string): { data: Record<string, any>; content: string } | null {
  const filePath = objectPath(id);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { data, content };
}

/** List all object IDs in a directory */
export function listObjects(type: ObjectType): string[] {
  const dirMap: Record<ObjectType, string> = {
    source: paths.sources,
    claim: paths.claims,
    frame: paths.frames,
    question: paths.questions,
    programme: paths.programmes,
    thread: paths.threads,
  };
  const dir = dirMap[type];
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""));
}

// ============================================================
// SQLite Cache (Derived, Rebuildable)
// ============================================================

let _db: InstanceType<typeof Database> | null = null;

/** Get or create the SQLite cache database */
export function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;

  mkdirSync(paths.root, { recursive: true });
  _db = new Database(paths.db);
  _db.exec("PRAGMA journal_mode=WAL");

  initSchema(_db);
  return _db;
}

/** Close the database connection */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function initSchema(db: InstanceType<typeof Database>) {
  db.exec(`
    -- FTS5 full-text search across all objects
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      id,
      type,
      title,
      body,
      tokenize='porter unicode61'
    );

    -- Object metadata for fast lookups
    CREATE TABLE IF NOT EXISTS objects (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    -- Universal relationship index (built from typed frontmatter fields)
    CREATE TABLE IF NOT EXISTS links (
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      rel TEXT NOT NULL,
      PRIMARY KEY (from_id, to_id, rel)
    );
    CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_id, rel);
    CREATE INDEX IF NOT EXISTS idx_links_rel ON links(rel);
  `);
}

/**
 * Index a lens object into the SQLite cache.
 * Includes both frontmatter data and markdown body content.
 */
export function indexObject(obj: LensObject, body: string = "") {
  const db = getDb();
  const now = new Date().toISOString();
  const data = JSON.stringify(obj);

  const title = getTitle(obj);
  const searchBody = [getSearchableText(obj), body].filter(Boolean).join(" ");

  // Wrap all cache updates in a transaction
  db.transaction(() => {
    // Upsert into objects table
    db.prepare(`
      INSERT INTO objects (id, type, data, body, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = ?, body = ?, updated_at = ?
    `).run(obj.id, obj.type, data, body, now, data, body, now);

    // Update FTS index
    db.prepare("DELETE FROM search_index WHERE id = ?").run(obj.id);
    db.prepare("INSERT INTO search_index (id, type, title, body) VALUES (?, ?, ?, ?)").run(
      obj.id,
      obj.type,
      title,
      searchBody
    );

    // Rebuild links for this object from typed fields
    db.prepare("DELETE FROM links WHERE from_id = ?").run(obj.id);
    const insertLink = db.prepare(
      "INSERT OR IGNORE INTO links (from_id, to_id, rel) VALUES (?, ?, ?)"
    );
    for (const { to, rel } of extractLinks(obj)) {
      insertLink.run(obj.id, to, rel);
    }
  })();
}

/**
 * Search the FTS5 index.
 * Escapes user input to prevent FTS5 syntax errors.
 */
export function searchIndex(query: string): { id: string; type: string; title: string; snippet: string }[] {
  const db = getDb();

  // Escape FTS5 query: wrap each word in double quotes to treat as literal
  const escaped = query
    .replace(/['"]/g, "") // strip quotes
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word}"`)
    .join(" ");

  if (!escaped) return [];

  try {
    return db
      .prepare(`
        SELECT id, type, title, snippet(search_index, 3, '**', '**', '...', 30) as snippet
        FROM search_index
        WHERE search_index MATCH ?
        ORDER BY rank
        LIMIT 20
      `)
      .all(escaped) as any[];
  } catch (err: unknown) {
    // FTS5 syntax errors from user input are expected — return empty
    // DB corruption or missing table errors should propagate
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fts5") || msg.includes("syntax") || msg.includes("MATCH")) {
      return [];
    }
    throw err;
  }
}

/** Get an object from the cache by ID */
export function getObjectFromCache(id: string): { obj: LensObject; body: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT data, body FROM objects WHERE id = ?").get(id) as any;
  if (!row) return null;
  return { obj: JSON.parse(row.data), body: row.body || "" };
}

/**
 * Rebuild the entire SQLite cache from markdown files.
 * Runs inside a transaction so a failure doesn't leave a half-empty cache.
 */
export function rebuildAllIndex() {
  const db = getDb();

  let count = 0;

  db.transaction(() => {
    // Clear everything
    db.exec("DELETE FROM search_index");
    db.exec("DELETE FROM objects");
    db.exec("DELETE FROM links");

    for (const type of ["source", "claim", "frame", "question", "programme", "thread"] as ObjectType[]) {
      const ids = listObjects(type);
      for (const id of ids) {
        const result = readObject(id);
        if (result) {
          const obj = { ...result.data, id, type } as LensObject;
          // Include markdown body content in the index
          indexObject(obj, result.content.trim());
          count++;
        }
      }
    }
  })();

  return count;
}

// ============================================================
// Helpers
// ============================================================

function getTitle(obj: LensObject): string {
  switch (obj.type) {
    case "source":
      return obj.title;
    case "claim":
      return obj.statement;
    case "frame":
      return obj.name;
    case "question":
      return obj.text;
    case "programme":
      return obj.title;
    case "thread":
      return obj.title;
    default:
      return "";
  }
}

function getSearchableText(obj: LensObject): string {
  switch (obj.type) {
    case "claim":
      return [obj.statement, ...(obj.evidence?.map((e) => e.text) || [])].join(" ");
    case "frame":
      return [obj.name, obj.sees, obj.ignores, ...(obj.assumptions || [])].join(" ");
    case "question":
      return [obj.text, obj.current_position || ""].join(" ");
    case "programme":
      return [obj.title, obj.description].join(" ");
    case "source":
      return obj.title;
    case "thread":
      return obj.title;
    default:
      return "";
  }
}

/** Extract all outgoing links from an object's typed fields into a flat list */
function extractLinks(obj: LensObject): { to: string; rel: string }[] {
  const links: { to: string; rel: string }[] = [];

  // Source field (provenance)
  if ("source" in obj && typeof obj.source === "string") {
    links.push({ to: obj.source, rel: "source" });
  }

  // Evidence (Claim → Source)
  if (obj.type === "claim" && obj.evidence) {
    for (const e of obj.evidence) {
      links.push({ to: e.source, rel: "evidence" });
    }
  }

  // Programmes
  if ("programmes" in obj && Array.isArray(obj.programmes)) {
    for (const id of obj.programmes) {
      links.push({ to: id, rel: "programme" });
    }
  }

  // Claim-specific typed relationships
  if (obj.type === "claim") {
    if (obj.warrant_frame) links.push({ to: obj.warrant_frame, rel: "warrant" });
    for (const id of obj.supports || []) links.push({ to: id, rel: "supports" });
    for (const id of obj.contradicts || []) links.push({ to: id, rel: "contradicts" });
    for (const id of obj.refines || []) links.push({ to: id, rel: "refines" });
    for (const id of obj.superseded_by || []) links.push({ to: id, rel: "superseded_by" });
  }

  // Frame-specific
  if (obj.type === "frame") {
    for (const id of obj.contradicts_frames || []) links.push({ to: id, rel: "contradicts" });
    for (const id of obj.refines || []) links.push({ to: id, rel: "refines" });
    for (const id of obj.superseded_by || []) links.push({ to: id, rel: "superseded_by" });
  }

  // Question-specific
  if (obj.type === "question") {
    if (obj.parent_question) links.push({ to: obj.parent_question, rel: "parent" });
    for (const id of obj.candidate_answers || []) links.push({ to: id, rel: "candidate_answer" });
    for (const id of obj.superseded_by || []) links.push({ to: id, rel: "superseded_by" });
  }

  // Programme-specific
  if (obj.type === "programme") {
    if (obj.root_question) links.push({ to: obj.root_question, rel: "root_question" });
  }

  // Thread-specific
  if (obj.type === "thread") {
    for (const id of obj.references) links.push({ to: id, rel: "discusses" });
    if (obj.started_from) links.push({ to: obj.started_from, rel: "started_from" });
  }

  // Related (escape hatch, all types)
  if ("related" in obj && Array.isArray(obj.related)) {
    for (const r of obj.related) {
      links.push({ to: r.id, rel: "related" });
    }
  }

  return links;
}

/** Query reverse links: which objects link TO this id? */
export function getBacklinks(id: string): { from_id: string; rel: string }[] {
  const db = getDb();
  return db
    .prepare("SELECT from_id, rel FROM links WHERE to_id = ? ORDER BY rel")
    .all(id) as any[];
}

/** Query forward links: which objects does this id link TO? */
export function getForwardLinks(id: string): { to_id: string; rel: string }[] {
  const db = getDb();
  return db
    .prepare("SELECT to_id, rel FROM links WHERE from_id = ? ORDER BY rel")
    .all(id) as any[];
}

/** Get all objects linked to a Programme (reverse query) */
export function getProgrammeMembers(programmeId: string): { from_id: string; rel: string }[] {
  return getBacklinks(programmeId).filter((l) => l.rel === "programme");
}
