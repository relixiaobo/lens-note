/**
 * lens view — local web viewer for the knowledge graph.
 *
 * Spawns a read-only HTTP server on an ephemeral port, opens the default
 * browser to the force-directed graph UI, and streams the graph as JSON on
 * request. No writes happen through this server; writes stay on the CLI.
 *
 * Architecture:
 *   - Static files served from dist/view-ui/ (produced by scripts/build-view.mjs)
 *   - /api/graph  → { nodes, edges } built from the readonly SQLite cache
 *   - /api/show   → the standard `show` payload for a clicked node
 *   - /api/layout → GET loads ~/.lens/view-layout.json; POST writes it
 *
 * Shutdown: Ctrl-C closes the server. No tab-close heartbeat by design.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { readFile, stat, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { dirname, extname, join, normalize, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { paths, LENS_HOME } from "../core/paths";
import { getDb, ensureInitialized, readObject, getBacklinks, getForwardLinks, resolveIdOrTitle, getLinkNeighborhood, extractBodyRefs, findSimilarExcluding, searchIndex, previewOf } from "../core/storage";
import { writeNote, writeLink, writeUnlink } from "./write";
import {
  readWhiteboard,
  listWhiteboards,
  createWhiteboard,
  addMembers,
  removeMember,
  updatePositions,
  updateWhiteboardMeta,
  deleteWhiteboard,
} from "../core/whiteboard-storage";
import type { CommandOptions } from "./commands";
import { LensError, respondSuccess } from "./response";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function uiDir(): string {
  // dist/main.mjs is the published entry; static assets live next to it at dist/view-ui/
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "view-ui");
}

function layoutFile(): string {
  return join(LENS_HOME, "view-layout.json");
}

function whiteboardLayoutFile(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9_-]/g, "_");
  return join(LENS_HOME, `whiteboard-${safe}.json`);
}

function sendJson(res: ServerResponse, payload: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, status: number, message: string) {
  sendJson(res, { ok: false, error: { code: "view_error", message } }, status);
}

/** Serve a file from dist/view-ui/ with path traversal protection. */
async function serveStatic(res: ServerResponse, relPath: string) {
  const root = uiDir();
  const safe = normalize(relPath).replace(/^([/\\]|\.\.)+/, "");
  const full = resolve(join(root, safe));
  if (!full.startsWith(resolve(root))) {
    res.statusCode = 400;
    res.end("bad path");
    return;
  }
  try {
    const buf = await readFile(full);
    res.setHeader("content-type", MIME[extname(full)] ?? "application/octet-stream");
    res.setHeader("cache-control", "no-cache");
    res.end(buf);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
}

interface GraphNode {
  id: string;
  type: "note" | "source" | "task";
  title: string;
  preview?: string;
  degree: number;
  status?: string;
  source_type?: string;
  inbox?: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  rel: string;
  reason?: string;
}

/** Build the full graph payload from the SQLite cache. Runs under readonly mode. */
function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[]; stats: Record<string, number> } {
  const db = getDb();

  const rows = db.prepare("SELECT id, type, data, body FROM objects").all() as {
    id: string; type: string; data: string; body: string;
  }[];

  // Inbound count per node, for sizing
  const inbound = new Map<string, number>();
  for (const r of db.prepare("SELECT to_id, COUNT(*) AS c FROM links GROUP BY to_id").all() as { to_id: string; c: number }[]) {
    inbound.set(r.to_id, r.c);
  }

  const nodes: GraphNode[] = rows.map(r => {
    const data = JSON.parse(r.data);
    const body = (r.body || "").trim();
    const node: GraphNode = {
      id: r.id,
      type: r.type as GraphNode["type"],
      title: data.title || "(untitled)",
      degree: inbound.get(r.id) ?? 0,
    };
    if (body) node.preview = body.slice(0, 140);
    if (data.status) node.status = data.status;
    if (data.source_type) node.source_type = data.source_type;
    if (data.inbox === true) node.inbox = true;
    return node;
  });

  // Edges are the contents of `links` table, already deduped at write time.
  const edgeRows = db.prepare("SELECT from_id, to_id, rel FROM links").all() as { from_id: string; to_id: string; rel: string }[];
  const edges: GraphEdge[] = edgeRows.map(e => ({ from: e.from_id, to: e.to_id, rel: e.rel }));

  // Enrich edges with reason by re-reading source YAML. Same pattern as cli/links.ts.
  const reasonByKey = new Map<string, string>();
  for (const r of rows) {
    const data = JSON.parse(r.data);
    if (!Array.isArray(data.links)) continue;
    for (const l of data.links) {
      if (l.reason) reasonByKey.set(`${r.id}→${l.to}:${l.rel}`, l.reason);
    }
  }
  for (const e of edges) {
    const reason = reasonByKey.get(`${e.from}→${e.to}:${e.rel}`);
    if (reason) e.reason = reason;
  }

  const stats = {
    total: nodes.length,
    notes: nodes.filter(n => n.type === "note").length,
    sources: nodes.filter(n => n.type === "source").length,
    tasks: nodes.filter(n => n.type === "task").length,
    edges: edges.length,
  };

  return { nodes, edges, stats };
}

/** Minimal object detail for the click panel. Mirrors the `show` CLI payload. */
function buildShow(id: string): unknown {
  const result = readObject(id);
  if (!result) return null;
  const { data, content } = result;
  const forward = (data.links || []).map((l: any) => {
    const target = readObject(l.to);
    const title = target ? (target.data.title || "").toString().slice(0, 120) : "";
    return { id: l.to, rel: l.rel, title, ...(l.reason ? { reason: l.reason } : {}) };
  });
  const backward = getBacklinks(id).map(l => {
    const source = readObject(l.from_id);
    const title = source ? (source.data.title || "").toString().slice(0, 120) : "";
    const sourceLink = source?.data.links?.find((sl: any) => sl.to === id && sl.rel === l.rel);
    const reason = sourceLink?.reason;
    return { id: l.from_id, rel: l.rel, title, ...(reason ? { reason } : {}) };
  });

  // When viewing a source, surface notes derived from it (notes whose
  // `source` frontmatter field points here). This is orthogonal to the
  // link graph — it's a parent/child relationship, not a typed edge.
  let derivedNotes: { id: string; title: string; preview?: string }[] | undefined;
  let sourceTitle: string | undefined; // when this IS a note with a source, show the source title
  if (data.type === "source") {
    const rows = getDb().prepare(
      `SELECT id, data, body FROM objects
       WHERE type = 'note' AND json_extract(data, '$.source') = ?
       ORDER BY json_extract(data, '$.created_at') ASC`,
    ).all(id) as { id: string; data: string; body: string }[];
    derivedNotes = rows.map(r => {
      const d = JSON.parse(r.data);
      const preview = previewOf(r.body, 140);
      return { id: r.id, title: (d.title || "").toString().slice(0, 140), ...(preview ? { preview } : {}) };
    });
  } else if (data.source) {
    try {
      const parent = readObject(data.source);
      if (parent) sourceTitle = (parent.data.title || "").toString().slice(0, 120);
    } catch { /* bad source ref (e.g. unresolved batch ref) — skip */ }
  }

  // Provenance extras (notes only): same-day siblings + related-but-unlinked
  let sameDaySiblings: { id: string; title: string; preview?: string }[] | undefined;
  let relatedUnlinked: { id: string; title: string; similarity: number; preview?: string }[] | undefined;

  if (data.type === "note") {
    const createdAt: string | undefined = data.created_at;
    if (createdAt) {
      const dayPrefix = createdAt.slice(0, 10); // YYYY-MM-DD
      const rows = getDb().prepare(
        `SELECT id, data, body FROM objects
         WHERE type = 'note' AND id != ?
           AND json_extract(data, '$.created_at') LIKE ?
         ORDER BY json_extract(data, '$.created_at') ASC
         LIMIT 10`,
      ).all(id, dayPrefix + "%") as { id: string; data: string; body: string }[];
      if (rows.length > 0) {
        sameDaySiblings = rows.map(r => {
          const d = JSON.parse(r.data);
          const preview = previewOf(r.body);
          return {
            id: r.id,
            title: (d.title || "").toString().slice(0, 120),
            ...(preview ? { preview } : {}),
          };
        });
      }
    }

    // Related unlinked: top 3 TF-IDF similar notes excluding self + 1-hop neighbors
    const exclude = new Set<string>([id]);
    for (const l of data.links || []) exclude.add(l.to);
    for (const l of getBacklinks(id)) exclude.add(l.from_id);
    const similar = findSimilarExcluding(id, exclude, 3, 0.15);
    if (similar.length > 0) {
      relatedUnlinked = similar.map(s => {
        const target = readObject(s.id);
        const preview = previewOf(target?.content);
        return {
          id: s.id,
          title: s.title,
          similarity: s.similarity,
          ...(preview ? { preview } : {}),
        };
      });
    }
  }

  return {
    id: data.id,
    type: data.type,
    title: data.title,
    body: content.trim(),
    status: data.status,
    source: data.source,
    source_title: sourceTitle,
    source_type: data.source_type,
    url: data.url,
    created_at: data.created_at,
    updated_at: data.updated_at,
    forward_links: forward,
    backward_links: backward,
    ...(derivedNotes ? { derived_notes: derivedNotes } : {}),
    ...(sameDaySiblings ? { same_day_siblings: sameDaySiblings } : {}),
    ...(relatedUnlinked ? { related_unlinked: relatedUnlinked } : {}),
  };
}

function titleOf(id: string): string {
  const obj = readObject(id);
  if (!obj) return id;
  const t = obj.data.title;
  return typeof t === "string" ? t : id;
}

/**
 * Build a whiteboard payload for wb_<ULID>.
 *
 * Whiteboards are independent entities (JSON files in .lens/whiteboards/),
 * distinct from the graph. Members are notes/sources/tasks placed on the board
 * by the user; positions come from the whiteboard entity itself. Edges are
 * derived from the graph (for the `show-links` toggle) but carry no authority —
 * whiteboard membership is purely workspace-local.
 */
interface WhiteboardNode extends GraphNode {
  body: string;
  x: number;
  y: number;
  is_ghost?: boolean;
}

function buildWhiteboard(wbId: string, promoted: string[] = []): {
  whiteboard: { id: string; title: string; body?: string; updated_at: string };
  nodes: WhiteboardNode[];
  edges: GraphEdge[];
} | null {
  const wb = readWhiteboard(wbId);
  if (!wb) return null;

  const posById = new Map<string, { x: number; y: number }>();
  for (const m of wb.members) posById.set(m.id, { x: m.x, y: m.y });

  const memberIds = new Set<string>([...wb.members.map(m => m.id), ...promoted]);
  if (memberIds.size === 0) {
    return {
      whiteboard: {
        id: wb.id,
        title: wb.title,
        ...(wb.body ? { body: wb.body } : {}),
        updated_at: wb.updated_at,
      },
      nodes: [],
      edges: [],
    };
  }

  const db = getDb();
  const memberPlaceholders = [...memberIds].map(() => "?").join(",");

  // Edges involving any member (member↔member or member↔ghost)
  const edgeRows = db.prepare(
    `SELECT from_id, to_id, rel FROM links
     WHERE from_id IN (${memberPlaceholders}) OR to_id IN (${memberPlaceholders})`,
  ).all(...memberIds, ...memberIds) as { from_id: string; to_id: string; rel: string }[];

  const ghostIds = new Set<string>();
  for (const e of edgeRows) {
    if (!memberIds.has(e.from_id)) ghostIds.add(e.from_id);
    if (!memberIds.has(e.to_id)) ghostIds.add(e.to_id);
  }

  const allIds = new Set<string>([...memberIds, ...ghostIds]);
  const allPlaceholders = [...allIds].map(() => "?").join(",");
  const rows = allIds.size > 0 ? db.prepare(
    `SELECT id, type, data, body FROM objects WHERE id IN (${allPlaceholders})`,
  ).all(...allIds) as { id: string; type: string; data: string; body: string }[] : [];

  const inbound = new Map<string, number>();
  for (const r of db.prepare("SELECT to_id, COUNT(*) AS c FROM links GROUP BY to_id").all() as { to_id: string; c: number }[]) {
    inbound.set(r.to_id, r.c);
  }

  const nodes: WhiteboardNode[] = rows.map(r => {
    const data = JSON.parse(r.data);
    const body = (r.body || "").trim();
    const isGhost = !memberIds.has(r.id);
    const pos = posById.get(r.id) || { x: 0, y: 0 };
    const node: WhiteboardNode = {
      id: r.id,
      type: r.type as GraphNode["type"],
      title: data.title || "(untitled)",
      degree: inbound.get(r.id) ?? 0,
      body,
      x: pos.x,
      y: pos.y,
    };
    if (body) node.preview = body.slice(0, 140);
    if (data.status) node.status = data.status;
    if (data.source_type) node.source_type = data.source_type;
    if (isGhost) node.is_ghost = true;
    return node;
  });

  const reasonByKey = new Map<string, string>();
  for (const r of rows) {
    const data = JSON.parse(r.data);
    if (!Array.isArray(data.links)) continue;
    for (const l of data.links) {
      if (l.reason) reasonByKey.set(`${r.id}→${l.to}:${l.rel}`, l.reason);
    }
  }
  const edges: GraphEdge[] = edgeRows.map(e => {
    const edge: GraphEdge = { from: e.from_id, to: e.to_id, rel: e.rel };
    const reason = reasonByKey.get(`${e.from_id}→${e.to_id}:${e.rel}`);
    if (reason) edge.reason = reason;
    return edge;
  });

  return {
    whiteboard: {
      id: wb.id,
      title: wb.title,
      ...(wb.body ? { body: wb.body } : {}),
      updated_at: wb.updated_at,
    },
    nodes,
    edges,
  };
}

interface WhiteboardLayout {
  nodes: Record<string, { x: number; y: number }>;
  camera?: { x: number; y: number; scale: number };
  expanded?: string[]; // ghost notes the user has promoted to full members
}

async function loadWhiteboardLayout(id: string): Promise<WhiteboardLayout> {
  const f = whiteboardLayoutFile(id);
  if (!existsSync(f)) return { nodes: {} };
  try {
    const raw = JSON.parse(await readFile(f, "utf-8"));
    // Accept either new shape or legacy plain {id: pos} shape
    if (raw && typeof raw === "object") {
      if (raw.nodes && typeof raw.nodes === "object") return raw as WhiteboardLayout;
      // Legacy: flat positions map
      return { nodes: raw as Record<string, { x: number; y: number }> };
    }
  } catch { /* fall through */ }
  return { nodes: {} };
}

async function saveWhiteboardLayout(id: string, layout: WhiteboardLayout): Promise<void> {
  await writeFile(whiteboardLayoutFile(id), JSON.stringify(layout), "utf-8");
}

/**
 * Library listing — all notes, searchable and filterable, paginated.
 * Filters use the links table directly for cheap set operations.
 */
interface LibraryItem {
  id: string;
  type: "note" | "source" | "task";
  title: string;
  preview?: string;
  updated_at?: string;
}

type LibraryFilter = "recent" | "orphans" | "tensions";

/** Multi-line preview: keeps single newlines (so bullets / headings survive)
 *  but collapses paragraph gaps (multiple blank lines) into a single newline.
 *  Without this, `white-space: pre-wrap` + `line-clamp: 4` wastes 1–2 of the
 *  visible lines on blank rows. */
function previewLines(content: string | null | undefined, maxLen = 280): string {
  if (!content) return "";
  const normalized = content
    .trim()
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n"); // collapse paragraph gaps — no empty lines in preview
  return normalized.slice(0, maxLen);
}

/** SQL clause that restricts the objects table to the given filter. */
function libraryFilterClause(filter: LibraryFilter): string {
  switch (filter) {
    case "orphans":
      return "AND id NOT IN (SELECT from_id FROM links) AND id NOT IN (SELECT to_id FROM links)";
    case "tensions":
      return "AND (id IN (SELECT from_id FROM links WHERE rel = 'contradicts') OR id IN (SELECT to_id FROM links WHERE rel = 'contradicts'))";
    case "recent":
    default:
      return "";
  }
}

function buildLibrary(
  query: string,
  filter: LibraryFilter,
  limit: number,
  offset: number
): { total: number; items: LibraryItem[] } {
  const db = getDb();

  // If query provided, FTS scoring takes precedence; filter is applied post-hoc.
  // Filters operate on the note/source set, so the post-hoc intersection is fine.
  if (query.trim()) {
    const results = searchIndex(query).filter(r => r.type === "note" || r.type === "source");

    // Apply filter in memory when a query is active
    const filteredIds = filter === "recent" ? null : collectFilterIds(filter);
    const filtered = filteredIds ? results.filter(r => filteredIds.has(r.id)) : results;

    const items: LibraryItem[] = filtered.slice(offset, offset + limit).map(r => {
      const obj = readObject(r.id);
      return {
        id: r.id,
        type: r.type as "note" | "source" | "task",
        title: r.title,
        preview: previewLines(obj?.content, 280),
        updated_at: obj?.data.updated_at,
      };
    });
    return { total: filtered.length, items };
  }

  const clause = libraryFilterClause(filter);
  const rows = db.prepare(
    `SELECT id, type, data, body FROM objects
     WHERE (type = 'note' OR type = 'source') ${clause}
     ORDER BY json_extract(data, '$.updated_at') DESC NULLS LAST
     LIMIT ? OFFSET ?`
  ).all(limit, offset) as { id: string; type: string; data: string; body: string }[];

  const total = (db.prepare(
    `SELECT COUNT(*) as c FROM objects WHERE (type = 'note' OR type = 'source') ${clause}`
  ).get() as { c: number }).c;

  const items: LibraryItem[] = rows.map(r => {
    const data = JSON.parse(r.data);
    return {
      id: r.id,
      type: r.type as "note" | "source" | "task",
      title: data.title || "(untitled)",
      preview: previewLines(r.body, 280),
      updated_at: data.updated_at,
    };
  });

  return { total, items };
}

/** Returns the set of ids matching a non-recent filter — used for post-hoc intersection with FTS results. */
function collectFilterIds(filter: LibraryFilter): Set<string> {
  const db = getDb();
  const clause = libraryFilterClause(filter);
  const rows = db.prepare(
    `SELECT id FROM objects WHERE (type = 'note' OR type = 'source') ${clause}`
  ).all() as { id: string }[];
  return new Set(rows.map(r => r.id));
}

/**
 * Resolve a search query to candidate notes.
 *
 * Resolution order (P5: lens index is the sparse, post-hoc entry-point system):
 *   1. `lens index` — registered keywords (stable, human-curated)
 *   2. Exact title match
 *   3. FTS (full-text search) as fallback (approximate)
 *
 * Returns candidates for the UI to render. Front-end decides whether to auto-
 * navigate (single match) or show a list.
 */
interface SearchCandidate {
  id: string;
  type: string;
  title: string;
  preview?: string;
  matched: "index" | "title" | "fts";
}

function buildSearch(query: string): {
  query: string;
  candidates: SearchCandidate[];
  matched_keyword?: string;
} {
  const trimmed = query.trim();
  if (!trimmed) return { query: trimmed, candidates: [] };

  const candidates: SearchCandidate[] = [];
  const seen = new Set<string>();

  // Helper to enrich an ID into a candidate (skip duplicates, skip missing)
  const pushCandidate = (id: string, matched: SearchCandidate["matched"]) => {
    if (seen.has(id)) return;
    const obj = readObject(id);
    if (!obj) return;
    seen.add(id);
    const preview = previewOf(obj.content, 140);
    candidates.push({
      id,
      type: obj.data.type,
      title: obj.data.title || "(untitled)",
      ...(preview ? { preview } : {}),
      matched,
    });
  };

  // 1. lens index lookup (exact keyword match)
  let matchedKeyword: string | undefined;
  try {
    if (existsSync(paths.keywordIndex)) {
      const raw = readFileSync(paths.keywordIndex, "utf-8");
      const parsed = JSON.parse(raw) as { keywords?: Record<string, string[]> };
      if (parsed.keywords && Array.isArray(parsed.keywords[trimmed])) {
        matchedKeyword = trimmed;
        for (const id of parsed.keywords[trimmed]) pushCandidate(id, "index");
      }
    }
  } catch {
    // Malformed index file — skip, don't block search
  }

  // 2. Exact title / ID resolution
  const direct = resolveIdOrTitle(trimmed);
  if ("id" in direct) pushCandidate(direct.id, "title");

  // 3. FTS fallback (up to 10 more)
  const fts = searchIndex(trimmed);
  for (const hit of fts) {
    if (candidates.length >= 15) break;
    pushCandidate(hit.id, "fts");
  }

  return {
    query: trimmed,
    candidates,
    ...(matchedKeyword ? { matched_keyword: matchedKeyword } : {}),
  };
}

/**
 * Landing-page summary: the registered keyword index (P5) + this-week digest
 * (P6) + basic graph stats. Everything here already exists in CLI form; this
 * endpoint only composes those outputs for the single landing render.
 */
interface LandingSummary {
  stats: { notes: number; sources: number; tasks: number; edges: number };
  keywords: Array<{ keyword: string; entries: Array<{ id: string; title: string }> }>;
  digest: {
    days: number;
    total_new_notes: number;
    tensions_count: number;
    seeds_count: number;
    new_links_count: number;
  };
  recent_whiteboards: Array<{ id: string; title: string; updated_at?: string; card_count: number }>;
}

function buildLandingSummary(): LandingSummary {
  const db = getDb();

  // Stats (same shape as buildGraph but without the actual graph)
  const noteCount = (db.prepare("SELECT COUNT(*) AS c FROM objects WHERE type = 'note'").get() as { c: number }).c;
  const sourceCount = (db.prepare("SELECT COUNT(*) AS c FROM objects WHERE type = 'source'").get() as { c: number }).c;
  const taskCount = (db.prepare("SELECT COUNT(*) AS c FROM objects WHERE type = 'task'").get() as { c: number }).c;
  const edgeCount = (db.prepare("SELECT COUNT(*) AS c FROM links").get() as { c: number }).c;

  // Registered keywords (file-as-truth: read the index file directly)
  const keywords: LandingSummary["keywords"] = [];
  try {
    if (existsSync(paths.keywordIndex)) {
      const raw = readFileSync(paths.keywordIndex, "utf-8");
      const parsed = JSON.parse(raw) as { keywords?: Record<string, string[]> };
      if (parsed.keywords) {
        for (const [kw, ids] of Object.entries(parsed.keywords)) {
          const entries: LandingSummary["keywords"][number]["entries"] = [];
          for (const id of ids) {
            const obj = readObject(id);
            if (!obj) continue;
            entries.push({
              id,
              title: obj.data.title || "(untitled)",
            });
          }
          if (entries.length > 0) keywords.push({ keyword: kw, entries });
        }
        keywords.sort((a, b) => a.keyword.localeCompare(b.keyword));
      }
    }
  } catch {
    // Malformed file — show nothing rather than crash landing
  }

  // This-week digest (7 days) — tension/seeds counts only, not full list
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const recentNotesRows = db.prepare(
    `SELECT id, data FROM objects
     WHERE type = 'note' AND json_extract(data, '$.created_at') > ?`,
  ).all(cutoff) as { id: string; data: string }[];
  let tensionsCount = 0;
  let seedsCount = 0;
  for (const r of recentNotesRows) {
    try {
      const d = JSON.parse(r.data);
      const links: any[] = Array.isArray(d.links) ? d.links : [];
      if (links.some(l => l.rel === "contradicts")) tensionsCount++;
      if (links.length === 0) seedsCount++;
    } catch { /* skip */ }
  }
  const newLinksCount = (db.prepare(
    `SELECT COUNT(*) AS c FROM links l
     JOIN objects o ON o.id = l.from_id
     WHERE json_extract(o.data, '$.updated_at') > ? AND json_extract(o.data, '$.created_at') <= ?`,
  ).get(cutoff, cutoff) as { c: number }).c;

  // Recent whiteboards — workspaces for topic research.
  const recentWhiteboards: LandingSummary["recent_whiteboards"] = listWhiteboards()
    .slice(0, 6)
    .map(wb => ({
      id: wb.id,
      title: wb.title,
      ...(wb.updated_at ? { updated_at: wb.updated_at } : {}),
      card_count: wb.members.length,
    }));

  return {
    stats: { notes: noteCount, sources: sourceCount, tasks: taskCount, edges: edgeCount },
    keywords,
    digest: {
      days: 7,
      total_new_notes: recentNotesRows.length,
      tensions_count: tensionsCount,
      seeds_count: seedsCount,
      new_links_count: newLinksCount,
    },
    recent_whiteboards: recentWhiteboards,
  };
}

/** Landing: which card to open if no id was passed. Most recently updated note. */
function buildLanding(): { id: string | null; title: string | null; total: number } {
  const db = getDb();
  const totalRow = db.prepare("SELECT COUNT(*) AS c FROM objects WHERE type = 'note'").get() as { c: number };
  const total = totalRow?.c ?? 0;
  if (total === 0) return { id: null, title: null, total: 0 };
  const row = db.prepare(
    "SELECT id, data FROM objects WHERE type = 'note' ORDER BY json_extract(data, '$.updated_at') DESC, id DESC LIMIT 1",
  ).get() as { id: string; data: string } | undefined;
  if (!row) return { id: null, title: null, total };
  try {
    const data = JSON.parse(row.data);
    return { id: row.id, title: data.title || "(untitled)", total };
  } catch {
    return { id: row.id, title: null, total };
  }
}

async function loadLayout(): Promise<Record<string, { x: number; y: number }>> {
  const f = layoutFile();
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(await readFile(f, "utf-8"));
  } catch {
    return {};
  }
}

async function saveLayout(positions: Record<string, { x: number; y: number }>): Promise<void> {
  await writeFile(layoutFile(), JSON.stringify(positions), "utf-8");
}

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "cmd"
    : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* user can copy the URL manually if auto-open fails */
  }
}

export async function runView(args: string[], opts: CommandOptions) {
  // View server runs in read-write mode: most traffic is reads, but whiteboard
  // mutations (drag card onto canvas → add member to whiteboard, create new
  // note) need the full write API. Writes are gated to specific endpoints.
  ensureInitialized();

  // Verify the UI bundle exists. If not, the user ran from source without
  // building view-ui — give them a clear hint.
  const indexHtml = join(uiDir(), "index.html");
  if (!existsSync(indexHtml)) {
    throw new LensError(`lens view UI bundle missing at ${indexHtml}`, {
      code: "view_ui_missing",
      hint: "Run: npm run build  (or reinstall lens-note)",
    });
  }

  // Optional card-view target: `lens view <id-or-title>`. Resolves titles to
  // IDs up-front so the server only deals with canonical IDs.
  const positional = args.filter(a => !a.startsWith("--"));
  let focusId: string | undefined;
  if (positional.length > 0) {
    const raw = positional[0];
    const resolved = resolveIdOrTitle(raw);
    if ("id" in resolved) {
      focusId = resolved.id;
    } else {
      throw new LensError(`Could not resolve "${raw}" to an object`, {
        code: "not_found",
        hint: resolved.candidates && resolved.candidates.length > 0
          ? `Candidates: ${resolved.candidates.slice(0, 3).map(c => c.title).join(" | ")}`
          : "Pass a full ID (note_XXX, src_XXX, task_XXX) or an exact title",
      });
    }
  }

  const port = typeof opts.port === "string" ? parseInt(opts.port, 10) : 0; // 0 = pick any free port

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url || "/", "http://localhost");
      const path = url.pathname;

      // API routes ──────────────────────────────────────────────
      if (path === "/api/graph") {
        return sendJson(res, { ok: true, data: buildGraph() });
      }
      if (path === "/api/show") {
        const id = url.searchParams.get("id");
        if (!id) return sendError(res, 400, "missing ?id");
        const data = buildShow(id);
        if (!data) return sendError(res, 404, `not found: ${id}`);
        return sendJson(res, { ok: true, data });
      }
      if (path === "/api/landing") {
        // Which note should we open by default? Most recently updated.
        return sendJson(res, { ok: true, data: buildLanding() });
      }
      if (path === "/api/landing-summary") {
        return sendJson(res, { ok: true, data: buildLandingSummary() });
      }
      if (path === "/api/digest") {
        const { computeDigest } = await import("./digest");
        const days = parseInt(url.searchParams.get("days") || "7", 10);
        return sendJson(res, { ok: true, data: computeDigest(isNaN(days) ? 7 : days, "week") });
      }
      if (path === "/api/search") {
        const q = url.searchParams.get("q");
        if (q === null) return sendError(res, 400, "missing ?q");
        return sendJson(res, { ok: true, data: buildSearch(q) });
      }
      if (path === "/api/layout" && req.method === "GET") {
        return sendJson(res, { ok: true, data: await loadLayout() });
      }
      if (path === "/api/whiteboard" && req.method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return sendError(res, 400, "missing ?id");
        if (!/^wb_[A-Z0-9]{26}$/.test(id)) return sendError(res, 400, `invalid whiteboard id: ${id}`);
        const expandParam = url.searchParams.get("expand") || "";
        const expanded = expandParam.split(",").map(s => s.trim()).filter(Boolean);
        const data = buildWhiteboard(id, expanded);
        if (!data) return sendError(res, 404, `whiteboard not found: ${id}`);
        return sendJson(res, { ok: true, data });
      }
      // POST /api/whiteboard/new — create an empty whiteboard.
      // Body: { title?: string, body?: string }. Returns { id, title }.
      if (path === "/api/whiteboard/new" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const title = typeof parsed.title === "string" && parsed.title.trim()
              ? parsed.title.trim()
              : `Whiteboard ${new Date().toISOString().slice(0, 10)}`;
            const bodyText = typeof parsed.body === "string" && parsed.body.trim() ? parsed.body : undefined;
            const wb = createWhiteboard({ title, ...(bodyText ? { body: bodyText } : {}) });
            sendJson(res, { ok: true, data: { id: wb.id, title: wb.title } });
          } catch (e: any) {
            sendError(res, 400, e.message);
          }
        });
        return;
      }
      // POST /api/whiteboard/cards — add a card to a whiteboard.
      // Body: { whiteboard_id: string, card_id: string }. Idempotent.
      if (path === "/api/whiteboard/cards" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const whiteboardId = parsed?.whiteboard_id;
            const cardId = parsed?.card_id;
            if (!whiteboardId || !cardId) return sendError(res, 400, "whiteboard_id and card_id required");
            const updated = addMembers(whiteboardId, [cardId]);
            if (!updated) return sendError(res, 404, `whiteboard not found: ${whiteboardId}`);
            sendJson(res, { ok: true, data: { whiteboard_id: whiteboardId, card_id: cardId, member_count: updated.members.length } });
          } catch (e: any) {
            sendError(res, 400, e.message);
          }
        });
        return;
      }
      // DELETE /api/whiteboard/cards — remove a card from a whiteboard.
      if (path === "/api/whiteboard/cards" && req.method === "DELETE") {
        const whiteboardId = url.searchParams.get("whiteboard_id");
        const cardId = url.searchParams.get("card_id");
        if (!whiteboardId || !cardId) return sendError(res, 400, "whiteboard_id and card_id required");
        try {
          const updated = removeMember(whiteboardId, cardId);
          if (!updated) return sendError(res, 404, `whiteboard not found: ${whiteboardId}`);
          return sendJson(res, { ok: true, data: { whiteboard_id: whiteboardId, card_id: cardId, member_count: updated.members.length } });
        } catch (e: any) {
          return sendError(res, 400, e.message);
        }
      }
      // DELETE /api/whiteboard — delete a whiteboard (irreversible).
      if (path === "/api/whiteboard" && req.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) return sendError(res, 400, "missing ?id");
        const ok = deleteWhiteboard(id);
        if (!ok) return sendError(res, 404, `whiteboard not found: ${id}`);
        return sendJson(res, { ok: true, data: { id, deleted: true } });
      }
      // PATCH /api/whiteboard — update title/body.
      if (path === "/api/whiteboard" && req.method === "PATCH") {
        const id = url.searchParams.get("id");
        if (!id) return sendError(res, 400, "missing ?id");
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const patch: { title?: string; body?: string } = {};
            if (typeof parsed.title === "string") patch.title = parsed.title;
            if (typeof parsed.body === "string") patch.body = parsed.body;
            const updated = updateWhiteboardMeta(id, patch);
            if (!updated) return sendError(res, 404, `whiteboard not found: ${id}`);
            sendJson(res, { ok: true, data: { id: updated.id, title: updated.title, body: updated.body, updated_at: updated.updated_at } });
          } catch (e: any) {
            sendError(res, 400, e.message);
          }
        });
        return;
      }
      // GET /api/whiteboards — list all whiteboards by recency.
      if (path === "/api/whiteboards" && req.method === "GET") {
        const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "20", 10) || 20);
        const all = listWhiteboards();
        const items = all.slice(0, limit).map(wb => ({
          id: wb.id,
          title: wb.title,
          updated_at: wb.updated_at,
          card_count: wb.members.length,
        }));
        return sendJson(res, { ok: true, data: { items } });
      }
      if (path === "/api/library") {
        const q = url.searchParams.get("q") || "";
        const rawFilter = url.searchParams.get("filter") || "recent";
        const filter: LibraryFilter = ["recent", "orphans", "tensions"].includes(rawFilter)
          ? (rawFilter as LibraryFilter)
          : "recent";
        const limit = Math.min(200, parseInt(url.searchParams.get("limit") || "60", 10) || 60);
        const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
        return sendJson(res, { ok: true, data: buildLibrary(q, filter, limit, offset) });
      }
      // GET /api/whiteboard-layout?id=wb_... — returns positions from whiteboard + camera/expanded sidecar.
      if (path === "/api/whiteboard-layout" && req.method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return sendError(res, 400, "missing ?id");
        const wb = readWhiteboard(id);
        if (!wb) return sendError(res, 404, `whiteboard not found: ${id}`);
        const nodes: Record<string, { x: number; y: number }> = {};
        for (const m of wb.members) nodes[m.id] = { x: m.x, y: m.y };
        const sidecar = await loadWhiteboardLayout(id);
        const layout: WhiteboardLayout = { nodes };
        if (sidecar.camera) layout.camera = sidecar.camera;
        if (sidecar.expanded) layout.expanded = sidecar.expanded;
        return sendJson(res, { ok: true, data: layout });
      }
      // POST /api/whiteboard-layout?id=wb_... — writes positions to whiteboard entity, camera/expanded to sidecar.
      if (path === "/api/whiteboard-layout" && req.method === "POST") {
        const id = url.searchParams.get("id");
        if (!id) return sendError(res, 400, "missing ?id");
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            if (!parsed || typeof parsed !== "object") return sendError(res, 400, "expected object");
            const positions: Record<string, { x: number; y: number }> = parsed.nodes
              ? parsed.nodes
              : parsed;
            const updated = updatePositions(id, positions);
            if (!updated) return sendError(res, 404, `whiteboard not found: ${id}`);
            // Persist camera/expanded to sidecar if provided
            const sidecarPatch: Partial<WhiteboardLayout> = {};
            if (parsed.camera) sidecarPatch.camera = parsed.camera;
            if (parsed.expanded) sidecarPatch.expanded = parsed.expanded;
            if (Object.keys(sidecarPatch).length > 0) {
              const existing = await loadWhiteboardLayout(id);
              await saveWhiteboardLayout(id, { ...existing, ...sidecarPatch, nodes: {} });
            }
            sendJson(res, { ok: true, data: { saved: Object.keys(positions).length } });
          } catch (e: any) {
            sendError(res, 400, e.message);
          }
        });
        return;
      }
      if (path === "/api/layout" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", async () => {
          try {
            const positions = JSON.parse(body);
            if (typeof positions !== "object" || positions === null) return sendError(res, 400, "expected object");
            await saveLayout(positions);
            sendJson(res, { ok: true, data: { saved: Object.keys(positions).length } });
          } catch (e: any) {
            sendError(res, 400, e.message);
          }
        });
        return;
      }

      // Static files vs SPA routes ──────────────────────────────
      // Paths with a file extension (/.css, /.js, /.png, ...) are real static
      // assets. Everything else is an SPA route and should serve index.html
      // so the client-side router can handle it.
      if (path === "/" || !extname(path)) {
        await serveStatic(res, "/index.html");
      } else {
        await serveStatic(res, path);
      }
    } catch (err: any) {
      sendError(res, 500, err.message);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  const url = `http://localhost:${actualPort}${focusId ? `/view/${focusId}` : "/"}`;

  // JSON mode: caller wants structured info (rare, mostly for CI/scripts)
  if (opts.json) {
    respondSuccess({ url, port: actualPort, lens_home: LENS_HOME });
  } else {
    const graph = buildGraph();
    process.stderr.write(
      `lens view — ${graph.stats.total} objects, ${graph.stats.edges} links\n` +
      `  ${url}\n` +
      `  Ctrl-C to stop\n`,
    );
  }

  openBrowser(url);

  // Keep the process alive until SIGINT / SIGTERM.
  await new Promise<void>(resolve => {
    const shutdown = () => server.close(() => resolve());
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });
}
