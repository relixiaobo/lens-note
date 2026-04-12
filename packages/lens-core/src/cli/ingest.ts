/**
 * lens ingest <url|file> — Fetch content and save as Source.
 *
 * For URLs: alias for lens fetch <url> --save
 * For files: reads file and creates Source record.
 */

import { copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { generateId, type Source, type SourceType } from "../core/types";
import { saveObject, ensureInitialized } from "../core/storage";
import { paths } from "../core/paths";
import type { CommandOptions } from "./commands";

export async function ingestSource(target: string, opts: CommandOptions) {
  const isUrl = target.startsWith("http://") || target.startsWith("https://");

  if (isUrl) {
    const { fetchUrl } = await import("./fetch");
    await fetchUrl(target, { ...opts, save: true });
  } else {
    ensureInitialized();

    const { extractLocalFile } = await import("../sources/file");
    const result = extractLocalFile(target);

    const sourceId = generateId("source");
    const now = new Date().toISOString();

    const rawPath = join("raw", `${sourceId}${target.substring(target.lastIndexOf("."))}`);
    const rawFullPath = join(paths.root, rawPath);
    mkdirSync(dirname(rawFullPath), { recursive: true });
    copyFileSync(target, rawFullPath);

    const sourceType: SourceType = target.endsWith(".md") || target.endsWith(".markdown")
      ? "markdown" : "plain_text";

    const source: Source = {
      id: sourceId,
      type: "source",
      source_type: sourceType,
      title: result.title,
      word_count: result.wordCount,
      raw_file: rawPath,
      ingested_at: now,
      created_at: now,
      status: "active",
    };

    saveObject(source, result.markdown);

    if (opts.json) {
      console.log(JSON.stringify({ id: sourceId, type: "source", action: "created", title: result.title, word_count: result.wordCount }, null, 2));
    } else {
      console.log(`Source saved: ${sourceId} — "${result.title}" (${result.wordCount} words)`);
    }
  }
}
