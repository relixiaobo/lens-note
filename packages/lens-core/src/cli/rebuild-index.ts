/**
 * lens rebuild-index — Rebuild SQLite cache from markdown files.
 */

import { rebuildAllIndex, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function rebuildIndex(opts: CommandOptions) {
  ensureInitialized();
  const start = Date.now();
  const count = rebuildAllIndex();
  const elapsed = Date.now() - start;

  if (opts.json) {
    console.log(JSON.stringify({ indexed: count, elapsed_ms: elapsed }));
  } else {
    console.log(`Rebuilt index: ${count} objects indexed in ${elapsed}ms`);
  }
}
