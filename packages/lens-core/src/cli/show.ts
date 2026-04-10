/**
 * lens show <id> — Show any lens object.
 */

import { readObject, ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";

export async function showObject(id: string, opts: CommandOptions) {
  ensureInitialized();

  const result = readObject(id);

  if (!result) {
    throw new Error(`Object not found: ${id}`);
  }

  if (opts.json) {
    console.log(JSON.stringify({ ...result.data, body: result.content.trim() }, null, 2));
  } else {
    const { data, content } = result;
    console.log(`--- ${data.type}: ${id} ---`);
    for (const [key, value] of Object.entries(data)) {
      if (key === "type" || key === "id") continue;
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        // Check if array contains objects
        if (typeof value[0] === "object") {
          console.log(`${key}:`);
          for (const item of value) {
            console.log(`  - ${JSON.stringify(item)}`);
          }
        } else {
          console.log(`${key}: ${value.join(", ")}`);
        }
      } else if (typeof value === "object") {
        console.log(`${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    if (content.trim()) {
      console.log(`\n${content.trim()}`);
    }
  }
}
