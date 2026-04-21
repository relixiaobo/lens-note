/**
 * Whiteboard renderer (React Flow engine).
 *
 * One renderer, not two. Default RF UI for everything except the card body:
 * cards use a custom `LensCard` node so we can show title + a truncated
 * markdown body preview inside a fixed-size box. Fixed dimensions are also
 * what lets dagre produce a clean auto-layout (the previous title-only
 * default node had unpredictable height, which made layouts overlap).
 */

import { createRoot, type Root } from "react-dom/client";
import {
  createRef,
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import {
  Background,
  Controls,
  ControlButton,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type ColorMode,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type Viewport,
} from "@xyflow/react";
import { marked } from "marked";

import type {
  WhiteboardArrow,
  WhiteboardCamera,
  WhiteboardEdge,
  WhiteboardLayoutEntry,
  WhiteboardNode,
  WhiteboardOptions,
  WhiteboardPayload,
} from "./whiteboard";

// Per-type accent — a thin left border on the card body lets you tell
// note / source / task apart at a glance.
const TYPE_ACCENT: Record<string, string> = {
  note: "#58a6ff",
  source: "#f0b429",
  task: "#8b949e",
};

const DEFAULT_VIEWPORT_PADDING = 0.15;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

// Card sizing — width is fixed so a grid / packed layout has stable columns,
// height is content-driven. CARD_MAX_H is the soft cap: cards that would
// render taller than this fade-truncate instead (user opens the side reader
// for the full text). CARD_SLOT_H is what the grid reserves per row — it
// has to be the MAX height so rows never overlap, even if most cards end
// up shorter.
const CARD_W = 280;
const CARD_MAX_H = 480;
const CARD_SLOT_H = CARD_MAX_H;

// Grid pitch — card size + gap, used for both initial fallback and reset.
const GRID_COL_GAP = 40;
const GRID_ROW_GAP = 40;
const GRID_COLS_MAX = 5;

/**
 * Neutral grid layout. Fills rows left-to-right in member order, no structural
 * meaning whatsoever. Used when a card has no saved position, or when the
 * user hits the reset action.
 *
 * Deliberately dumb: the whiteboard's job is to present positions the user
 * (or an agent) explicitly chose. Inferring layout from graph topology leaks
 * the graph layer into the whiteboard; inferring from body similarity /
 * clustering is more intelligence than a renderer should carry. Intelligent
 * placement happens at the agent layer via `lens board move` /
 * `lens board layout`; the renderer only falls back to this grid.
 */
function gridLayout(nodes: WhiteboardNode[]): Map<string, { x: number; y: number }> {
  const colStride = CARD_W + GRID_COL_GAP;
  const rowStride = CARD_SLOT_H + GRID_ROW_GAP;
  const cols = Math.min(GRID_COLS_MAX, Math.max(1, Math.ceil(Math.sqrt(nodes.length))));
  const rows = Math.ceil(nodes.length / cols);
  const xStart = -(cols * colStride - GRID_COL_GAP) / 2;
  const yStart = -(rows * rowStride - GRID_ROW_GAP) / 2;
  const out = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.set(n.id, { x: xStart + col * colStride, y: yStart + row * rowStride });
  });
  return out;
}

/**
 * Are any two card bounding boxes overlapping? Used to decide whether a
 * saved layout is worth respecting on mount — legacy layouts from the old
 * DOM renderer (different card size, tighter grid) routinely overlap with
 * the RF cards and look broken. If we detect overlap we fall back to the
 * neutral grid; otherwise we trust the user's arrangement.
 */
function hasOverlappingCards(positions: Map<string, { x: number; y: number }>): boolean {
  const pts = [...positions.values()];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j];
      // Use the slot height here too: a variable-height card can extend down
      // up to CARD_MAX_H, so any saved position closer than that vertically
      // is "at risk" of overlap with a tall neighbor.
      if (Math.abs(a.x - b.x) < CARD_W && Math.abs(a.y - b.y) < CARD_SLOT_H) return true;
    }
  }
  return false;
}

/**
 * Resolve positions for the initial mount. Priority:
 *   1. Saved user/agent positions — preserved verbatim when they're
 *      conflict-free. This is the whole point: layout decisions belong to
 *      the user or an agent acting on their behalf.
 *   2. Neutral grid fallback — when nothing is placed yet, or when the
 *      saved layout is stale (pre-RF card dimensions) enough to overlap.
 *
 * Note: the grid is semantically empty. It doesn't reflect graph structure
 * or anything else about the cards — just their member order. If the board
 * deserves meaningful placement, an agent (or the user) should do it.
 */
function resolveInitialPositions(
  nodes: WhiteboardNode[],
  saved: Record<string, WhiteboardLayoutEntry>,
): Map<string, { x: number; y: number }> {
  const merged = nodes.map(n => {
    const savedPos = saved[n.id];
    if (savedPos) return { ...n, x: savedPos.x, y: savedPos.y };
    return n;
  });

  const anyPlaced = merged.some(n => (n.x ?? 0) !== 0 || (n.y ?? 0) !== 0);
  if (!anyPlaced) return gridLayout(merged);

  const kept = new Map<string, { x: number; y: number }>();
  for (const n of merged) kept.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
  if (hasOverlappingCards(kept)) return gridLayout(merged);
  return kept;
}

// ── Custom node: LensCard ────────────────────────────────────
//
// Card showing title + markdown body. Width is fixed (CARD_W) so positions
// pack predictably; height is driven by content up to CARD_MAX_H, beyond
// which the fade-gradient takes over and the user opens the side reader.

interface LensCardData {
  title: string;
  body: string;
  kind: "note" | "source" | "task";
  accent: string;
  meta?: string;
  [key: string]: unknown;
}

function renderBodyHtml(body: string): string {
  if (!body) return "";
  try {
    return marked.parse(body, { async: false }) as string;
  } catch {
    return "";
  }
}

const LensCard = memo(function LensCard({ data, selected }: NodeProps) {
  const d = data as unknown as LensCardData;
  const bodyHtml = useMemo(() => renderBodyHtml(d.body), [d.body]);

  // Only show the fade gradient when content is actually being clipped by
  // CARD_MAX_H — otherwise it just covers empty space on short cards.
  const innerRef = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) { setTruncated(false); return; }
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [d.body, d.title, d.meta]);

  return (
    <div
      className={`lens-card${selected ? " selected" : ""}`}
      style={{ width: CARD_W, maxHeight: CARD_MAX_H }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="lens-card-accent" style={{ background: d.accent }} />
      <div
        ref={innerRef}
        className={`lens-card-inner${truncated ? " truncated" : ""}`}
      >
        <div className="lens-card-title">{d.title || "(untitled)"}</div>
        {d.meta ? <div className="lens-card-meta">{d.meta}</div> : null}
        {bodyHtml ? (
          <div
            className="lens-card-body markdown"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const nodeTypes: NodeTypes = { lensCard: LensCard };

// ── Data transforms ──────────────────────────────────────────

function buildNodes(
  payload: WhiteboardPayload,
  layout: Record<string, WhiteboardLayoutEntry>,
): RFNode[] {
  const positions = resolveInitialPositions(payload.nodes, layout);

  return payload.nodes.map<RFNode>(n => {
    const pos = positions.get(n.id) || { x: 0, y: 0 };
    const accent = TYPE_ACCENT[n.type] || "#30363d";
    const meta: string[] = [];
    if (n.type !== "note") meta.push(n.type);
    if (n.source_type) meta.push(n.source_type);
    if (n.status) meta.push(n.status);
    const data: LensCardData = {
      title: n.title || "(untitled)",
      body: n.body || "",
      kind: n.type,
      accent,
      ...(meta.length ? { meta: meta.join(" · ") } : {}),
    };
    return {
      id: n.id,
      position: pos,
      type: "lensCard",
      data: data as unknown as Record<string, unknown>,
      // Width is fixed; height is measured at runtime by RF based on actual
      // content. Leaving `height` unset lets RF pick it up from the DOM.
      width: CARD_W,
    };
  });
}

/** Build RF edges for board-local arrows. Graph rels never render on the
 * whiteboard (they inform dagre layout but stay invisible — see the comment
 * on `edges` in RFInner); these are the only lines you see here. */
function buildArrowEdges(arrows: WhiteboardArrow[]): RFEdge[] {
  return arrows.map<RFEdge>(a => {
    const promoted = !!a.promoted;
    const color = a.color || (promoted ? "#d2a8ff" : "#8b949e");
    const style = a.style || (promoted ? "solid" : "dashed");
    const edgeStyle: React.CSSProperties = { stroke: color };
    if (style === "dashed") edgeStyle.strokeDasharray = "6 4";
    return {
      id: a.id,
      source: a.from,
      target: a.to,
      label: a.label || (promoted ? `promoted: ${a.promoted?.rel}` : ""),
      style: edgeStyle,
      data: { kind: "arrow", promoted, label: a.label, promotion: a.promoted },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    };
  });
}

// ── Inner component ──────────────────────────────────────────

interface RFHandle {
  focusCard: (id: string | null) => void;
  fit: () => void;
  zoomBy: (factor: number) => void;
  tidy: () => void;
  snapshot: () => { nodes: Record<string, { x: number; y: number }>; camera: WhiteboardCamera };
}

interface InnerProps {
  opts: WhiteboardOptions;
}

const RFInner = forwardRef<RFHandle, InnerProps>(({ opts }, handleRef) => {
  const [nodes, setNodes] = useState<RFNode[]>(() => buildNodes(opts.payload, opts.layout));
  // Whiteboard renders ONLY its own arrows — the library graph rels are
  // deliberately not drawn here. The graph layer lives in the library
  // sidebar / main graph view / `lens discover` / `lens map`; showing it
  // again on the whiteboard would turn the board into a second graph view
  // and obscure what the user themselves has connected. Layout, likewise,
  // doesn't consult graph topology: that would let graph structure dictate
  // the board's spatial meaning by stealth. Placement is the user/agent's
  // job (via drag or `lens board move` / `lens board layout`); the renderer
  // only falls back to a neutral grid when nothing else is saved.
  const edges = useMemo(
    () => buildArrowEdges(opts.payload.arrows || []),
    [opts.payload.arrows],
  );

  const rf = useReactFlow();

  const persistPositions = useCallback((next: RFNode[]) => {
    const payload: Record<string, WhiteboardLayoutEntry> = {};
    for (const n of next) {
      payload[n.id] = { x: n.position.x, y: n.position.y };
    }
    opts.onLayoutChange(payload);
  }, [opts]);

  const onNodesChange = useCallback((changes: NodeChange<RFNode>[]) => {
    setNodes(curr => {
      const next = curr.map(n => ({ ...n }));
      for (const ch of changes) {
        if (ch.type === "position" && ch.position) {
          const idx = next.findIndex(n => n.id === ch.id);
          if (idx >= 0) next[idx] = { ...next[idx], position: ch.position };
        } else if (ch.type === "select") {
          const idx = next.findIndex(n => n.id === ch.id);
          if (idx >= 0) next[idx] = { ...next[idx], selected: ch.selected };
        }
      }
      return next;
    });
    if (changes.some(c => c.type === "position" && c.dragging === false)) {
      queueMicrotask(() => persistPositions(rf.getNodes()));
    }
  }, [persistPositions, rf]);

  const onNodeClick = useCallback((_: unknown, node: RFNode) => {
    opts.onCardClick(node.id);
  }, [opts]);

  const onMoveEnd = useCallback((_: unknown, viewport: Viewport) => {
    opts.onCameraChange({ x: viewport.x, y: viewport.y, scale: viewport.zoom });
  }, [opts]);

  const onPaneClick = useCallback(() => {
    opts.onBackgroundTap();
  }, [opts]);

  /**
   * Reset every card to the neutral grid. Intentionally dumb — no graph
   * topology, no content clustering. An agent can do smarter placement via
   * `lens board layout`; the UI only offers the "clear slate" fallback.
   */
  const resetToGrid = useCallback(() => {
    const currentNodes = rf.getNodes();
    if (currentNodes.length === 0) return;
    const stub: WhiteboardNode[] = currentNodes.map(n => ({
      id: n.id,
      type: "note", title: "", body: "",
    }));
    const grid = gridLayout(stub);
    const next = currentNodes.map(n => {
      const pos = grid.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });
    setNodes(next);
    // Persist from the post-layout array — reading rf.getNodes() here races
    // RF's reconciliation and would save stale positions.
    persistPositions(next);
    requestAnimationFrame(() => rf.fitView({ padding: 0.15, duration: 300 }));
  }, [rf, persistPositions]);

  useImperativeHandle(handleRef, () => ({
    focusCard: (id) => {
      setNodes(curr =>
        curr.map(n => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })),
      );
      if (id) {
        const node = rf.getNode(id);
        if (node) {
          rf.setCenter(node.position.x, node.position.y, { zoom: rf.getZoom(), duration: 300 });
        }
      }
    },
    fit: () => rf.fitView({ padding: 0.15, duration: 300 }),
    zoomBy: (factor) => rf.zoomTo(rf.getZoom() * factor, { duration: 200 }),
    tidy: resetToGrid,
    snapshot: () => {
      const out: Record<string, { x: number; y: number }> = {};
      for (const n of rf.getNodes()) out[n.id] = { x: n.position.x, y: n.position.y };
      const vp = rf.getViewport();
      return { nodes: out, camera: { x: vp.x, y: vp.y, scale: vp.zoom } };
    },
  }), [rf, resetToGrid]);

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    if (!opts.onCardRemove) return;
    for (const n of deleted) opts.onCardRemove(n.id);
  }, [opts]);

  // Drawing an arrow: user dragged from one node handle to another. Only
  // fires when both endpoints are board members (RF default). We send to
  // the host which hits POST /api/whiteboard/arrows.
  const onConnect = useCallback(
    (params: { source: string | null; target: string | null }) => {
      if (!opts.onArrowCreate || !params.source || !params.target) return;
      if (params.source === params.target) return;
      opts.onArrowCreate(params.source, params.target);
    },
    [opts],
  );

  const onEdgesDelete = useCallback((deleted: RFEdge[]) => {
    if (!opts.onArrowDelete) return;
    for (const e of deleted) {
      if ((e.data as { kind?: string } | undefined)?.kind === "arrow") {
        opts.onArrowDelete(e.id);
      }
    }
  }, [opts]);

  // Double-clicking a board arrow triggers promotion. Graph rels are
  // `selectable: false` so they won't receive this — but we guard anyway.
  const onEdgeDoubleClick = useCallback(
    (_: unknown, edge: RFEdge) => {
      if ((edge.data as { kind?: string } | undefined)?.kind !== "arrow") return;
      if (!opts.onArrowPromote) return;
      opts.onArrowPromote(edge.id);
    },
    [opts],
  );

  const defaultViewport: Viewport | undefined = opts.camera
    ? { x: opts.camera.x, y: opts.camera.y, zoom: opts.camera.scale }
    : undefined;

  // Light/dark both supported; "system" follows the OS so the board matches
  // whichever theme the host page is in.
  const colorMode: ColorMode = "system";

  // Delete-key gesture only active when at least one host handler is wired
  // (either cards or arrows). Setting `null` disables RF's built-in deletion.
  const deleteKeyCode =
    opts.onCardRemove || opts.onArrowDelete ? "Backspace" : null;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onMoveEnd={onMoveEnd}
      onPaneClick={onPaneClick}
      onNodesDelete={onNodesDelete}
      onConnect={onConnect}
      onEdgesDelete={onEdgesDelete}
      onEdgeDoubleClick={onEdgeDoubleClick}
      defaultViewport={defaultViewport}
      fitView={!defaultViewport}
      fitViewOptions={{ padding: DEFAULT_VIEWPORT_PADDING }}
      colorMode={colorMode}
      // Interaction: trackpad-friendly — two-finger drag pans, pinch zooms.
      panOnScroll
      zoomOnDoubleClick={false}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      // Selection: marquee-drag on empty canvas, shift for multi-select.
      selectionOnDrag
      selectNodesOnDrag={false}
      multiSelectionKeyCode="Shift"
      deleteKeyCode={deleteKeyCode}
      // Drawing is enabled only when the host accepts new arrows. Graph rels
      // are marked `deletable: false, selectable: false` per-edge, so they
      // stay read-only even when connect is on.
      nodesConnectable={!!opts.onArrowCreate}
      edgesFocusable={!!opts.onArrowDelete || !!opts.onArrowPromote}
      elevateNodesOnSelect
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls>
        <ControlButton onClick={resetToGrid} title="Reset to grid (ask an agent for smarter layouts via `lens board layout`)">
          {/* Stock RF control buttons render a single SVG; we follow suit.
              Simple "sparkle" glyph — no custom styling beyond the RF defaults. */}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0.5l1.9 4.6 4.6 1.9-4.6 1.9L8 13.5l-1.9-4.6L1.5 7l4.6-1.9L8 .5z" />
          </svg>
        </ControlButton>
      </Controls>
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
});
RFInner.displayName = "RFInner";

// ── Class adapter (matches Whiteboard class API) ─────────────

export class WhiteboardRF {
  private opts: WhiteboardOptions;
  private root: Root;
  private handleRef: RefObject<RFHandle | null>;
  private mountNode: HTMLDivElement;
  private destroyed = false;

  constructor(opts: WhiteboardOptions) {
    this.opts = opts;
    this.handleRef = createRef<RFHandle>();
    this.mountNode = document.createElement("div");
    this.mountNode.className = "wb-rf-mount";
    this.mountNode.style.cssText = "position:absolute;inset:0;";
    opts.container.appendChild(this.mountNode);
    this.root = createRoot(this.mountNode);
    this.root.render(
      <ReactFlowProvider>
        <RFInner ref={this.handleRef as Ref<RFHandle>} opts={opts} />
      </ReactFlowProvider>,
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.unmount();
    this.mountNode.remove();
  }

  focusCard(id: string | null): void {
    this.handleRef.current?.focusCard(id);
  }

  fit(): void {
    this.handleRef.current?.fit();
  }

  zoomBy(factor: number): void {
    this.handleRef.current?.zoomBy(factor);
  }

  tidy(): void {
    this.handleRef.current?.tidy();
  }

  snapshot(): { nodes: Record<string, { x: number; y: number }>; camera: WhiteboardCamera } {
    return this.handleRef.current?.snapshot() ?? {
      nodes: {},
      camera: this.opts.camera ?? { x: 0, y: 0, scale: 1 },
    };
  }
}
