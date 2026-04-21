/**
 * Shared promotion crossing: board-local arrow → graph rel.
 *
 * This is the ONE sanctioned place where a whiteboard operation touches the
 * graph layer (`note.links[]`). Both the CLI handler (`lens board
 * arrow-promote`) and the view server's HTTP endpoint route through here so
 * validation, conflict handling, and compensation stay consistent.
 *
 * Not put in `core/whiteboard-storage.ts` on purpose: that module is supposed
 * to stay independent of the graph layer (see docs/whiteboard-model.md).
 */

import {
  ArrowPromotionConflict,
  readWhiteboard,
  setArrowPromotion,
} from "../core/whiteboard-storage";
import { writeLink, writeUnlink } from "./write";
import { LensError } from "./response";
import type { LinkRel, WhiteboardArrow } from "../core/types";

const VALID_LINK_RELS: ReadonlySet<LinkRel> = new Set(
  ["supports", "contradicts", "refines", "related", "continues"] as const,
);
const NOTE_ID = /^note_[A-Z0-9]{26}$/;

export interface PromoteArrowResult {
  arrow: WhiteboardArrow;
  link: ReturnType<typeof writeLink>;
}

/**
 * Promote a board-local arrow to a graph rel. Steps:
 *   1. Re-read the whiteboard and locate the arrow.
 *   2. Validate both endpoints are notes (graph rels only live on notes).
 *   3. Check for existing promotion: same rel → no-op; different rel → throw.
 *   4. Create the graph rel via `writeLink` (idempotent).
 *   5. Record the promotion on the arrow. If recording fails (e.g., arrow
 *      was deleted by a concurrent CLI in another process), compensate by
 *      rolling back the link so the graph layer stays consistent with the
 *      arrow's `promoted_to`.
 *
 * All steps run synchronously; inside a single Node process the event loop
 * already serializes concurrent handlers. The compensation in step 5 covers
 * the rare cross-process race.
 */
export function promoteArrow(
  wbId: string,
  arrowId: string,
  rel: string,
  reason?: string,
): PromoteArrowResult {
  if (!VALID_LINK_RELS.has(rel as LinkRel)) {
    throw new LensError(
      `Invalid --rel: "${rel}" (expected one of ${[...VALID_LINK_RELS].join(", ")})`,
      { code: "invalid_arg" },
    );
  }

  const wb = readWhiteboard(wbId);
  if (!wb) throw new LensError(`Whiteboard not found: ${wbId}`, { code: "not_found" });
  const arrow = wb.arrows.find(a => a.id === arrowId);
  if (!arrow) throw new LensError(`Arrow not found: ${arrowId}`, { code: "not_found" });

  if (!NOTE_ID.test(arrow.from) || !NOTE_ID.test(arrow.to)) {
    throw new LensError(
      "arrow-promote requires both endpoints to be notes (note_<ULID>)",
      {
        code: "invalid_arg",
        hint: "Source/task endpoints can't hold graph rels. Only note → note arrows promote.",
      },
    );
  }

  // Conflict check BEFORE writing the graph link — cheaper + avoids having to
  // roll back a freshly-written rel when the caller picked the wrong flag.
  if (arrow.promoted_to) {
    const same =
      arrow.promoted_to.rel === rel
      && arrow.promoted_to.from_note === arrow.from
      && arrow.promoted_to.to_note === arrow.to;
    if (!same) {
      throw new LensError(
        `Arrow is already promoted to ${arrow.promoted_to.rel} (${arrow.promoted_to.from_note} → ${arrow.promoted_to.to_note}); demote it first before re-promoting.`,
        { code: "promotion_conflict" },
      );
    }
    // Same rel + endpoints — the link may or may not exist yet (idempotent
    // writeLink handles both). Still call through so we get a canonical link
    // object for the response.
  }

  const link = writeLink({
    from: arrow.from,
    to: arrow.to,
    rel,
    ...(reason ? { reason } : {}),
  });

  try {
    setArrowPromotion(wbId, arrowId, {
      rel: rel as LinkRel,
      from_note: arrow.from,
      to_note: arrow.to,
    });
  } catch (e) {
    // Only compensate on a genuine failure to record the promotion. A conflict
    // thrown here means another writer slipped in between our check and this
    // call — treat that as the caller's conflict and roll back the link.
    if (e instanceof ArrowPromotionConflict) {
      writeUnlink({ from: arrow.from, to: arrow.to, rel });
      throw new LensError(e.message, { code: "promotion_conflict" });
    }
    throw e;
  }

  // Re-read so we return the post-promotion arrow shape. If the arrow has
  // been deleted by a concurrent writer after we wrote the link, roll back.
  const after = readWhiteboard(wbId);
  const stored = after?.arrows.find(a => a.id === arrowId);
  if (!stored) {
    writeUnlink({ from: arrow.from, to: arrow.to, rel });
    throw new LensError(
      `Arrow ${arrowId} was removed during promotion; graph link has been rolled back.`,
      { code: "concurrent_modification" },
    );
  }

  return { arrow: stored, link };
}
