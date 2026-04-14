#!/usr/bin/env tsx
/**
 * Roam Research Clean — Extract clean notes from Roam EDN backup.
 *
 * Roam's EDN backup is a Datascript database with datoms:
 *   [entity-id :attribute "value" tx-id]
 *
 * We extract pages and their block trees, clean formatting,
 * and output the same JSONL format as tana-clean.ts.
 *
 * Usage:
 *   npx tsx spike/roam-clean.ts <roam-backup.edn> [output.jsonl]
 */

import { readFileSync, writeFileSync } from "fs";

const ROAM_FILE = process.argv[2];
if (!ROAM_FILE) {
  console.error("Usage: npx tsx spike/roam-clean.ts <roam-backup.edn> [output.jsonl]");
  process.exit(1);
}
const OUTPUT_FILE = process.argv[3] || "/tmp/roam-cleaned.jsonl";

console.log(`Loading ${ROAM_FILE}...`);
const raw = readFileSync(ROAM_FILE, "utf-8");
console.log(`File size: ${(raw.length / 1048576).toFixed(1)} MB`);

// ============================================================
// Parse datoms from EDN
// ============================================================

// Extract the datoms array content (between :datoms [[ and ]])
const datomsStart = raw.indexOf(":datoms [[");
if (datomsStart === -1) throw new Error("Cannot find :datoms in EDN file");

const arrayStart = raw.indexOf("[[", datomsStart);
const arrayEnd = raw.lastIndexOf("]]");
const datomsStr = raw.substring(arrayStart + 1, arrayEnd + 1);

// Parse individual datoms: [entity-id :attribute value tx-id]
// Entity and tx are numbers, attribute starts with :, value can be string/number/ref
interface Datom {
  e: number;
  a: string;
  v: string | number;
}

const datoms: Datom[] = [];
const datomRegex = /\[(\d+)\s+:([\w\-\/]+)\s+((?:"(?:[^"\\]|\\.)*"|\d+|true|false))\s+\d+\]/g;

let match;
while ((match = datomRegex.exec(datomsStr)) !== null) {
  const e = parseInt(match[1]);
  const a = match[2];
  let v: string | number = match[3];

  // Parse value
  if (typeof v === "string" && v.startsWith('"')) {
    v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  } else if (v === "true" || v === "false") {
    v = v === "true" ? 1 : 0;
  } else {
    v = parseInt(v as string);
  }

  datoms.push({ e, a, v });
}

console.log(`Parsed ${datoms.length} datoms`);

// ============================================================
// Build entity map
// ============================================================

interface Entity {
  [key: string]: any;
}

const entities = new Map<number, Entity>();

for (const { e, a, v } of datoms) {
  if (!entities.has(e)) entities.set(e, { _id: e });
  const ent = entities.get(e)!;

  // Multi-value attributes (children, refs)
  if (a === "block/children" || a === "block/refs" || a === "node/links") {
    if (!ent[a]) ent[a] = [];
    ent[a].push(v);
  } else {
    ent[a] = v;
  }
}

console.log(`Built ${entities.size} entities`);

// ============================================================
// Identify pages and blocks
// ============================================================

const pages: Entity[] = [];
const blocks = new Map<number, Entity>();

for (const [id, ent] of entities) {
  if (ent["node/title"]) {
    pages.push(ent);
  }
  if (ent["block/string"] !== undefined) {
    blocks.set(id, ent);
  }
}

console.log(`Pages: ${pages.length}, Blocks: ${blocks.size}`);

// ============================================================
// Build block tree
// ============================================================

function getBlockText(entityId: number): string {
  const ent = entities.get(entityId);
  if (!ent) return "";
  return cleanRoamMarkup(ent["block/string"] || "");
}

function getBlockOrder(entityId: number): number {
  const ent = entities.get(entityId);
  return ent?.["block/order"] ?? 999;
}

function buildBlockTree(entityId: number, depth: number = 0, maxDepth: number = 6): string[] {
  const ent = entities.get(entityId);
  if (!ent) return [];

  const children: number[] = ent["block/children"] || [];
  // Sort by block/order
  children.sort((a, b) => getBlockOrder(a) - getBlockOrder(b));

  const lines: string[] = [];
  for (const childId of children) {
    const text = getBlockText(childId);
    if (!text || text.length < 2) continue;

    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${text}`);

    if (depth < maxDepth) {
      lines.push(...buildBlockTree(childId, depth + 1, maxDepth));
    }
  }
  return lines;
}

// ============================================================
// Clean Roam markup
// ============================================================

function cleanRoamMarkup(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove block references ((ref-uid))
  cleaned = cleaned.replace(/\(\(([a-zA-Z0-9_-]+)\)\)/g, (_, uid) => {
    const refEnt = [...entities.values()].find(e => e["block/uid"] === uid);
    return refEnt?.["block/string"] ? cleanRoamMarkup(refEnt["block/string"]).substring(0, 80) : "";
  });

  // Convert page references [[Page Title]] to just the title
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // Convert Roam attributes (Key:: Value) to plain text
  cleaned = cleaned.replace(/^(\w+)::\s*/gm, "$1: ");

  // Remove {{}} macros
  cleaned = cleaned.replace(/\{\{[^}]*\}\}/g, "");

  // Remove #hashtags but keep the text
  cleaned = cleaned.replace(/#\[\[([^\]]+)\]\]/g, "$1");
  cleaned = cleaned.replace(/#(\S+)/g, "$1");

  // Clean up
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

// ============================================================
// Process pages into clean notes
// ============================================================

interface CleanNote {
  title: string;
  body: string;
  roam_uid: string;
  created: string | null;
  category: "reflection" | "thought" | "daily";
  word_count: number;
}

const results: CleanNote[] = [];

// Daily note pattern (Roam format: "February 18th, 2022" or similar)
const DAILY_PATTERN = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th),\s+\d{4}$/;

for (const page of pages) {
  const title = cleanRoamMarkup(page["node/title"] || "");
  if (!title || title.length < 2) continue;

  const uid = page["block/uid"] || "";

  // Skip system pages
  if (title.startsWith("roam/")) continue;

  // Build body from child blocks
  const bodyLines = buildBlockTree(page._id);
  const body = bodyLines.join("\n");

  // Skip empty pages
  if (!body && title.length < 10) continue;

  // Word count
  const fullText = title + " " + body;
  const cjkChars = (fullText.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = fullText.replace(/[\u4e00-\u9fff]/g, "").split(/\s+/).filter(Boolean).length;
  const wordCount = cjkChars + englishWords;

  // Skip very thin content
  if (wordCount < 10) continue;

  // Categorize
  let category: CleanNote["category"] = "thought";
  if (DAILY_PATTERN.test(page["node/title"] || "")) {
    category = "daily";
  } else if (bodyLines.length >= 3) {
    category = "reflection";
  }

  // Get creation time from earliest block edit
  const created = page["create/time"]
    ? new Date(page["create/time"]).toISOString()
    : null;

  results.push({
    title,
    body,
    roam_uid: uid,
    created,
    category,
    word_count: wordCount,
  });
}

// Sort by word count descending
results.sort((a, b) => b.word_count - a.word_count);

// ============================================================
// Output
// ============================================================

const lines = results.map(r => JSON.stringify(r));
writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n", "utf-8");

const stats = {
  total: results.length,
  daily: results.filter(r => r.category === "daily").length,
  reflection: results.filter(r => r.category === "reflection").length,
  thought: results.filter(r => r.category === "thought").length,
  avg_words: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.word_count, 0) / results.length) : 0,
};

console.log(`\n═══ Roam Clean Results ═══`);
console.log(`Output: ${OUTPUT_FILE}`);
console.log(`Total: ${stats.total} clean notes`);
console.log(`  daily:      ${stats.daily}`);
console.log(`  reflection: ${stats.reflection}`);
console.log(`  thought:    ${stats.thought}`);
console.log(`  avg words:  ${stats.avg_words}`);

// Show samples
for (const cat of ["reflection", "thought", "daily"] as const) {
  const samples = results.filter(r => r.category === cat).slice(0, 3);
  if (samples.length === 0) continue;
  console.log(`\n─── ${cat} samples ───`);
  for (const s of samples) {
    const bodyPreview = s.body ? s.body.substring(0, 100).replace(/\n/g, " ") : "(no body)";
    console.log(`  "${s.title.substring(0, 60)}" [${s.word_count}w]`);
    console.log(`    ${bodyPreview}...`);
  }
}
