/**
 * lens ingest <url|file> — Ingest a source and compile understanding.
 *
 * Pipeline:
 * 1. Extract: fetch URL (Defuddle) or read file -> markdown
 * 2. Save: create Source object (markdown file + raw backup)
 * 3. Compile: spawn Compilation Agent to extract Notes
 * 4. Process: create lens objects from Agent output
 */

import { mkdirSync, writeFileSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { generateId, type Source, type SourceType } from "../core/types";
import { saveObject, ensureInitialized } from "../core/storage";
import { paths } from "../core/paths";
import type { CommandOptions } from "./commands";

export async function ingestSource(target: string, opts: CommandOptions) {
  ensureInitialized();

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set. Required for the Compilation Agent.");
  }

  const isUrl = target.startsWith("http://") || target.startsWith("https://");

  if (isUrl) {
    await ingestUrl(target, opts);
  } else {
    await ingestFile(target, opts);
  }
}

async function ingestUrl(url: string, opts: CommandOptions) {
  const log = opts.json ? () => {} : (msg: string) => console.log(msg);

  log(`Fetching ${url}...`);
  const { extractWebArticle } = await import("../sources/web");
  const result = await extractWebArticle(url);

  const sourceId = generateId("source");
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
    status: "active",
  };

  const filePath = saveObject(source, result.markdown);
  log(`Source saved: ${sourceId} — "${result.title}" (${result.wordCount} words)`);

  // Run Compilation Agent
  await compile(sourceId, result.title, result.markdown, opts, log);
}

async function ingestFile(filePath: string, opts: CommandOptions) {
  const log = opts.json ? () => {} : (msg: string) => console.log(msg);

  const { extractLocalFile } = await import("../sources/file");
  const result = extractLocalFile(filePath);

  const sourceId = generateId("source");
  const now = new Date().toISOString();

  const rawPath = join("raw", `${sourceId}${filePath.substring(filePath.lastIndexOf("."))}`);
  const rawFullPath = join(paths.root, rawPath);
  mkdirSync(dirname(rawFullPath), { recursive: true });
  copyFileSync(filePath, rawFullPath);

  const sourceType: SourceType = filePath.endsWith(".md") || filePath.endsWith(".markdown")
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
  log(`Source saved: ${sourceId} — "${result.title}" (${result.wordCount} words)`);

  // Run Compilation Agent
  await compile(sourceId, result.title, result.markdown, opts, log);
}

async function compile(
  sourceId: string,
  title: string,
  content: string,
  opts: CommandOptions,
  log: (msg: string) => void,
) {
  log("\nStarting Compilation Agent...");

  const { runCompilationAgent } = await import("../agent/compilation-agent");
  const { processAgentOutput } = await import("../agent/process-output");

  const result = await runCompilationAgent(sourceId, title, content, log);
  const processed = processAgentOutput(result, sourceId, log);

  if (opts.json) {
    console.log(JSON.stringify({
      source_id: sourceId,
      title,
      compiled: {
        notes_new: processed.notes_new.length,
        notes_reinforced: processed.notes_reinforced.length,
        notes_skipped: processed.notes_skipped,
        notes_contradicted: processed.notes_contradicted.length / 2,
      },
    }, null, 2));
  } else {
    log(`\nCompilation complete:`);
    log(`  ${processed.notes_new.length} new Notes`);
    if (processed.notes_reinforced.length) log(`  ${processed.notes_reinforced.length} existing Notes reinforced (evidence added)`);
    if (processed.notes_skipped) log(`  ${processed.notes_skipped} duplicates merged`);
    if (processed.notes_contradicted.length) log(`  ${processed.notes_contradicted.length / 2} contradiction(s) detected`);
  }
}
