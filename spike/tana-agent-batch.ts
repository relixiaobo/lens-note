#!/usr/bin/env tsx
/**
 * Tana Agent Batch — Split cleaned notes into batches for agent processing.
 *
 * Reads /tmp/tana-cleaned.jsonl and produces batch files:
 *   /tmp/tana-batches/
 *     tier1/           — Agent MUST review (reflections 200w+)
 *       batch-01.md    — 10 notes per file, clean readable format
 *       batch-02.md
 *     tier2/           — Mechanical import (articles, highlights)
 *       articles.jsonl — For lens fetch + write pipeline
 *       highlights.jsonl
 *     tier3/           — Agent samples (short thoughts, light reflections)
 *       sample.md      — 30 random notes for agent to spot-check
 *
 * The agent reads each batch-NN.md, evaluates each note, and outputs
 * import decisions as lens write JSON commands.
 *
 * Usage:
 *   npx tsx spike/tana-agent-batch.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";

const INPUT = "/tmp/tana-cleaned.jsonl";
const OUTPUT_DIR = "/tmp/tana-batches";

// ============================================================
// Load
// ============================================================

const lines = readFileSync(INPUT, "utf-8").trim().split("\n");
const notes = lines.map(l => JSON.parse(l));

console.log(`Loaded ${notes.length} cleaned notes\n`);

// ============================================================
// Split into tiers
// ============================================================

const tier1 = notes.filter(n =>
  n.category === "reflection" && n.word_count >= 200
);

const articles = notes.filter(n => n.category === "article");
const highlights = notes.filter(n => n.category === "highlight");

const tier3Pool = [
  ...notes.filter(n => n.category === "thought" && n.word_count >= 50),
  ...notes.filter(n => n.category === "reflection" && n.word_count >= 50 && n.word_count < 200),
];

// Random sample for tier 3
const tier3Sample = tier3Pool
  .sort(() => Math.random() - 0.5)
  .slice(0, 30);

console.log(`Tier 1 (agent review): ${tier1.length} reflections (200w+)`);
console.log(`Tier 2 (mechanical):   ${articles.length} articles + ${highlights.length} highlights`);
console.log(`Tier 3 (sample):       ${tier3Sample.length} from ${tier3Pool.length} pool`);

// ============================================================
// Output Tier 1: Agent review batches
// ============================================================

const BATCH_SIZE = 10;
const tier1Dir = `${OUTPUT_DIR}/tier1`;
mkdirSync(tier1Dir, { recursive: true });

// Sort by word count descending (most substantial first)
tier1.sort((a, b) => b.word_count - a.word_count);

for (let i = 0; i < tier1.length; i += BATCH_SIZE) {
  const batch = tier1.slice(i, i + BATCH_SIZE);
  const batchNum = String(Math.floor(i / BATCH_SIZE) + 1).padStart(2, "0");

  const lines: string[] = [
    `# Tana Import Batch ${batchNum}`,
    "",
    `> ${batch.length} notes to evaluate. For each note, decide:`,
    `> - **IMPORT**: Worth keeping in the knowledge graph. Provide a clean title.`,
    `> - **SKIP**: Not worth importing (dev task, prompt template, repost, too fragmentary).`,
    `> - **MERGE**: Should be combined with another note in this batch.`,
    "",
    "---",
    "",
  ];

  for (let j = 0; j < batch.length; j++) {
    const n = batch[j];
    lines.push(`## Note ${j + 1} [${n.word_count}w] [${n.tana_id}]`);
    if (n.parent_context) lines.push(`> Context: ${n.parent_context}`);
    lines.push("");
    lines.push(`**${n.title}**`);
    lines.push("");
    if (n.body) {
      lines.push(n.body);
    }
    lines.push("");
    lines.push(`**Decision**: [ IMPORT / SKIP / MERGE ]`);
    lines.push(`**Title** (if import): `);
    lines.push(`**Reason**: `);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  writeFileSync(`${tier1Dir}/batch-${batchNum}.md`, lines.join("\n"), "utf-8");
}

const tier1Batches = Math.ceil(tier1.length / BATCH_SIZE);
console.log(`\nWrote ${tier1Batches} batch files to ${tier1Dir}/`);

// ============================================================
// Output Tier 2: Mechanical import
// ============================================================

const tier2Dir = `${OUTPUT_DIR}/tier2`;
mkdirSync(tier2Dir, { recursive: true });

writeFileSync(
  `${tier2Dir}/articles.jsonl`,
  articles.map(a => JSON.stringify(a)).join("\n") + "\n",
  "utf-8"
);

writeFileSync(
  `${tier2Dir}/highlights.jsonl`,
  highlights.map(h => JSON.stringify(h)).join("\n") + "\n",
  "utf-8"
);

console.log(`Wrote ${articles.length} articles + ${highlights.length} highlights to ${tier2Dir}/`);

// ============================================================
// Output Tier 3: Agent sample
// ============================================================

const tier3Dir = `${OUTPUT_DIR}/tier3`;
mkdirSync(tier3Dir, { recursive: true });

const sampleLines: string[] = [
  "# Tana Import Sample (Tier 3)",
  "",
  "> 30 random short notes. Evaluate whether any of these patterns",
  "> are worth importing at scale, or if the whole tier should be skipped.",
  "",
  "---",
  "",
];

for (let j = 0; j < tier3Sample.length; j++) {
  const n = tier3Sample[j];
  sampleLines.push(`### ${j + 1}. [${n.category}] [${n.word_count}w]`);
  sampleLines.push("");
  sampleLines.push(`**${n.title}**`);
  if (n.body) {
    sampleLines.push("");
    sampleLines.push(n.body.substring(0, 300));
    if (n.body.length > 300) sampleLines.push("...");
  }
  sampleLines.push("");
  sampleLines.push("---");
  sampleLines.push("");
}

writeFileSync(`${tier3Dir}/sample.md`, sampleLines.join("\n"), "utf-8");
console.log(`Wrote ${tier3Sample.length} sample notes to ${tier3Dir}/`);

// ============================================================
// Summary
// ============================================================

console.log(`\n═══ Processing Plan ═══`);
console.log(`\nTier 1 — Agent review (${tier1.length} notes, ${tier1Batches} batches):`);
console.log(`  Read each batch-NN.md file, evaluate each note.`);
console.log(`  The agent decides IMPORT/SKIP/MERGE for each.`);
console.log(`  High-value reflections get imported with clean titles.`);
console.log(`  Estimated: ~40% import rate → ~${Math.round(tier1.length * 0.4)} notes`);

console.log(`\nTier 2 — Mechanical import (${articles.length + highlights.length} items):`);
console.log(`  Articles: lens fetch <url> --save for each.`);
console.log(`  Highlights: lens write batch import.`);

console.log(`\nTier 3 — Sample review (${tier3Sample.length}/${tier3Pool.length}):`);
console.log(`  Agent reviews sample, decides if whole tier is worth processing.`);

// Show first batch preview
console.log(`\n─── Preview: batch-01.md (first 3 notes) ───`);
for (const n of tier1.slice(0, 3)) {
  console.log(`  "${n.title.substring(0, 60)}" [${n.word_count}w]`);
}
