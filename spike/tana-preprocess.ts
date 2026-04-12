#!/usr/bin/env bun
/**
 * Tana Export Preprocessor
 *
 * Reads a Tana JSON export and produces markdown files ready for lens:
 * - sources/*.md  — #source and #article tagged nodes with children (for `lens ingest`)
 * - highlights/*.md — independent #highlight notes batched (for `lens note --file`)
 *
 * Usage:
 *   bun run spike/tana-preprocess.ts <tana-export.json> [output-dir]
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// ============================================================
// Config
// ============================================================

const TANA_FILE = process.argv[2];
const OUTPUT_DIR = process.argv[3] || "/tmp/tana-preprocessed";

if (!TANA_FILE) {
  console.error("Usage: bun run spike/tana-preprocess.ts <tana-export.json> [output-dir]");
  process.exit(1);
}

// Tag IDs (from Tana analysis)
const TAGS = {
  source: "Gqw0OMEGjiuk",
  article: "Y5LItkZPjavg",
  highlight: "S1LBP4a9eoaH",
  product: "-vHeZaLpwMPM",
};

const HIGHLIGHTS_PER_BATCH = 15;

// ============================================================
// Load + Index
// ============================================================

console.log(`Loading ${TANA_FILE}...`);
const data = JSON.parse(readFileSync(TANA_FILE, "utf-8"));
const docs: any[] = data.docs;
const docMap = new Map<string, any>();
for (const d of docs) docMap.set(d.id, d);

console.log(`Loaded ${docs.length} docs`);

// ============================================================
// Helpers
// ============================================================

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function getTaggedNodes(tagId: string): Set<string> {
  // Tag linking: content_node → tuple_child → _sourceId → tuple → _ownerId → tagDef
  const tagTuples = new Set<string>();
  for (const d of docs) {
    if (d.props?._ownerId === tagId && d.props?._docType === "tuple") {
      tagTuples.add(d.id);
    }
  }

  const nodes = new Set<string>();
  for (const d of docs) {
    if (tagTuples.has(d.props?._sourceId) && d.props?._ownerId && !d.props._ownerId.startsWith("SYS_")) {
      nodes.add(d.props._ownerId);
    }
  }
  return nodes;
}

function getChildrenContent(nodeId: string, depth = 0, maxDepth = 4): string[] {
  const lines: string[] = [];
  for (const d of docs) {
    if (d.props?._ownerId !== nodeId) continue;
    const docType = d.props?._docType;
    if (docType === "tuple" || docType === "metanode" || docType === "associatedData" || docType === "visual") continue;

    const name = cleanHtml(d.props?.name || "");
    if (!name || name.length < 3) continue;

    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${name}`);
    if (depth < maxDepth) {
      lines.push(...getChildrenContent(d.id, depth + 1, maxDepth));
    }
  }
  return lines;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

// ============================================================
// Collect tagged nodes
// ============================================================

const sourceNodes = getTaggedNodes(TAGS.source);
const articleNodes = getTaggedNodes(TAGS.article);
const highlightNodes = getTaggedNodes(TAGS.highlight);

const allSourceLike = new Set([...sourceNodes, ...articleNodes]);
const independentHighlights = new Set(
  [...highlightNodes].filter((id) => !allSourceLike.has(id))
);

console.log(`\nTagged content:`);
console.log(`  #source: ${sourceNodes.size}`);
console.log(`  #article: ${articleNodes.size}`);
console.log(`  Combined (dedup): ${allSourceLike.size}`);
console.log(`  #highlight (independent): ${independentHighlights.size}`);

// ============================================================
// Output: Sources + Articles
// ============================================================

const sourcesDir = join(OUTPUT_DIR, "sources");
mkdirSync(sourcesDir, { recursive: true });

let sourceCount = 0;
for (const nodeId of allSourceLike) {
  const node = docMap.get(nodeId);
  if (!node) continue;

  const title = cleanHtml(node.props?.name || "");
  if (!title || title.length < 5) continue;

  const children = getChildrenContent(nodeId);
  if (children.length === 0 && title.length < 20) continue; // skip very thin entries

  const slug = slugify(title) || `source-${sourceCount}`;
  const filename = `${slug}.md`;

  const lines = [`# ${title}`, "", "Reading notes and highlights from this source.", ""];
  lines.push(...children);

  writeFileSync(join(sourcesDir, filename), lines.join("\n"), "utf-8");
  sourceCount++;
}

console.log(`\nWrote ${sourceCount} source files to ${sourcesDir}/`);

// ============================================================
// Output: Highlights (batched)
// ============================================================

const highlightsDir = join(OUTPUT_DIR, "highlights");
mkdirSync(highlightsDir, { recursive: true });

// Collect all highlight texts
const highlightTexts: string[] = [];
for (const nodeId of independentHighlights) {
  const node = docMap.get(nodeId);
  if (!node) continue;

  const text = cleanHtml(node.props?.name || "");
  if (!text || text.length < 15) continue;

  highlightTexts.push(text);
}

// Batch into files
const batchCount = Math.ceil(highlightTexts.length / HIGHLIGHTS_PER_BATCH);
for (let i = 0; i < batchCount; i++) {
  const batch = highlightTexts.slice(
    i * HIGHLIGHTS_PER_BATCH,
    (i + 1) * HIGHLIGHTS_PER_BATCH
  );

  const lines: string[] = [];
  for (let j = 0; j < batch.length; j++) {
    lines.push(`${j + 1}. ${batch[j]}`, "");
  }

  const filename = `highlights-batch-${String(i + 1).padStart(2, "0")}.md`;
  writeFileSync(join(highlightsDir, filename), lines.join("\n"), "utf-8");
}

console.log(`Wrote ${batchCount} highlight batches (${highlightTexts.length} total) to ${highlightsDir}/`);

// ============================================================
// Summary
// ============================================================

console.log(`\n=== Preprocessing Complete ===`);
console.log(`Output: ${OUTPUT_DIR}/`);
console.log(`  sources/    ${sourceCount} files  → run: for f in ${sourcesDir}/*.md; do lens ingest "$f"; done`);
console.log(`  highlights/ ${batchCount} batches → run: for f in ${highlightsDir}/*.md; do lens note --file "$f"; done`);
console.log(`\nRecommended order: sources first (build knowledge base), then highlights (place with links).`);
