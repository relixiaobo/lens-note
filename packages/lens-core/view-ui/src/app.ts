/**
 * lens view — canvas-first navigator with a reader panel.
 *
 * The canvas (Cytoscape + fcose + WebGL) is always present. Single-click a
 * card → its content slides in from the right as a reader panel. The clicked
 * card is highlighted and centered in the canvas. Close the panel → the
 * canvas is the whole screen again. Maximize the panel → deep-reading mode.
 *
 * URL state is the source of truth:
 *   /              canvas only, no panel
 *   /view/<id>     canvas + panel open on that card
 *   /view/<id>?full=1   panel maximized (canvas hidden behind it)
 *
 * Browser back/forward walks the URL history — every pivot pushes state.
 */

import { marked } from "marked";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import { Whiteboard, type WhiteboardPayload, type WhiteboardCamera } from "./whiteboard";

cytoscape.use(fcose);

// ── Types (mirror server buildGraph / buildShow) ─────────────

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
  source_title?: string;
  source_type?: string;
  created_at?: string;
  updated_at?: string;
  forward_links: Array<{ id: string; rel: string; title: string; reason?: string }>;
  backward_links: Array<{ id: string; rel: string; title: string; reason?: string }>;
  derived_notes?: Array<{ id: string; title: string; preview?: string }>;
  same_day_siblings?: Array<{ id: string; title: string; preview?: string }>;
  related_unlinked?: Array<{ id: string; title: string; similarity: number; preview?: string }>;
}

interface LandingPayload {
  id: string | null;
  title: string | null;
  total: number;
}

interface LandingSummaryPayload {
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

interface DigestNote {
  id: string;
  title: string;
  links: Array<{ to: string; rel: string; reason?: string }>;
  created_at: string;
}

interface DigestPayload {
  days: number;
  periodLabel: string;
  tensions: DigestNote[];
  connected: DigestNote[];
  seeds: DigestNote[];
  newLinks: Array<{ from_id: string; from_title: string; rel: string; to_id: string; to_title: string }>;
  gainedEvidence: Array<{ id: string; title: string; new_supports: number }>;
}

interface SearchCandidate {
  id: string;
  type: string;
  title: string;
  preview?: string;
  matched: "index" | "title" | "fts";
}

interface SearchPayload {
  query: string;
  candidates: SearchCandidate[];
  matched_keyword?: string;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

// ── Style maps ───────────────────────────────────────────────

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

const REL_ORDER = ["contradicts", "supports", "refines", "continues", "indexes", "related"];

// ── State ────────────────────────────────────────────────────

type ViewMode =
  | { kind: "graph" }
  | { kind: "whiteboard"; id: string; title: string }
  | { kind: "card_page"; id: string }
  | { kind: "landing" }
  | { kind: "search"; query: string }
  | { kind: "digest"; days: number };

let cy: cytoscape.Core | null = null;
let currentGraph: GraphPayload | null = null;
let currentMode: ViewMode = { kind: "graph" };
let currentCardId: string | null = null;
let saveLayoutTimer: number | null = null;
let whiteboard: Whiteboard | null = null;

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
//
// A URL means: which card (if any) is open + is the panel maximized.
// The canvas is always mounted; routing just opens/closes/maximizes the panel
// and tells the canvas which node to focus.

async function route() {
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  const full = params.get("full") === "1";

  // Legacy: /graph → /
  if (path === "/graph") {
    history.replaceState({}, "", "/");
    return route();
  }

  // /whiteboard/<wb_id>  (?open=<card_id>)
  // Opening a card on the whiteboard shows its detail INSIDE the left library
  // sidebar (master/detail), so there's no second panel. The right-side reader
  // panel stays closed in whiteboard mode.
  if (path.startsWith("/whiteboard/")) {
    const id = decodeURIComponent(path.slice("/whiteboard/".length));
    if (!id) {
      history.replaceState({}, "", "/");
      return route();
    }
    await ensureWhiteboardMode(id);
    closePanel(); // whiteboard mode uses the library sidebar for card detail
    const open = params.get("open");
    if (open) {
      whiteboard?.focusCard(open);
      openLibraryDetail(open);
    } else {
      whiteboard?.focusCard(null);
      closeLibraryDetail();
    }
    return;
  }

  // /view/<id> — canonical URL for any lens object. Full-screen reader page.
  if (path.startsWith("/view/")) {
    const id = decodeURIComponent(path.slice("/view/".length));
    if (!id) {
      await ensureGraphMode();
      closePanel();
      return;
    }
    let show: ShowPayload;
    try {
      show = await fetchJson<ShowPayload>(`/api/show?id=${encodeURIComponent(id)}`);
    } catch {
      await ensureGraphMode();
      await openPanel(id, full);
      return;
    }
    await ensureCardPageMode(show.id);
    await openPanel(show.id, true);
    return;
  }

  // /search?q=<keyword> — candidate list via lens index + title + FTS
  if (path === "/search") {
    const q = params.get("q") || "";
    await ensureSearchMode(q);
    closePanel();
    return;
  }

// /digest?days=N — full weekly report, rendered inline. Used as drill-through
  // target from the landing digest tiles (clicking "tensions" lands here with
  // #tensions anchor).
  if (path === "/digest") {
    const days = parseInt(params.get("days") || "7", 10);
    await ensureDigestMode(isNaN(days) ? 7 : days);
    closePanel();
    // Scroll to hash anchor after render
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  // Root: landing page — command bar + registered keywords + digest teaser.
  if (path === "/" || path === "") {
    await ensureLandingMode();
    closePanel();
    return;
  }
}

function wireLinkInterception() {
  document.body.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // <a href="/...">  — standard link
    const a = (e.target as Element | null)?.closest("a") as HTMLAnchorElement | null;
    let href = a?.getAttribute("href") || null;
    if (a?.target && a.target !== "_self") return;

    // [data-href="/..."] — whole-card click target (used where nesting <a> is awkward)
    if (!href) {
      const el = (e.target as Element | null)?.closest("[data-href]") as HTMLElement | null;
      if (el) href = el.getAttribute("data-href");
    }

    if (!href || !href.startsWith("/")) return;
    e.preventDefault();
    if (href === location.pathname + location.search + location.hash) return;
    history.pushState({}, "", href);
    route().catch(err => console.error(err));
  });

  // Keyboard: Enter on [data-href] elements (cards) should also navigate
  document.body.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const el = e.target as HTMLElement | null;
    if (!el || !el.hasAttribute("data-href")) return;
    const href = el.getAttribute("data-href");
    if (!href) return;
    e.preventDefault();
    history.pushState({}, "", href);
    route().catch(err => console.error(err));
  });

  window.addEventListener("popstate", () => {
    route().catch(err => console.error(err));
  });
}

// ── Panel open / close / maximize ────────────────────────────

function panelEl() { return document.getElementById("reader-panel")!; }
function stageEl() { return document.getElementById("stage")!; }

async function openPanel(id: string, full: boolean) {
  const panel = panelEl();
  panel.classList.remove("hidden");
  panel.classList.toggle("max", full);
  stageEl().classList.toggle("panel-open", true);
  stageEl().classList.toggle("panel-max", full);

  if (currentMode.kind === "whiteboard") {
    whiteboard?.focusCard(id);
  } else if (currentMode.kind === "landing" || currentMode.kind === "search" || currentMode.kind === "card_page" || currentMode.kind === "digest") {
    // no canvas focus in page modes — the page content is the visual context
  } else {
    focusCanvasOn(id, { animate: true });
  }
  await renderCard(id);
  currentCardId = id;
}

function closePanel() {
  const panel = panelEl();
  panel.classList.add("hidden");
  panel.classList.remove("max");
  stageEl().classList.remove("panel-open", "panel-max");
  if (currentMode.kind === "whiteboard") {
    whiteboard?.focusCard(null);
  } else if (currentMode.kind === "landing" || currentMode.kind === "search" || currentMode.kind === "card_page" || currentMode.kind === "digest") {
    // no canvas in page modes
  } else {
    clearCanvasFocus();
  }
  currentCardId = null;
  // Cytoscape should reclaim the space
  cy?.resize();
}

function toggleMaximize() {
  const panel = panelEl();
  const isMax = panel.classList.toggle("max");
  stageEl().classList.toggle("panel-max", isMax);
  const params = new URLSearchParams(location.search);
  if (isMax) params.set("full", "1"); else params.delete("full");
  const q = params.toString();
  history.replaceState({}, "", location.pathname + (q ? `?${q}` : ""));
  cy?.resize();
}

// ── Canvas focus highlighting (called from router) ───────────

function focusCanvasOn(id: string, opts: { animate: boolean } = { animate: false }) {
  if (!cy) return;
  const node = cy.getElementById(id);
  if (!node.nonempty()) return;

  const hood = node.closedNeighborhood();
  cy.batch(() => {
    clearCanvasClasses();
    cy!.elements().addClass("dim");
    hood.removeClass("dim").addClass("neighbor");
    node.removeClass("neighbor").addClass("focused");
    node.connectedEdges().removeClass("dim").addClass("focus-edge");
  });

  if (opts.animate) {
    cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 0.7) }, { duration: 320 });
  }
}

function clearCanvasFocus() {
  if (!cy) return;
  clearCanvasClasses();
}

function clearCanvasClasses() {
  if (!cy) return;
  cy.elements()
    .removeClass("dim")
    .removeClass("neighbor")
    .removeClass("focused")
    .removeClass("focus-edge")
    .removeClass("hovered");
}

// ── Card rendering into the panel ────────────────────────────

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

function linkifyRefs(html: string, titleById: Map<string, string>): string {
  return html.replace(/\[\[((?:note|src|task)_[A-Z0-9]{26})\]\]/g, (_match, id: string) => {
    const title = titleById.get(id) || id;
    return `<a class="inline-ref" href="/view/${id}">${escapeHtml(title)}</a>`;
  });
}

type FlatLink = { arrow: "→" | "←" | "↔"; id: string; rel: string; title: string; reason?: string };

function flattenLinks(show: ShowPayload) {
  const contradicts: FlatLink[] = [];
  const other: FlatLink[] = [];
  const seen = new Set<string>();

  for (const l of show.forward_links) {
    if (l.rel === "contradicts") {
      if (!seen.has(l.id)) { seen.add(l.id); contradicts.push({ arrow: "↔", ...l }); }
    } else other.push({ arrow: "→", ...l });
  }
  for (const l of show.backward_links) {
    if (l.rel === "contradicts") {
      if (!seen.has(l.id)) { seen.add(l.id); contradicts.push({ arrow: "↔", ...l }); }
    } else other.push({ arrow: "←", ...l });
  }

  other.sort((a, b) => {
    const r = REL_ORDER.indexOf(a.rel) - REL_ORDER.indexOf(b.rel);
    if (r !== 0) return r;
    return (a.arrow === "→" ? 0 : 1) - (b.arrow === "→" ? 0 : 1);
  });

  return { contradicts, other };
}

/** Render the full card HTML (title, meta, body, derived, links, provenance).
 *  Shared between the right-side reader panel and the library sidebar detail
 *  view — they must show identical content. */
function buildCardHtml(show: ShowPayload): string {
  const titleById = new Map<string, string>();
  for (const l of show.forward_links) titleById.set(l.id, l.title || l.id);
  for (const l of show.backward_links) titleById.set(l.id, l.title || l.id);

  const rawHtml = show.body ? (marked.parse(show.body, { async: false }) as string) : "";
  const bodyHtml = linkifyRefs(rawHtml, titleById);

  const flat = flattenLinks(show);
  const totalLinks = show.forward_links.length + show.backward_links.length;

  const indexesCount = show.forward_links.filter(l => l.rel === "indexes").length;
  const canWhiteboard = show.type === "note" && indexesCount >= 2;
  const alreadyInWb = currentMode.kind === "whiteboard" && currentMode.id === show.id;

  const meta: string[] = [];
  meta.push(`<code>${escapeHtml(show.id)}</code>`);
  meta.push(escapeHtml(show.type));
  if (show.source_type) meta.push(escapeHtml(show.source_type));
  if (show.status) meta.push(escapeHtml(show.status));
  if (show.type === "note" && show.source) {
    const label = show.source_title || show.source;
    meta.push(`from <a href="/view/${escapeAttr(show.source)}">${escapeHtml(label)}</a>`);
  }
  if (show.url) meta.push(`<a href="${escapeAttr(show.url)}" target="_blank" rel="noopener">original ↗</a>`);
  if (show.updated_at) meta.push(`<span class="meta-date">updated ${escapeHtml(show.updated_at.slice(0, 10))}</span>`);

  const whiteboardButton = canWhiteboard && !alreadyInWb
    ? `<a class="wb-button" href="/whiteboard/${escapeAttr(show.id)}">Open as whiteboard (${indexesCount})</a>`
    : "";

  const linkRow = (l: FlatLink) =>
    `<li class="link-row">
       <div class="link-head">
         <span class="arrow" style="color:${REL_COLOR[l.rel] || "#8b949e"}">${l.arrow}</span>
         <span class="rel-tag" style="color:${REL_COLOR[l.rel] || "#8b949e"};border-color:${REL_COLOR[l.rel] || "#8b949e"}">${escapeHtml(l.rel)}</span>
         <a class="link-title" href="/view/${l.id}">${escapeHtml(l.title || l.id)}</a>
       </div>
       ${l.reason ? `<div class="reason" style="border-left-color:${REL_COLOR[l.rel] || "#30363d"}">${escapeHtml(l.reason)}</div>` : ""}
     </li>`;

  const contradictsBlock = flat.contradicts.length > 0
    ? `<section class="links-section links-contradicts">
         <h3 class="links-title"><span class="links-icon">⚠</span>Contradicts<span class="links-count">(${flat.contradicts.length})</span></h3>
         <ul class="rel-list">${flat.contradicts.map(linkRow).join("")}</ul>
       </section>`
    : "";

  const linksBlock = flat.other.length > 0
    ? `<section class="links-section">
         <h3 class="links-title">Links<span class="links-count">(${flat.other.length})</span></h3>
         <ul class="rel-list">${flat.other.map(linkRow).join("")}</ul>
       </section>`
    : "";

  const derivedSection = (show.derived_notes && show.derived_notes.length > 0)
    ? `<section class="derived-notes">
         <h3 class="rel-section-title">Notes from this source (${show.derived_notes.length})</h3>
         <ul class="derived-list">
           ${show.derived_notes.map(n => `
             <li class="derived-row">
               <a class="derived-title" href="/view/${escapeAttr(n.id)}">${escapeHtml(n.title || n.id)}</a>
               ${n.preview ? `<div class="derived-preview">${escapeHtml(n.preview)}</div>` : ""}
             </li>
           `).join("")}
         </ul>
       </section>`
    : (show.type === "source" ? `<section class="derived-notes"><p class="isolated">No notes extracted from this source yet.</p></section>` : "");

  const linksArea = (show.type === "note" && totalLinks > 0)
    ? `<div class="card-links">
         ${contradictsBlock}
         ${linksBlock}
       </div>`
    : (show.type === "note"
        ? `<div class="card-links"><p class="isolated">This card has no links yet.</p></div>`
        : "");

  const provenanceBlock = renderProvenance(show);

  return `
    <header class="card-header">
      <h1 class="card-title">${escapeHtml(show.title || "(untitled)")}</h1>
      <div class="card-meta">${meta.join(" · ")}</div>
      ${whiteboardButton ? `<div class="card-actions">${whiteboardButton}</div>` : ""}
    </header>
    <div class="card-body markdown">${bodyHtml || '<p class="empty-body">(no body)</p>'}</div>
    ${derivedSection}
    ${linksArea}
    ${provenanceBlock}
  `;
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
        <p><a href="/">back to canvas</a></p>
      </div>`;
    return;
  }

  card.innerHTML = buildCardHtml(show);

  card.scrollTop = 0;
  document.title = `${show.title || "(untitled)"} · lens`;
  resetCardKeyNav();
}

// ── Provenance: where this card comes from and what surrounds it ───

function renderProvenance(show: ShowPayload): string {
  const rows: string[] = [];

  if (show.created_at) {
    const created = formatAbsDate(show.created_at);
    const createdRel = formatRelativeDate(show.created_at);
    rows.push(`
      <div class="prov-row">
        <span class="prov-label">Created</span>
        <span class="prov-val">${escapeHtml(created)} <span class="prov-rel">· ${escapeHtml(createdRel)}</span></span>
      </div>`);
  }
  if (show.updated_at && show.updated_at !== show.created_at) {
    const updated = formatAbsDate(show.updated_at);
    const updatedRel = formatRelativeDate(show.updated_at);
    rows.push(`
      <div class="prov-row">
        <span class="prov-label">Updated</span>
        <span class="prov-val">${escapeHtml(updated)} <span class="prov-rel">· ${escapeHtml(updatedRel)}</span></span>
      </div>`);
  }

  // Source drill (notes only; surfaces as prominent link)
  if (show.type === "note" && show.source) {
    const label = show.source_title || show.source;
    rows.push(`
      <div class="prov-row">
        <span class="prov-label">Source</span>
        <span class="prov-val"><a class="prov-source" href="/view/${escapeAttr(show.source)}">${escapeHtml(label)}</a></span>
      </div>`);
  }

  const meta = rows.length > 0
    ? `<section class="prov-section prov-meta"><ul class="prov-list">${rows.join("")}</ul></section>`
    : "";

  const sameDay = (show.same_day_siblings && show.same_day_siblings.length > 0)
    ? `<section class="prov-section">
         <h3 class="prov-title">Same-day siblings <span class="prov-count">${show.same_day_siblings.length}</span></h3>
         <ul class="prov-entry-list">
           ${show.same_day_siblings.map(s => `
             <li class="prov-entry">
               <a class="prov-entry-title" href="/view/${escapeAttr(s.id)}">${escapeHtml(s.title || s.id)}</a>
               ${s.preview ? `<div class="prov-entry-preview">${escapeHtml(s.preview)}</div>` : ""}
             </li>`).join("")}
         </ul>
       </section>`
    : "";

  const relatedUnlinked = (show.related_unlinked && show.related_unlinked.length > 0)
    ? `<section class="prov-section">
         <h3 class="prov-title">Related but unlinked <span class="prov-count">${show.related_unlinked.length}</span></h3>
         <ul class="prov-entry-list">
           ${show.related_unlinked.map(r => `
             <li class="prov-entry">
               <div class="prov-entry-head">
                 <a class="prov-entry-title" href="/view/${escapeAttr(r.id)}">${escapeHtml(r.title || r.id)}</a>
                 <span class="prov-entry-score">${similarityDots(r.similarity)}</span>
               </div>
               ${r.preview ? `<div class="prov-entry-preview">${escapeHtml(r.preview)}</div>` : ""}
             </li>`).join("")}
         </ul>
       </section>`
    : "";

  if (!meta && !sameDay && !relatedUnlinked) return "";
  return `<div class="card-provenance">${meta}${sameDay}${relatedUnlinked}</div>`;
}

function formatAbsDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

// ── Keyboard navigation (panel OR main content) ──────────────
//
// j/k walks through `<a href="/view/...">` links in whichever surface is
// currently in focus: the reader panel when open, otherwise the main container
// (landing / search / reader page). Enter follows the focused link.

let cardNavIndex = -1;

/**
 * Container the user is currently looking at (panel if open, else main).
 * Returns null in graph and whiteboard modes — those use pointer/drag, not
 * list-style keyboard nav, so j/k cleanly no-op there.
 */
function navContainer(): HTMLElement | null {
  if (!panelEl().classList.contains("hidden")) {
    return document.getElementById("card");
  }
  // Main view: the structure-page-container is reused for landing, search, and reader pages.
  const sp = document.getElementById("structure-page-container");
  if (sp && !sp.classList.contains("hidden")) return sp;
  return null;
}

function cardNavLinks(): HTMLAnchorElement[] {
  const root = navContainer();
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="/view/"]'));
}

function resetCardKeyNav() {
  cardNavIndex = -1;
  const prev = document.querySelectorAll(".card-nav-focus");
  prev.forEach(el => el.classList.remove("card-nav-focus"));
}

function moveCardNav(delta: number) {
  const links = cardNavLinks();
  if (links.length === 0) return;
  cardNavIndex = Math.max(0, Math.min(links.length - 1,
    cardNavIndex === -1 ? (delta > 0 ? 0 : links.length - 1) : cardNavIndex + delta));
  const prev = document.querySelectorAll(".card-nav-focus");
  prev.forEach(el => el.classList.remove("card-nav-focus"));
  const target = links[cardNavIndex];
  target.classList.add("card-nav-focus");
  target.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function wireCardKeyNav() {
  document.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const panelOpen = !panelEl().classList.contains("hidden");

    if (e.key === "Escape") {
      // Priority: un-maximize → close panel (staying in mode) → back a step
      if (panelEl().classList.contains("max") && currentMode.kind !== "card_page") {
        toggleMaximize();
      } else if (panelOpen && currentMode.kind !== "card_page") {
        // Panel open over graph/search/digest: just close the panel,
        // keep the mode. Rewrite URL to the mode's base so back-button behaves.
        const base = currentMode.kind === "whiteboard"
          ? `/whiteboard/${currentMode.id}`
          : currentMode.kind === "search"
            ? `/search?q=${encodeURIComponent(currentMode.query)}`
            : currentMode.kind === "digest"
              ? `/digest`
              : "/";
        history.pushState({}, "", base);
        route().catch(err => console.error(err));
      } else {
        // No panel (or card_page): Esc = history back. Falls back to landing.
        if (history.length > 1) history.back();
        else { history.pushState({}, "", "/"); route().catch(console.error); }
      }
      return;
    }

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
      // Prefer the big landing/search input if it's on screen; else topbar.
      const landingInput = document.getElementById("landing-search-input") as HTMLInputElement | null;
      if (landingInput && landingInput.offsetParent !== null) {
        landingInput.focus();
        landingInput.select();
      } else {
        (document.getElementById("search") as HTMLInputElement | null)?.focus();
      }
    } else if (e.key === "g" && !panelOpen) {
      // Vim-style "gg" → scroll to top of main view. (One-tap is fine too.)
      e.preventDefault();
      const c = navContainer();
      c?.scrollTo({ top: 0, behavior: "smooth" });
    } else if (e.key === "G" && !panelOpen) {
      e.preventDefault();
      const c = navContainer();
      if (c) c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
    }
  });
}

// ── Canvas boot ──────────────────────────────────────────────

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

interface WhiteboardLayout {
  nodes: Record<string, { x: number; y: number }>;
  camera?: WhiteboardCamera;
  expanded?: string[];
}

async function loadWhiteboardLayout(id: string): Promise<WhiteboardLayout> {
  try {
    return await fetchJson<WhiteboardLayout>(
      `/api/whiteboard-layout?id=${encodeURIComponent(id)}`,
    );
  } catch {
    return { nodes: {} };
  }
}

async function saveWhiteboardLayout(id: string, layout: WhiteboardLayout) {
  await fetch(`/api/whiteboard-layout?id=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(layout),
  });
}

/** Persist cytoscape node positions for the main graph. Debounced. */
function schedulePersistPositions(delayMs = 500) {
  if (!cy) return;
  if (saveLayoutTimer !== null) clearTimeout(saveLayoutTimer);
  saveLayoutTimer = window.setTimeout(() => {
    saveLayoutTimer = null;
    if (!cy) return;
    if (currentMode.kind !== "graph") return;
    const positions: Record<string, { x: number; y: number }> = {};
    cy.nodes().forEach(n => { positions[n.id()] = n.position(); });
    saveLayout(positions).catch(() => {});
  }, delayMs);
}

async function bootCanvas() {
  const graphEl = document.getElementById("graph")!;
  const graph = await fetchJson<GraphPayload>("/api/graph");
  currentGraph = graph;
  updateStats(graph.stats);

  if (graph.nodes.length === 0) {
    document.getElementById("empty")?.classList.remove("hidden");
    return;
  }

  const urlParams = new URLSearchParams(location.search);
  const wantWebgl = urlParams.get("webgl") !== "0";

  cy = cytoscape({
    container: graphEl,
    elements: [],
    minZoom: 0.08,
    maxZoom: 4,
    renderer: { name: "canvas", webgl: wantWebgl } as any,
    textureOnViewport: true,
    hideEdgesOnViewport: true,
    style: [
      { selector: "node", style: {
        "shape": "round-rectangle",
        "background-color": "#161b22",
        "width": 220,
        "height": 56,
        "label": "data(title)",
        "text-wrap": "wrap",
        "text-max-width": "200px",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": 11,
        "min-zoomed-font-size": 8,
        "color": "#e6edf3",
        "border-width": 1,
        "border-color": (ele: any) => TYPE_COLOR[ele.data("type")] ?? "#30363d",
        "padding": "8px",
      }},
      { selector: "node.dim",      style: { "opacity": 0.18 }},
      { selector: "node.neighbor", style: { "border-width": 2 }},
      { selector: "node.hovered",  style: {
        "border-width": 2, "border-color": "#e6edf3", "z-index": 50,
      }},
      { selector: "node.focused",  style: {
        "border-width": 3, "border-color": "#e6edf3",
        "font-weight": "bold", "z-index": 99,
      }},
      { selector: "edge", style: {
        "width": 1.5,
        "line-color": (ele: any) => REL_COLOR[ele.data("rel")] ?? "#6e7681",
        "target-arrow-color": (ele: any) => REL_COLOR[ele.data("rel")] ?? "#6e7681",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.9,
        "curve-style": "bezier",
        "opacity": 0.55,
        "label": "data(rel)",
        "font-size": 9,
        "color": "#8b949e",
        "text-background-color": "#0d1117",
        "text-background-opacity": 0.8,
        "text-background-padding": "2px",
        "min-zoomed-font-size": 11,
      }},
      { selector: "edge.dim",        style: { "opacity": 0.04 }},
      { selector: "edge.focus-edge", style: { "opacity": 1, "width": 2.5, "z-index": 50 }},
    ],
  });

  wireCanvasInteractions();

  if (urlParams.get("fps") === "1") mountFpsMeter();
}

/** Populate cy with the given nodes/edges + saved positions, running fcose if needed. */
function populateCanvas(
  nodes: GraphNode[],
  edges: GraphEdge[],
  saved: Record<string, { x: number; y: number }>,
  opts: { forceLayout?: boolean } = {},
) {
  if (!cy) return;

  const nodeIds = new Set(nodes.map(n => n.id));
  const validEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
  if (validEdges.length !== edges.length) {
    console.warn(`[lens view] filtered ${edges.length - validEdges.length} orphan edge(s)`);
  }

  const cyNodes = nodes.map(n => ({
    group: "nodes" as const,
    data: { id: n.id, type: n.type, title: n.title, preview: n.preview || "", degree: n.degree },
    ...(saved[n.id] ? { position: saved[n.id] } : {}),
  }));
  const cyEdges = validEdges.map((e, i) => ({
    group: "edges" as const,
    data: { id: `e${i}`, source: e.from, target: e.to, rel: e.rel, reason: e.reason || "" },
  }));

  cy.elements().remove();
  cy.add([...cyNodes, ...cyEdges]);

  const savedCount = Object.keys(saved).filter(k => nodeIds.has(k)).length;
  const urlParams = new URLSearchParams(location.search);
  const needLayout = opts.forceLayout
    || urlParams.get("relayout") === "1"
    || savedCount < nodes.length * 0.9;

  if (needLayout) {
    const t0 = performance.now();
    const layout = cy.layout({
      name: "fcose" as any,
      animate: false,
      randomize: savedCount === 0,
      quality: "default",
      nodeRepulsion: 20000,
      idealEdgeLength: 260,
      nodeSeparation: 180,
      uniformNodeDimensions: true,
      packComponents: true,
    } as any);
    layout.run();
    layout.on("layoutstop", () => {
      console.log(`[lens view] layout finished in ${(performance.now() - t0).toFixed(0)}ms`);
      schedulePersistPositions(0);
    });
  }

  cy.fit(undefined, 80);
}

/** Swap the canvas container between graph (cytoscape) and whiteboard (DOM) renderers. */
function showGraphContainer() {
  const graphEl = document.getElementById("graph")!;
  graphEl.classList.remove("hidden");
  const wbEl = document.getElementById("whiteboard-container");
  if (wbEl) wbEl.classList.add("hidden");
  const spEl = document.getElementById("structure-page-container");
  if (spEl) spEl.classList.add("hidden");
  // Cytoscape needs a tick to pick up the new container dimensions
  requestAnimationFrame(() => cy?.resize());
}

function showWhiteboardContainer() {
  const graphEl = document.getElementById("graph")!;
  graphEl.classList.add("hidden");
  const wbEl = ensureWhiteboardContainer();
  wbEl.classList.remove("hidden");
  const spEl = document.getElementById("structure-page-container");
  if (spEl) spEl.classList.add("hidden");
}

function ensureWhiteboardContainer(): HTMLElement {
  let el = document.getElementById("whiteboard-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "whiteboard-container";
    el.className = "whiteboard-container";
    el.innerHTML = `
      <div class="wb-canvas-host" id="wb-canvas-host"></div>
      <div class="wb-resizer" id="wb-resizer" title="Drag to resize"></div>
      <aside class="wb-library" id="wb-library">
        <div class="wb-library-list" id="wb-library-list">
          <div class="wb-library-header">
            <div class="wb-library-pills" id="wb-library-pills">
              <button class="wb-library-pill" data-filter="recent" data-active="true">Recent</button>
              <button class="wb-library-pill" data-filter="orphans">Orphans</button>
              <button class="wb-library-pill" data-filter="tensions">Tensions</button>
            </div>
            <input id="wb-library-search" class="wb-library-search" type="text" placeholder="Search cards…" autocomplete="off" />
          </div>
          <div class="wb-library-body" id="wb-library-body">
            <div class="wb-library-loading">Loading…</div>
          </div>
          <div class="wb-library-footer" id="wb-library-footer"></div>
        </div>
        <div class="wb-library-detail" id="wb-library-detail">
          <header class="wb-library-detail-header">
            <button class="wb-library-back" id="wb-library-back" title="Back to list (Esc)">← Back</button>
          </header>
          <div class="wb-library-detail-body" id="wb-library-detail-body"></div>
        </div>
      </aside>
    `;
    const holder = document.getElementById("canvas-holder")!;
    holder.appendChild(el);
  }
  return el;
}

function ensureStructurePageContainer(): HTMLElement {
  let el = document.getElementById("structure-page-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "structure-page-container";
    el.className = "page-container";
    const holder = document.getElementById("canvas-holder")!;
    holder.appendChild(el);
  }
  return el;
}

function showStructurePageContainer() {
  const graphEl = document.getElementById("graph")!;
  graphEl.classList.add("hidden");
  const wbEl = document.getElementById("whiteboard-container");
  if (wbEl) wbEl.classList.add("hidden");
  const pageEl = ensureStructurePageContainer();
  pageEl.classList.remove("hidden");
}

/**
 * Every "main container" mode (landing, search, reader page) starts the same
 * way: tear down the whiteboard, show the shared container, and return it so the
 * caller can paint into it. Factored to keep the ensure*Mode functions short and
 * keep mode-entry semantics in one place.
 */
function enterMainMode(): HTMLElement {
  if (whiteboard) { whiteboard.destroy(); whiteboard = null; }
  showStructurePageContainer();
  return ensureStructurePageContainer();
}

function showLoading(container: HTMLElement, label = "Loading…") {
  container.innerHTML = `<div class="page-loading">${escapeHtml(label)}</div>`;
}

/** Compact keyboard-hint footer. Reused by landing, search, reader page. */
function keyboardHints(): string {
  return `
    <footer class="page-keys">
      <kbd>/</kbd> search&nbsp;·&nbsp;
      <kbd>j</kbd>/<kbd>k</kbd> move&nbsp;·&nbsp;
      <kbd>↵</kbd> open&nbsp;·&nbsp;
      <kbd>Esc</kbd> back
    </footer>`;
}

/**
 * Notes get a full-screen reader panel with no force
 * graph behind them. The graph is a graveyard at scale — showing it behind a
 * single-card read adds visual noise without any user benefit.
 */
async function ensureCardPageMode(id: string) {
  if (currentMode.kind === "card_page" && currentMode.id === id) return;
  if (whiteboard) { whiteboard.destroy(); whiteboard = null; }
  const graphEl = document.getElementById("graph");
  if (graphEl) graphEl.classList.add("hidden");
  const wbEl = document.getElementById("whiteboard-container");
  if (wbEl) wbEl.classList.add("hidden");
  const spEl = document.getElementById("structure-page-container");
  if (spEl) spEl.classList.add("hidden");
  currentMode = { kind: "card_page", id };
  updateModeBadge();
}

async function ensureLandingMode() {
  const container = enterMainMode();
  showLoading(container);
  currentMode = { kind: "landing" };
  updateModeBadge();

  let summary: LandingSummaryPayload;
  try {
    summary = await fetchJson<LandingSummaryPayload>("/api/landing-summary");
  } catch (err) {
    container.innerHTML = `<div class="page-error"><h2>Could not load landing page</h2></div>`;
    return;
  }
  renderLanding(container, summary);
  updateStats({
    total: summary.stats.notes + summary.stats.sources + summary.stats.tasks,
    notes: summary.stats.notes,
    sources: summary.stats.sources,
    tasks: summary.stats.tasks,
    edges: summary.stats.edges,
  } as any);
}

function renderLanding(container: HTMLElement, s: LandingSummaryPayload) {
  const keywordsBlock = s.keywords.length === 0 ? `
    <section class="page-section page-section-faded">
      <h2 class="page-section-title">Keyword entries <span class="page-count">0</span></h2>
      <p class="page-empty-inline">
        No keyword entries yet. Register one with
        <code>lens index add "&lt;keyword&gt;" &lt;note_id&gt;</code>
        and it will appear here.
      </p>
    </section>` : `
    <section class="page-section page-section-faded">
      <h2 class="page-section-title">Keyword entries <span class="page-count">${s.keywords.length}</span></h2>
      <ul class="landing-keyword-list">
        ${s.keywords.map(k => `
          <li class="landing-keyword" data-href="/search?q=${encodeURIComponent(k.keyword)}" tabindex="0">
            <div class="landing-keyword-label">${escapeHtml(k.keyword)}</div>
            <ul class="landing-keyword-entries">
              ${k.entries.map(e => `
                <li>
                  <a href="/view/${encodeURIComponent(e.id)}" class="landing-keyword-entry" onclick="event.stopPropagation()">
                    ${escapeHtml(e.title)}
                  </a>
                </li>`).join("")}
            </ul>
          </li>`).join("")}
      </ul>
    </section>`;

  const digestBlock = `
    <section class="page-section">
      <h2 class="page-section-title">This week <span class="page-count">${s.digest.days} days</span></h2>
      <div class="landing-digest">
        <a class="landing-digest-cell" href="/digest#connected"><span class="landing-digest-num">${s.digest.total_new_notes}</span><span class="landing-digest-label">new notes</span></a>
        <a class="landing-digest-cell" href="/digest#new-links"><span class="landing-digest-num">${s.digest.new_links_count}</span><span class="landing-digest-label">new links</span></a>
        <a class="landing-digest-cell ${s.digest.tensions_count > 0 ? 'landing-digest-tension' : ''}" href="/digest#tensions"><span class="landing-digest-num">${s.digest.tensions_count}</span><span class="landing-digest-label">tensions</span></a>
        <a class="landing-digest-cell" href="/digest#seeds"><span class="landing-digest-num">${s.digest.seeds_count}</span><span class="landing-digest-label">seeds</span></a>
      </div>
    </section>`;

  const recentWhiteboardsBlock = `
    <section class="page-section">
      <div class="page-section-head">
        <h2 class="page-section-title">Whiteboards ${s.recent_whiteboards.length > 0 ? `<span class="page-count">${s.recent_whiteboards.length}</span>` : ""}</h2>
        <button type="button" id="new-whiteboard-btn" class="page-section-action">+ New</button>
      </div>
      ${s.recent_whiteboards.length === 0 ? `
        <div class="page-section-empty">No whiteboards yet. Click <strong>+ New</strong> to create one.</div>
      ` : `
        <ul class="page-list">
          ${s.recent_whiteboards.map(n => `
            <li class="page-item">
              <a class="page-item-title" href="/whiteboard/${encodeURIComponent(n.id)}">${escapeHtml(n.title)}</a>
              <div class="page-item-preview">${n.card_count} card${n.card_count === 1 ? "" : "s"}${n.updated_at ? ` · updated ${formatRelativeDate(n.updated_at)}` : ""}</div>
            </li>`).join("")}
        </ul>
      `}
    </section>`;

  container.innerHTML = `
    <article class="page landing-page">
      <header class="landing-hero">
        <h1 class="landing-title">lens</h1>
        <div class="landing-sub">
          ${s.stats.notes} notes · ${s.stats.sources} sources · ${s.stats.tasks} tasks · ${s.stats.edges} links
        </div>
        <form class="landing-search-form" onsubmit="return false">
          <input
            id="landing-search-input"
            class="landing-search-input"
            type="text"
            placeholder="Search a keyword or paste an ID…"
            autocomplete="off"
            autofocus />
          <button type="submit" class="landing-search-btn">→</button>
        </form>
      </header>
      ${recentWhiteboardsBlock}
      ${digestBlock}
      ${keywordsBlock}
      <footer class="landing-keys">
        <kbd>/</kbd> focus search&nbsp;·&nbsp;
        <kbd>j</kbd>/<kbd>k</kbd> move&nbsp;·&nbsp;
        <kbd>↵</kbd> open&nbsp;·&nbsp;
        <kbd>Esc</kbd> back&nbsp;·&nbsp;
        <a href="/graph" class="landing-keys-link">full graph</a>
      </footer>
    </article>
  `;

  const form = container.querySelector(".landing-search-form") as HTMLFormElement | null;
  const input = container.querySelector("#landing-search-input") as HTMLInputElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (input?.value || "").trim();
    if (!q) return;
    history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);
    route().catch(console.error);
  });

  const newBtn = container.querySelector("#new-whiteboard-btn") as HTMLButtonElement | null;
  newBtn?.addEventListener("click", () => { createNewWhiteboard(); });

  resetCardKeyNav();
}

// ── Library pane: shared by whiteboard mode ───────────────────
//
// The left sidebar that sits on every whiteboard. Shows all notes/sources
// with pills (Recent / Structure / Orphans / Tensions), a search input, and
// paginated infinite scroll. Items are draggable — dropping one onto the
// canvas adds an `indexes` link from the current whiteboard to the card.

interface LibraryItem {
  id: string;
  type: "note" | "source" | "task";
  title: string;
  preview?: string;
  updated_at?: string;
}

// Library pane state — single source of truth for filter/query/pagination.
// Mutating any of { query, filter } resets offset to 0 and replaces the list;
// scroll-triggered loads only advance offset.
type LibraryFilter = "recent" | "orphans" | "tensions";
const LIBRARY_PAGE_SIZE = 60;
interface LibraryState {
  query: string;
  filter: LibraryFilter;
  offset: number;
  total: number;
  loading: boolean;
  exhausted: boolean;
  observer: IntersectionObserver | null;
}
const libraryState: LibraryState = {
  query: "",
  filter: "recent",
  offset: 0,
  total: 0,
  loading: false,
  exhausted: false,
  observer: null,
};

function libraryUrl(offset: number): string {
  const params = new URLSearchParams();
  if (libraryState.query) params.set("q", libraryState.query);
  if (libraryState.filter !== "recent") params.set("filter", libraryState.filter);
  params.set("limit", String(LIBRARY_PAGE_SIZE));
  params.set("offset", String(offset));
  return `/api/library?${params.toString()}`;
}

/**
 * Fetch a page of library items. `reset` clears the list and rebinds observer;
 * otherwise items append to the existing list for infinite scroll.
 */
async function loadLibraryPage(opts: { reset: boolean }) {
  if (libraryState.loading) return;
  if (!opts.reset && libraryState.exhausted) return;

  const body = document.getElementById("wb-library-body");
  if (!body) return;

  libraryState.loading = true;

  if (opts.reset) {
    libraryState.offset = 0;
    libraryState.exhausted = false;
    body.innerHTML = `<div class="wb-library-loading">Loading…</div>`;
  } else {
    appendSentinel(body, "loading");
  }

  try {
    const data = await fetchJson<{ total: number; items: LibraryItem[] }>(libraryUrl(libraryState.offset));
    libraryState.total = data.total;

    if (opts.reset) {
      body.innerHTML = "";
      if (data.items.length === 0) {
        body.innerHTML = `<div class="wb-library-empty">No matches.</div>`;
        libraryState.exhausted = true;
        updateLibraryFooter();
        return;
      }
    } else {
      removeSentinel(body);
    }

    appendLibraryItems(body, data.items);
    libraryState.offset += data.items.length;
    libraryState.exhausted = libraryState.offset >= libraryState.total;

    if (!libraryState.exhausted) {
      appendSentinel(body, "observer");
      attachScrollObserver(body);
    }

    updateLibraryFooter();
  } catch (err) {
    console.error(err);
    if (opts.reset) {
      body.innerHTML = `<div class="wb-library-empty">Error loading.</div>`;
    } else {
      removeSentinel(body);
    }
  } finally {
    libraryState.loading = false;
  }
}

function appendLibraryItems(body: HTMLElement, items: LibraryItem[]) {
  const TYPE_ICON: Record<string, string> = { note: "○", source: "□", task: "▲" };
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const wrap = document.createElement("div");
    wrap.className = "wb-library-item";
    wrap.draggable = true;
    wrap.dataset.cardId = item.id;
    wrap.title = item.id;
    wrap.innerHTML = `
      <span class="wb-library-type type-${item.type}">${TYPE_ICON[item.type] || "·"}</span>
      <div class="wb-library-item-main">
        <div class="wb-library-item-title">
          ${escapeHtml(item.title)}
        </div>
        ${item.preview ? `<div class="wb-library-item-preview">${escapeHtml(item.preview)}</div>` : ""}
      </div>
    `;
    wrap.addEventListener("dragstart", (ev) => {
      if (!ev.dataTransfer) return;
      ev.dataTransfer.effectAllowed = "copy";
      ev.dataTransfer.setData("application/x-lens-card", item.id);
      ev.dataTransfer.setData("text/plain", item.id);
    });
    frag.appendChild(wrap);
  }
  body.appendChild(frag);
}

function appendSentinel(body: HTMLElement, kind: "loading" | "observer") {
  removeSentinel(body);
  const s = document.createElement("div");
  s.className = kind === "loading" ? "wb-library-loading-more" : "wb-library-sentinel";
  s.id = "wb-library-sentinel";
  if (kind === "loading") s.textContent = "Loading…";
  body.appendChild(s);
}

function removeSentinel(body: HTMLElement) {
  const s = body.querySelector("#wb-library-sentinel");
  if (s) s.remove();
}

function attachScrollObserver(body: HTMLElement) {
  if (libraryState.observer) {
    libraryState.observer.disconnect();
  }
  const sentinel = body.querySelector("#wb-library-sentinel");
  if (!sentinel) return;
  libraryState.observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        loadLibraryPage({ reset: false });
      }
    }
  }, { root: body, rootMargin: "200px" });
  libraryState.observer.observe(sentinel);
}

function updateLibraryFooter() {
  const footer = document.getElementById("wb-library-footer");
  if (!footer) return;
  if (libraryState.total === 0) {
    footer.textContent = "0 cards";
    return;
  }
  const shown = Math.min(libraryState.offset, libraryState.total);
  footer.textContent = `${shown} of ${libraryState.total} shown`;
}

function wireLibraryPills() {
  const pills = document.getElementById("wb-library-pills");
  if (!pills) return;
  if (pills.dataset.wired === "1") return;
  pills.dataset.wired = "1";
  pills.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement;
    const btn = target.closest<HTMLElement>(".wb-library-pill");
    if (!btn) return;
    const filter = btn.dataset.filter as LibraryFilter | undefined;
    if (!filter || filter === libraryState.filter) return;
    pills.querySelectorAll<HTMLElement>(".wb-library-pill").forEach(b => {
      b.dataset.active = b === btn ? "true" : "false";
    });
    libraryState.filter = filter;
    loadLibraryPage({ reset: true });
  });
}

function wireLibrarySearch() {
  const input = document.getElementById("wb-library-search") as HTMLInputElement | null;
  if (!input) return;
  if (input.dataset.wired === "1") return;
  input.dataset.wired = "1";
  let timer: number | undefined;
  input.addEventListener("input", () => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      libraryState.query = input.value.trim();
      loadLibraryPage({ reset: true });
    }, 200);
  });
}

// Master → detail navigation within the library sidebar.
// Click a list item → slide to detail view (same content as the right-side
// reader panel, just hosted inside the library column). Back / Esc → list.
function openLibraryDetail(id: string) {
  const sidebar = document.getElementById("wb-library");
  const body = document.getElementById("wb-library-detail-body");
  if (!sidebar || !body) return;
  sidebar.classList.add("detail-mode");
  body.innerHTML = `<div class="wb-library-detail-loading">Loading…</div>`;
  body.scrollTop = 0;

  (async () => {
    try {
      const show = await fetchJson<ShowPayload>(`/api/show?id=${encodeURIComponent(id)}`);
      // Same renderer as the right-side panel — full parity.
      body.innerHTML = `<article class="card wb-library-card">${buildCardHtml(show)}</article>`;
    } catch {
      body.innerHTML = `<div class="wb-library-detail-loading">Error loading.</div>`;
    }
  })();
}

function closeLibraryDetail() {
  const sidebar = document.getElementById("wb-library");
  if (!sidebar) return;
  sidebar.classList.remove("detail-mode");
}

function navigateToWhiteboardCard(id: string | null) {
  if (currentMode.kind !== "whiteboard") {
    if (id) openLibraryDetail(id); else closeLibraryDetail();
    return;
  }
  const base = `/whiteboard/${encodeURIComponent(currentMode.id)}`;
  const href = id ? `${base}?open=${encodeURIComponent(id)}` : base;
  if (location.pathname + location.search === href) return;
  if (id) {
    history.pushState({}, "", href);
  } else {
    // "back to list" — prefer history.back() so forward arrow still works
    if (history.state) history.back(); else history.pushState({}, "", href);
  }
  route().catch(console.error);
}

function wireLibraryNavigation() {
  const listBody = document.getElementById("wb-library-body");
  const back = document.getElementById("wb-library-back");
  if (!listBody || !back) return;

  if (listBody.dataset.navWired !== "1") {
    listBody.dataset.navWired = "1";
    listBody.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement;
      const wrap = target.closest<HTMLElement>(".wb-library-item");
      if (!wrap) return;
      const sel = window.getSelection?.();
      if (sel && sel.toString().length > 0) return;
      const id = wrap.dataset.cardId;
      if (!id) return;
      navigateToWhiteboardCard(id);
    });
  }

  if (back.dataset.wired !== "1") {
    back.dataset.wired = "1";
    back.addEventListener("click", () => navigateToWhiteboardCard(null));
  }

  if (document.body.dataset.libEscWired !== "1") {
    document.body.dataset.libEscWired = "1";
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      const sidebar = document.getElementById("wb-library");
      if (sidebar && sidebar.classList.contains("detail-mode")) {
        ev.stopPropagation();
        navigateToWhiteboardCard(null);
      }
    }, true);
  }
}

async function ensureDigestMode(days: number) {
  const container = enterMainMode();
  showLoading(container);
  currentMode = { kind: "digest", days };
  updateModeBadge();

  let data: DigestPayload;
  try {
    data = await fetchJson<DigestPayload>(`/api/digest?days=${days}`);
  } catch (err) {
    container.innerHTML = `<div class="page-error"><h2>Could not load digest</h2></div>`;
    return;
  }
  renderDigestPage(container, data);
  resetCardKeyNav();
}

function renderDigestPage(container: HTMLElement, d: DigestPayload) {
  const noteItem = (n: DigestNote) => `
    <li class="page-item">
      <a class="page-item-title" href="/view/${encodeURIComponent(n.id)}">${escapeHtml(n.title || "(untitled)")}</a>
    </li>`;

  const linkItem = (l: DigestPayload["newLinks"][number]) => `
    <li class="page-item">
      <a class="page-item-title" href="/view/${encodeURIComponent(l.from_id)}">${escapeHtml(l.from_title)}</a>
      <div class="page-item-reason">${escapeHtml(l.rel)} → <a href="/view/${encodeURIComponent(l.to_id)}">${escapeHtml(l.to_title)}</a></div>
    </li>`;

  const evidenceItem = (g: DigestPayload["gainedEvidence"][number]) => `
    <li class="page-item">
      <div class="page-item-head">
        <a class="page-item-title" href="/view/${encodeURIComponent(g.id)}">${escapeHtml(g.title)}</a>
        <span class="page-item-score">+${g.new_supports} supports</span>
      </div>
    </li>`;

  const section = (anchor: string, title: string, count: number, body: string, opts: { highlight?: "tension" } = {}) => {
    if (count === 0) return "";
    const cls = opts.highlight === "tension" ? "page-section page-section-tensions" : "page-section";
    return `
      <section id="${anchor}" class="${cls}">
        <h2 class="page-section-title">${escapeHtml(title)} <span class="page-count">${count}</span></h2>
        ${body}
      </section>`;
  };

  const totalNew = d.tensions.length + d.connected.length + d.seeds.length;

  container.innerHTML = `
    <article class="page">
      <header class="page-header">
        <div class="page-breadcrumb">
          <a href="/" class="page-back">←</a>
          <span class="page-query">Digest · last ${d.days} days</span>
        </div>
        <div class="structure-anchor-meta">
          ${totalNew} new notes · ${d.newLinks.length} new links · ${d.gainedEvidence.length} gained evidence · ${d.tensions.length} tensions · ${d.seeds.length} seeds
        </div>
      </header>
      ${section("tensions", "Tensions", d.tensions.length,
        `<ul class="page-list">${d.tensions.map(noteItem).join("")}</ul>`,
        { highlight: "tension" })}
      ${section("connected", "New & connected", d.connected.length,
        `<ul class="page-list">${d.connected.map(noteItem).join("")}</ul>`)}
      ${section("seeds", "Seeds (unlinked)", d.seeds.length,
        `<ul class="page-list">${d.seeds.map(noteItem).join("")}</ul>`)}
      ${section("new-links", "New connections", d.newLinks.length,
        `<ul class="page-list">${d.newLinks.map(linkItem).join("")}</ul>`)}
      ${section("gained-evidence", "Gained evidence", d.gainedEvidence.length,
        `<ul class="page-list">${d.gainedEvidence.map(evidenceItem).join("")}</ul>`)}
      ${totalNew + d.newLinks.length + d.gainedEvidence.length === 0
        ? '<p class="page-empty">No activity in this window.</p>' : ""}
      ${keyboardHints()}
    </article>
  `;
}

async function ensureSearchMode(query: string) {
  const container = enterMainMode();
  currentMode = { kind: "search", query };
  updateModeBadge();

  if (!query.trim()) {
    container.innerHTML = `
      <article class="page landing-page">
        <header class="landing-hero">
          <h1 class="landing-title">Search</h1>
          <form class="landing-search-form" onsubmit="return false">
            <input id="landing-search-input" class="landing-search-input" type="text" placeholder="Keyword or ID…" autocomplete="off" autofocus />
            <button type="submit" class="landing-search-btn">→</button>
          </form>
        </header>
      </article>`;
    const form = container.querySelector(".landing-search-form") as HTMLFormElement | null;
    const input = container.querySelector("#landing-search-input") as HTMLInputElement | null;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (input?.value || "").trim();
      if (!q) return;
      history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);
      route().catch(console.error);
    });
    return;
  }

  showLoading(container, "Searching…");
  let result: SearchPayload;
  try {
    result = await fetchJson<SearchPayload>(`/api/search?q=${encodeURIComponent(query)}`);
  } catch (err) {
    container.innerHTML = `<div class="page-error"><h2>Search failed</h2></div>`;
    return;
  }
  renderSearch(container, result);
  resetCardKeyNav();
}

function renderSearch(container: HTMLElement, result: SearchPayload) {
  const byBucket: Record<SearchCandidate["matched"], SearchCandidate[]> = {
    index: [],
    title: [],
    fts: [],
  };
  for (const c of result.candidates) byBucket[c.matched].push(c);

  const entryItem = (c: SearchCandidate) => `
    <li class="page-item">
      <div class="page-item-head">
        <a class="page-item-title" href="/view/${encodeURIComponent(c.id)}">
          ${escapeHtml(c.title)}
        </a>
      </div>
      ${c.preview ? `<div class="page-item-preview">${escapeHtml(c.preview)}</div>` : ""}
    </li>`;

  const bucketSection = (label: string, items: SearchCandidate[], hint?: string) => {
    if (items.length === 0) return "";
    return `
      <section class="page-section">
        <h2 class="page-section-title">${label} <span class="page-count">${items.length}</span></h2>
        ${hint ? `<p class="search-bucket-hint">${hint}</p>` : ""}
        <ul class="page-list">${items.map(entryItem).join("")}</ul>
      </section>`;
  };

  const indexBlock = bucketSection(
    `Keyword entries${result.matched_keyword ? ` · "${escapeHtml(result.matched_keyword)}"` : ""}`,
    byBucket.index,
    "Stable entry points registered via <code>lens index</code>",
  );
  const titleBlock = bucketSection("Exact title match", byBucket.title);
  const ftsBlock = bucketSection("Full-text search", byBucket.fts, "Ranked by full-text relevance — may not be the card you want");

  container.innerHTML = `
    <article class="page landing-page">
      <header class="landing-hero landing-hero-search">
        <div class="page-breadcrumb">
          <a href="/" class="page-back">←</a>
          <span class="page-query">Search: ${escapeHtml(result.query)}</span>
        </div>
        <form class="landing-search-form" onsubmit="return false">
          <input id="landing-search-input" class="landing-search-input" type="text" value="${escapeAttr(result.query)}" autocomplete="off" autofocus />
          <button type="submit" class="landing-search-btn">→</button>
        </form>
      </header>
      ${result.candidates.length === 0 ? `
        <section class="page-section">
          <p class="page-empty">No matches. Register an entry point with <code>lens index add "${escapeHtml(result.query)}" &lt;note_id&gt;</code>.</p>
        </section>
      ` : `${indexBlock}${titleBlock}${ftsBlock}`}
      ${keyboardHints()}
    </article>
  `;

  const form = container.querySelector(".landing-search-form") as HTMLFormElement | null;
  const input = container.querySelector("#landing-search-input") as HTMLInputElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (input?.value || "").trim();
    if (!q) return;
    history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);
    route().catch(console.error);
  });
}

/** 5-dot similarity indicator (●●●○○) — readable without needing to parse floats. */
function similarityDots(sim: number): string {
  const filled = Math.max(1, Math.min(5, Math.round(sim * 5)));
  return "●".repeat(filled) + "○".repeat(5 - filled);
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "yesterday";
  const days = Math.floor(diff / day);
  if (days < 30) return `${days}d ago`;
  return d.toISOString().slice(0, 10);
}

async function ensureGraphMode() {
  if (currentMode.kind === "graph" && cy && currentGraph && cy.nodes().length === currentGraph.nodes.length) {
    showGraphContainer();
    return;
  }
  // Tear down any active whiteboard
  if (whiteboard) {
    whiteboard.destroy();
    whiteboard = null;
  }
  showGraphContainer();
  if (!cy || !currentGraph) return;
  const saved = await loadLayout();
  populateCanvas(currentGraph.nodes, currentGraph.edges, saved);
  currentMode = { kind: "graph" };
  updateStats(currentGraph.stats);
  updateModeBadge();
}

async function ensureWhiteboardMode(wbId: string) {
  if (currentMode.kind === "whiteboard" && currentMode.id === wbId && whiteboard) return;

  // Fetch saved layout FIRST so we can pass any previously-promoted ghosts to the server.
  const layout = await loadWhiteboardLayout(wbId);
  const expandedParam = (layout.expanded || []).length > 0
    ? `&expand=${encodeURIComponent((layout.expanded || []).join(","))}`
    : "";

  let wb: WhiteboardPayload;
  try {
    wb = await fetchJson<WhiteboardPayload>(`/api/whiteboard?id=${encodeURIComponent(wbId)}${expandedParam}`);
  } catch (err) {
    console.warn("[lens view] whiteboard load failed — falling back to /view/:id", err);
    history.replaceState({}, "", `/view/${encodeURIComponent(wbId)}`);
    await ensureGraphMode();
    await openPanel(wbId, false);
    return;
  }

  // Tear down any existing whiteboard (switching between whiteboards)
  if (whiteboard) {
    whiteboard.destroy();
    whiteboard = null;
  }

  showWhiteboardContainer();
  ensureWhiteboardContainer();
  // Clear only the canvas pane — the library sidebar persists across whiteboard switches.
  const canvasHost = document.getElementById("wb-canvas-host")!;
  canvasHost.innerHTML = "";

  // Floating toolbar (fit / zoom out / zoom in)
  const tb = document.createElement("div");
  tb.className = "wb-toolbar";
  tb.innerHTML = `
    <button data-wb-action="tidy" title="Tidy overlapping cards">✦</button>
    <button data-wb-action="zoom-out" title="Zoom out">−</button>
    <button data-wb-action="fit" title="Fit to view">⤢</button>
    <button data-wb-action="zoom-in" title="Zoom in">+</button>
  `;
  tb.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest("button");
    if (!btn || !whiteboard) return;
    const action = btn.getAttribute("data-wb-action");
    if (action === "zoom-in") whiteboard.zoomBy(1.2);
    else if (action === "zoom-out") whiteboard.zoomBy(1 / 1.2);
    else if (action === "fit") whiteboard.fit();
    else if (action === "tidy") whiteboard.tidy();
  });
  canvasHost.appendChild(tb);

  const edgeTooltip = document.getElementById("edge-tooltip")!;

  whiteboard = new Whiteboard({
    container: canvasHost,
    payload: wb,
    layout: layout.nodes,
    camera: layout.camera || null,
    onCardClick: (id) => {
      // Canvas → library sidebar detail, via the shared URL-driven helper.
      navigateToWhiteboardCard(id);
    },
    onCardPromote: async (id) => {
      if (currentMode.kind !== "whiteboard" || !whiteboard) return;
      const snap = whiteboard.snapshot();
      const current = await loadWhiteboardLayout(currentMode.id);
      const expanded = new Set<string>(current.expanded || []);
      if (expanded.has(id)) return;
      expanded.add(id);
      await saveWhiteboardLayout(currentMode.id, {
        nodes: snap.nodes,
        camera: snap.camera,
        expanded: [...expanded],
      });
      // Reload whiteboard so the server adds this node's neighbors as new ghosts
      const wbId = currentMode.id;
      currentMode = { kind: "graph" }; // force re-init path
      await ensureWhiteboardMode(wbId);
    },
    onLayoutChange: (nodes) => {
      if (currentMode.kind !== "whiteboard" || !whiteboard) return;
      const snap = whiteboard.snapshot();
      saveWhiteboardLayout(currentMode.id, {
        nodes,
        camera: snap.camera,
        expanded: layout.expanded,
      }).catch(() => {});
    },
    onCameraChange: (camera) => {
      if (currentMode.kind !== "whiteboard" || !whiteboard) return;
      const snap = whiteboard.snapshot();
      saveWhiteboardLayout(currentMode.id, {
        nodes: snap.nodes,
        camera,
        expanded: layout.expanded,
      }).catch(() => {});
    },
    onEdgeHover: (edge, x, y) => {
      if (!edge) { edgeTooltip.classList.add("hidden"); return; }
      const relColor = REL_COLOR[edge.rel] || "#8b949e";
      // Multi-line reason (from the pair-indicator synthetic edge) renders each line separately.
      const reasonHtml = edge.reason
        ? edge.reason.split("\n").map(line => `<div class="edge-reason-line">${escapeHtml(line)}</div>`).join("")
        : "";
      edgeTooltip.innerHTML = `<span class="edge-rel" style="color:${relColor}">${escapeHtml(edge.rel)}</span>${reasonHtml}`;
      edgeTooltip.style.left = `${x + 14}px`;
      edgeTooltip.style.top = `${y + 14}px`;
      edgeTooltip.classList.remove("hidden");
    },
    onBackgroundTap: () => {
      if (currentCardId && currentMode.kind === "whiteboard") {
        history.pushState({}, "", `/whiteboard/${currentMode.id}`);
        route().catch(console.error);
      }
    },
    tooltipEl: edgeTooltip,
  });

  currentMode = { kind: "whiteboard", id: wb.whiteboard.id, title: wb.whiteboard.title };
  updateStats({
    notes: wb.nodes.filter(n => n.type === "note").length,
    sources: wb.nodes.filter(n => n.type === "source").length,
    tasks: wb.nodes.filter(n => n.type === "task").length,
    edges: wb.edges.length,
    total: wb.nodes.length,
  } as any);
  updateModeBadge();

  // Library + drop wiring. Library state is reset per whiteboard entry so
  // navigating between whiteboards starts fresh with the Recent filter.
  libraryState.query = "";
  libraryState.filter = "recent";
  libraryState.offset = 0;
  libraryState.total = 0;
  libraryState.exhausted = false;
  const pills = document.getElementById("wb-library-pills");
  if (pills) {
    pills.querySelectorAll<HTMLElement>(".wb-library-pill").forEach(b => {
      b.dataset.active = b.dataset.filter === "recent" ? "true" : "false";
    });
  }
  const searchInput = document.getElementById("wb-library-search") as HTMLInputElement | null;
  if (searchInput) searchInput.value = "";
  wireLibraryPills();
  wireLibrarySearch();
  wireLibraryNavigation();
  wireLibraryResizer();
  wireWhiteboardDrop();
  // Entering whiteboard mode resets to list view.
  closeLibraryDetail();
  loadLibraryPage({ reset: true });
}

// Drag the vertical splitter between canvas and library to resize the sidebar.
// Width persists to localStorage so it survives reloads.
const LIBRARY_WIDTH_KEY = "lens.wb-library-width";
const LIBRARY_WIDTH_MIN = 260;
const LIBRARY_WIDTH_MAX = 720;
const LIBRARY_WIDTH_DEFAULT = 360;

function applyLibraryWidth(px: number) {
  const clamped = Math.max(LIBRARY_WIDTH_MIN, Math.min(LIBRARY_WIDTH_MAX, Math.round(px)));
  document.documentElement.style.setProperty("--wb-library-w", `${clamped}px`);
  // Whiteboard has an internal ResizeObserver — it'll redraw edges on its own.
}

function wireLibraryResizer() {
  const resizer = document.getElementById("wb-resizer");
  const container = document.getElementById("whiteboard-container");
  if (!resizer || !container) return;

  // Apply persisted width once, on first mount.
  if (!document.documentElement.style.getPropertyValue("--wb-library-w")) {
    const saved = parseInt(localStorage.getItem(LIBRARY_WIDTH_KEY) || "", 10);
    applyLibraryWidth(Number.isFinite(saved) && saved > 0 ? saved : LIBRARY_WIDTH_DEFAULT);
  }

  if (resizer.dataset.wired === "1") return;
  resizer.dataset.wired = "1";

  let dragging = false;
  resizer.addEventListener("pointerdown", (ev) => {
    dragging = true;
    resizer.setPointerCapture(ev.pointerId);
    document.body.classList.add("wb-resizing");
    ev.preventDefault();
  });
  resizer.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    // Library sits on the right, so its width = container.right - pointer.x
    const rect = container.getBoundingClientRect();
    applyLibraryWidth(rect.right - ev.clientX);
  });
  const end = (ev: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    try { resizer.releasePointerCapture(ev.pointerId); } catch {}
    document.body.classList.remove("wb-resizing");
    // Persist final width
    const cur = document.documentElement.style.getPropertyValue("--wb-library-w");
    const n = parseInt(cur, 10);
    if (Number.isFinite(n) && n > 0) localStorage.setItem(LIBRARY_WIDTH_KEY, String(n));
  };
  resizer.addEventListener("pointerup", end);
  resizer.addEventListener("pointercancel", end);

  // Double-click the splitter → reset to default.
  resizer.addEventListener("dblclick", () => {
    applyLibraryWidth(LIBRARY_WIDTH_DEFAULT);
    localStorage.setItem(LIBRARY_WIDTH_KEY, String(LIBRARY_WIDTH_DEFAULT));
  });
}

/**
/**
 * Drag-and-drop target on the whiteboard canvas. When a library card is
 * dropped, we add it as a member of the current whiteboard via
 * POST /api/whiteboard/cards. After the write, the whiteboard reloads to
 * pick up the new member node.
 */
function wireWhiteboardDrop() {
  const host = document.getElementById("wb-canvas-host");
  if (!host) return;
  if (host.dataset.dropWired === "1") return;
  host.dataset.dropWired = "1";

  host.addEventListener("dragover", (ev) => {
    if (!ev.dataTransfer?.types.includes("application/x-lens-card")) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
    host.classList.add("wb-drop-active");
  });
  host.addEventListener("dragleave", (ev) => {
    if ((ev as DragEvent).relatedTarget && host.contains((ev as DragEvent).relatedTarget as Node)) return;
    host.classList.remove("wb-drop-active");
  });
  host.addEventListener("drop", async (ev) => {
    ev.preventDefault();
    host.classList.remove("wb-drop-active");
    const cardId = ev.dataTransfer?.getData("application/x-lens-card");
    if (!cardId || currentMode.kind !== "whiteboard") return;
    if (cardId === currentMode.id) return; // can't link a whiteboard to itself

    try {
      const resp = await fetch("/api/whiteboard/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ whiteboard_id: currentMode.id, card_id: cardId }),
      });
      const json = await resp.json();
      if (!json.ok) {
        console.warn("[lens view] drop failed", json);
        return;
      }
      const wbId = currentMode.id;
      currentMode = { kind: "graph" };
      await ensureWhiteboardMode(wbId);
    } catch (err) {
      console.error("[lens view] drop error", err);
    }
  });
}


interface WhiteboardListItem {
  id: string;
  title: string;
  card_count: number;
  updated_at?: string;
}

function closeWhiteboardPicker() {
  document.getElementById("whiteboard-picker-menu")?.remove();
  document.getElementById("whiteboard-picker-btn")?.classList.remove("open");
}

async function openWhiteboardPicker(anchor: HTMLElement) {
  closeWhiteboardPicker();
  const menu = document.createElement("div");
  menu.id = "whiteboard-picker-menu";
  menu.className = "whiteboard-picker-menu";
  menu.innerHTML = `<div class="wp-loading">Loading…</div>`;
  document.body.appendChild(menu);
  anchor.classList.add("open");

  // Position below the anchor button
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${rect.left}px`;

  try {
    const data = await fetchJson<{ items: WhiteboardListItem[] }>("/api/whiteboards?limit=100");
    const items = data.items;
    const current = currentMode.kind === "whiteboard" ? currentMode.id : "";
    const rows = items.map(w => `
      <button class="wp-row${w.id === current ? " wp-current" : ""}" data-id="${escapeAttr(w.id)}">
        <span class="wp-check">${w.id === current ? "✓" : ""}</span>
        <span class="wp-title">${escapeHtml(w.title || "(untitled)")}</span>
        <span class="wp-count">${w.card_count}</span>
      </button>
    `).join("");
    menu.innerHTML = `
      <div class="wp-head">Whiteboards <span class="wp-head-count">(${items.length})</span></div>
      <div class="wp-list">${rows || '<div class="wp-empty">No whiteboards yet.</div>'}</div>
      <div class="wp-sep"></div>
      <button class="wp-row wp-new" id="wp-new-btn">
        <span class="wp-check">+</span>
        <span class="wp-title">New whiteboard</span>
      </button>
    `;
    menu.querySelectorAll<HTMLElement>(".wp-row[data-id]").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.id!;
        closeWhiteboardPicker();
        if (currentMode.kind === "whiteboard" && currentMode.id === id) return;
        history.pushState({}, "", `/whiteboard/${encodeURIComponent(id)}`);
        route().catch(console.error);
      });
    });
    document.getElementById("wp-new-btn")?.addEventListener("click", () => {
      closeWhiteboardPicker();
      createNewWhiteboard();
    });
  } catch {
    menu.innerHTML = `<div class="wp-empty">Could not load whiteboards.</div>`;
  }
}

function wireWhiteboardPicker() {
  const btn = document.getElementById("whiteboard-picker-btn");
  if (!btn || btn.dataset.wired === "1") {
    // Re-bind is a no-op, but still ensure global close handler exists.
    bindWhiteboardPickerGlobals();
    return;
  }
  btn.dataset.wired = "1";
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (document.getElementById("whiteboard-picker-menu")) {
      closeWhiteboardPicker();
    } else {
      openWhiteboardPicker(btn);
    }
  });
  bindWhiteboardPickerGlobals();
}

function bindWhiteboardPickerGlobals() {
  if (document.body.dataset.wpGlobalsWired === "1") return;
  document.body.dataset.wpGlobalsWired = "1";
  document.addEventListener("click", (ev) => {
    const menu = document.getElementById("whiteboard-picker-menu");
    if (!menu) return;
    if ((ev.target as HTMLElement).closest("#whiteboard-picker-menu")) return;
    if ((ev.target as HTMLElement).closest("#whiteboard-picker-btn")) return;
    closeWhiteboardPicker();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (document.getElementById("whiteboard-picker-menu")) {
      ev.stopPropagation();
      closeWhiteboardPicker();
    }
  }, true);
}

function updateModeBadge() {
  const badge = document.getElementById("mode-badge");
  const relayout = document.getElementById("relayout");
  if (badge) {
    // Exit button uses history.back() so it returns to wherever the user came
    // from (reader page → whiteboard → reader page; landing → search →
    // landing). Falls through to the interceptor's pushState on manual clicks
    // since the × is bound as a button, not a link.
    const exitBtn = `<button class="mode-exit" onclick="history.length>1?history.back():(history.pushState({},'','/'),location.reload())" title="Back">×</button>`;
    if (currentMode.kind === "whiteboard") {
      // Clickable picker: shows the current whiteboard, clicking opens a
      // dropdown that lists every whiteboard in the graph + a "New" action.
      badge.innerHTML = `
        <button class="mode-picker" id="whiteboard-picker-btn" title="Switch whiteboard">
          <span class="mode-label">whiteboard</span>
          <span class="mode-title">${escapeHtml(currentMode.title)}</span>
          <span class="mode-chevron">▾</span>
        </button>
        ${exitBtn}`;
      badge.classList.remove("hidden");
      wireWhiteboardPicker();
    } else if (currentMode.kind === "search") {
      badge.innerHTML = `<span class="mode-label">search</span> <span class="mode-title">${escapeHtml(currentMode.query)}</span> ${exitBtn}`;
      badge.classList.remove("hidden");
    } else if (currentMode.kind === "card_page") {
      badge.innerHTML = `<span class="mode-label">note</span> ${exitBtn}`;
      badge.classList.remove("hidden");
    } else if (currentMode.kind === "digest") {
      badge.innerHTML = `<span class="mode-label">digest</span> <span class="mode-title">last ${currentMode.days} days</span> ${exitBtn}`;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
      badge.innerHTML = "";
    }
  }
  // Cytoscape relayout button is meaningless outside graph mode
  if (relayout) relayout.classList.toggle("hidden", currentMode.kind !== "graph");
  // Max toggle is pointless in card_page (the panel is the page, always full)
  const panelMax = document.getElementById("panel-max");
  if (panelMax) panelMax.classList.toggle("hidden", currentMode.kind === "card_page");
  // Topbar stats duplicate the landing hero stats — hide them on landing.
  const stats = document.getElementById("stats");
  if (stats) stats.classList.toggle("hidden", currentMode.kind === "landing");
  // Filter chips belong to the graph canvas; hide them everywhere else.
  const filters = document.getElementById("filters");
  if (filters) filters.classList.toggle("hidden", currentMode.kind !== "graph");
}

function wireCanvasInteractions() {
  if (!cy) return;

  // Node hover — transient highlight (only when no panel open / no focus).
  cy.on("mouseover", "node", (evt) => {
    if (currentCardId) return;
    cy!.batch(() => {
      clearCanvasClasses();
      evt.target.addClass("hovered");
    });
  });
  cy.on("mouseout", "node", () => {
    if (currentCardId) return;
    clearCanvasClasses();
  });

  // Single click a node = open it in the panel (via pushState + route)
  cy.on("tap", "node", (evt) => {
    const id = evt.target.id();
    const base = currentMode.kind === "whiteboard" ? `/whiteboard/${currentMode.id}` : "";
    if (currentCardId === id) {
      // Already open — close
      history.pushState({}, "", base || "/");
      route().catch(err => console.error(err));
      return;
    }
    const href = currentMode.kind === "whiteboard"
      ? `/whiteboard/${currentMode.id}?open=${encodeURIComponent(id)}`
      : `/view/${id}`;
    history.pushState({}, "", href);
    route().catch(err => console.error(err));
  });

  // Click empty canvas = close panel
  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      if (currentCardId) {
        const base = currentMode.kind === "whiteboard" ? `/whiteboard/${currentMode.id}` : "/";
        history.pushState({}, "", base);
        route().catch(err => console.error(err));
      }
    }
  });

  // Dragging a node persists its position (debounced) — the one "whiteboard"-
  // style interaction we grant in all modes.
  cy.on("dragfree", "node", () => schedulePersistPositions());

  // Edge hover = show reason tooltip
  const tooltip = document.getElementById("edge-tooltip")!;
  cy.on("mouseover", "edge", (evt) => {
    const d = evt.target.data();
    if (!d.reason) return;
    tooltip.innerHTML = `<span class="edge-rel" style="color:${REL_COLOR[d.rel] || "#8b949e"}">${escapeHtml(d.rel)}</span><div class="edge-reason">${escapeHtml(d.reason)}</div>`;
    tooltip.classList.remove("hidden");
  });
  cy.on("mousemove", "edge", (evt) => {
    const pos = evt.originalEvent as MouseEvent | undefined;
    if (!pos) return;
    tooltip.style.left = `${pos.clientX + 14}px`;
    tooltip.style.top = `${pos.clientY + 14}px`;
  });
  cy.on("mouseout", "edge", () => tooltip.classList.add("hidden"));
}

// ── Filters ──────────────────────────────────────────────────

function applyFilters() {
  if (!cy) return;
  cy.batch(() => {
    cy!.nodes().forEach(n => n.style("display", typeFilter.has(n.data("type")) ? "element" : "none"));
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

// ── Relayout / stats / search ────────────────────────────────

function wireRelayout() {
  const btn = document.getElementById("relayout");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!cy) return;
    const layout = cy.layout({
      name: "fcose" as any, animate: true, randomize: true, quality: "default",
      nodeRepulsion: 20000, idealEdgeLength: 260, nodeSeparation: 180, uniformNodeDimensions: true,
    } as any);
    layout.run();
    layout.on("layoutstop", () => {
      const positions: Record<string, { x: number; y: number }> = {};
      cy!.nodes().forEach(n => { positions[n.id()] = n.position(); });
      saveLayout(positions).catch(() => {});
    });
  });
}

function updateStats(s: GraphPayload["stats"]) {
  const el = document.getElementById("stats");
  if (el) el.textContent = `${s.notes} notes · ${s.sources} sources · ${s.tasks} tasks · ${s.edges} links`;
}

function wireSearch() {
  const input = document.getElementById("search") as HTMLInputElement;
  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const q = input.value.trim();
    if (!q) return;
    if (!currentGraph) return;
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

function wirePanelToolbar() {
  document.getElementById("panel-close")!.addEventListener("click", () => {
    const base = currentMode.kind === "whiteboard"
      ? `/whiteboard/${currentMode.id}`
      : currentMode.kind === "search"
        ? `/search?q=${encodeURIComponent(currentMode.query)}`
        : "/";
    history.pushState({}, "", base);
    route().catch(err => console.error(err));
  });
  document.getElementById("panel-max")!.addEventListener("click", toggleMaximize);
}

// ── Optional FPS meter (spike artifact) ──────────────────────

function mountFpsMeter() {
  if (document.getElementById("fps-meter")) return;
  const meter = document.createElement("div");
  meter.id = "fps-meter";
  meter.style.cssText =
    "position:fixed;top:52px;right:8px;z-index:9999;background:rgba(0,0,0,0.7);" +
    "color:#e6edf3;font:11px 'SF Mono',Menlo,monospace;padding:4px 8px;" +
    "border-radius:4px;pointer-events:none;min-width:90px;text-align:right";
  document.body.appendChild(meter);
  let frames = 0;
  let lastReport = performance.now();
  let minFps = Infinity;
  let interacting = false;
  let interactTimer = 0;
  const mark = () => {
    interacting = true;
    clearTimeout(interactTimer);
    interactTimer = window.setTimeout(() => { interacting = false; minFps = Infinity; }, 1200);
  };
  cy?.on("pan zoom", mark);
  function frame() {
    frames++;
    const now = performance.now();
    if (now - lastReport >= 250) {
      const fps = (frames * 1000) / (now - lastReport);
      if (interacting) minFps = Math.min(minFps, fps);
      meter.textContent = interacting
        ? `${fps.toFixed(0)} fps (min ${isFinite(minFps) ? minFps.toFixed(0) : "—"})`
        : "idle";
      meter.style.color = fps > 50 ? "#3fb950" : fps > 30 ? "#f0b429" : "#f85149";
      frames = 0;
      lastReport = now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

// Create a new whiteboard from anywhere — topbar button, keyboard shortcut,
// or any future entry point. Creates the whiteboard server-side,
// navigates to it, and lets the user start dropping cards immediately.
async function createNewWhiteboard(opts: { title?: string } = {}): Promise<string | null> {
  try {
    const body = opts.title ? JSON.stringify({ title: opts.title }) : "{}";
    const resp = await fetch("/api/whiteboard/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const json = await resp.json();
    if (!json.ok) return null;
    const newId = json.data.id as string;
    history.pushState({}, "", `/whiteboard/${encodeURIComponent(newId)}`);
    route().catch(console.error);
    return newId;
  } catch (err) {
    console.error("[lens view] new whiteboard failed", err);
    return null;
  }
}

function wireGlobalNewWhiteboard() {
  document.getElementById("new-whiteboard-top")?.addEventListener("click", () => {
    createNewWhiteboard();
  });
  // Cmd+Shift+N (or Ctrl+Shift+N on non-Mac) — new whiteboard from anywhere.
  document.addEventListener("keydown", (ev) => {
    if (!(ev.metaKey || ev.ctrlKey)) return;
    if (!ev.shiftKey) return;
    if (ev.key.toLowerCase() !== "n") return;
    // Skip when focus is in an input — don't steal typing from search/text fields.
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    ev.preventDefault();
    createNewWhiteboard();
  });
}

// ── Boot ─────────────────────────────────────────────────────

wireFilters();
wireRelayout();
wireSearch();
wirePanelToolbar();
wireLinkInterception();
wireCardKeyNav();
wireGlobalNewWhiteboard();

bootCanvas()
  .then(() => route())
  .catch(err => {
    console.error("bootCanvas failed:", err);
    document.getElementById("empty")?.classList.remove("hidden");
  });
