/**
 * lens fetch <url> — Extract web content as clean markdown.
 *
 * Pure extraction: no LLM, no compilation.
 * With --save: also creates a Source record.
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { generateId, type Source } from "../core/types";
import { saveObject, ensureInitialized } from "../core/storage";
import { paths } from "../core/paths";
import type { CommandOptions } from "./commands";

export async function fetchUrl(url: string, opts: CommandOptions) {
  ensureInitialized();

  const { extractWebArticle } = await import("../sources/web");
  const result = await extractWebArticle(url);

  let sourceId: string | undefined;

  if (opts.save) {
    sourceId = generateId("source");
    const now = new Date().toISOString();

    // Save raw HTML
    const rawPath = join("raw", `${sourceId}.html`);
    const rawFullPath = join(paths.root, rawPath);
    mkdirSync(dirname(rawFullPath), { recursive: true });
    writeFileSync(rawFullPath, result.rawHtml, "utf-8");

    const source: Source = {
      id: sourceId,
      type: "source",
      source_type: "web_article",
      title: result.title,
      author: result.author,
      url,
      word_count: result.wordCount,
      raw_file: rawPath,
      ingested_at: now,
      created_at: now,
    };

    saveObject(source, result.markdown);
  }

  if (opts.json) {
    // Sanitize markdown for JSON output (replace control chars)
    const cleanMarkdown = result.markdown.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ");
    console.log(JSON.stringify({
      title: result.title,
      author: result.author || null,
      url,
      word_count: result.wordCount,
      markdown: cleanMarkdown,
      ...(sourceId ? { source_id: sourceId } : {}),
    }, null, 2));
  } else {
    if (sourceId) {
      console.log(`Source saved: ${sourceId} — "${result.title}" (${result.wordCount} words)`);
    } else {
      console.log(`Title: ${result.title}`);
      console.log(`Author: ${result.author || "unknown"}`);
      console.log(`Words: ${result.wordCount}`);
      console.log(`\n${result.markdown}`);
    }
  }
}
