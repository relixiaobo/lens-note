/**
 * Whiteboard payload + renderer contract shared between the host (`app.ts`)
 * and the React Flow renderer (`whiteboard-rf.tsx`).
 *
 * The actual renderer lives in `whiteboard-rf.tsx`. This file used to also
 * contain a DOM+SVG renderer, kept behind `?engine=rf` as a fallback during
 * migration. Phase 4 deleted it: RF is the only renderer, this file is now
 * pure types.
 */

export interface WhiteboardNode {
  id: string;
  type: "note" | "source" | "task";
  title: string;
  body: string;
  x?: number;
  y?: number;
  source_type?: string;
  status?: string;
  parent?: string;
}

export interface WhiteboardLayoutEntry {
  x: number;
  y: number;
}

export interface WhiteboardEdge {
  from: string;
  to: string;
  rel: string;
  reason?: string;
}

/** Board-local arrow. Distinct from WhiteboardEdge (which is a graph rel). */
export interface WhiteboardArrow {
  id: string;
  from: string;
  to: string;
  label?: string;
  color?: string;
  style?: "solid" | "dashed";
  promoted?: { rel: string; from_note: string; to_note: string };
}

export interface WhiteboardPayload {
  whiteboard: { id: string; title: string; body?: string; updated_at: string };
  nodes: WhiteboardNode[];
  edges: WhiteboardEdge[];
  arrows?: WhiteboardArrow[];
}

export interface WhiteboardCamera {
  x: number;
  y: number;
  scale: number;
}

export interface WhiteboardOptions {
  container: HTMLElement;
  payload: WhiteboardPayload;
  layout: Record<string, WhiteboardLayoutEntry>;
  camera: WhiteboardCamera | null;
  onCardClick: (id: string) => void;
  onLayoutChange: (layout: Record<string, WhiteboardLayoutEntry>) => void;
  onCameraChange: (camera: WhiteboardCamera) => void;
  onBackgroundTap: () => void;
  // Optional: engines that expose a delete-key gesture call this with the
  // member id so the host can remove it from the whiteboard. If absent,
  // delete-by-keyboard is disabled.
  onCardRemove?: (id: string) => void;
  // Board-local arrow hooks. If `onArrowCreate` is provided, engines that
  // support connection gestures (handle-drag in RF) will enable them.
  onArrowCreate?: (from: string, to: string) => void;
  onArrowDelete?: (id: string) => void;
  // Promotion: host opens whatever picker it wants; arrow id is passed so the
  // host can look up endpoints + current label.
  onArrowPromote?: (id: string) => void;
}
