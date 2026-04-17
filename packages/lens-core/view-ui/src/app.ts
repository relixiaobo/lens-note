/**
 * lens view — graph UI.
 *
 * Loads /api/graph once, renders with Cytoscape + fcose. Hover fades
 * non-neighbors; click opens detail panel. Layout positions are cached in
 * ~/.lens/view-layout.json via /api/layout so refreshes preserve the user's
 * mental map.
 */

import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);

// ── Types (mirrors server buildGraph) ────────────────────────

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
  created_at?: string;
  updated_at?: string;
  forward_links: Array<{ id: string; rel: string; title: string; reason?: string }>;
  backward_links: Array<{ id: string; rel: string; title: string; reason?: string }>;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

// ── Style mapping ────────────────────────────────────────────

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

function nodeSize(degree: number): number {
  return 6 + Math.sqrt(degree) * 5;
}

// ── State ────────────────────────────────────────────────────

let cy: cytoscape.Core | null = null;
let currentGraph: GraphPayload | null = null;
let focusedId: string | null = null; // click-locked focus; null = no focus

const typeFilter = new Set(["note", "source", "task"]);
const relFilter = new Set(["supports", "contradicts", "refines", "related", "indexes", "continues"]);

// ── API ──────────────────────────────────────────────────────

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  const body = (await res.json()) as Envelope<T>;
  if (!body.ok) throw new Error(body.error.message);
  return body.data;
}

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

// ── Render ───────────────────────────────────────────────────

async function render() {
  const graphEl = document.getElementById("graph")!;
  const emptyEl = document.getElementById("empty")!;

  const [graph, saved] = await Promise.all([fetchJson<GraphPayload>("/api/graph"), loadLayout()]);
  currentGraph = graph;

  updateStats(graph.stats);

  if (graph.nodes.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  const nodes = graph.nodes.map(n => ({
    data: { id: n.id, type: n.type, title: n.title, preview: n.preview || "", degree: n.degree },
    ...(saved[n.id] ? { position: saved[n.id] } : {}),
  }));

  const edges = graph.edges.map((e, i) => ({
    data: { id: `e${i}`, source: e.from, target: e.to, rel: e.rel, reason: e.reason || "" },
  }));

  cy = cytoscape({
    container: graphEl,
    elements: [...nodes, ...edges],
    minZoom: 0.08,
    maxZoom: 4,
    style: [
      {
        selector: "node",
        style: {
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
        },
      },
      {
        selector: "node.dim",
        style: { "opacity": 0.06 },
      },
      {
        selector: "node.neighbor",
        style: {
          "border-width": 1,
          "border-color": "#8b949e",
        },
      },
      {
        selector: "node.hovered",
        style: {
          "text-opacity": 1,
          "color": "#e6edf3",
          "border-width": 1,
          "border-color": "#8b949e",
          "z-index": 50,
        },
      },
      {
        selector: "node.focused",
        style: {
          "border-width": 3,
          "border-color": "#e6edf3",
          "text-opacity": 1,
          "color": "#ffffff",
          "font-size": 11,
          "font-weight": "bold",
          "z-index": 99,
        },
      },
      {
        selector: "edge",
        style: {
          "width": 1.2,
          "line-color": (ele: any) => REL_COLOR[ele.data("rel")] ?? "#6e7681",
          "target-arrow-color": (ele: any) => REL_COLOR[ele.data("rel")] ?? "#6e7681",
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.7,
          "curve-style": "bezier",
          "opacity": 0.55,
        },
      },
      {
        selector: "edge.dim",
        style: { "opacity": 0.04 },
      },
      {
        selector: "edge.focus-edge",
        style: {
          "opacity": 1,
          "width": 2,
          "z-index": 50,
        },
      },
    ],
  });

  // Layout: reuse saved positions when present, otherwise run fcose
  const savedCount = Object.keys(saved).length;
  const needLayout = savedCount < graph.nodes.length * 0.9; // ≥90% of current nodes have cached positions
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
    // Cache positions after layout finishes
    layout.on("layoutstop", () => {
      if (!cy) return;
      const positions: Record<string, { x: number; y: number }> = {};
      cy.nodes().forEach(n => { positions[n.id()] = n.position(); });
      saveLayout(positions).catch(() => { /* non-critical */ });
    });
  }

  wireInteractions();
  cy.fit(undefined, 60);
}

function wireInteractions() {
  if (!cy) return;

  // Hover = transient preview. If no lock focus is set, paint classes;
  // on mouseout, restore to whatever the focus state dictates.
  cy.on("mouseover", "node", (evt) => {
    if (focusedId) return; // don't interfere with locked focus
    applyHover(evt.target.id());
  });
  cy.on("mouseout", "node", () => {
    if (focusedId) return;
    clearClasses();
  });

  // Click a node = lock focus on it. Click again = unfocus.
  cy.on("tap", "node", (evt) => {
    const id = evt.target.id();
    if (focusedId === id) {
      setFocus(null);
    } else {
      setFocus(id);
    }
  });

  // Click empty canvas = unfocus everything.
  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      setFocus(null);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setFocus(null);
    }
  });
}

/** Hover = subtle preview: just reveal the hovered node's label. No dimming. */
function applyHover(id: string) {
  if (!cy) return;
  const node = cy.getElementById(id);
  if (!node.nonempty()) return;
  cy.batch(() => {
    clearClasses();
    node.addClass("hovered");
  });
}

/** Set the locked focus. null = no focus (full graph visible). */
function setFocus(id: string | null) {
  if (!cy) return;
  focusedId = id;
  if (id === null) {
    clearClasses();
    closePanel();
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

  // Smooth-center on the focused node without zooming out too much.
  cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 0.8) }, { duration: 260 });
  openPanel(id);
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

// ── Panel ────────────────────────────────────────────────────

function openPanel(id: string) {
  const nodePanel = document.getElementById("node-panel")!;
  const linksPanel = document.getElementById("links-panel")!;
  const nodeBody = document.getElementById("node-panel-body")!;
  const linksBody = document.getElementById("links-panel-body")!;
  nodeBody.innerHTML = '<div class="meta">Loading…</div>';
  linksBody.innerHTML = "";
  nodePanel.classList.remove("hidden");
  linksPanel.classList.remove("hidden");
  // Panels just appeared as flex siblings — graph flex item shrinks.
  // Tell cytoscape to resize its canvas to the new width.
  cy?.resize();

  fetchJson<ShowPayload>(`/api/show?id=${encodeURIComponent(id)}`)
    .then(data => renderPanel(data))
    .catch(err => {
      nodeBody.innerHTML = `<div class="meta">Error: ${escapeHtml(err.message)}</div>`;
    });
}

function closePanel() {
  document.getElementById("node-panel")!.classList.add("hidden");
  document.getElementById("links-panel")!.classList.add("hidden");
  cy?.resize();
}

/** Rel type display order — most meaningful first. */
const REL_ORDER = ["contradicts", "supports", "refines", "continues", "indexes", "related"];

function groupByRel(links: Array<{ id: string; rel: string; title: string; reason?: string }>) {
  const groups = new Map<string, typeof links>();
  for (const l of links) {
    if (!groups.has(l.rel)) groups.set(l.rel, []);
    groups.get(l.rel)!.push(l);
  }
  return [...groups.entries()].sort(
    ([a], [b]) => (REL_ORDER.indexOf(a) ?? 99) - (REL_ORDER.indexOf(b) ?? 99),
  );
}

function renderPanel(d: ShowPayload) {
  const nodeBody = document.getElementById("node-panel-body")!;
  const linksBody = document.getElementById("links-panel-body")!;

  // Left panel: node detail only. Body gets ~1200 chars since it owns the column.
  const bodyPreview = d.body ? d.body.slice(0, 1200) : "";
  const truncated = d.body && d.body.length > 1200;

  nodeBody.innerHTML = `
    <h3>${escapeHtml(d.title || "(untitled)")}</h3>
    <div class="meta">
      <code>${escapeHtml(d.id)}</code> · ${escapeHtml(d.type)}
      ${d.status ? ` · ${escapeHtml(d.status)}` : ""}
      ${d.url ? ` · <a href="${escapeAttr(d.url)}" target="_blank" rel="noopener">link ↗</a>` : ""}
    </div>
    ${bodyPreview
      ? `<div class="body">${escapeHtml(bodyPreview)}${truncated ? "…" : ""}</div>`
      : `<div class="meta" style="margin-top:14px">(no body)</div>`}
  `;

  // Right panel: rel-grouped connections.
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

  // Clicking a panel row → re-lock focus on the target
  linksBody.querySelectorAll<HTMLElement>(".link-row").forEach(row => {
    row.addEventListener("click", () => {
      const targetId = row.dataset.id;
      if (targetId) setFocus(targetId);
    });
  });
}

// ── Filters ──────────────────────────────────────────────────

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

// ── Search ───────────────────────────────────────────────────

function wireSearch() {
  const input = document.getElementById("search") as HTMLInputElement;
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = input.value.trim().toLowerCase();
    if (!q || !cy || !currentGraph) return;

    const match = currentGraph.nodes.find(n => n.title.toLowerCase().includes(q));
    if (!match) {
      input.style.borderColor = "#f85149";
      setTimeout(() => { input.style.borderColor = ""; }, 600);
      return;
    }
    const node = cy.getElementById(match.id);
    if (node.nonempty()) {
      cy.animate({ center: { eles: node }, zoom: 1.4 }, { duration: 350 });
      openPanel(match.id);
    }
  });
}

// ── Relayout button ──────────────────────────────────────────

function wireRelayout() {
  document.getElementById("relayout")!.addEventListener("click", () => {
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

// ── Filter wiring ────────────────────────────────────────────

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

// ── Panel close ──────────────────────────────────────────────

function wirePanelClose() {
  document.getElementById("panel-close")!.addEventListener("click", closePanel);
}

// ── Stats ────────────────────────────────────────────────────

function updateStats(s: GraphPayload["stats"]) {
  const el = document.getElementById("stats")!;
  el.textContent = `${s.notes} notes · ${s.sources} sources · ${s.tasks} tasks · ${s.edges} links`;
}

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

// ── Boot ─────────────────────────────────────────────────────

wireFilters();
wireSearch();
wireRelayout();
wirePanelClose();
render().catch(err => {
  document.getElementById("node-panel-body")!.innerHTML =
    `<div class="meta">Failed to load graph: ${escapeHtml(err.message)}</div>`;
  document.getElementById("node-panel")!.classList.remove("hidden");
});
