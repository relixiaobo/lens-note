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

  // Count all tasks by status for context
  let totalOpen = 0, totalDone = 0;
  for (const file of files) {
    const id = file.replace(".md", "");
    const obj = readObject(id);
    if (!obj) continue;
    if (obj.data.status === "done") totalDone++;
    else totalOpen++;
  }

  if (opts.json) {
    const result: Record<string, any> = {
      type: "tasks",
      filter: showAll ? "all" : showDone ? "done" : "open",
      count: items.length,
      total: { open: totalOpen, done: totalDone },
      items,
    };
    if (items.length === 0 && (totalOpen + totalDone) > 0) {
      result.hint = showDone
        ? `No completed tasks. ${totalOpen} task(s) still open — use 'lens tasks' to see them.`
        : `No open tasks. ${totalDone} completed task(s) — use 'lens tasks --done' to see them.`;
    }
    console.log(JSON.stringify(result, null, 2));
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
