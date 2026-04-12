/**
 * Storage layer.
 *
 * Two concerns:
 * 1. Markdown files (source of truth) — read/write objects as .md with YAML frontmatter
 * 2. SQLite cache (derived) — FTS5 full-text search, rebuildable from files
 *
 * 3 types: Source, Note, Thread
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync } from "fs";
import { dirname } from "path";
import matter from "gray-matter";
import { paths, objectPath } from "./paths";
import type { LensObject, ObjectType, Note } from "./types";

// ============================================================
// Initialization check
// ============================================================

export function ensureInitialized() {
  if (!existsSync(paths.config)) {
    throw new Error("lens is not initialized. Run: lens init");
  }
}

// ============================================================
// File Operations (Source of Truth)
// ============================================================

export function writeObject(obj: LensObject, body: string = ""): string {
  const filePath = objectPath(obj.id);
  mkdirSync(dirname(filePath), { recursive: true });

  const clean = JSON.parse(JSON.stringify(obj));
  const content = matter.stringify(body, clean);

  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, filePath);

  return filePath;
}

export function saveObject(obj: LensObject, body: string = ""): string {
  const filePath = writeObject(obj, body);
  indexObject(obj, body);
  return filePath;
}

export function readObject(id: string): { data: Record<string, any>; content: string } | null {
  const filePath = objectPath(id);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { data, content };
}

export function listObjects(type: ObjectType): string[] {
  const dirMap: Record<ObjectType, string> = {
    source: paths.sources,
    note: paths.notes,
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

export function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;

  mkdirSync(paths.root, { recursive: true });
  _db = new Database(paths.db);
  _db.exec("PRAGMA journal_mode=WAL");

  initSchema(_db);
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function initSchema(db: InstanceType<typeof Database>) {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      id, type, title, body, tokenize='porter unicode61'
    );

    CREATE TABLE IF NOT EXISTS objects (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      role TEXT,
      data TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

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

export function indexObject(obj: LensObject, body: string = "") {
  const db = getDb();
  const now = new Date().toISOString();
  const data = JSON.stringify(obj);

  const title = getTitle(obj);
  const searchBody = [getSearchableText(obj), body].filter(Boolean).join(" ");
  const role = obj.type === "note" ? (obj as Note).role || null : null;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO objects (id, type, role, data, body, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET type = ?, role = ?, data = ?, body = ?, updated_at = ?
    `).run(obj.id, obj.type, role, data, body, now, obj.type, role, data, body, now);

    db.prepare("DELETE FROM search_index WHERE id = ?").run(obj.id);
    db.prepare("INSERT INTO search_index (id, type, title, body) VALUES (?, ?, ?, ?)").run(
      obj.id, obj.type, title, searchBody
    );

    db.prepare("DELETE FROM links WHERE from_id = ?").run(obj.id);
    const insertLink = db.prepare("INSERT OR IGNORE INTO links (from_id, to_id, rel) VALUES (?, ?, ?)");
    for (const { to, rel } of extractLinks(obj)) {
      insertLink.run(obj.id, to, rel);
    }
  })();
}

/** Detect if a string contains CJK characters */
function hasCJK(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text);
}

export function searchIndex(query: string): { id: string; type: string; title: string; snippet: string }[] {
  const db = getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];

  // CJK queries: use LIKE on the objects table (FTS5 unicode61 can't tokenize CJK)
  if (hasCJK(trimmed)) {
    return searchCJK(db, trimmed);
  }

  // Latin queries: use FTS5 with porter stemming
  const escaped = trimmed
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word}"`)
    .join(" ");

  if (!escaped) return [];

  try {
    return db
      .prepare(`
        SELECT id, type, title, snippet(search_index, 3, '**', '**', '...', 30) as snippet
        FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT 20
      `)
      .all(escaped) as any[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fts5") || msg.includes("syntax") || msg.includes("MATCH")) return [];
    throw err;
  }
}

/** CJK search via LIKE on the objects table */
function searchCJK(db: any, query: string): { id: string; type: string; title: string; snippet: string }[] {
  // Split CJK query into individual search terms (by spaces or punctuation)
  const terms = query.split(/[\s，。？！、；：""'']+/).filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  // Search body and data for each term, score by number of terms matched
  const results = new Map<string, { id: string; type: string; title: string; snippet: string; score: number }>();

  for (const term of terms) {
    const escaped = term.replace(/[%_]/g, "\\$&");
    const pattern = `%${escaped}%`;
    const rows = db
      .prepare(`SELECT id, type, data, body FROM objects WHERE body LIKE ? ESCAPE '\\' OR data LIKE ? ESCAPE '\\' LIMIT 50`)
      .all(pattern, pattern) as any[];

    for (const row of rows) {
      if (results.has(row.id)) {
        results.get(row.id)!.score++;
      } else {
        const data = JSON.parse(row.data);
        const title = data.text || data.title || "";
        const bodyStr = row.body || "";
        // Extract snippet around the match
        const idx = bodyStr.indexOf(term);
        const start = Math.max(0, idx - 30);
        const end = Math.min(bodyStr.length, idx + term.length + 50);
        const snippet = idx >= 0 ? `...${bodyStr.substring(start, end)}...` : title.substring(0, 80);

        results.set(row.id, { id: row.id, type: row.type, title: title.substring(0, 100), snippet, score: 1 });
      }
    }
  }

  // Sort by score (more terms matched = higher rank), limit 20
  return [...results.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ score, ...rest }) => rest);
}

export function getObjectFromCache(id: string): { obj: LensObject; body: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT data, body FROM objects WHERE id = ?").get(id) as any;
  if (!row) return null;
  return { obj: JSON.parse(row.data), body: row.body || "" };
}

export function rebuildAllIndex() {
  const db = getDb();
  let count = 0;

  db.transaction(() => {
    db.exec("DELETE FROM search_index");
    db.exec("DELETE FROM objects");
    db.exec("DELETE FROM links");

    for (const type of ["source", "note", "thread"] as ObjectType[]) {
      const ids = listObjects(type);
      for (const id of ids) {
        const result = readObject(id);
        if (result) {
          const obj = { ...result.data, id, type } as LensObject;
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
    case "source": return obj.title;
    case "note": return obj.text;
    case "thread": return obj.title;
    default: return "";
  }
}

function getSearchableText(obj: LensObject): string {
  switch (obj.type) {
    case "note": {
      const n = obj as Note;
      const parts = [n.text];
      if (n.evidence) parts.push(...n.evidence.map((e) => e.text));
      if (n.sees) parts.push(n.sees);
      if (n.ignores) parts.push(n.ignores);
      if (n.assumptions) parts.push(...n.assumptions);
      return parts.join(" ");
    }
    case "source": return obj.title;
    case "thread": return obj.title;
    default: return "";
  }
}

function extractLinks(obj: LensObject): { to: string; rel: string }[] {
  const links: { to: string; rel: string }[] = [];

  if (obj.type === "note") {
    const n = obj as Note;

    // Provenance
    if (n.source) links.push({ to: n.source, rel: "source" });

    // Evidence sources
    if (n.evidence) {
      for (const e of n.evidence) {
        if (e.source) links.push({ to: e.source, rel: "evidence" });
      }
    }

    // Typed links
    for (const id of n.supports || []) links.push({ to: id, rel: "supports" });
    for (const id of n.contradicts || []) links.push({ to: id, rel: "contradicts" });
    for (const id of n.refines || []) links.push({ to: id, rel: "refines" });

    // Bridge
    for (const id of n.bridges || []) links.push({ to: id, rel: "bridges" });

    // Structure note entries
    for (const id of n.entries || []) links.push({ to: id, rel: "entries" });

    // Related
    if (n.related) {
      for (const r of n.related) links.push({ to: r.id, rel: "related" });
    }
  }

  if (obj.type === "thread") {
    for (const id of obj.references) links.push({ to: id, rel: "discusses" });
    if (obj.started_from) links.push({ to: obj.started_from, rel: "started_from" });
  }

  return links;
}

export function getBacklinks(id: string): { from_id: string; rel: string }[] {
  const db = getDb();
  return db.prepare("SELECT from_id, rel FROM links WHERE to_id = ? ORDER BY rel").all(id) as any[];
}

export function getForwardLinks(id: string): { to_id: string; rel: string }[] {
  const db = getDb();
  return db.prepare("SELECT to_id, rel FROM links WHERE from_id = ? ORDER BY rel").all(id) as any[];
}
