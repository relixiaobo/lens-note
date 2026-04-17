/**
 * lens view — card-first reading UI with a secondary graph mode.
 *
 * Default mode is a full-page card reader: title + markdown body + typed
 * outbound/inbound links, all clickable. Walking from card to card is the
 * primary interaction — like a wiki with typed edges.
 *
 * Graph mode (force-directed Cytoscape) is still available at /graph for
 * panoramic orientation.
 *
 * Routing uses the real URL (pushState), not a hash. The server returns
 * index.html for any non-asset path; this script inspects location.pathname
 * and decides which mode to render.
 */

import { marked } from "marked";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);

// ── Shared types ─────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: "note" | "source" | "task";
  title: string;
  preview?: string;
  degree: number;
}

interface GraphEdge {
  from: string;
  to: string;
  rel: string;
  reason?: string;
}

interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { total: number; notes: number; sources: number; tasks: number; edges: number };
}

interface ShowPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  status?: string;
  url?: string;
  source?: string;
  source_type?: string;
  created_at?: string;
  updated_at?: string;
  forward_links: Array<{ id: string; rel: string; title: string; reason?: string }>;
  backward_links: Array<{ id: string; rel: string; title: string; reason?: string }>;
}

interface LandingPayload {
  id: string | null;
  title: string | null;
  total: number;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

// ── Style maps (shared by both modes) ────────────────────────

const TYPE_COLOR: Record<string, string> = {
  note: "#58a6ff",
  source: "#f0b429",
  task: "#8b949e",
};

const REL_COLOR: Record<string, string> = {
  supports: "#2ea043",
  contradicts: "#f85149",
  refines: "#58a6ff",
  related: "#6e7681",
  indexes: "#a371f7",
  continues: "#e3b341",
};

/** Rel display order: contradiction is the most load-bearing, related is the weakest. */
const REL_ORDER = ["contradicts", "supports", "refines", "continues", "indexes", "related"];

// ── Graph-mode state ─────────────────────────────────────────

let cy: cytoscape.Core | null = null;
let currentGraph: GraphPayload | null = null;
let focusedId: string | null = null;
let graphBooted = false;

const typeFilter = new Set(["note", "source", "task"]);
const relFilter = new Set(["supports", "contradicts", "refines", "related", "indexes", "continues"]);

// ── HTTP helpers ─────────────────────────────────────────────

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  const body = (await res.json()) as Envelope<T>;
  if (!body.ok) throw new Error(body.error.message);
  return body.data;
}

// ── Router ───────────────────────────────────────────────────

type Mode = "card" | "graph" | "empty";

function showMode(mode: Mode) {
  const card = document.getElementById("card-view")!;
  const graph = document.getElementById("graph-view")!;
  const empty = document.getElementById("empty")!;
  card.classList.toggle("hidden", mode !== "card");
  graph.classList.toggle("hidden", mode !== "graph");
  empty.classList.toggle("hidden", mode !== "empty");
  document.body.dataset.mode = mode;
  if (mode === "graph") cy?.resize();
}

async function route() {
  const path = location.pathname;

  // Graph view
  if (path === "/graph") {
    showMode("graph");
    if (!graphBooted) {
      graphBooted = true;
      await bootGraph();
    }
    return;
  }

  // Explicit card view
  if (path.startsWith("/view/")) {
    const id = decodeURIComponent(path.slice("/view/".length));
    if (!id) {
      showMode("empty");
      return;
    }
    showMode("card");
    await renderCard(id);
    return;
  }

  // Landing: redirect to most-recently-updated note, or show empty state
  if (path === "/" || path === "") {
    try {
      const landing = await fetchJson<LandingPayload>("/api/landing");
      if (!landing.id) {
        showMode("empty");
        return;
      }
      history.replaceState({ id: landing.id }, "", `/view/${landing.id}`);
      showMode("card");
      await renderCard(landing.id);
    } catch (err) {
      showMode("empty");
    }
    return;
  }

  // Unknown path → empty
  showMode("empty");
}

/** Intercept clicks on in-app links so we can pushState instead of full reload. */
function wireLinkInterception() {
  document.body.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest("a") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    // Only intercept same-origin relative links to our SPA routes
    if (!href.startsWith("/")) return;
    if (a.target && a.target !== "_self") return;
    e.preventDefault();
    if (href === location.pathname + location.search) return;
    history.pushState({}, "", href);
    route().catch(err => console.error("route failed:", err));
  });

  window.addEventListener("popstate", () => {
    route().catch(err => console.error("route failed:", err));
  });
}

// ── Card mode ────────────────────────────────────────────────

function groupByRel(links: Array<{ id: string; rel: string; title: string; reason?: string }>) {
  const groups = new Map<string, typeof links>();
  for (const l of links) {
    if (!groups.has(l.rel)) groups.set(l.rel, []);
    groups.get(l.rel)!.push(l);
  }
  return [...groups.entries()].sort(
    ([a], [b]) => REL_ORDER.indexOf(a) - REL_ORDER.indexOf(b),
  );
}

/** Replace [[note_XXX]] / [[src_XXX]] / [[task_XXX]] with clickable links. */
function linkifyRefs(html: string, titleById: Map<string, string>): string {
  return html.replace(/\[\[((?:note|src|task)_[A-Z0-9]{26})\]\]/g, (_match, id: string) => {
    const title = titleById.get(id) || id;
    return `<a class="inline-ref" href="/view/${id}">${escapeHtml(title)}</a>`;
  });
}

async function renderCard(id: string) {
  const card = document.getElementById("card")!;
  card.innerHTML = `<div class="card-loading">Loading…</div>`;

  let show: ShowPayload;
  try {
    show = await fetchJson<ShowPayload>(`/api/show?id=${encodeURIComponent(id)}`);
  } catch (err: any) {
    card.innerHTML = `
      <header class="card-header">
        <h1>Not found</h1>
      </header>
      <div class="card-body">
        <p>No object with ID <code>${escapeHtml(id)}</code>.</p>
        <p><a href="/">back to landing</a></p>
      </div>`;
    return;
  }

  // Build id→title map for both inline [[ref]] resolution and link sidebar.
  const titleById = new Map<string, string>();
  for (const l of show.forward_links) titleById.set(l.id, l.title || l.id);
  for (const l of show.backward_links) titleById.set(l.id, l.title || l.id);

  // Markdown render → then linkify [[ID]] refs.
  const rawHtml = show.body ? (marked.parse(show.body, { async: false }) as string) : "";
  const bodyHtml = linkifyRefs(rawHtml, titleById);

  const forwardGroups = groupByRel(show.forward_links);
  const backwardGroups = groupByRel(show.backward_links);

  const meta: string[] = [];
  meta.push(`<code>${escapeHtml(show.id)}</code>`);
  meta.push(escapeHtml(show.type));
  if (show.source_type) meta.push(escapeHtml(show.source_type));
  if (show.status) meta.push(escapeHtml(show.status));
  if (show.url) meta.push(`<a href="${escapeAttr(show.url)}" target="_blank" rel="noopener">source ↗</a>`);
  if (show.updated_at) meta.push(`<span class="meta-date">updated ${escapeHtml(show.updated_at.slice(0, 10))}</span>`);

  const linkRow = (arrow: "→" | "←", l: { id: string; rel: string; title: string; reason?: string }) =>
    `<li class="link-row">
       <span class="arrow" style="color:${REL_COLOR[l.rel] || "#8b949e"}">${arrow}</span>
       <a class="link-title" href="/view/${l.id}">${escapeHtml(l.title || l.id)}</a>
       ${l.reason ? `<div class="reason">${escapeHtml(l.reason)}</div>` : ""}
     </li>`;

  const relSection = (dir: "forward" | "backward", groups: ReturnType<typeof groupByRel>) => {
    const arrow: "→" | "←" = dir === "forward" ? "→" : "←";
    const count = groups.reduce((n, [, ls]) => n + ls.length, 0);
    if (groups.length === 0) return "";
    return `<section class="rel-section">
      <h3 class="rel-section-title">${dir === "forward" ? "Outbound" : "Inbound"} (${count})</h3>
      ${groups.map(([rel, links]) => `
        <div class="rel-group" style="--rel-color:${REL_COLOR[rel] || "#8b949e"}">
          <div class="rel-label"><span class="rel-dot"></span>${escapeHtml(rel)}<span class="rel-count">(${links.length})</span></div>
          <ul class="rel-list">${links.map(l => linkRow(arrow, l)).join("")}</ul>
        </div>
      `).join("")}
    </section>`;
  };

  card.innerHTML = `
    <header class="card-header">
      <h1 class="card-title">${escapeHtml(show.title || "(untitled)")}</h1>
      <div class="card-meta">${meta.join(" · ")}</div>
    </header>
    <div class="card-body markdown">${bodyHtml || '<p class="empty-body">(no body)</p>'}</div>
    ${forwardGroups.length + backwardGroups.length > 0
      ? `<div class="card-links">
           ${relSection("forward", forwardGroups)}
           ${relSection("backward", backwardGroups)}
         </div>`
      : `<div class="card-links"><p class="isolated">This card is isolated — no links yet.</p></div>`}
    ${currentGraph
      ? `<footer class="card-footer">${currentGraph.stats.total} objects · ${currentGraph.stats.edges} links · <a href="/graph">full graph</a></footer>`
      : `<footer class="card-footer"><a href="/graph">full graph</a></footer>`}
  `;

  // Scroll to top on navigation
  window.scrollTo(0, 0);
  document.title = `${show.title || "(untitled)"} · lens`;
  resetCardKeyNav();
}

// ── Card keyboard navigation (j/k, arrows, Enter, /) ─────────
//
// Lets the reader walk without touching the mouse. Focus moves through every
// internal link on the card (sidebar rows + inline [[ID]] refs) in DOM order.

let cardNavIndex = -1;

function cardNavLinks(): HTMLAnchorElement[] {
  const card = document.getElementById("card");
  if (!card) return [];
  return Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href^="/view/"]'));
}

function resetCardKeyNav() {
  cardNavIndex = -1;
  const prev = document.querySelector(".card-nav-focus");
  if (prev) prev.classList.remove("card-nav-focus");
}

function moveCardNav(delta: number) {
  const links = cardNavLinks();
  if (links.length === 0) return;
  cardNavIndex = Math.max(0, Math.min(links.length - 1,
    cardNavIndex === -1 ? (delta > 0 ? 0 : links.length - 1) : cardNavIndex + delta));
  const prev = document.querySelector(".card-nav-focus");
  if (prev) prev.classList.remove("card-nav-focus");
  const target = links[cardNavIndex];
  target.classList.add("card-nav-focus");
  target.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function wireCardKeyNav() {
  document.addEventListener("keydown", (e) => {
    // Don't interfere when typing in inputs
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    // Only active in card mode
    if (document.body.dataset.mode !== "card") return;
    // Ignore modifier combos (leave those for the browser)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      moveCardNav(+1);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      moveCardNav(-1);
    } else if (e.key === "Enter") {
      const links = cardNavLinks();
      if (cardNavIndex >= 0 && cardNavIndex < links.length) {
        e.preventDefault();
        links[cardNavIndex].click();
      }
    } else if (e.key === "/") {
      e.preventDefault();
      (document.getElementById("search") as HTMLInputElement | null)?.focus();
    }
  });
}

// ── Graph mode (largely preserved from prior impl) ───────────

async function loadLayout(): Promise<Record<string, { x: number; y: number }>> {
  try {
    return await fetchJson<Record<string, { x: number; y: number }>>("/api/layout");
  } catch {
    return {};
  }
}

async function saveLayout(positions: Record<string, { x: number; y: number }>) {
  await fetch("/api/layout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(positions),
  });
}

function nodeSize(degree: number): number {
  return 6 + Math.sqrt(degree) * 5;
}

async function bootGraph() {
  const graphEl = document.getElementById("graph")!;
  const [graph, saved] = await Promise.all([fetchJson<GraphPayload>("/api/graph"), loadLayout()]);
  currentGraph = graph;
  updateStats(graph.stats);

  if (graph.nodes.length === 0) {
    showMode("empty");
    return;
  }

  const nodes = graph.nodes.map(n => ({
    data: { id: n.id, type: n.type, title: n.title, preview: n.preview || "", degree: n.degree },
    ...(saved[n.id] ? { position: saved[n.id] } : {}),
  }));

  // Defensive: skip edges whose endpoints no longer exist (orphaned by deletion).
  // Cytoscape would throw on these; surface the count in the console for awareness.
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const validEdges = graph.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
  if (validEdges.length !== graph.edges.length) {
    console.warn(`[lens view] filtered ${graph.edges.length - validEdges.length} orphan edge(s) pointing to deleted nodes`);
  }
  const edges = validEdges.map((e, i) => ({
    data: { id: `e${i}`, source: e.from, target: e.to, rel: e.rel, reason: e.reason || "" },
  }));

  cy = cytoscape({
    container: graphEl,
    elements: [...nodes, ...edges],
    minZoom: 0.08,
    maxZoom: 4,
    style: [
      { selector: "node", style: {
        "background-color": (ele: any) => TYPE_COLOR[ele.data("type")] ?? "#ccc",
        "width": (ele: any) => nodeSize(ele.data("degree")),
        "height": (ele: any) => nodeSize(ele.data("degree")),
        "label": "data(title)",
        "font-size": 9,
        "color": "#8b949e",
        "text-margin-y": -4,
        "text-opacity": 0,
        "text-outline-color": "#0d1117",
        "text-outline-width": 2,
        "border-width": 0,
      }},
      { selector: "node.dim",     style: { "opacity": 0.06 }},
      { selector: "node.neighbor", style: { "border-width": 1, "border-color": "#8b949e" }},
      { selector: "node.hovered", style: {
        "text-opacity": 1, "color": "#e6edf3",
        "border-width": 1, "border-color": "#8b949e", "z-index": 50,
      }},
      { selector: "node.focused", style: {
        "border-width": 3, "border-color": "#e6edf3",
        "text-opacity": 1, "color": "#ffffff",
        "font-size": 11, "font-weight": "bold", "z-index": 99,
      }},
      { selector: "edge", style: {
        "width": 1.2,
        "line-color": (ele: any) => REL_COLOR[ele.data("rel")] ?? "#6e7681",
        "target-arrow-color": (ele: any) => REL_COLOR[ele.data("rel")] ?? "#6e7681",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        "curve-style": "bezier",
        "opacity": 0.55,
      }},
      { selector: "edge.dim",        style: { "opacity": 0.04 }},
      { selector: "edge.focus-edge", style: { "opacity": 1, "width": 2, "z-index": 50 }},
    ],
  });

  const savedCount = Object.keys(saved).length;
  const needLayout = savedCount < graph.nodes.length * 0.9;
  if (needLayout) {
    const layout = cy.layout({
      name: "fcose" as any,
      animate: false,
      randomize: savedCount === 0,
      quality: "default",
      nodeRepulsion: 4500,
      idealEdgeLength: 55,
      nodeSeparation: 75,
      uniformNodeDimensions: false,
    } as any);
    layout.run();
    layout.on("layoutstop", () => {
      if (!cy) return;
      const positions: Record<string, { x: number; y: number }> = {};
      cy.nodes().forEach(n => { positions[n.id()] = n.position(); });
      saveLayout(positions).catch(() => { /* non-critical */ });
    });
  }

  wireGraphInteractions();
  cy.fit(undefined, 60);
}

function wireGraphInteractions() {
  if (!cy) return;

  cy.on("mouseover", "node", (evt) => {
    if (focusedId) return;
    applyHover(evt.target.id());
  });
  cy.on("mouseout", "node", () => {
    if (focusedId) return;
    clearClasses();
  });

  cy.on("tap", "node", (evt) => {
    const id = evt.target.id();
    if (focusedId === id) setFocus(null);
    else setFocus(id);
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) setFocus(null);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.dataset.mode === "graph") setFocus(null);
  });
}

function applyHover(id: string) {
  if (!cy) return;
  const node = cy.getElementById(id);
  if (!node.nonempty()) return;
  cy.batch(() => {
    clearClasses();
    node.addClass("hovered");
  });
}

function setFocus(id: string | null) {
  if (!cy) return;
  focusedId = id;
  if (id === null) {
    clearClasses();
    closeGraphPanel();
    return;
  }
  const node = cy.getElementById(id);
  if (!node.nonempty()) return;

  const hood = node.closedNeighborhood();
  cy.batch(() => {
    clearClasses();
    cy!.elements().addClass("dim");
    hood.removeClass("dim").addClass("neighbor");
    node.removeClass("neighbor").addClass("focused");
    node.connectedEdges().removeClass("dim").addClass("focus-edge");
  });

  cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 0.8) }, { duration: 260 });
  openGraphPanel(id);
}

function clearClasses() {
  if (!cy) return;
  cy.elements()
    .removeClass("dim")
    .removeClass("neighbor")
    .removeClass("focused")
    .removeClass("focus-edge")
    .removeClass("hovered");
}

function openGraphPanel(id: string) {
  const nodePanel = document.getElementById("node-panel")!;
  const linksPanel = document.getElementById("links-panel")!;
  const nodeBody = document.getElementById("node-panel-body")!;
  const linksBody = document.getElementById("links-panel-body")!;
  nodeBody.innerHTML = '<div class="meta">Loading…</div>';
  linksBody.innerHTML = "";
  nodePanel.classList.remove("hidden");
  linksPanel.classList.remove("hidden");
  cy?.resize();

  fetchJson<ShowPayload>(`/api/show?id=${encodeURIComponent(id)}`)
    .then(data => renderGraphPanel(data))
    .catch(err => {
      nodeBody.innerHTML = `<div class="meta">Error: ${escapeHtml(err.message)}</div>`;
    });
}

function closeGraphPanel() {
  document.getElementById("node-panel")!.classList.add("hidden");
  document.getElementById("links-panel")!.classList.add("hidden");
  cy?.resize();
}

function renderGraphPanel(d: ShowPayload) {
  const nodeBody = document.getElementById("node-panel-body")!;
  const linksBody = document.getElementById("links-panel-body")!;

  const bodyPreview = d.body ? d.body.slice(0, 1200) : "";
  const truncated = d.body && d.body.length > 1200;

  nodeBody.innerHTML = `
    <h3>${escapeHtml(d.title || "(untitled)")}</h3>
    <div class="meta">
      <code>${escapeHtml(d.id)}</code> · ${escapeHtml(d.type)}
      ${d.status ? ` · ${escapeHtml(d.status)}` : ""}
      ${d.url ? ` · <a href="${escapeAttr(d.url)}" target="_blank" rel="noopener">link ↗</a>` : ""}
    </div>
    <div class="panel-open-link"><a href="/view/${escapeAttr(d.id)}">open card →</a></div>
    ${bodyPreview
      ? `<div class="body">${escapeHtml(bodyPreview)}${truncated ? "…" : ""}</div>`
      : `<div class="meta" style="margin-top:14px">(no body)</div>`}
  `;

  const linkRow = (arrow: "→" | "←", l: { id: string; rel: string; title: string; reason?: string }) =>
    `<div class="link-row" data-id="${escapeAttr(l.id)}">
       <span class="arrow" style="color:${REL_COLOR[l.rel] || "#8b949e"}">${arrow}</span>
       <span class="link-title">${escapeHtml(l.title || l.id)}</span>
       ${l.reason ? `<div class="reason">${escapeHtml(l.reason)}</div>` : ""}
     </div>`;

  const relGroup = (arrow: "→" | "←", rel: string, links: Array<{ id: string; rel: string; title: string; reason?: string }>) =>
    `<div class="rel-group" style="--rel-color:${REL_COLOR[rel] || "#8b949e"}">
       <div class="rel-label"><span class="rel-dot"></span>${escapeHtml(rel)} <span class="rel-count">(${links.length})</span></div>
       ${links.map(l => linkRow(arrow, l)).join("")}
     </div>`;

  const forwardGroups = groupByRel(d.forward_links);
  const backwardGroups = groupByRel(d.backward_links);

  linksBody.innerHTML = `
    <h4 class="links-header">Connections</h4>
    ${forwardGroups.length > 0 ? `
      <section>
        <h4>Forward (${d.forward_links.length})</h4>
        ${forwardGroups.map(([rel, links]) => relGroup("→", rel, links)).join("")}
      </section>` : ""}
    ${backwardGroups.length > 0 ? `
      <section>
        <h4>Backward (${d.backward_links.length})</h4>
        ${backwardGroups.map(([rel, links]) => relGroup("←", rel, links)).join("")}
      </section>` : ""}
    ${forwardGroups.length + backwardGroups.length === 0 ? `
      <section><h4>No connections yet</h4><p class="meta">This node is isolated.</p></section>` : ""}
  `;

  linksBody.querySelectorAll<HTMLElement>(".link-row").forEach(row => {
    row.addEventListener("click", () => {
      const targetId = row.dataset.id;
      if (targetId) setFocus(targetId);
    });
  });
}

function applyFilters() {
  if (!cy) return;
  cy.batch(() => {
    cy!.nodes().forEach(n => {
      const visible = typeFilter.has(n.data("type"));
      n.style("display", visible ? "element" : "none");
    });
    cy!.edges().forEach(e => {
      const visible = relFilter.has(e.data("rel"))
        && e.source().style("display") === "element"
        && e.target().style("display") === "element";
      e.style("display", visible ? "element" : "none");
    });
  });
}

function wireFilters() {
  document.querySelectorAll<HTMLInputElement>('.filters input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", () => {
      const kind = cb.dataset.filter;
      const value = cb.value;
      const set = kind === "type" ? typeFilter : relFilter;
      if (cb.checked) set.add(value); else set.delete(value);
      applyFilters();
    });
  });
}

function wireRelayout() {
  const btn = document.getElementById("relayout");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!cy) return;
    const layout = cy.layout({ name: "fcose" as any, animate: true, randomize: true, quality: "default" } as any);
    layout.run();
    layout.on("layoutstop", () => {
      const positions: Record<string, { x: number; y: number }> = {};
      cy!.nodes().forEach(n => { positions[n.id()] = n.position(); });
      saveLayout(positions).catch(() => {});
    });
  });
}

function wirePanelClose() {
  const btn = document.getElementById("panel-close");
  if (btn) btn.addEventListener("click", closeGraphPanel);
}

function updateStats(s: GraphPayload["stats"]) {
  const el = document.getElementById("stats");
  if (el) el.textContent = `${s.notes} notes · ${s.sources} sources · ${s.tasks} tasks · ${s.edges} links`;
}

// ── Search (works in both modes) ─────────────────────────────

function wireSearch() {
  const input = document.getElementById("search") as HTMLInputElement;
  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const q = input.value.trim();
    if (!q) return;

    // In graph mode: center the matching node, like before.
    if (document.body.dataset.mode === "graph" && cy && currentGraph) {
      const qLower = q.toLowerCase();
      const match = currentGraph.nodes.find(n => n.title.toLowerCase().includes(qLower));
      if (match) {
        const node = cy.getElementById(match.id);
        if (node.nonempty()) {
          cy.animate({ center: { eles: node }, zoom: 1.4 }, { duration: 350 });
          openGraphPanel(match.id);
          return;
        }
      }
      input.style.borderColor = "#f85149";
      setTimeout(() => { input.style.borderColor = ""; }, 600);
      return;
    }

    // Card mode: use the graph payload for title lookup (load it lazily once).
    if (!currentGraph) {
      try {
        currentGraph = await fetchJson<GraphPayload>("/api/graph");
      } catch {
        input.style.borderColor = "#f85149";
        setTimeout(() => { input.style.borderColor = ""; }, 600);
        return;
      }
    }
    const qLower = q.toLowerCase();
    const match = currentGraph.nodes.find(n => n.title.toLowerCase().includes(qLower));
    if (!match) {
      input.style.borderColor = "#f85149";
      setTimeout(() => { input.style.borderColor = ""; }, 600);
      return;
    }
    history.pushState({}, "", `/view/${match.id}`);
    route().catch(err => console.error(err));
    input.value = "";
  });
}

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

// ── Boot ─────────────────────────────────────────────────────

wireFilters();
wireRelayout();
wirePanelClose();
wireSearch();
wireLinkInterception();
wireCardKeyNav();
route().catch(err => {
  const card = document.getElementById("card");
  if (card) card.innerHTML = `<div class="card-loading">Failed to load: ${escapeHtml(err.message)}</div>`;
  showMode("card");
});
