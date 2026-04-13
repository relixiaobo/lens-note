#!/usr/bin/env tsx
/**
 * Tana Import Strategy — Test different approaches for importing Tana data into lens.
 *
 * Strategy A: Articles with URLs → lens fetch --save → source record
 * Strategy B: Personal reflections → lens write (note with body from children)
 * Strategy C: Highlights → lens write (note, linked to source if possible)
 *
 * Usage:
 *   LENS_HOME=/tmp/lens-tana-test npx tsx spike/tana-import-strategy.ts <tana-export.json>
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";

const TANA_FILE = process.argv[2] || "/Users/lixiaobo/Downloads/b8AyeCJNsefK@2026-03-01.json";
const LENS_CMD = "npx tsx packages/lens-core/src/main.ts";

// ============================================================
// Load + Index
// ============================================================

console.log(`Loading ${TANA_FILE}...`);
const data = JSON.parse(readFileSync(TANA_FILE, "utf-8"));
const docs: any[] = data.docs;
const docMap = new Map<string, any>();
for (const d of docs) docMap.set(d.id, d);
console.log(`Loaded ${docs.length} docs\n`);

// ============================================================
// Helpers
// ============================================================

function cleanHtml(text: string): string {
  // Remove inline refs but keep their text
  let cleaned = text.replace(/<span[^>]*data-inlineref-node="([^"]*)"[^>]*>([^<]*)<\/span>/g, "$2");
  cleaned = cleaned
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
  return cleaned;
}

function getChildren(nodeId: string): any[] {
  const node = docMap.get(nodeId);
  if (!node?.children) return [];
  return node.children
    .map((cid: string) => docMap.get(cid))
    .filter((c: any) => c != null);
}

function getOwnedDocs(nodeId: string): any[] {
  return docs.filter(d => d.props?._ownerId === nodeId);
}

/** Get URL from a node's tuple fields */
function getUrlFromTuples(nodeId: string): string | null {
  const owned = getOwnedDocs(nodeId);
  for (const d of owned) {
    if (d.props?._docType !== "tuple") continue;
    // Check children of this tuple for URL label + value
    const tupleChildren = getChildren(d.id);
    let hasUrlLabel = false;
    let urlValue: string | null = null;
    for (const tc of tupleChildren) {
      const name = cleanHtml(tc.props?.name || "");
      if (name === "URL" || name === "url") hasUrlLabel = true;
      if (/^https?:\/\/.+/.test(name)) urlValue = name;
    }
    if (hasUrlLabel && urlValue) return urlValue;
  }
  // Also check if the node name itself is a URL
  const name = cleanHtml(docMap.get(nodeId)?.props?.name || "");
  if (/^https?:\/\/.+/.test(name)) return name;
  return null;
}

/** Get tag IDs for a node */
function getTagIds(nodeId: string): string[] {
  const owned = getOwnedDocs(nodeId);
  const tagIds: string[] = [];
  for (const d of owned) {
    if (d.props?._docType === "tuple") {
      const tupleChildren = getChildren(d.id);
      for (const tc of tupleChildren) {
        if (tc.props?._metaNodeId) {
          tagIds.push(tc.props._metaNodeId);
        }
      }
    }
  }
  return tagIds;
}

/** Build body text from children (hierarchical outline) */
function buildBody(nodeId: string, depth = 0, maxDepth = 5): string {
  const children = getChildren(nodeId);
  const lines: string[] = [];

  for (const child of children) {
    const docType = child.props?._docType;
    if (docType === "tuple" || docType === "metanode" || docType === "associatedData" || docType === "visual") continue;

    const name = cleanHtml(child.props?.name || "");
    if (!name || name.length < 2) continue;

    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${name}`);
    if (depth < maxDepth) {
      const childBody = buildBody(child.id, depth + 1, maxDepth);
      if (childBody) lines.push(childBody);
    }
  }
  return lines.join("\n");
}

function lensExec(cmd: string): string {
  try {
    return execSync(`${LENS_CMD} ${cmd}`, {
      encoding: "utf-8",
      cwd: "/Users/lixiaobo/Documents/Coding/lens",
      timeout: 30000,
    }).trim();
  } catch (e: any) {
    return e.stdout?.trim() || e.stderr?.trim() || e.message;
  }
}

function lensWrite(payload: any): any {
  const json = JSON.stringify(payload);
  // Use stdin to avoid shell escaping issues
  try {
    const result = execSync(`${LENS_CMD} write --json`, {
      input: json,
      encoding: "utf-8",
      cwd: "/Users/lixiaobo/Documents/Coding/lens",
      timeout: 30000,
    }).trim();
    return JSON.parse(result);
  } catch (e: any) {
    const out = e.stdout?.trim() || "";
    try { return JSON.parse(out); } catch { return { error: out || e.message }; }
  }
}

// ============================================================
// Tag detection
// ============================================================

// Find tag definition IDs
const ARTICLE_TAG_ID = "Y5LItkZPjavg";
const SOURCE_TAG_ID = "Gqw0OMEGjiuk";
const HIGHLIGHT_TAG_ID = "S1LBP4a9eoaH";

function isTagged(nodeId: string, tagId: string): boolean {
  const owned = getOwnedDocs(nodeId);
  for (const d of owned) {
    if (d.props?._docType !== "tuple") continue;
    if (d.props?._sourceId) {
      const src = docMap.get(d.props._sourceId);
      if (src?.props?._ownerId === tagId) return true;
    }
    // Also check metaNodeId
    const tupleChildren = getChildren(d.id);
    for (const tc of tupleChildren) {
      if (tc.props?._metaNodeId === tagId) return true;
    }
  }
  return false;
}

// ============================================================
// Strategy A: Articles with URLs
// ============================================================

async function strategyA_ArticlesWithUrls() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("Strategy A: Articles with URLs → lens fetch --save");
  console.log("═══════════════════════════════════════════════════════\n");

  // Find article-tagged nodes with URLs
  const articles: { id: string; title: string; url: string; childCount: number }[] = [];

  for (const d of docs) {
    if (d.props?._docType && d.props._docType !== "node") continue;
    const name = cleanHtml(d.props?.name || "");
    if (!name || name.length < 5) continue;

    // Check if tagged as article
    if (!isTagged(d.id, ARTICLE_TAG_ID) && !isTagged(d.id, SOURCE_TAG_ID)) continue;

    const url = getUrlFromTuples(d.id);
    if (!url) continue;

    const children = getChildren(d.id).filter(c =>
      c.props?._docType !== "tuple" && c.props?._docType !== "metanode"
    );

    articles.push({ id: d.id, title: name, url, childCount: children.length });
  }

  console.log(`Found ${articles.length} articles with URLs\n`);

  // Test with first 3
  const testArticles = articles.slice(0, 3);
  for (const art of testArticles) {
    console.log(`─── Article: "${art.title.substring(0, 60)}..." ───`);
    console.log(`  URL: ${art.url}`);
    console.log(`  Tana children: ${art.childCount}`);

    // Try lens fetch --save
    console.log(`  Fetching...`);
    const fetchResult = lensExec(`fetch "${art.url}" --save --json`);
    try {
      const parsed = JSON.parse(fetchResult);
      if (parsed.error) {
        console.log(`  ✗ Fetch failed: ${parsed.error.message || parsed.error}`);
        // Fallback: create source from Tana data
        console.log(`  → Fallback: creating source from Tana content`);
        const body = buildBody(art.id);
        const result = lensWrite({
          type: "source",
          title: art.title,
          url: art.url,
          source_type: "web_article",
          body: body || "(content not available — original URL could not be fetched)",
        });
        console.log(`  → Source created: ${result.id || "failed"}`);
      } else {
        console.log(`  ✓ Fetched: ${parsed.word_count} words, source_id: ${parsed.source_id}`);
        // Now import Tana children as notes linked to this source
        const tanaBody = buildBody(art.id);
        if (tanaBody && tanaBody.length > 30) {
          const noteResult = lensWrite({
            type: "note",
            title: `Reading notes: ${art.title.substring(0, 80)}`,
            source: parsed.source_id,
            body: tanaBody,
          });
          console.log(`  ✓ Reading notes imported: ${noteResult.id || "failed"}`);
        }
      }
    } catch {
      console.log(`  ✗ Parse error: ${fetchResult.substring(0, 200)}`);
    }
    console.log();
  }

  return articles.length;
}

// ============================================================
// Strategy B: Personal Reflections (v2 — multi-tier scoring)
// ============================================================

// --- Scoring signals ---

// Tier 1: First-person depth — highest precision for genuine insight
const FIRST_PERSON_DEPTH = /我觉得|我认为|我发现|我意识到|我曾经|我的经验|我的感受|我之前|我想要/;

// Tier 2: Reflection vocabulary — good signal but needs dev-content guard
const REFLECTION_VOCAB = /反思|心得|感悟|体会|领悟|教训|启发|顿悟|醒悟/;

// Tier 3: Life & wisdom domain — topical signal for personal insight
const LIFE_DOMAIN = /恐惧|关系|人性|人生|认知偏差|沟通|冲突|成长|幸福|痛苦|勇气|谦虚|感激|尊重|信任|爱/;

// Tier 4: Insight structure — conceptual thinking patterns
const INSIGHT_STRUCTURE = /本质是|规律是|原则是|关键在于|核心是|根本原因|重要的是|不在于.*而在于|与其.*不如/;

// --- Negative signals (blockers) ---

// Title patterns that indicate dev/product task
const DEV_TITLE = /^V\d|^优化\s|^修复\s|^增加\s|^删除\s|^更新\s|^调整\s|^支持\s|^实现\s|^设计\s.*方案|System Prompt|Prompt Template|^<\w+>|^\w+\.\w+\(|^bug:|^feat:|^fix:/i;

// Body content that indicates prompt engineering / code spec
const DEV_BODY = /# Role|## Profile|## Constraints|## Skills|<Thinking>|<artifact|```\w+\n|system prompt|function call|API endpoint|npm install|import \{/i;

// Repost signals — third-person reporting without original thought
const REPOST_SIGNALS = /万字访谈|万字长文|最新采访|^转：|^转载|^分享：|@\w+:|访谈要点|原文链接/;

// Noise patterns
const NOISE_TITLE = /^Root node|^Trash|^test$|^Test |^TODO:|^FIXME:|^undefined|^null|^Untitled|Claude UI Test|Reference test/i;

function scoreNote(title: string, body: string): { quality: "high" | "medium" | "low"; reason: string } {
  const fullText = title + "\n" + body;

  // --- Hard rejections ---
  if (NOISE_TITLE.test(title)) return { quality: "low", reason: "noise-title" };
  if (body.length > 50000) return { quality: "low", reason: "container-node" };

  // Count positive and negative signals
  const hasFirstPerson = FIRST_PERSON_DEPTH.test(fullText);
  const hasReflection = REFLECTION_VOCAB.test(fullText);
  const hasLifeDomain = LIFE_DOMAIN.test(fullText);
  const hasInsightStructure = INSIGHT_STRUCTURE.test(fullText);

  const hasDevTitle = DEV_TITLE.test(title);
  const hasDevBody = DEV_BODY.test(body);
  const hasRepost = REPOST_SIGNALS.test(fullText);

  // Score: +2 for first-person, +1 for each other positive signal
  let score = 0;
  if (hasFirstPerson) score += 2;
  if (hasReflection) score += 1;
  if (hasLifeDomain) score += 1;
  if (hasInsightStructure) score += 1;

  // Penalty: -2 for dev content, -1 for repost
  if (hasDevTitle) score -= 2;
  if (hasDevBody) score -= 2;
  if (hasRepost) score -= 1;

  // Length bonus: substantial content without dev signals
  if (fullText.length > 200 && !hasDevTitle && !hasDevBody) score += 1;

  // --- Classify ---
  if (score >= 3) return { quality: "high", reason: `score=${score}` };
  if (score >= 1 && fullText.length > 80) return { quality: "medium", reason: `score=${score}` };
  return { quality: "low", reason: `score=${score}` };
}

async function strategyB_PersonalNotes() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("Strategy B: Personal Reflections → multi-tier scoring");
  console.log("═══════════════════════════════════════════════════════\n");

  const personalNotes: { id: string; title: string; body: string; quality: string; reason: string }[] = [];

  for (const d of docs) {
    if (d.props?._docType && d.props._docType !== "node") continue;
    if (d.props?._ownerId?.startsWith("SYS_")) continue;
    if (isTagged(d.id, ARTICLE_TAG_ID) || isTagged(d.id, SOURCE_TAG_ID) || isTagged(d.id, HIGHLIGHT_TAG_ID)) continue;

    const name = cleanHtml(d.props?.name || "");
    if (!name || name.length < 15) continue;

    const body = buildBody(d.id);
    const { quality, reason } = scoreNote(name, body);

    if (quality !== "low") {
      personalNotes.push({ id: d.id, title: name, body, quality, reason });
    }
  }

  const high = personalNotes.filter(n => n.quality === "high");
  const medium = personalNotes.filter(n => n.quality === "medium");

  console.log(`Found ${personalNotes.length} quality personal notes`);
  console.log(`  High: ${high.length}`);
  console.log(`  Medium: ${medium.length}\n`);

  // 1. The "妈妈" note
  const mamaNote = personalNotes.find(n => n.title.includes("妈妈")) ||
    (() => {
      const d = docMap.get("McDQy1iODwcZ");
      if (!d) return null;
      const title = cleanHtml(d.props?.name || "");
      const body = buildBody(d.id);
      const { quality, reason } = scoreNote(title, body);
      return { id: d.id, title, body, quality, reason };
    })();

  if (mamaNote) {
    console.log(`─── Test: 妈妈 note ───`);
    console.log(`  Title: ${mamaNote.title}`);
    console.log(`  Quality: ${mamaNote.quality} (${mamaNote.reason})`);
    console.log(`  Body: ${mamaNote.body.length} chars`);

    const result = lensWrite({ type: "note", title: mamaNote.title, body: mamaNote.body });
    console.log(`  → ${result.id ? `✓ Created: ${result.id}` : `✗ Failed: ${JSON.stringify(result.error)}`}\n`);
  }

  // 2. Show top 15 high-quality titles for review
  console.log(`─── Top 15 high-quality notes ───`);
  for (const n of high.slice(0, 15)) {
    console.log(`  [${n.reason}] [${n.body.length}c] ${n.title.substring(0, 70)}`);
  }
  console.log();

  // 3. Import first 8 high-quality
  const toImport = high.filter(n => !n.title.includes("妈妈")).slice(0, 8);
  for (const note of toImport) {
    console.log(`─── Importing: "${note.title.substring(0, 60)}" ───`);
    console.log(`  Quality: ${note.quality} (${note.reason}), Body: ${note.body.length}c`);

    const result = lensWrite({
      type: "note",
      title: note.title.length > 200 ? note.title.substring(0, 197) + "..." : note.title,
      body: note.body || "",
    });
    console.log(`  → ${result.id ? `✓ Created: ${result.id}` : `✗ Failed: ${JSON.stringify(result.error)}`}\n`);
  }

  // 4. Show what got REJECTED — spot-check the filter
  console.log(`─── Rejected examples (was high in v1, now filtered) ───`);
  const oldHighPatterns = /思考|经验|启发/;
  let rejectedCount = 0;
  for (const d of docs) {
    if (d.props?._docType && d.props._docType !== "node") continue;
    if (d.props?._ownerId?.startsWith("SYS_")) continue;
    const name = cleanHtml(d.props?.name || "");
    if (!name || name.length < 15) continue;
    const body = buildBody(d.id);
    const fullText = name + "\n" + body;
    // Would have been "high" in v1
    if (oldHighPatterns.test(fullText) && fullText.length > 100) {
      const { quality } = scoreNote(name, body);
      if (quality === "low") {
        console.log(`  ✗ REJECTED: "${name.substring(0, 70)}" [body=${body.length}c]`);
        rejectedCount++;
        if (rejectedCount >= 10) break;
      }
    }
  }
  console.log(`  (${rejectedCount} shown)\n`);

  return personalNotes.length;
}

// ============================================================
// Strategy C: Highlights as Notes
// ============================================================

async function strategyC_Highlights() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("Strategy C: Highlights → lens write (note)");
  console.log("═══════════════════════════════════════════════════════\n");

  // Find highlight-tagged nodes
  const highlights: { id: string; text: string; parentTitle: string | null }[] = [];

  for (const d of docs) {
    if (!isTagged(d.id, HIGHLIGHT_TAG_ID)) continue;
    if (isTagged(d.id, ARTICLE_TAG_ID) || isTagged(d.id, SOURCE_TAG_ID)) continue;

    const text = cleanHtml(d.props?.name || "");
    if (!text || text.length < 15) continue;

    // Try to find parent source
    let parentTitle: string | null = null;
    if (d.props?._ownerId) {
      const parent = docMap.get(d.props._ownerId);
      if (parent) {
        parentTitle = cleanHtml(parent.props?.name || "");
      }
    }

    highlights.push({ id: d.id, text, parentTitle });
  }

  console.log(`Found ${highlights.length} highlights\n`);

  // Test: batch write first 5 as individual notes
  const testHighlights = highlights.slice(0, 5);
  for (const hl of testHighlights) {
    console.log(`─── Highlight: "${hl.text.substring(0, 80)}..." ───`);
    if (hl.parentTitle) console.log(`  From: "${hl.parentTitle.substring(0, 60)}"`);

    const result = lensWrite({
      type: "note",
      title: hl.text.length > 120 ? hl.text.substring(0, 117) + "..." : hl.text,
      body: hl.text.length > 120 ? hl.text : "",
    });
    console.log(`  → ${result.id ? `✓ Created: ${result.id}` : `✗ Failed: ${JSON.stringify(result.error)}`}`);
  }

  // Test: batch write (array of notes)
  if (highlights.length > 5) {
    console.log(`\n─── Batch write test (next 5 highlights) ───`);
    const batch = highlights.slice(5, 10).map(hl => ({
      type: "note" as const,
      title: hl.text.length > 120 ? hl.text.substring(0, 117) + "..." : hl.text,
      body: hl.text.length > 120 ? hl.text : "",
    }));

    const result = lensWrite(batch);
    if (result.created) {
      console.log(`  ✓ Batch created ${result.created.length} notes`);
      for (const r of result.created) {
        console.log(`    ${r.id}: "${(r.title || "").substring(0, 50)}"`);
      }
    } else {
      console.log(`  ✗ Batch failed: ${JSON.stringify(result).substring(0, 200)}`);
    }
  }

  return highlights.length;
}

// ============================================================
// Run all strategies
// ============================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Tana Import Strategy Test                          ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const articleCount = await strategyA_ArticlesWithUrls();
  const personalCount = await strategyB_PersonalNotes();
  const highlightCount = await strategyC_Highlights();

  // Final status
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("Summary");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`Tana data available:`);
  console.log(`  Articles with URLs: ${articleCount}`);
  console.log(`  Quality personal notes: ${personalCount}`);
  console.log(`  Highlights: ${highlightCount}`);

  console.log(`\nlens status after import:`);
  const status = lensExec("status --json");
  try {
    const s = JSON.parse(status);
    console.log(`  Notes: ${s.notes}`);
    console.log(`  Sources: ${s.sources}`);
    console.log(`  Total: ${s.total}`);
    console.log(`  Links: ${s.connectivity?.total_links || 0}`);
  } catch {
    console.log(status);
  }

  console.log(`\n─── Recommendations ───`);
  console.log(`1. Articles: fetch --save for live URLs, fallback to Tana content for dead links`);
  console.log(`2. Personal notes: filter by reflection/insight markers, import with children as body`);
  console.log(`3. Highlights: import as individual notes; batch write for efficiency`);
  console.log(`4. Quality gate: skip notes <15 chars, skip system/test nodes`);
}

main().catch(console.error);
