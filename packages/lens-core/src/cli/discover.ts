/**
 * lens discover <id> — Discover related notes with different scopes.
 *
 * Default:      Exclude 1-2 hop link neighborhood → find unlinked-but-related notes.
 * --collide:    Exclude entire connected component → find cross-domain surprises.
 * --duplicates: No exclusion → find near-duplicates for merge.
 * --all --duplicates: Scan all notes, group duplicate clusters.
 */

import {
  readObject,
  findSimilarNotes,
  findAllSimilarGroups,
  ensureInitialized,
  resolveIdOrTitle,
  setReadonly,
  getLinkNeighborhood,
  getConnectedComponent,
  findSimilarExcluding,
} from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

export async function runDiscover(input: string | undefined, opts: CommandOptions) {
  setReadonly();
  ensureInitialized();

  const duplicates = opts.duplicates === true;
  const collide = opts.collide === true;

  if (duplicates && collide) {
    throw new Error("Cannot use both --duplicates and --collide.");
  }

  // --all --duplicates: global duplicate scan
  if (opts.all) {
    if (!duplicates) throw new Error("--all requires --duplicates.");
    if (input) throw new Error("Cannot use both <id> and --all.");

    const threshold = opts.threshold ? parseFloat(String(opts.threshold)) : 0.3;
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error("--threshold must be a number between 0 and 1");
    }

    const result = findAllSimilarGroups(threshold);

    if (opts.json) {
      respondSuccess(result);
    } else {
      if (result.count === 0) {
        console.log(`No similar groups found (threshold: ${threshold})`);
        return;
      }
      console.log(`${result.count} group(s) of similar notes:\n`);
      for (let i = 0; i < result.groups.length; i++) {
        const g = result.groups[i];
        console.log(`Group ${i + 1} (${g.notes.length} notes):`);
        for (const n of g.notes) {
          console.log(`  ${n.id}  ${n.title}`);
        }
        for (const p of g.pairs) {
          const pct = (p.similarity * 100).toFixed(0);
          console.log(`    ${pct}%  ${p.a} ↔ ${p.b}`);
        }
        console.log();
      }
    }
    return;
  }

  // Single-note mode — require id
  if (!input) {
    throw new Error(
      duplicates
        ? "Usage: lens discover <id|title> --duplicates [--threshold 0.3]  or  lens discover --all --duplicates"
        : collide
          ? "Usage: lens discover <id|title> --collide [--count 3]"
          : "Usage: lens discover <id|title> [--count 10] [--hops 2]",
    );
  }

  const resolved = resolveIdOrTitle(input);
  if ("error" in resolved) {
    if (opts.json && resolved.candidates) {
      const { respondError } = await import("./response");
      respondError("ambiguous_match", resolved.error, undefined, { candidates: resolved.candidates });
      return;
    }
    throw new Error(resolved.error);
  }

  const id = resolved.id;
  const target = readObject(id);
  if (!target) throw new Error(`Object not found: ${id}.`);
  if (target.data.type !== "note") throw new Error(`discover only works with notes, got ${target.data.type}.`);

  // --duplicates: find near-duplicates (no exclusion)
  if (duplicates) {
    const threshold = opts.threshold ? parseFloat(String(opts.threshold)) : 0.3;
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error("--threshold must be a number between 0 and 1");
    }
    const results = findSimilarNotes(id, threshold);
    if (opts.json) {
      respondSuccess({ id, count: results.length, results });
    } else {
      if (results.length === 0) {
        console.log(`No duplicates found (threshold: ${threshold})`);
        return;
      }
      console.log(`${results.length} potential duplicate(s):\n`);
      for (const r of results) {
        const pct = (r.similarity * 100).toFixed(0);
        console.log(`  ${pct}%  ${r.title}`);
        console.log(`      ${r.id}`);
      }
    }
    return;
  }

  // --collide: exclude entire connected component
  if (collide) {
    const count = opts.count ? parseInt(String(opts.count), 10) : 3;
    const component = getConnectedComponent(id);
    const results = findSimilarExcluding(id, component, count);

    if (opts.json) {
      respondSuccess({
        id,
        component_size: component.size,
        excluded: component.size,
        count: results.length,
        results,
        hint: results.length > 0
          ? "Review each candidate. If a genuine connection exists, create a link: lens write link."
          : "No cross-domain candidates found. The note may be too generic, or the graph is too interconnected.",
      });
    } else {
      if (results.length === 0) {
        console.log(`No collision candidates found (excluded ${component.size} connected notes).`);
        console.log("The note may be too generic, or the graph is too interconnected.");
        return;
      }
      console.log(`${results.length} collision candidate(s) from outside the connected component:\n`);
      for (const r of results) {
        const pct = (r.similarity * 100).toFixed(0);
        console.log(`  ${pct}%  ${r.title}`);
        console.log(`      ${r.id}`);
      }
      console.log("\nReview each candidate. If a genuine connection exists, create a link.");
    }
    return;
  }

  // Default: exclude link neighborhood → find unlinked-but-related
  const count = opts.count ? parseInt(String(opts.count), 10) : 10;
  const hops = opts.hops ? parseInt(String(opts.hops), 10) : 2;
  const neighborhood = getLinkNeighborhood(id, hops);
  const results = findSimilarExcluding(id, neighborhood, count);

  if (opts.json) {
    respondSuccess({ id, neighborhood_size: neighborhood.size, count: results.length, results });
  } else {
    if (results.length === 0) {
      console.log(`No nearby-but-unlinked notes found (excluded ${neighborhood.size} linked neighbors).`);
      return;
    }
    console.log(`${results.length} note(s) conceptually nearby but not linked:\n`);
    for (const r of results) {
      const pct = (r.similarity * 100).toFixed(0);
      console.log(`  ${pct}%  ${r.title}`);
      console.log(`      ${r.id}`);
    }
  }
}
