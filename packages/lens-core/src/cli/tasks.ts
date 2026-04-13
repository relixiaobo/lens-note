/**
 * lens tasks — List tasks.
 *
 * Default: open tasks. Use --all or --done for other views.
 */

import { readdirSync } from "fs";
import { join } from "path";
import { paths } from "../core/paths";
import { readObject, ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";

export async function listTasks(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const { flags } = parseCliArgs(args);
  const showAll = flags.all === true;
  const showDone = flags.done === true;

  const tasksDir = paths.tasks;
  let files: string[];
  try {
    files = readdirSync(tasksDir).filter(f => f.endsWith(".md"));
  } catch {
    files = [];
  }

  const items: any[] = [];
  for (const file of files) {
    const id = file.replace(".md", "");
    const obj = readObject(id);
    if (!obj) continue;

    const status = obj.data.status || "open";

    // Filter by status
    if (!showAll && !showDone && status !== "open") continue;
    if (showDone && status !== "done") continue;

    items.push({
      id: obj.data.id,
      title: obj.data.title,
      status,
      ...(obj.data.links?.length ? { links: obj.data.links.length } : {}),
    });
  }

  if (opts.json) {
    console.log(JSON.stringify({
      type: "tasks",
      filter: showAll ? "all" : showDone ? "done" : "open",
      count: items.length,
      items,
    }, null, 2));
  } else {
    if (items.length === 0) {
      console.log(showDone ? "No completed tasks." : showAll ? "No tasks." : "No open tasks.");
      return;
    }
    for (const item of items) {
      const status = item.status === "done" ? "[done]" : "[open]";
      console.log(`${status} ${item.id} — ${item.title}`);
    }
  }
}
