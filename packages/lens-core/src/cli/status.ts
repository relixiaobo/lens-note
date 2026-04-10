/**
 * lens status — Show system status.
 */

import { existsSync, statSync } from "fs";
import { paths } from "../core/paths";
import { listObjects } from "../core/storage";
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

  const counts = {
    notes: listObjects("note").length,
    sources: listObjects("source").length,
    threads: listObjects("thread").length,
  };

  // Include WAL file in cache size
  const cacheSize = fileSize(paths.db) + fileSize(paths.db + "-wal") + fileSize(paths.db + "-shm");

  const status = {
    initialized: true,
    path: paths.root,
    objects: counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    cache_size_bytes: cacheSize,
  };

  if (opts.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(`lens status`);
    console.log(`  Path: ${paths.root}`);
    console.log(`  Notes:    ${counts.notes}`);
    console.log(`  Sources:  ${counts.sources}`);
    console.log(`  Threads:  ${counts.threads}`);
    console.log(`  Total:    ${status.total} objects`);
    console.log(`  Cache:    ${(cacheSize / 1024).toFixed(1)} KB`);
  }
}
