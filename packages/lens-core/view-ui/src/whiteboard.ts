/**
 * Whiteboard renderer — DOM cards + SVG edges, pan/zoom/drag.
 *
 * Unlike the main graph (cytoscape + WebGL, 900 nodes), whiteboards are small
 * (<50 cards) and the cards must render full markdown content at arbitrary
 * sizes. So we use a purely DOM-based approach:
 *
 *   .wb-root            overflow: hidden viewport
 *     .wb-world         transform: translate + scale  (the camera)
 *       <svg .wb-edges>  edges, inside world so they scale
 *       .wb-card        absolutely positioned inside world
 *         .wb-card-title
 *         .wb-card-body (markdown HTML)
 *
 * Interaction model mirrors Figma/Heptabase:
 *   - two-finger drag (wheel without ctrl) → pan
 *   - pinch (wheel with ctrl) or cmd+wheel → zoom
 *   - drag empty space → pan
 *   - drag card → reposition
 *   - click card → onCardClick
 */

import { marked } from "marked";

export interface WhiteboardNode {
  id: string;
  type: "note" | "source" | "task";
  title: string;
  body: string;
  x?: number;
  y?: number;
  is_ghost?: boolean;
  source_type?: string;
  status?: string;
}

export interface WhiteboardEdge {
  from: string;
  to: string;
  rel: string;
  reason?: string;
}

export interface WhiteboardPayload {
  whiteboard: { id: string; title: string; body?: string; updated_at: string };
  nodes: WhiteboardNode[];
  edges: WhiteboardEdge[];
}

export interface WhiteboardCamera {
  x: number;
  y: number;
  scale: number;
}

export interface WhiteboardOptions {
  container: HTMLElement;
  payload: WhiteboardPayload;
  layout: Record<string, { x: number; y: number }>;
  camera: WhiteboardCamera | null;
  onCardClick: (id: string) => void;
  onCardPromote: (id: string) => void;
  onLayoutChange: (layout: Record<string, { x: number; y: number }>) => void;
  onCameraChange: (camera: WhiteboardCamera) => void;
  onEdgeHover: (edge: WhiteboardEdge | null, clientX: number, clientY: number) => void;
  onBackgroundTap: () => void;
  tooltipEl: HTMLElement;
}

const REL_COLOR: Record<string, string> = {
  supports: "#2ea043",
  contradicts: "#f85149",
  refines: "#58a6ff",
  related: "#6e7681",
  indexes: "#a371f7",
  continues: "#e3b341",
  // `suggested` is synthetic — emitted by the desk to hint TF-IDF neighbors
  // that aren't yet explicitly linked. Rendered as dotted, muted.
  suggested: "#8b949e",
};

const TYPE_COLOR: Record<string, string> = {
  note: "#58a6ff",
  source: "#f0b429",
  task: "#8b949e",
};

const CARD_DEFAULT_WIDTH = 280;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}

function linkifyRefs(html: string, titleById: Map<string, string>): string {
  return html.replace(/\[\[((?:note|src|task)_[A-Z0-9]{26})\]\]/g, (_m, id: string) => {
    const title = titleById.get(id) || id;
    return `<a class="inline-ref" data-ref="${id}">${escapeHtml(title)}</a>`;
  });
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export class Whiteboard {
  private opts: WhiteboardOptions;
  private root: HTMLElement;
  private world: HTMLElement;
  private svg: SVGSVGElement;
  private edgeLayer: SVGGElement;
  private cards = new Map<string, HTMLElement>();
  private positions: Map<string, { x: number; y: number }>;
  private camera: WhiteboardCamera;
  private saveLayoutTimer: number | null = null;
  private saveCameraTimer: number | null = null;
  private destroyed = false;
  private resizeObserver: ResizeObserver;

  // Interaction state
  private draggingCard: { id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null = null;
  private panning: { startX: number; startY: number; origCam: WhiteboardCamera; moved: boolean } | null = null;

  constructor(opts: WhiteboardOptions) {
    this.opts = opts;
    this.positions = this.computeInitialLayout(opts.payload, opts.layout);
    this.camera = opts.camera ? { ...opts.camera } : { x: 0, y: 0, scale: 1 };

    // Build DOM skeleton
    this.root = document.createElement("div");
    this.root.className = "wb-root";
    this.world = document.createElement("div");
    this.world.className = "wb-world";
    this.root.appendChild(this.world);

    // SVG edge layer (inside world so edges zoom with cards)
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("wb-edges");
    this.svg.setAttribute("width", "100000");
    this.svg.setAttribute("height", "100000");
    this.svg.setAttribute("viewBox", "-50000 -50000 100000 100000");
    this.svg.style.position = "absolute";
    this.svg.style.left = "-50000px";
    this.svg.style.top = "-50000px";
    this.svg.style.pointerEvents = "none";
    this.svg.style.overflow = "visible";
    this.world.appendChild(this.svg);

    // Rel-specific arrow markers — shape encodes the semantic
    //   supports    →  filled triangle (strong, directional evidence)
    //   contradicts →  bold filled triangle (used on both ends = bidirectional)
    //   refines     →  open chevron (narrows toward target)
    //   indexes     →  diamond (hub / structural)
    //   continues   →  small filled triangle (flow / chain)
    //   related     →  (no arrow — symmetric)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const markerSpecs: Record<string, { viewBox: string; path: string; refX: number; width: number; fillOnly?: boolean }> = {
      supports:    { viewBox: "0 0 10 10", path: "M 0 0 L 10 5 L 0 10 z", refX: 9, width: 8 },
      contradicts: { viewBox: "0 0 10 10", path: "M 0 0 L 10 5 L 0 10 z", refX: 9, width: 9 },
      refines:     { viewBox: "0 0 10 10", path: "M 0 0 L 10 5 L 0 10", refX: 9, width: 9, fillOnly: false },
      indexes:     { viewBox: "0 0 12 10", path: "M 0 5 L 6 0 L 12 5 L 6 10 z", refX: 11, width: 9 },
      continues:   { viewBox: "0 0 10 10", path: "M 0 2 L 8 5 L 0 8 z", refX: 8, width: 7 },
    };
    for (const [rel, spec] of Object.entries(markerSpecs)) {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", `wb-arrow-${rel}`);
      marker.setAttribute("viewBox", spec.viewBox);
      marker.setAttribute("refX", spec.refX.toString());
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", spec.width.toString());
      marker.setAttribute("markerHeight", spec.width.toString());
      marker.setAttribute("orient", "auto-start-reverse");
      marker.setAttribute("markerUnits", "userSpaceOnUse");
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", spec.path);
      if (spec.fillOnly === false) {
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", REL_COLOR[rel]);
        p.setAttribute("stroke-width", "1.6");
        p.setAttribute("stroke-linecap", "round");
        p.setAttribute("stroke-linejoin", "round");
      } else {
        p.setAttribute("fill", REL_COLOR[rel]);
      }
      marker.appendChild(p);
      defs.appendChild(marker);
    }
    this.svg.appendChild(defs);

    this.edgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.edgeLayer.classList.add("wb-edge-layer");
    this.svg.appendChild(this.edgeLayer);

    // Cards
    const titleById = new Map<string, string>();
    for (const n of opts.payload.nodes) titleById.set(n.id, n.title);
    for (const n of opts.payload.nodes) {
      const card = this.createCard(n, titleById);
      this.cards.set(n.id, card);
      this.world.appendChild(card);
    }

    // Wire interactions
    this.wireInteractions();

    // Resize observer re-draws edges when card heights change (markdown loads async etc)
    this.resizeObserver = new ResizeObserver(() => this.redrawEdges());
    for (const c of this.cards.values()) this.resizeObserver.observe(c);

    // Mount
    opts.container.appendChild(this.root);

    // Initial paint
    this.applyCardPositions();
    this.applyCamera();
    // Cards contain markdown that may need a frame or two to finish laying out.
    // Two rAFs give us solid card dimensions before we compute edge endpoints + fit.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.destroyed) return;
        this.redrawEdges();
        if (!opts.camera) this.fit();
      });
    });
  }

  destroy() {
    this.destroyed = true;
    this.resizeObserver.disconnect();
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.root.remove();
  }

  /** Current positions + camera. For callers that need to persist state together. */
  snapshot(): { nodes: Record<string, { x: number; y: number }>; camera: WhiteboardCamera } {
    const nodes: Record<string, { x: number; y: number }> = {};
    for (const [id, p] of this.positions) nodes[id] = { ...p };
    return { nodes, camera: { ...this.camera } };
  }

  /** Zoom in/out centered on the viewport middle. */
  zoomBy(factor: number) {
    const rect = this.root.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  /**
   * Resolve all existing card overlaps in place. Passes multiple times through
   * the cards, pushing each out of its worst overlap until layout is clean.
   */
  tidy() {
    const maxPasses = 12;
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;
      for (const id of this.positions.keys()) {
        const pos = this.positions.get(id)!;
        const resolved = this.resolveCollisions(id, pos);
        if (Math.abs(resolved.x - pos.x) > 0.5 || Math.abs(resolved.y - pos.y) > 0.5) {
          this.positions.set(id, resolved);
          changed = true;
        }
      }
      if (!changed) break;
    }
    this.applyCardPositions();
    this.redrawEdges();
    this.scheduleLayoutSave();
  }

  // ── Layout ────────────────────────────────────────────────────

  private computeInitialLayout(
    payload: WhiteboardPayload,
    saved: Record<string, { x: number; y: number }>,
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const members = payload.nodes.filter(n => !n.is_ghost);
    const ghosts = payload.nodes.filter(n => n.is_ghost);

    // Members: use server-provided (x, y) if non-zero; otherwise fall back to saved layout;
    // otherwise place in a centered grid.
    const colW = 320;
    const rowH = 300;
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(Math.max(1, members.length)))));
    members.forEach((n, i) => {
      if (typeof n.x === "number" && typeof n.y === "number" && (n.x !== 0 || n.y !== 0)) {
        positions.set(n.id, { x: n.x, y: n.y });
        return;
      }
      if (saved[n.id]) {
        positions.set(n.id, saved[n.id]);
        return;
      }
      const row = Math.floor(i / cols);
      const col = i % cols;
      const startIdx = row * cols;
      const endIdx = Math.min(startIdx + cols, members.length);
      const itemsInRow = endIdx - startIdx;
      const rowWidth = (itemsInRow - 1) * colW;
      positions.set(n.id, {
        x: col * colW - rowWidth / 2,
        y: row * rowH,
      });
    });

    if (ghosts.length > 0) {
      const radius = 200 + Math.max(4, members.length) * 140;
      const centerX = 0;
      const rowCount = Math.ceil(members.length / cols);
      const centerY = (rowCount * rowH) / 2;

      ghosts.forEach((n, i) => {
        if (saved[n.id]) {
          positions.set(n.id, saved[n.id]);
          return;
        }
        const angle = (i / ghosts.length) * Math.PI * 2 - Math.PI / 2;
        positions.set(n.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius * 0.7,
        });
      });
    }

    return positions;
  }

  private applyCardPositions() {
    for (const [id, pos] of this.positions) {
      const card = this.cards.get(id);
      if (!card) continue;
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;
    }
  }

  private applyCamera() {
    this.world.style.transform = `translate(${this.camera.x}px, ${this.camera.y}px) scale(${this.camera.scale})`;
  }

  /** Fit all cards into the viewport with padding. */
  fit() {
    if (this.cards.size === 0) return;
    const pad = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [id, pos] of this.positions) {
      const card = this.cards.get(id);
      if (!card) continue;
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }
    if (!isFinite(minX)) return;
    const bbW = maxX - minX + pad * 2;
    const bbH = maxY - minY + pad * 2;
    const vw = this.root.clientWidth;
    const vh = this.root.clientHeight;
    const scale = clamp(Math.min(vw / bbW, vh / bbH), 0.15, 1.2);
    this.camera = {
      scale,
      x: vw / 2 - (minX + (maxX - minX) / 2) * scale,
      y: vh / 2 - (minY + (maxY - minY) / 2) * scale,
    };
    this.applyCamera();
    this.scheduleCameraSave();
  }

  // ── Cards ─────────────────────────────────────────────────────

  private createCard(n: WhiteboardNode, titleById: Map<string, string>): HTMLElement {
    const card = document.createElement("div");
    const classes = [`wb-card`, `type-${n.type}`];
    if (n.is_ghost) classes.push("is-ghost");
    card.className = classes.join(" ");
    card.dataset.id = n.id;

    if (n.is_ghost) {
      // Compact chip — title + type dot, single-line, dimmed. Double-click promotes.
      card.style.width = "200px";
      card.innerHTML = `
        <div class="wb-card-accent" style="background:${TYPE_COLOR[n.type] || "#30363d"}"></div>
        <div class="wb-card-inner no-fade">
          <div class="wb-card-title">${escapeHtml(n.title || "(untitled)")}</div>
          <div class="wb-ghost-hint">double-click to expand</div>
        </div>
      `;
      return card;
    }

    card.style.width = `${CARD_DEFAULT_WIDTH}px`;

    const bodyHtml = n.body
      ? linkifyRefs(marked.parse(n.body, { async: false }) as string, titleById)
      : "";

    const metaBits: string[] = [];
    if (n.type !== "note") metaBits.push(n.type);
    if (n.source_type) metaBits.push(n.source_type);
    if (n.status) metaBits.push(n.status);

    card.innerHTML = `
      <div class="wb-card-accent" style="background:${TYPE_COLOR[n.type] || "#30363d"}"></div>
      <div class="wb-card-inner no-fade">
        <div class="wb-card-title">${escapeHtml(n.title || "(untitled)")}</div>
        ${metaBits.length > 0 ? `<div class="wb-card-meta">${metaBits.map(escapeHtml).join(" · ")}</div>` : ""}
        ${bodyHtml ? `<div class="wb-card-body markdown">${bodyHtml}</div>` : ""}
      </div>
    `;

    requestAnimationFrame(() => {
      const inner = card.querySelector(".wb-card-inner") as HTMLElement | null;
      if (!inner) return;
      if (inner.scrollHeight > inner.clientHeight + 2) {
        inner.classList.remove("no-fade");
      }
    });

    return card;
  }

  focusCard(id: string | null) {
    for (const card of this.cards.values()) card.classList.remove("focused");
    if (id) {
      const el = this.cards.get(id);
      if (el) el.classList.add("focused");
    }
  }

  // ── Edge drawing ──────────────────────────────────────────────

  /** Tracks edge SVG elements — keyed by "cardA|cardB" unordered pair. */
  private edgeElements = new Map<string, {
    path: SVGPathElement;
    edges: WhiteboardEdge[];
    cardA: string;
    cardB: string;
  }>();

  private redrawEdges() {
    if (this.destroyed) return;
    this.edgeLayer.textContent = "";
    this.edgeElements.clear();

    // Dedup bidirectional contradicts pairs
    const seenContradicts = new Set<string>();
    const edges: WhiteboardEdge[] = [];
    for (const e of this.opts.payload.edges) {
      if (e.rel === "contradicts") {
        const k1 = `${e.from}|${e.to}`;
        const k2 = `${e.to}|${e.from}`;
        if (seenContradicts.has(k1) || seenContradicts.has(k2)) continue;
        seenContradicts.add(k1);
      }
      edges.push(e);
    }
    const relPriority: Record<string, number> = {
      related: 0, supports: 1, continues: 2, refines: 3, indexes: 4, contradicts: 5,
    };
    edges.sort((a, b) => (relPriority[a.rel] ?? 0) - (relPriority[b.rel] ?? 0));

    const rects = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of this.opts.payload.nodes) {
      const card = this.cards.get(n.id);
      if (!card) continue;
      const r = this.cardRect(n.id, card);
      if (r) rects.set(n.id, r);
    }

    // Group edges by unordered card pair — every pair renders as a single line.
    // If the pair has 2+ rels, the line goes neutral gray and a rel indicator
    // (colored dots) sits at the midpoint. If it has 1 rel, the line takes that
    // rel's color + arrow, same as before.
    const pairs = new Map<string, { cardA: string; cardB: string; edges: WhiteboardEdge[] }>();
    for (const e of edges) {
      const [cardA, cardB] = e.from < e.to ? [e.from, e.to] : [e.to, e.from];
      const key = `${cardA}|${cardB}`;
      if (!pairs.has(key)) pairs.set(key, { cardA, cardB, edges: [] });
      pairs.get(key)!.edges.push(e);
    }

    for (const [key, pair] of pairs) {
      const rA = rects.get(pair.cardA);
      const rB = rects.get(pair.cardB);
      if (!rA || !rB) continue;

      // Ports at the side midpoints, chosen by relative direction.
      const portA = this.pickPort(rA, rB);
      const portB = this.pickPort(rB, rA);
      const d = this.bezierPath(portA, portB);

      const isMulti = pair.edges.length > 1;

      // Use dominant (highest priority) rel to style the line.
      const dominant = pair.edges[pair.edges.length - 1]; // last = highest priority after sort
      const color = isMulti ? "#6e7681" : (REL_COLOR[dominant.rel] || "#6e7681");

      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hit.setAttribute("d", d);
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "16");
      hit.setAttribute("fill", "none");
      hit.style.pointerEvents = "stroke";
      hit.classList.add("wb-edge-hit");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", color);
      path.setAttribute("fill", "none");
      path.setAttribute("data-from", pair.cardA);
      path.setAttribute("data-to", pair.cardB);

      if (isMulti) {
        // Neutral line — the indicator carries the semantic info
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("opacity", "1");
      } else {
        const rel = dominant.rel;
        // Arrow marker reflects actual edge direction (from → to)
        if (rel === "contradicts") {
          path.setAttribute("marker-start", `url(#wb-arrow-${rel})`);
          path.setAttribute("marker-end", `url(#wb-arrow-${rel})`);
        } else if (rel !== "related") {
          // Arrow on whichever end is the "to" side
          const toIsB = dominant.to === pair.cardB;
          path.setAttribute(toIsB ? "marker-end" : "marker-start", `url(#wb-arrow-${rel})`);
        }
        if (rel === "contradicts" || rel === "indexes") path.setAttribute("stroke-width", "2.4");
        else if (rel === "refines") path.setAttribute("stroke-width", "1.9");
        else if (rel === "related") { path.setAttribute("stroke-width", "1.4"); path.setAttribute("stroke-dasharray", "5 5"); }
        else if (rel === "continues") { path.setAttribute("stroke-width", "1.8"); path.setAttribute("stroke-dasharray", "8 4"); }
        else if (rel === "suggested") { path.setAttribute("stroke-width", "1"); path.setAttribute("stroke-dasharray", "2 4"); path.setAttribute("opacity", "0.55"); }
        else path.setAttribute("stroke-width", "1.7");
      }
      path.setAttribute("stroke-linecap", "round");
      path.style.pointerEvents = "none";
      path.classList.add("wb-edge");

      this.edgeLayer.appendChild(hit);
      this.edgeLayer.appendChild(path);

      const restWidth = path.getAttribute("stroke-width")!;
      const hoverWidth = (parseFloat(restWidth) + 1.2).toString();

      // For multi-rel pairs: dot cluster at each connection point — the rel info
      // sits at the card's edge midpoint, not floating at the line middle.
      // For single-rel pairs: line color + arrow already carry the rel; no extra dot.
      const indicatorGroups: SVGGElement[] = [];
      if (isMulti) {
        const clusterA = this.buildPortCluster(pair.edges, portA);
        const clusterB = this.buildPortCluster(pair.edges, portB);
        indicatorGroups.push(clusterA, clusterB);
        this.edgeLayer.appendChild(clusterA);
        this.edgeLayer.appendChild(clusterB);
      }

      // Single hover tooltip for the whole pair: list all rels with directions
      const firstRelTooltipEdge: WhiteboardEdge = isMulti
        ? this.buildPairTooltipEdge(pair)
        : dominant;

      const onEnter = (ev: MouseEvent) => {
        path.classList.add("highlight-edge");
        path.setAttribute("stroke-width", hoverWidth);
        this.opts.onEdgeHover(firstRelTooltipEdge, ev.clientX, ev.clientY);
      };
      const onMove = (ev: MouseEvent) => this.opts.onEdgeHover(firstRelTooltipEdge, ev.clientX, ev.clientY);
      const onLeave = () => {
        path.classList.remove("highlight-edge");
        path.setAttribute("stroke-width", restWidth);
        this.opts.onEdgeHover(null, 0, 0);
      };
      hit.addEventListener("mouseenter", onEnter as EventListener);
      hit.addEventListener("mousemove", onMove as EventListener);
      hit.addEventListener("mouseleave", onLeave);
      for (const g of indicatorGroups) {
        g.addEventListener("mouseenter", onEnter as EventListener);
        g.addEventListener("mousemove", onMove as EventListener);
        g.addEventListener("mouseleave", onLeave);
      }

      this.edgeElements.set(key, { path, edges: pair.edges, cardA: pair.cardA, cardB: pair.cardB });
    }

    // Preserve highlight state across drag-redraws
    if (this.draggingCard) this.highlightEdgesFor(this.draggingCard.id);
  }

  /**
   * Multi-rel port indicator: one small circle pie-charted into N wedges, one
   * per rel. Sits at the card's edge midpoint, inner edge flush with the card
   * border. Clean, compact — and a natural "socket" for future drag-to-connect.
   */
  private buildPortCluster(
    pairEdges: WhiteboardEdge[],
    port: { x: number; y: number; side: string },
  ): SVGGElement {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("wb-pair-indicator");
    g.style.cursor = "pointer";

    const r = 6.5;
    const [nx, ny] = this.sideNormal(port.side);
    // Center the circle so its inner edge sits just outside the card border
    const offset = r;
    const cx = port.x + nx * offset;
    const cy = port.y + ny * offset;
    g.setAttribute("transform", `translate(${cx.toFixed(1)}, ${cy.toFixed(1)})`);

    // Background ring (slightly larger, dark) gives a halo so the wedges pop against any card color
    const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    halo.setAttribute("r", `${r + 1.2}`);
    halo.setAttribute("fill", "#0d1117");
    halo.setAttribute("stroke", "#30363d");
    halo.setAttribute("stroke-width", "1");
    g.appendChild(halo);

    const n = pairEdges.length;
    if (n === 1) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", `${r}`);
      c.setAttribute("fill", REL_COLOR[pairEdges[0].rel] || "#6e7681");
      g.appendChild(c);
    } else {
      // Pie slices, starting at 12 o'clock (angle -π/2), going clockwise
      for (let i = 0; i < n; i++) {
        const startA = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const endA = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n;
        const x1 = r * Math.cos(startA);
        const y1 = r * Math.sin(startA);
        const x2 = r * Math.cos(endA);
        const y2 = r * Math.sin(endA);
        const largeArc = endA - startA > Math.PI ? 1 : 0;
        const slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
        slice.setAttribute("d", `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`);
        slice.setAttribute("fill", REL_COLOR[pairEdges[i].rel] || "#6e7681");
        g.appendChild(slice);
      }
    }

    return g;
  }


  /** Synthesize a virtual edge carrying combined reason text for the tooltip. */
  private buildPairTooltipEdge(pair: { cardA: string; cardB: string; edges: WhiteboardEdge[] }): WhiteboardEdge {
    const titleFor = (id: string) =>
      this.opts.payload.nodes.find(n => n.id === id)?.title || id;
    const tA = titleFor(pair.cardA);
    const tB = titleFor(pair.cardB);
    const lines = pair.edges.map(e => {
      const dir = e.from === pair.cardA ? `${tA} → ${tB}` : `${tB} → ${tA}`;
      return `• ${e.rel}${e.reason ? ` — ${e.reason}` : ""}   (${dir})`;
    });
    return {
      from: pair.cardA,
      to: pair.cardB,
      rel: `${pair.edges.length} relations`,
      reason: lines.join("\n"),
    };
  }

  private cardRect(id: string, el: HTMLElement): { x: number; y: number; w: number; h: number } | null {
    const pos = this.positions.get(id);
    if (!pos) return null;
    return { x: pos.x, y: pos.y, w: el.offsetWidth, h: el.offsetHeight };
  }

  /**
   * Pick which side of card `a` the edge should exit from based on the angle
   * to card `b`. Angle-based (not axis-dominant) so 8 edges radiating from a
   * hub naturally spread across all four sides instead of stacking on two.
   *
   * The aspect ratio of the card shifts the sector boundaries — wider cards
   * prefer horizontal exits over vertical ones.
   */
  private pickPort(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ): { x: number; y: number; side: "top" | "bottom" | "left" | "right" } {
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    const tx = b.x + b.w / 2;
    const ty = b.y + b.h / 2;
    const dx = tx - cx;
    const dy = ty - cy;
    // Normalize by aspect: the diagonal from card center points to corner
    const nx = dx / (a.w / 2);
    const ny = dy / (a.h / 2);
    if (Math.abs(nx) > Math.abs(ny)) {
      return dx >= 0
        ? { x: a.x + a.w, y: cy, side: "right" }
        : { x: a.x,       y: cy, side: "left" };
    }
    return dy >= 0
      ? { x: cx, y: a.y + a.h, side: "bottom" }
      : { x: cx, y: a.y,       side: "top" };
  }

  /**
   * Build a cubic bezier between two ports. Control points are pulled OUT along each
   * port's side normal, but gently — a subtle arc, not a loop.
   */
  private bezierPath(a: { x: number; y: number; side: string }, b: { x: number; y: number; side: string }): string {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    // Gentle curve — short edges near straight, long edges with just enough arc to
    // leave each card perpendicular to its border. Keep pull short relative to
    // distance so lines don't loop.
    const pull = Math.min(90, Math.max(20, dist * 0.22));
    const [nax, nay] = this.sideNormal(a.side);
    const [nbx, nby] = this.sideNormal(b.side);
    // If both ports point away from each other (normal case), standard bezier works.
    // If they point at each other (same side facing), reduce pull to avoid loops.
    const dot = nax * nbx + nay * nby;
    const pullA = dot > 0 ? pull * 0.5 : pull;
    const pullB = dot > 0 ? pull * 0.5 : pull;
    const c1x = a.x + nax * pullA;
    const c1y = a.y + nay * pullA;
    const c2x = b.x + nbx * pullB;
    const c2y = b.y + nby * pullB;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }

  private sideNormal(side: string): [number, number] {
    switch (side) {
      case "top":    return [0, -1];
      case "bottom": return [0, 1];
      case "left":   return [-1, 0];
      case "right":  return [1, 0];
    }
    return [0, 0];
  }

  /** Dim all edges except those incident to the given card id. */
  private highlightEdgesFor(id: string | null) {
    for (const { path, cardA, cardB } of this.edgeElements.values()) {
      path.classList.remove("highlight-card", "dim");
      if (!id) continue;
      if (cardA === id || cardB === id) path.classList.add("highlight-card");
      else path.classList.add("dim");
    }
  }

  // ── Interaction ───────────────────────────────────────────────

  private wireInteractions() {
    // Pan / zoom via wheel (trackpad friendly)
    this.root.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      // pinch: chrome sends ctrlKey=true on pinch gesture over trackpad
      // cmd+wheel: user explicit zoom
      if (ev.ctrlKey || ev.metaKey) {
        const rect = this.root.getBoundingClientRect();
        const px = ev.clientX - rect.left;
        const py = ev.clientY - rect.top;
        const factor = Math.exp(-ev.deltaY * 0.01);
        this.zoomAt(px, py, factor);
      } else {
        // two-finger drag = pan
        this.camera.x -= ev.deltaX;
        this.camera.y -= ev.deltaY;
        this.applyCamera();
        this.scheduleCameraSave();
      }
    }, { passive: false });

    // Mouse down on empty area = start panning
    this.root.addEventListener("mousedown", (ev) => {
      const target = ev.target as Element | null;
      if (!target) return;
      // Ignore clicks inside cards / edge labels / links
      const card = target.closest(".wb-card");
      const link = target.closest("a");
      if (card || link) return;
      if (ev.button !== 0) return;
      this.panning = {
        startX: ev.clientX,
        startY: ev.clientY,
        origCam: { ...this.camera },
        moved: false,
      };
      this.root.classList.add("panning");
      ev.preventDefault();
    });

    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);

    // Card-specific listeners
    for (const [id, card] of this.cards) {
      this.wireCardDrag(id, card);
    }

    // Inline reference click
    this.root.addEventListener("click", (ev) => {
      const a = (ev.target as Element | null)?.closest("a.inline-ref") as HTMLAnchorElement | null;
      if (a) {
        ev.preventDefault();
        const ref = a.getAttribute("data-ref");
        if (ref) this.opts.onCardClick(ref);
      }
    });
  }

  private handleMouseMove = (ev: MouseEvent) => {
    if (this.destroyed) return;
    if (this.draggingCard) {
      const dx = (ev.clientX - this.draggingCard.startX) / this.camera.scale;
      const dy = (ev.clientY - this.draggingCard.startY) / this.camera.scale;
      if (!this.draggingCard.moved && Math.hypot(dx, dy) > 3) {
        this.draggingCard.moved = true;
      }
      if (this.draggingCard.moved) {
        const { id, origX, origY } = this.draggingCard;
        const proposed = { x: origX + dx, y: origY + dy };
        const resolved = this.resolveCollisions(id, proposed);
        this.positions.set(id, resolved);
        const card = this.cards.get(id);
        if (card) {
          card.style.left = `${resolved.x}px`;
          card.style.top = `${resolved.y}px`;
        }
        this.redrawEdges();
      }
      return;
    }
    if (this.panning) {
      const dx = ev.clientX - this.panning.startX;
      const dy = ev.clientY - this.panning.startY;
      if (!this.panning.moved && Math.hypot(dx, dy) > 3) this.panning.moved = true;
      this.camera.x = this.panning.origCam.x + dx;
      this.camera.y = this.panning.origCam.y + dy;
      this.applyCamera();
    }
  };

  private handleMouseUp = (_ev: MouseEvent) => {
    if (this.destroyed) return;
    if (this.draggingCard) {
      const dragged = this.draggingCard;
      this.draggingCard = null;
      const card = this.cards.get(dragged.id);
      card?.classList.remove("dragging");
      if (dragged.moved) {
        this.scheduleLayoutSave();
      } else {
        // It was a tap (no move) → open card
        this.opts.onCardClick(dragged.id);
      }
      return;
    }
    if (this.panning) {
      const wasPan = this.panning.moved;
      this.panning = null;
      this.root.classList.remove("panning");
      if (wasPan) {
        this.scheduleCameraSave();
      } else {
        this.opts.onBackgroundTap();
      }
    }
  };

  private wireCardDrag(id: string, card: HTMLElement) {
    card.addEventListener("mousedown", (ev) => {
      // Don't initiate drag if user clicked an inline link inside the card
      const link = (ev.target as Element | null)?.closest("a");
      if (link) return;
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const pos = this.positions.get(id);
      if (!pos) return;
      this.draggingCard = {
        id,
        startX: ev.clientX,
        startY: ev.clientY,
        origX: pos.x,
        origY: pos.y,
        moved: false,
      };
      card.classList.add("dragging");
    });

    // Card hover → highlight its incident edges, dim the rest
    card.addEventListener("mouseenter", () => {
      if (this.draggingCard || this.panning) return;
      card.classList.add("hover-incident");
      this.highlightEdgesFor(id);
    });
    card.addEventListener("mouseleave", () => {
      card.classList.remove("hover-incident");
      this.highlightEdgesFor(null);
    });

    // Double-click a ghost → promote it into a full member
    card.addEventListener("dblclick", (ev) => {
      if (!card.classList.contains("is-ghost")) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.opts.onCardPromote(id);
    });
  }

  /**
   * Iteratively push the dragged card out of any other card it overlaps.
   * Keeps a gap around cards so they can't touch. Limits iterations so a
   * "trapped" card (surrounded on all sides) doesn't spin the CPU.
   */
  private resolveCollisions(
    draggedId: string,
    proposed: { x: number; y: number },
  ): { x: number; y: number } {
    const draggedCard = this.cards.get(draggedId);
    if (!draggedCard) return proposed;
    const w = draggedCard.offsetWidth;
    const h = draggedCard.offsetHeight;
    const gap = 16;

    let x = proposed.x;
    let y = proposed.y;

    for (let iter = 0; iter < 8; iter++) {
      let worst: {
        overlapX: number;
        overlapY: number;
        bcx: number;
        bcy: number;
      } | null = null;
      let worstArea = 0;

      for (const [otherId, otherPos] of this.positions) {
        if (otherId === draggedId) continue;
        const otherCard = this.cards.get(otherId);
        if (!otherCard) continue;
        const ow = otherCard.offsetWidth;
        const oh = otherCard.offsetHeight;

        // Expanded AABB of the dragged card (include gap so there's always a buffer)
        const aL = x - gap, aR = x + w + gap;
        const aT = y - gap, aB = y + h + gap;
        const bL = otherPos.x, bR = otherPos.x + ow;
        const bT = otherPos.y, bB = otherPos.y + oh;

        const ox = Math.min(aR, bR) - Math.max(aL, bL);
        const oy = Math.min(aB, bB) - Math.max(aT, bT);
        if (ox > 0 && oy > 0) {
          const area = ox * oy;
          if (area > worstArea) {
            worstArea = area;
            worst = {
              overlapX: ox,
              overlapY: oy,
              bcx: otherPos.x + ow / 2,
              bcy: otherPos.y + oh / 2,
            };
          }
        }
      }

      if (!worst) break;

      const acx = x + w / 2;
      const acy = y + h / 2;
      // Push out along the axis with the smaller overlap (minimum translation vector)
      if (worst.overlapX < worst.overlapY) {
        x += acx < worst.bcx ? -worst.overlapX : worst.overlapX;
      } else {
        y += acy < worst.bcy ? -worst.overlapY : worst.overlapY;
      }
    }

    return { x, y };
  }

  private zoomAt(px: number, py: number, factor: number) {
    const newScale = clamp(this.camera.scale * factor, 0.1, 3);
    const actualFactor = newScale / this.camera.scale;
    // Keep the point under cursor fixed in world space
    this.camera.x = px - (px - this.camera.x) * actualFactor;
    this.camera.y = py - (py - this.camera.y) * actualFactor;
    this.camera.scale = newScale;
    this.applyCamera();
    this.scheduleCameraSave();
  }

  private scheduleLayoutSave() {
    if (this.saveLayoutTimer !== null) clearTimeout(this.saveLayoutTimer);
    this.saveLayoutTimer = window.setTimeout(() => {
      this.saveLayoutTimer = null;
      const out: Record<string, { x: number; y: number }> = {};
      for (const [id, p] of this.positions) out[id] = p;
      this.opts.onLayoutChange(out);
    }, 300);
  }

  private scheduleCameraSave() {
    if (this.saveCameraTimer !== null) clearTimeout(this.saveCameraTimer);
    this.saveCameraTimer = window.setTimeout(() => {
      this.saveCameraTimer = null;
      this.opts.onCameraChange({ ...this.camera });
    }, 300);
  }
}
