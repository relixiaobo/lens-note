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
import { getDb, setReadonly, ensureInitialized, readObject, getBacklinks, resolveIdOrTitle } from "../core/storage";
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
  return {
    id: data.id,
    type: data.type,
    title: data.title,
    body: content.trim(),
    status: data.status,
    source: data.source,
    source_type: data.source_type,
    url: data.url,
    created_at: data.created_at,
    updated_at: data.updated_at,
    forward_links: forward,
    backward_links: backward,
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
  setReadonly();
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
      if (path === "/api/layout" && req.method === "GET") {
        return sendJson(res, { ok: true, data: await loadLayout() });
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
