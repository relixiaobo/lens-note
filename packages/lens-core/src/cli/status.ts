/**
 * lens status — System status + graph health metrics.
 *
 * One command for everything an agent needs to know about the knowledge graph.
 */

import { existsSync, statSync } from "fs";
import { paths } from "../core/paths";
import { listObjects, readObject, getForwardLinks, getBacklinks } from "../core/storage";
import type { CommandOptions } from "./commands";

function fileSize(path: string): number {
  return existsSync(path) ? statSync(path).size : 0;
}

export async function showStatus(opts: CommandOptions) {
  const initialized = existsSync(paths.config);

  if (!initialized) {
    if (opts.json) {
      console.log(JSON.stringify({ initialized: false }));
    } else {
      console.log("lens is not initialized. Run: lens init");
    }
    return;
  }

  const noteIds = listObjects("note");
  const sourceIds = listObjects("source");
  const taskIds = listObjects("task");
  const total = noteIds.length + sourceIds.length + taskIds.length;

  // Task status counts
  let tasksOpen = 0;
  let tasksDone = 0;
  for (const id of taskIds) {
    const obj = readObject(id);
    if (obj?.data.status === "done") tasksDone++;
    else tasksOpen++;
  }
  const cacheSize = fileSize(paths.db) + fileSize(paths.db + "-wal") + fileSize(paths.db + "-shm");

  // Graph health metrics
  let orphanCount = 0;
  let totalLinks = 0;
  const linkTypes: Record<string, number> = {};
  let crossSourceLinks = 0;

  const noteSourceMap = new Map<string, string>();
  for (const id of noteIds) {
    const obj = readObject(id);
    if (obj) noteSourceMap.set(id, obj.data.source || "");
  }

  for (const id of noteIds) {
    const fwd = getForwardLinks(id).filter(l => l.to_id.startsWith("note_"));
    const bck = getBacklinks(id).filter(l => l.from_id.startsWith("note_"));

    if (fwd.length === 0 && bck.length === 0) {
      orphanCount++;
    }

    const mySource = noteSourceMap.get(id) || "";
    for (const l of fwd) {
      totalLinks++;
      linkTypes[l.rel] = (linkTypes[l.rel] || 0) + 1;
      const targetSource = noteSourceMap.get(l.to_id) || "";
      if (mySource && targetSource && mySource !== targetSource) crossSourceLinks++;
    }
  }

  const status = {
    path: paths.root,
    notes: noteIds.length,
    sources: sourceIds.length,
    tasks: { open: tasksOpen, done: tasksDone, total: taskIds.length },
    total,
    connectivity: {
      orphan_count: orphanCount,
      orphan_rate: noteIds.length > 0 ? parseFloat((orphanCount / noteIds.length * 100).toFixed(1)) : 0,
      total_links: totalLinks,
      cross_source_pct: totalLinks > 0 ? parseFloat((crossSourceLinks / totalLinks * 100).toFixed(1)) : 0,
    },
    link_types: linkTypes,
  };

  if (opts.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    const check = (ok: boolean) => ok ? "OK" : "!!";
    console.log(`lens status`);
    console.log(`  Path:     ${paths.root}`);
    console.log(`  Notes:    ${noteIds.length}`);
    console.log(`  Sources:  ${sourceIds.length}`);
    console.log(`  Tasks:    ${taskIds.length} (${tasksOpen} open, ${tasksDone} done)`);
    console.log(`  Total:    ${total} objects`);
    console.log(`  Cache:    ${(cacheSize / 1024).toFixed(1)} KB`);
    console.log();
    console.log(`  ${check(orphanCount / Math.max(noteIds.length, 1) < 0.1)} Orphans:   ${orphanCount} (${status.connectivity.orphan_rate}%)`);
    console.log(`  ${check(totalLinks > 0)} Links:     ${totalLinks} (${Object.entries(linkTypes).map(([k,v]) => `${k}:${v}`).join(", ")})`);
    console.log(`  ${check(status.connectivity.cross_source_pct > 40)} Cross-src: ${status.connectivity.cross_source_pct}%`);
  }
}
