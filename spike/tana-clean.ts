#!/usr/bin/env tsx
/**
 * Tana Clean — Extract clean, readable notes from Tana export.
 *
 * Produces a JSONL file where each line is one candidate note:
 *   { title, body, tana_id, created, category, word_count }
 *
 * Categories:
 *   article  — tagged #article/#source, has URL
 *   reflection — personal note with children
 *   highlight — tagged #highlight
 *   thought  — short standalone thought
 *
 * An agent can then read each line and decide: import, skip, or refine.
 *
 * Usage:
 *   npx tsx spike/tana-clean.ts <tana-export.json> [output.jsonl]
 */

import { readFileSync, writeFileSync } from "fs";

const TANA_FILE = process.argv[2];
if (!TANA_FILE) {
  console.error("Usage: npx tsx spike/tana-clean.ts <tana-export.json> [output.jsonl]");
  process.exit(1);
}
const OUTPUT_FILE = process.argv[3] || "/tmp/tana-cleaned.jsonl";

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
// Tag detection (same approach as tana-import-strategy.ts)
// ============================================================

const ARTICLE_TAG_ID = "Y5LItkZPjavg";
const SOURCE_TAG_ID = "Gqw0OMEGjiuk";
const HIGHLIGHT_TAG_ID = "S1LBP4a9eoaH";

function getOwnedDocs(nodeId: string): any[] {
  return docs.filter(d => d.props?._ownerId === nodeId);
}

function getChildren(nodeId: string): any[] {
  const node = docMap.get(nodeId);
  if (!node?.children) return [];
  return node.children.map((cid: string) => docMap.get(cid)).filter(Boolean);
}

function isTagged(nodeId: string, tagId: string): boolean {
  const owned = getOwnedDocs(nodeId);
  for (const d of owned) {
    if (d.props?._docType !== "tuple") continue;
    if (d.props?._sourceId) {
      const src = docMap.get(d.props._sourceId);
      if (src?.props?._ownerId === tagId) return true;
    }
    const tupleChildren = getChildren(d.id);
    for (const tc of tupleChildren) {
      if (tc.props?._metaNodeId === tagId) return true;
    }
  }
  return false;
}

function hasTag(nodeId: string, tagId: string): boolean {
  return isTagged(nodeId, tagId);
}

// ============================================================
// URL extraction
// ============================================================

function getUrl(nodeId: string): string | null {
  for (const d of docs) {
    if (d.props?._ownerId !== nodeId || d.props?._docType !== "tuple") continue;
    const children = (d.children || []).map((cid: string) => docMap.get(cid)).filter(Boolean);
    let hasUrlLabel = false;
    let urlValue: string | null = null;
    for (const c of children) {
      const name = c.props?.name || "";
      if (name === "URL" || name === "url") hasUrlLabel = true;
      if (/^https?:\/\/.+/.test(name)) urlValue = name;
    }
    if (hasUrlLabel && urlValue) return urlValue;
  }
  return null;
}

// ============================================================
// Cleaning
// ============================================================

/** System doc types to skip entirely */
const SKIP_TYPES = new Set([
  "tuple", "metanode", "associatedData", "visual",
  "search", "command", "viewDef", "url", "syntax",
  "dataSource", "behavior", "alias",
]);

function cleanText(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // Resolve inline refs: <span data-inlineref-node="ID">text</span>
  text = text.replace(/<span[^>]*data-inlineref-node="([^"]*)"[^>]*>(.*?)<\/span>/g, (_, refId, innerText) => {
    if (innerText.trim()) return innerText;
    const refNode = docMap.get(refId);
    return refNode?.props?.name ? cleanText(refNode.props.name) : "";
  });

  // Handle <a> tags: keep link text, drop URL
  text = text.replace(/<a[^>]*>([^<]*)<\/a>/g, "$1");

  // Strip formatting tags but keep content
  text = text.replace(/<\/?(b|strong|em|i|code|u|s|mark|span|a)[^>]*>/g, "");

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean trailing noise
  text = text.replace(/\s*#\s*$/, "").trim();

  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, " ");

  return text;
}

/** Build clean body from children, recursively */
function buildCleanBody(nodeId: string, depth = 0, maxDepth = 5): string[] {
  const node = docMap.get(nodeId);
  if (!node?.children) return [];

  const lines: string[] = [];
  for (const cid of node.children) {
    const child = docMap.get(cid);
    if (!child) continue;

    const docType = child.props?._docType || "none";
    if (SKIP_TYPES.has(docType)) continue;

    const text = cleanText(child.props?.name || "");
    if (!text || text.length < 2) continue;

    const indent = "  ".repeat(depth);
    // Code blocks: preserve as-is
    if (docType === "codeblock") {
      lines.push(`${indent}\`\`\``);
      lines.push(`${indent}${text}`);
      lines.push(`${indent}\`\`\``);
    } else {
      lines.push(`${indent}- ${text}`);
    }

    if (depth < maxDepth) {
      lines.push(...buildCleanBody(cid, depth + 1, maxDepth));
    }
  }
  return lines;
}

/** Get parent context (what this note lives under) */
function getParentContext(nodeId: string): string | null {
  const node = docMap.get(nodeId);
  if (!node?.props?._ownerId) return null;
  const parent = docMap.get(node.props._ownerId);
  if (!parent) return null;
  const parentName = cleanText(parent.props?.name || "");
  if (!parentName || parentName.length < 3) return null;
  // Skip if parent is a system/root node
  if (parentName.startsWith("Root node") || parentName.startsWith("Trash")) return null;
  return parentName;
}

// ============================================================
// Process all content nodes
// ============================================================

interface CleanNote {
  title: string;
  body: string;
  tana_id: string;
  created: string | null;
  category: "article" | "reflection" | "highlight" | "thought";
  url?: string;
  parent_context?: string;
  word_count: number;
}

const results: CleanNote[] = [];
const processed = new Set<string>();

for (const d of docs) {
  const docType = d.props?._docType || "none";
  if (SKIP_TYPES.has(docType)) continue;
  if (d.props?._ownerId?.startsWith("SYS_")) continue;

  const title = cleanText(d.props?.name || "");
  if (!title) continue;

  // CJK-aware minimum title length: Chinese packs more meaning per char
  const hasCjk = /[\u4e00-\u9fff]/.test(title);
  if (hasCjk ? title.length < 3 : title.length < 10) continue;

  // Skip if already processed (dedup)
  if (processed.has(d.id)) continue;
  processed.add(d.id);

  // Skip obvious noise
  if (/^Root node|^Trash|^Untitled$/i.test(title)) continue;

  // Skip journal day containers (e.g., "2025-06-26 - Thursday")
  if (/^\d{4}-\d{2}-\d{2}\s*-\s*\w+day$/.test(title)) continue;

  // Skip JSON/code content masquerading as notes
  if (/^\s*[\{"\[]/.test(title) || /^\s*<\w+>/.test(title)) continue;

  // Skip system prompts and prompt templates
  if (/^(The assistant is|You are a|您是|你是一位|I want you to|# Role|# The |You are ChatGPT)/i.test(title)) continue;

  // Skip raw code/JSON blobs (title looks like code)
  if (/^(const |let |var |function |import |export |class |interface |type |\w+\()/i.test(title)) continue;

  // Build body
  const bodyLines = buildCleanBody(d.id);
  const body = bodyLines.join("\n");

  // Skip container nodes (huge bodies usually mean this is a grouping node)
  if (body.length > 30000) continue;

  // Categorize
  let category: CleanNote["category"] = "thought";
  let url: string | undefined;

  if (hasTag(d.id, ARTICLE_TAG_ID) || hasTag(d.id, SOURCE_TAG_ID)) {
    category = "article";
    url = getUrl(d.id) || undefined;
  } else if (hasTag(d.id, HIGHLIGHT_TAG_ID)) {
    category = "highlight";
  } else if (bodyLines.length >= 2) {
    category = "reflection";
  }

  // Word count (rough: Chinese chars + English words)
  const fullText = title + " " + body;
  const chineseChars = (fullText.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = fullText.replace(/[\u4e00-\u9fff]/g, "").split(/\s+/).filter(Boolean).length;
  const wordCount = chineseChars + englishWords;

  // Skip very short thoughts (< 20 effective words)
  if (category === "thought" && wordCount < 20) continue;

  const parentContext = getParentContext(d.id) || undefined;

  results.push({
    title,
    body,
    tana_id: d.id,
    created: d.props?._createdAt || null,
    category,
    ...(url ? { url } : {}),
    ...(parentContext ? { parent_context: parentContext } : {}),
    word_count: wordCount,
  });
}

// ============================================================
// Output
// ============================================================

// Sort: articles first, then reflections (by word count desc), then highlights, then thoughts
const categoryOrder = { article: 0, reflection: 1, highlight: 2, thought: 3 };
results.sort((a, b) => {
  const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
  if (catDiff !== 0) return catDiff;
  return b.word_count - a.word_count;
});

// Write JSONL
const lines = results.map(r => JSON.stringify(r));
writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n", "utf-8");

// Stats
const stats = {
  total: results.length,
  article: results.filter(r => r.category === "article").length,
  reflection: results.filter(r => r.category === "reflection").length,
  highlight: results.filter(r => r.category === "highlight").length,
  thought: results.filter(r => r.category === "thought").length,
  with_url: results.filter(r => r.url).length,
  avg_words: Math.round(results.reduce((s, r) => s + r.word_count, 0) / results.length),
};

console.log(`\n═══ Tana Clean Results ═══`);
console.log(`Output: ${OUTPUT_FILE}`);
console.log(`Total: ${stats.total} clean notes`);
console.log(`  article:    ${stats.article} (${stats.with_url} with URL)`);
console.log(`  reflection: ${stats.reflection}`);
console.log(`  highlight:  ${stats.highlight}`);
console.log(`  thought:    ${stats.thought}`);
console.log(`  avg words:  ${stats.avg_words}`);

// Show samples from each category
for (const cat of ["article", "reflection", "highlight", "thought"] as const) {
  const samples = results.filter(r => r.category === cat).slice(0, 3);
  if (samples.length === 0) continue;
  console.log(`\n─── ${cat} samples ───`);
  for (const s of samples) {
    const bodyPreview = s.body ? s.body.substring(0, 100).replace(/\n/g, " ") : "(no body)";
    console.log(`  "${s.title.substring(0, 60)}" [${s.word_count}w]`);
    console.log(`    ${bodyPreview}...`);
  }
}
