/**
 * lens rebuild-index — Rebuild SQLite cache from markdown files.
 */

import { rebuildAllIndex, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

export async function rebuildIndex(opts: CommandOptions) {
  ensureInitialized();
  const start = Date.now();
  const count = rebuildAllIndex();
  const elapsed = Date.now() - start;

  if (opts.json) {
    respondSuccess({ indexed: count, elapsed_ms: elapsed });
  } else {
    console.log(`Rebuilt index: ${count} objects indexed in ${elapsed}ms`);
  }
}
