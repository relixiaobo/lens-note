/**
 * Storage layer.
 *
 * Two concerns:
 * 1. Markdown files (source of truth) — read/write objects as .md with YAML frontmatter
 * 2. SQLite cache (derived) — FTS5 full-text search, rebuildable from files
 *
 * 3 types: Source, Note, Task
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync } from "fs";
import { dirname } from "path";
import matter from "gray-matter";
import { paths, objectPath } from "./paths";
import { execFileSync } from "child_process";
import type { LensObject, ObjectType, Note, Task } from "./types";

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
  gitCommit(filePath, obj);
  return filePath;
}

/** Debounced git commit — stages immediately, commits after a short delay */
let _gitTimer: ReturnType<typeof setTimeout> | null = null;
const _gitEnv = { GIT_AUTHOR_NAME: "lens", GIT_AUTHOR_EMAIL: "lens@local", GIT_COMMITTER_NAME: "lens", GIT_COMMITTER_EMAIL: "lens@local" };

function gitCommit(filePath: string, obj: LensObject): void {
  try {
    const gitDir = paths.root;
    // Stage immediately
    execFileSync("git", ["-C", gitDir, "add", filePath], { stdio: "ignore" });

    // Debounce commit — batch multiple writes into one commit
    if (_gitTimer) clearTimeout(_gitTimer);
    _gitTimer = setTimeout(() => {
      try {
        execFileSync("git", ["-C", gitDir, "commit", "-m", "lens: update knowledge", "--no-gpg-sign"], {
          stdio: "ignore",
          env: { ...process.env, ..._gitEnv },
        });
      } catch {
        // Nothing staged or commit failed
      }
      _gitTimer = null;
    }, 500);
  } catch {
    // Git not initialized — silently continue
  }
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
    task: paths.tasks,
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
  const searchBody = [title, body].filter(Boolean).join(" ");

  db.transaction(() => {
    db.prepare(`
      INSERT INTO objects (id, type, data, body, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET type = ?, data = ?, body = ?, updated_at = ?
    `).run(obj.id, obj.type, data, body, now, obj.type, data, body, now);

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

// Common English stop words — filtered from search queries to reduce noise
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must",
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
  "into", "about", "between", "through", "during", "before", "after",
  "and", "or", "but", "not", "no", "nor", "so", "yet",
  "it", "its", "this", "that", "these", "those", "what", "which", "who",
  "how", "when", "where", "why", "all", "each", "every", "both",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they", "them",
]);

export function searchIndex(query: string): { id: string; type: string; title: string; snippet: string }[] {
  const db = getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];

  // CJK queries: use LIKE on the objects table (FTS5 unicode61 can't tokenize CJK)
  if (hasCJK(trimmed)) {
    return searchCJK(db, trimmed);
  }

  // Latin queries: FTS5 with porter stemming + tiered relevance ranking
  // Column weights: id=0, type=0, title=10, body=1 — title matches rank 10x higher
  const BM25_WEIGHTS = "bm25(search_index, 0.0, 0.0, 10.0, 1.0)";

  const words = trimmed
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w.toLowerCase()));

  if (words.length === 0) return [];

  const runFts = (matchExpr: string): any[] =>
    db.prepare(`
      SELECT id, type, title, snippet(search_index, 3, '**', '**', '...', 30) as snippet
      FROM search_index WHERE search_index MATCH ? ORDER BY ${BM25_WEIGHTS} LIMIT 20
    `).all(matchExpr);

  try {
    if (words.length === 1) {
      return runFts(`"${words[0]}"`);
    }

    // Multi-word: tiered search — phrase → AND → OR, deduplicated
    const seen = new Set<string>();
    const results: any[] = [];
    const addResults = (rows: any[]) => {
      for (const r of rows) {
        if (!seen.has(r.id) && results.length < 20) {
          seen.add(r.id);
          results.push(r);
        }
      }
    };

    // Tier 1: exact phrase match (words adjacent in order) — highest relevance
    try {
      addResults(runFts(`"${words.join(" ")}"`));
    } catch { /* phrase syntax may fail — skip */ }

    // Tier 2: AND match (all words present, any position)
    if (results.length < 20) {
      addResults(runFts(words.map((w) => `"${w}"`).join(" ")));
    }

    // Tier 3: OR fallback (any word matches) — broadest, ranked by BM25
    if (results.length < 5) {
      addResults(runFts(words.map((w) => `"${w}"`).join(" OR ")));
    }

    return results;
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
        const title = data.title || "";
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

    for (const type of ["source", "note", "task"] as ObjectType[]) {
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

  // Remove zombie links: links pointing to deleted objects that remain in YAML frontmatter.
  // This handles notes created before the writeDelete cleanup fix was in place.
  pruneDeadLinks();

  return count;
}

/** Remove links to non-existent objects from YAML frontmatter and SQLite cache. */
function pruneDeadLinks(): void {
  const db = getDb();

  // Load all live IDs once — avoids N×M DB lookups per link reference
  const liveIds = new Set<string>(
    (db.prepare("SELECT id FROM objects").all() as { id: string }[]).map(r => r.id)
  );

  for (const type of ["note", "task"] as ObjectType[]) {
    for (const id of listObjects(type)) {
      const result = readObject(id);
      if (!result) continue;
      const data = { ...result.data };
      let changed = false;

      // Filter dead entries from links[] array
      if (Array.isArray(data.links) && data.links.length > 0) {
        const validLinks = data.links.filter((l: any) => liveIds.has(l.to));
        if (validLinks.length !== data.links.length) {
          data.links = validLinks;
          changed = true;
        }
      }

      // Clear dead source reference
      if (data.source && !liveIds.has(data.source)) {
        delete data.source;
        changed = true;
      }

      if (changed) {
        data.updated_at = new Date().toISOString();
        const obj = { ...data, id, type } as unknown as LensObject;
        saveObject(obj, result.content.trim()); // Fix YAML on disk, update SQLite, commit to git
      }
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function getTitle(obj: LensObject): string {
  return obj.title;
}

function extractLinks(obj: LensObject): { to: string; rel: string }[] {
  const result: { to: string; rel: string }[] = [];

  if (obj.type === "note" || obj.type === "task") {
    const n = obj as Note | Task;
    if (n.links) {
      for (const link of n.links) {
        result.push({ to: link.to, rel: link.rel });
      }
    }
  }

  return result;
}

export function getBacklinks(id: string): { from_id: string; rel: string }[] {
  const db = getDb();
  return db.prepare("SELECT from_id, rel FROM links WHERE to_id = ? ORDER BY rel").all(id) as any[];
}

export function getForwardLinks(id: string): { to_id: string; rel: string }[] {
  const db = getDb();
  return db.prepare("SELECT to_id, rel FROM links WHERE from_id = ? ORDER BY rel").all(id) as any[];
}

export function getOrphanNotes(limit?: number, offset?: number): { id: string; title: string; preview: string }[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT o.id, o.data, o.body FROM objects o
    WHERE o.type = 'note'
      AND o.id NOT IN (SELECT from_id FROM links WHERE rel IN ('supports','contradicts','refines','related','indexes') AND to_id LIKE 'note_%')
      AND o.id NOT IN (SELECT to_id FROM links WHERE rel IN ('supports','contradicts','refines','related','indexes') AND from_id LIKE 'note_%')
    ORDER BY o.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(limit ?? -1, offset ?? 0) as any[];

  return rows.map((r: any) => {
    const data = JSON.parse(r.data);
    return {
      id: r.id,
      title: data.title || "(untitled)",
      preview: (r.body || "").substring(0, 100).trim(),
    };
  });
}

export function findByTitle(title: string): { id: string; type: string; title: string }[] {
  const db = getDb();
  return db.prepare(
    "SELECT id, type, json_extract(data, '$.title') as title FROM objects WHERE LOWER(json_extract(data, '$.title')) = LOWER(?)"
  ).all(title) as any[];
}

/**
 * Resolve an ID-or-title string to a valid object ID.
 *
 * If the input looks like a valid ID (prefix_ULID), returns it directly (after verifying it exists).
 * Otherwise, treats it as a title: tries exact title match, then FTS5 search.
 *
 * Returns: { id } on unique match, { error, candidates? } on failure.
 */
export function resolveIdOrTitle(input: string): { id: string } | { error: string; candidates?: { id: string; title: string }[] } {
  // 1. Valid ID format? Try direct lookup
  if (/^(src|note|task)_[A-Z0-9]{26}$/.test(input)) {
    const obj = getObjectFromCache(input);
    if (obj) return { id: input };
    const prefix = input.split("_")[0];
    return { error: `No ${prefix} with ID ${input}. It may have been deleted. Use 'lens search' to find by title.` };
  }

  // 2. Exact title match (case-insensitive)
  const titleMatches = findByTitle(input);
  if (titleMatches.length === 1) return { id: titleMatches[0].id };
  if (titleMatches.length > 1) {
    return { error: `Multiple objects match title "${input}".`, candidates: titleMatches.map(t => ({ id: t.id, title: t.title })) };
  }

  // 3. FTS5 search fallback
  const ftsResults = searchIndex(input);
  if (ftsResults.length === 1) return { id: ftsResults[0].id };
  if (ftsResults.length > 1) {
    return { error: `Multiple objects match "${input}".`, candidates: ftsResults.slice(0, 5).map(r => ({ id: r.id, title: r.title })) };
  }

  return { error: `No results for "${input}". Use 'lens search' to explore, or 'lens index' for entry points.` };
}

// ============================================================
// Similarity (character trigrams + Dice coefficient)
// ============================================================

function normalizeForSimilarity(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function charNgrams(text: string): Set<string> {
  const norm = normalizeForSimilarity(text);
  const grams = new Set<string>();
  const n = Math.min(3, norm.length);
  if (n === 0) return grams;
  for (let i = 0; i <= norm.length - n; i++) {
    grams.add(norm.substring(i, i + n));
  }
  return grams;
}

function diceSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const g of smaller) {
    if (larger.has(g)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

/** Minimum size ratio for a pair to possibly reach a Dice threshold: r >= t / (2 - t). */
function minSizeRatio(threshold: number): number {
  return threshold / (2 - threshold);
}

export function findSimilarNotes(id: string, threshold: number = 0.3): { id: string; title: string; similarity: number }[] {
  const db = getDb();

  const target = db.prepare("SELECT data, body FROM objects WHERE id = ?").get(id) as any;
  if (!target) return [];
  const targetData = JSON.parse(target.data);
  const targetText = (targetData.title || "") + " " + (target.body || "");
  const targetGrams = charNgrams(targetText);
  if (targetGrams.size === 0) return [];

  const minRatio = minSizeRatio(threshold);
  const rows = db.prepare("SELECT id, data, body FROM objects WHERE type = 'note' AND id != ?").all(id) as any[];

  const results: { id: string; title: string; similarity: number }[] = [];
  for (const row of rows) {
    const data = JSON.parse(row.data);
    const text = (data.title || "") + " " + (row.body || "");
    const grams = charNgrams(text);

    if (grams.size === 0) continue;
    const sizeRatio = Math.min(targetGrams.size, grams.size) / Math.max(targetGrams.size, grams.size);
    if (sizeRatio < minRatio) continue;

    const similarity = diceSimilarity(targetGrams, grams);
    if (similarity >= threshold) {
      results.push({ id: row.id, title: data.title || "(untitled)", similarity: parseFloat(similarity.toFixed(3)) });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/** Scan all notes pairwise → group similar ones via Union-Find. */
export function findAllSimilarGroups(threshold: number = 0.3): { count: number; groups: { notes: { id: string; title: string }[]; pairs: { a: string; b: string; similarity: number }[] }[] } {
  const db = getDb();
  const rows = db.prepare("SELECT id, data, body FROM objects WHERE type = 'note'").all() as any[];

  // Pre-compute trigrams for every note
  const notes: { id: string; title: string; grams: Set<string> }[] = [];
  for (const row of rows) {
    const data = JSON.parse(row.data);
    const text = (data.title || "") + " " + (row.body || "");
    const grams = charNgrams(text);
    if (grams.size > 0) {
      notes.push({ id: row.id, title: data.title || "(untitled)", grams });
    }
  }

  // Union-Find
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // Pairwise comparison with pre-filters
  const minRatio = minSizeRatio(threshold);
  const allPairs: { a: string; b: string; similarity: number }[] = [];
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const sizeRatio = Math.min(notes[i].grams.size, notes[j].grams.size) / Math.max(notes[i].grams.size, notes[j].grams.size);
      if (sizeRatio < minRatio) continue;

      const sim = diceSimilarity(notes[i].grams, notes[j].grams);
      if (sim >= threshold) {
        union(notes[i].id, notes[j].id);
        allPairs.push({ a: notes[i].id, b: notes[j].id, similarity: parseFloat(sim.toFixed(3)) });
      }
    }
  }

  // Build groups from Union-Find
  const groupMap = new Map<string, { ids: Set<string>; pairs: typeof allPairs }>();
  for (const pair of allPairs) {
    const root = find(pair.a);
    if (!groupMap.has(root)) groupMap.set(root, { ids: new Set(), pairs: [] });
    const g = groupMap.get(root)!;
    g.ids.add(pair.a);
    g.ids.add(pair.b);
    g.pairs.push(pair);
  }

  const noteMap = new Map(notes.map(n => [n.id, n.title]));
  const groups = [...groupMap.values()]
    .map(g => ({
      notes: [...g.ids].map(id => ({ id, title: noteMap.get(id) || "(untitled)" })),
      pairs: g.pairs.sort((a, b) => b.similarity - a.similarity),
    }))
    .sort((a, b) => b.pairs[0].similarity - a.pairs[0].similarity);

  return { count: groups.length, groups };
}

// ============================================================
// Body reference extraction: [[note_ID]] → refs list with titles
// ============================================================

const BODY_REF_RE = /\[\[(note_[A-Z0-9]+|src_[A-Z0-9]+|task_[A-Z0-9]+)\]\]/g;

/** Build list of [start, end) ranges for code blocks and inline code spans. */
function codeRanges(body: string): [number, number][] {
  const ranges: [number, number][] = [];
  const re = /```[\s\S]*?```|`[^`\n]+`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isInsideCode(offset: number, ranges: [number, number][]): boolean {
  for (const [start, end] of ranges) {
    if (offset >= start && offset < end) return true;
  }
  return false;
}

export function extractBodyRefs(body: string): { id: string; title: string }[] {
  if (!body) return [];

  const ranges = codeRanges(body);
  const seen = new Set<string>();
  const refs: { id: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  BODY_REF_RE.lastIndex = 0;
  while ((match = BODY_REF_RE.exec(body)) !== null) {
    if (isInsideCode(match.index, ranges)) continue;
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);

    const obj = readObject(id);
    refs.push({
      id,
      title: obj ? (obj.data.title || "(untitled)").substring(0, 120) : "⚠ not found",
    });
  }

  return refs;
}

export function resolveBodyRefs(body: string): string {
  if (!body) return body;

  const ranges = codeRanges(body);

  BODY_REF_RE.lastIndex = 0;
  return body.replace(BODY_REF_RE, (match, id, offset) => {
    if (isInsideCode(offset, ranges)) return match;

    const obj = readObject(id);
    if (!obj) return `[⚠ not found](${id})`;
    const title = (obj.data.title || "(untitled)").substring(0, 120);
    return `[${title}](${id})`;
  });
}
