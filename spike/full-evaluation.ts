/**
 * Full Extraction Quality Evaluation
 *
 * Fetches real articles, runs extraction, evaluates quality across
 * multiple dimensions, outputs a comprehensive report.
 *
 * Usage:
 *   bun run spike/full-evaluation.ts
 *   bun run spike/full-evaluation.ts --article ai-01    # run single article
 *   bun run spike/full-evaluation.ts --skip-fetch       # use cached content
 *
 * Requires: ANTHROPIC_API_KEY in .env or environment
 */

import { complete, getModel } from "@mariozechner/pi-ai";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { TEST_ARTICLES, type TestArticle } from "./test-articles";

// Load .env
const envPath = `${process.cwd()}/.env`;
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY not set. Create a .env file or export it.");
  process.exit(1);
}

// ============================================================
// Types
// ============================================================

interface ExtractedClaim {
  statement: string;
  evidence_text: string;
  qualifier: "certain" | "likely" | "presumably" | "tentative";
  voice: "extracted" | "restated" | "synthesized";
  structure_type: string;
  elaboration: {
    scope: string;
    importance: string;
    scale: string;
    generality: string;
    context: string;
  };
  warrant_description?: string;
  rebuttals?: string[];
}

interface ExtractedFrame {
  name: string;
  sees: string;
  ignores: string;
  assumptions: string[];
  useful_when: string[];
  failure_modes: string[];
}

interface ExtractedQuestion {
  text: string;
  status: "open" | "tentative_answer";
  current_position?: string;
}

interface ExtractionResult {
  claims: ExtractedClaim[];
  frames: ExtractedFrame[];
  questions: ExtractedQuestion[];
}

// ============================================================
// LLM Setup
// ============================================================

const model = getModel("anthropic", "claude-sonnet-4-6");

const EXTRACTION_PROMPT = `You are a structured knowledge extraction system. Given an article, extract:

1. **Claims**: Falsifiable assertions with Toulmin structure
2. **Frames**: Perspectives or lenses through which the article sees the world
3. **Questions**: Open questions raised by the article

## Claim Extraction Rules

For each claim:
- **statement**: A single, clear, falsifiable assertion. Not a summary or opinion.
- **evidence_text**: The exact excerpt from the article that supports this claim (verbatim or near-verbatim quote, 50-300 chars).
- **qualifier**: How confident the article is: "certain" / "likely" / "presumably" / "tentative"
- **voice**: "extracted" (directly stated) / "restated" (rephrased, same meaning) / "synthesized" (inferred from multiple parts)
- **structure_type**: "taxonomy" / "causal" / "description" / "timeline" / "argument" / "content" / "story" / "process" / "relationships"
- **elaboration**: Position on 5 independent dimensions:
  - scope: "big_picture" / "intermediate" / "detail"
  - importance: "core" / "supporting" / "subsidiary"
  - scale: "whole" / "part" / "sub_part"
  - generality: "general" / "specific" / "exception"
  - context: "wider" / "mid" / "narrow"
- **warrant_description** (optional): What perspective/theory makes this claim valid?
- **rebuttals** (optional): Conditions under which this claim would fail

## Frame Extraction Rules

A Frame is a perspective/lens, NOT a topic.
- **name**: Short name (2-5 words)
- **sees**: What this frame makes visible
- **ignores**: What this frame deliberately ignores
- **assumptions**: What it takes for granted
- **useful_when**: When to apply this frame
- **failure_modes**: When this frame misleads

## Question Extraction Rules

Extract genuine open questions the article raises or implies. Don't manufacture questions the article already answers.

## Output

Return valid JSON: { "claims": [...], "frames": [...], "questions": [...] }

Extract 5-15 claims, 1-4 frames, and 2-6 questions per article. Quality over quantity.`;

// ============================================================
// Article Fetching
// ============================================================

async function fetchArticle(url: string): Promise<string> {
  console.log(`    Fetching ${url}...`);
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const html = await resp.text();

  // Simple HTML to text extraction (strip tags, decode entities)
  // In production, lens uses Defuddle. For the spike, basic extraction is fine.
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to ~8000 words to stay within context window
  const words = text.split(/\s+/);
  if (words.length > 8000) {
    text = words.slice(0, 8000).join(" ") + "\n\n[truncated]";
  }

  return text;
}

// ============================================================
// Extraction
// ============================================================

function getTextContent(response: AssistantMessage): string {
  return response.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
}

async function extract(content: string, title: string): Promise<ExtractionResult> {
  const response = await complete(
    model,
    {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${EXTRACTION_PROMPT}\n\n---\n\n# Article: ${title}\n\n${content}`,
            },
          ],
        },
      ],
    },
    { maxTokens: 8000 }
  );

  const text = getTextContent(response);
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text];
  const jsonStr = jsonMatch[1] || text;

  try {
    return JSON.parse(jsonStr.trim()) as ExtractionResult;
  } catch {
    console.error(`    JSON parse failed. Raw output (first 300 chars): ${text.substring(0, 300)}`);
    return { claims: [], frames: [], questions: [] };
  }
}

// ============================================================
// Quality Metrics
// ============================================================

const VALID_STRUCTURE_TYPES = new Set([
  "taxonomy", "causal", "description", "timeline",
  "argument", "content", "story", "process", "relationships",
]);

const VALID_QUALIFIERS = new Set(["certain", "likely", "presumably", "tentative"]);
const VALID_VOICES = new Set(["extracted", "restated", "synthesized"]);
const VALID_ELAB = {
  scope: new Set(["big_picture", "intermediate", "detail"]),
  importance: new Set(["core", "supporting", "subsidiary"]),
  scale: new Set(["whole", "part", "sub_part"]),
  generality: new Set(["general", "specific", "exception"]),
  context: new Set(["wider", "mid", "narrow"]),
};

interface ArticleMetrics {
  article_id: string;
  title: string;
  domain: string;
  word_count: number;

  // Counts
  claim_count: number;
  frame_count: number;
  question_count: number;

  // Toulmin completeness
  toulmin_core_pct: number; // % with statement + evidence + qualifier
  toulmin_extended_pct: number; // % with warrant + rebuttals

  // Field validity
  qualifier_valid_pct: number;
  voice_valid_pct: number;
  structure_type_valid_pct: number;
  elaboration_valid_pct: number;

  // Distribution
  qualifier_dist: Record<string, number>;
  voice_dist: Record<string, number>;
  structure_type_dist: Record<string, number>;

  // Frame quality
  frames_with_sees_ignores_pct: number;
  frames_with_assumptions_pct: number;

  // Issues
  issues: string[];
}

function evaluate(result: ExtractionResult, article: TestArticle, wordCount: number): ArticleMetrics {
  const issues: string[] = [];
  const claims = result.claims || [];
  const frames = result.frames || [];
  const questions = result.questions || [];
  const n = claims.length || 1;

  // Toulmin core
  const coreOk = claims.filter(
    (c) => c.statement?.length > 10 && c.evidence_text?.length > 10 && c.qualifier
  ).length;

  // Toulmin extended
  const extOk = claims.filter(
    (c) => c.warrant_description && c.rebuttals?.length
  ).length;

  // Validity checks
  const qualOk = claims.filter((c) => VALID_QUALIFIERS.has(c.qualifier)).length;
  const voiceOk = claims.filter((c) => VALID_VOICES.has(c.voice)).length;
  const stOk = claims.filter((c) => VALID_STRUCTURE_TYPES.has(c.structure_type)).length;

  let elabOk = 0;
  for (const c of claims) {
    if (!c.elaboration) continue;
    const e = c.elaboration;
    if (
      VALID_ELAB.scope.has(e.scope) &&
      VALID_ELAB.importance.has(e.importance) &&
      VALID_ELAB.scale.has(e.scale) &&
      VALID_ELAB.generality.has(e.generality) &&
      VALID_ELAB.context.has(e.context)
    ) elabOk++;
  }

  // Distributions
  const qualDist: Record<string, number> = {};
  const voiceDist: Record<string, number> = {};
  const stDist: Record<string, number> = {};
  for (const c of claims) {
    qualDist[c.qualifier || "missing"] = (qualDist[c.qualifier || "missing"] || 0) + 1;
    voiceDist[c.voice || "missing"] = (voiceDist[c.voice || "missing"] || 0) + 1;
    stDist[c.structure_type || "missing"] = (stDist[c.structure_type || "missing"] || 0) + 1;
  }

  // Frame quality
  const framesSeesIgnores = frames.filter((f) => f.sees && f.ignores).length;
  const framesAssumptions = frames.filter((f) => f.assumptions?.length > 0).length;

  // Issue detection
  if (claims.length === 0) issues.push("No claims extracted");
  if (claims.length < 3) issues.push(`Only ${claims.length} claims (expected 5-15)`);
  if (frames.length === 0) issues.push("No frames extracted");
  if (questions.length === 0) issues.push("No questions extracted");
  if (coreOk / n < 0.8) issues.push(`Toulmin core completeness ${Math.round((coreOk / n) * 100)}% < 80%`);

  const invalidSt = Object.keys(stDist).filter(
    (t) => t !== "missing" && !VALID_STRUCTURE_TYPES.has(t)
  );
  if (invalidSt.length) issues.push(`Invalid structure_types: ${invalidSt.join(", ")}`);

  return {
    article_id: article.id,
    title: article.title,
    domain: article.domain,
    word_count: wordCount,
    claim_count: claims.length,
    frame_count: frames.length,
    question_count: questions.length,
    toulmin_core_pct: Math.round((coreOk / n) * 100),
    toulmin_extended_pct: Math.round((extOk / n) * 100),
    qualifier_valid_pct: Math.round((qualOk / n) * 100),
    voice_valid_pct: Math.round((voiceOk / n) * 100),
    structure_type_valid_pct: Math.round((stOk / n) * 100),
    elaboration_valid_pct: Math.round((elabOk / n) * 100),
    qualifier_dist: qualDist,
    voice_dist: voiceDist,
    structure_type_dist: stDist,
    frames_with_sees_ignores_pct: Math.round((framesSeesIgnores / Math.max(frames.length, 1)) * 100),
    frames_with_assumptions_pct: Math.round((framesAssumptions / Math.max(frames.length, 1)) * 100),
    issues,
  };
}

// ============================================================
// Consistency Test
// ============================================================

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size ? intersection.size / union.size : 0;
}

interface ConsistencyMetrics {
  claim_overlap_pct: number;
  qualifier_agreement_pct: number;
  structure_type_agreement_pct: number;
  elaboration_scope_agreement_pct: number;
}

async function testConsistency(content: string, title: string): Promise<ConsistencyMetrics> {
  const [r1, r2] = await Promise.all([
    extract(content, title),
    extract(content, title),
  ]);

  let matched = 0;
  let qualAgree = 0;
  let stAgree = 0;
  let scopeAgree = 0;

  for (const c1 of r1.claims) {
    const best = r2.claims.reduce(
      (acc, c2) => {
        const sim = jaccardSimilarity(c1.statement, c2.statement);
        return sim > acc.sim ? { claim: c2, sim } : acc;
      },
      { claim: null as ExtractedClaim | null, sim: 0 }
    );

    if (best.sim > 0.4 && best.claim) {
      matched++;
      if (c1.qualifier === best.claim.qualifier) qualAgree++;
      if (c1.structure_type === best.claim.structure_type) stAgree++;
      if (c1.elaboration?.scope === best.claim.elaboration?.scope) scopeAgree++;
    }
  }

  const total = Math.max(matched, 1);
  return {
    claim_overlap_pct: Math.round((matched / Math.max(r1.claims.length, 1)) * 100),
    qualifier_agreement_pct: Math.round((qualAgree / total) * 100),
    structure_type_agreement_pct: Math.round((stAgree / total) * 100),
    elaboration_scope_agreement_pct: Math.round((scopeAgree / total) * 100),
  };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const singleArticle = args.includes("--article") ? args[args.indexOf("--article") + 1] : null;
  const skipFetch = args.includes("--skip-fetch");

  let articles = TEST_ARTICLES;
  if (singleArticle) {
    articles = articles.filter((a) => a.id === singleArticle);
    if (articles.length === 0) {
      console.error(`Article "${singleArticle}" not found. Available: ${TEST_ARTICLES.map((a) => a.id).join(", ")}`);
      process.exit(1);
    }
  }

  console.log("=== Lens Full Extraction Evaluation ===\n");
  console.log(`Testing ${articles.length} article(s) across ${new Set(articles.map((a) => a.domain)).size} domains\n`);

  // Ensure cache dir exists
  mkdirSync("spike/cache", { recursive: true });
  mkdirSync("spike/results", { recursive: true });

  const allMetrics: ArticleMetrics[] = [];
  const allConsistency: (ConsistencyMetrics & { article_id: string })[] = [];
  const allExtractions: { article: TestArticle; extraction: ExtractionResult; metrics: ArticleMetrics }[] = [];

  for (const article of articles) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ${article.id}: ${article.title}`);
    console.log(`  Domain: ${article.domain} | Style: ${article.style} | Expected: ${article.expected_length}`);
    console.log(`${"=".repeat(60)}\n`);

    // Fetch or use cache
    const cachePath = `spike/cache/${article.id}.txt`;
    let content: string;

    if (article.content) {
      content = article.content;
    } else if (!skipFetch || !existsSync(cachePath)) {
      try {
        content = await fetchArticle(article.url);
        writeFileSync(cachePath, content);
        console.log(`    Cached to ${cachePath} (${content.split(/\s+/).length} words)`);
      } catch (e: any) {
        console.error(`    FETCH FAILED: ${e.message}`);
        console.log(`    Skipping this article.\n`);
        continue;
      }
    } else {
      content = readFileSync(cachePath, "utf-8");
      console.log(`    Using cached content (${content.split(/\s+/).length} words)`);
    }

    const wordCount = content.split(/\s+/).length;

    // Extract
    console.log(`    Extracting...`);
    const extraction = await extract(content, article.title);
    console.log(`    → ${extraction.claims.length} claims, ${extraction.frames.length} frames, ${extraction.questions.length} questions`);

    // Evaluate
    const metrics = evaluate(extraction, article, wordCount);
    allMetrics.push(metrics);
    allExtractions.push({ article, extraction, metrics });

    // Print metrics
    console.log(`\n    Quality:`);
    console.log(`      Toulmin core:       ${metrics.toulmin_core_pct}%`);
    console.log(`      Toulmin extended:   ${metrics.toulmin_extended_pct}%`);
    console.log(`      Qualifier valid:    ${metrics.qualifier_valid_pct}%`);
    console.log(`      Voice valid:        ${metrics.voice_valid_pct}%`);
    console.log(`      Structure type:     ${metrics.structure_type_valid_pct}%`);
    console.log(`      Elaboration:        ${metrics.elaboration_valid_pct}%`);
    console.log(`      Frame sees/ignores: ${metrics.frames_with_sees_ignores_pct}%`);

    // Consistency test
    console.log(`\n    Consistency (2 runs)...`);
    const consistency = await testConsistency(content, article.title);
    allConsistency.push({ ...consistency, article_id: article.id });

    console.log(`      Claim overlap:      ${consistency.claim_overlap_pct}%`);
    console.log(`      Qualifier agree:    ${consistency.qualifier_agreement_pct}%`);
    console.log(`      Structure agree:    ${consistency.structure_type_agreement_pct}%`);
    console.log(`      Elaboration agree:  ${consistency.elaboration_scope_agreement_pct}%`);

    if (metrics.issues.length > 0) {
      console.log(`\n    Issues:`);
      for (const issue of metrics.issues) console.log(`      ! ${issue}`);
    }
  }

  // ============================================================
  // Summary Report
  // ============================================================

  console.log("\n\n" + "=".repeat(60));
  console.log("  SUMMARY REPORT");
  console.log("=".repeat(60));

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(arr.length, 1);

  const avgCore = avg(allMetrics.map((m) => m.toulmin_core_pct));
  const avgExtended = avg(allMetrics.map((m) => m.toulmin_extended_pct));
  const avgStValid = avg(allMetrics.map((m) => m.structure_type_valid_pct));
  const avgElabValid = avg(allMetrics.map((m) => m.elaboration_valid_pct));
  const avgFrameQuality = avg(allMetrics.map((m) => m.frames_with_sees_ignores_pct));

  const avgClaimOverlap = avg(allConsistency.map((c) => c.claim_overlap_pct));
  const avgQualAgree = avg(allConsistency.map((c) => c.qualifier_agreement_pct));
  const avgStAgree = avg(allConsistency.map((c) => c.structure_type_agreement_pct));
  const avgElabAgree = avg(allConsistency.map((c) => c.elaboration_scope_agreement_pct));

  console.log("\n  Completeness (avg across articles):");
  console.log(`    Toulmin core:         ${avgCore.toFixed(0)}%  ${avgCore >= 80 ? "✅ PASS" : "❌ FAIL (need >= 80%)"}`);
  console.log(`    Toulmin extended:     ${avgExtended.toFixed(0)}%  ${avgExtended >= 50 ? "✅ PASS" : "⚠️  WARN (< 50%)"}`);
  console.log(`    Structure type valid: ${avgStValid.toFixed(0)}%  ${avgStValid >= 80 ? "✅ PASS" : "⚠️  WARN"}`);
  console.log(`    Elaboration valid:    ${avgElabValid.toFixed(0)}%  ${avgElabValid >= 80 ? "✅ PASS" : "⚠️  WARN"}`);
  console.log(`    Frame sees/ignores:   ${avgFrameQuality.toFixed(0)}%  ${avgFrameQuality >= 80 ? "✅ PASS" : "⚠️  WARN"}`);

  console.log("\n  Consistency (avg across articles, 2 runs each):");
  console.log(`    Claim overlap:        ${avgClaimOverlap.toFixed(0)}%  ${avgClaimOverlap >= 50 ? "✅" : "⚠️"}`);
  console.log(`    Qualifier agreement:  ${avgQualAgree.toFixed(0)}%  ${avgQualAgree >= 70 ? "✅" : "⚠️"}`);
  console.log(`    Structure type agree: ${avgStAgree.toFixed(0)}%  ${avgStAgree >= 70 ? "✅ PASS" : "⚠️  WARN (< 70%)"}`);
  console.log(`    Elaboration agree:    ${avgElabAgree.toFixed(0)}%  ${avgElabAgree >= 60 ? "✅ PASS" : "⚠️  WARN (< 60%)"}`);

  // Per-domain breakdown
  console.log("\n  Per-domain breakdown:");
  const domains = [...new Set(allMetrics.map((m) => m.domain))];
  for (const domain of domains) {
    const domainMetrics = allMetrics.filter((m) => m.domain === domain);
    const domCore = avg(domainMetrics.map((m) => m.toulmin_core_pct));
    const domClaims = avg(domainMetrics.map((m) => m.claim_count));
    console.log(`    ${domain.padEnd(25)} core: ${domCore.toFixed(0)}%  claims: ${domClaims.toFixed(1)} avg`);
  }

  // Schema recommendation
  console.log("\n  Schema Recommendations:");
  console.log(`    Toulmin core:      ${avgCore >= 80 ? "KEEP in v0.1" : "PRODUCT AT RISK — simplify prompt"}`);
  console.log(`    Toulmin extended:  ${avgExtended >= 50 ? "KEEP as optional" : "DEFER to v0.2"}`);
  console.log(`    structure_type:    ${avgStAgree >= 70 ? "KEEP in v0.1" : "DEFER to v0.2 (consistency too low)"}`);
  console.log(`    elaboration:       ${avgElabAgree >= 60 ? "KEEP in v0.1" : "DEFER to v0.2 (consistency too low)"}`);

  // Cost estimate
  const totalClaims = allMetrics.reduce((s, m) => s + m.claim_count, 0);
  console.log(`\n  Cost estimate:`);
  console.log(`    Articles processed: ${allMetrics.length}`);
  console.log(`    Total claims extracted: ${totalClaims}`);
  console.log(`    LLM calls: ${allMetrics.length * 3} (1 extract + 2 consistency per article)`);

  // Save full results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultPath = `spike/results/full-eval-${timestamp}.json`;
  writeFileSync(
    resultPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        model: "claude-sonnet-4-6",
        articles_tested: allMetrics.length,
        summary: { avgCore, avgExtended, avgStValid, avgElabValid, avgFrameQuality, avgClaimOverlap, avgQualAgree, avgStAgree, avgElabAgree },
        per_article: allExtractions.map((e) => ({
          article: e.article,
          metrics: e.metrics,
          extraction: e.extraction,
        })),
        consistency: allConsistency,
      },
      null,
      2
    )
  );
  console.log(`\n  Full results saved to ${resultPath}`);

  // Sample claims for human review
  console.log("\n\n" + "=".repeat(60));
  console.log("  SAMPLE CLAIMS FOR HUMAN REVIEW");
  console.log("  (review these manually to assess semantic quality)");
  console.log("=".repeat(60));

  for (const { article, extraction } of allExtractions.slice(0, 5)) {
    console.log(`\n  --- ${article.title} ---`);
    for (const claim of extraction.claims.slice(0, 3)) {
      console.log(`\n    Claim: "${claim.statement}"`);
      console.log(`    Qualifier: ${claim.qualifier} | Voice: ${claim.voice} | Type: ${claim.structure_type}`);
      console.log(`    Evidence: "${claim.evidence_text?.substring(0, 100)}..."`);
      if (claim.warrant_description) console.log(`    Warrant: ${claim.warrant_description.substring(0, 100)}`);
    }
  }
}

main().catch(console.error);
