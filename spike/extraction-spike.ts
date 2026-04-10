/**
 * Lens Extraction Quality Spike
 *
 * Purpose: Validate LLM extraction quality BEFORE writing product code.
 * This script answers the question: "Can Claude reliably extract structured
 * Claim / Frame / Question objects from real articles?"
 *
 * Usage:
 *   bun run spike/extraction-spike.ts [--url <url>] [--file <path>] [--all]
 *
 * Prerequisites:
 *   - bun installed
 *   - ANTHROPIC_API_KEY set
 *   - bun add @mariozechner/pi-ai (or run from project root after pnpm install)
 *
 * Output:
 *   - Console: quality metrics per article
 *   - File: spike/results/<timestamp>.json (full extraction results)
 *
 * Note: Uses pi-ai (https://github.com/badlogic/pi-mono) for LLM calls.
 * This is the same library lens will use in production, so this spike also
 * validates the pi-ai integration path.
 */

import { complete, getModel } from "@mariozechner/pi-ai";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

// ============================================================
// Types (minimal subset of schema.md for spike validation)
// ============================================================

type Qualifier = "certain" | "likely" | "presumably" | "tentative";
type Voice = "extracted" | "restated" | "synthesized";
type StructureType =
  | "taxonomy"
  | "causal"
  | "description"
  | "timeline"
  | "argument"
  | "content"
  | "story"
  | "process"
  | "relationships";

interface Elaboration {
  scope: "big_picture" | "intermediate" | "detail";
  importance: "core" | "supporting" | "subsidiary";
  scale: "whole" | "part" | "sub_part";
  generality: "general" | "specific" | "exception";
  context: "wider" | "mid" | "narrow";
}

interface ExtractedClaim {
  statement: string;
  evidence_text: string; // the excerpt text that supports this claim
  qualifier: Qualifier;
  voice: Voice;
  structure_type: StructureType;
  elaboration: Elaboration;
  warrant_description?: string; // what frame/perspective makes this claim valid
  rebuttals?: string[]; // conditions under which this claim fails
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
// Prompts
// ============================================================

const EXTRACTION_PROMPT = `You are a structured knowledge extraction system. Given an article, extract:

1. **Claims**: Falsifiable assertions with Toulmin structure
2. **Frames**: Perspectives or lenses through which the article sees the world
3. **Questions**: Open questions raised by the article

## Claim Extraction Rules

For each claim:
- **statement**: A single, clear, falsifiable assertion. Not a summary or opinion.
- **evidence_text**: The exact excerpt from the article that supports this claim (verbatim quote, 50-300 chars).
- **qualifier**: How confident the article is about this claim:
  - "certain" (0.95-1.0): Presented as established fact
  - "likely" (0.75-0.95): Strong evidence, minor caveats
  - "presumably" (0.50-0.75): Reasonable but debatable
  - "tentative" (0.00-0.50): Speculative, preliminary
- **voice**:
  - "extracted": Directly stated in the article
  - "restated": You rephrased but meaning is identical
  - "synthesized": You inferred from combining multiple parts
- **structure_type**: What structural pattern does this claim use?
  - "taxonomy": Classification/categorization
  - "causal": Cause-and-effect explanation
  - "description": Parts-of-a-whole
  - "timeline": Temporal sequence
  - "argument": Reasoning toward a conclusion
  - "content": About content organization itself
  - "story": Narrative
  - "process": Step-by-step procedure
  - "relationships": Comparisons, contrasts, connections
- **elaboration**: Position on 5 independent dimensions:
  - scope: "big_picture" | "intermediate" | "detail"
  - importance: "core" | "supporting" | "subsidiary"
  - scale: "whole" | "part" | "sub_part"
  - generality: "general" | "specific" | "exception"
  - context: "wider" | "mid" | "narrow"
- **warrant_description** (optional): What perspective/theory makes this claim valid?
- **rebuttals** (optional): Conditions under which this claim would fail

## Frame Extraction Rules

A Frame is a perspective/lens, NOT a topic. It defines what you see AND what you ignore.
- **name**: Short name (2-5 words)
- **sees**: What this frame makes visible
- **ignores**: What this frame deliberately ignores
- **assumptions**: What it takes for granted
- **useful_when**: When to apply this frame
- **failure_modes**: When this frame misleads

## Question Extraction Rules

Extract genuine open questions the article raises or implies.
- Don't manufacture questions the article already answers.
- Focus on what remains genuinely uncertain.

## Output Format

Return valid JSON matching this schema exactly:
{
  "claims": [...],
  "frames": [...],
  "questions": [...]
}

Extract 5-15 claims, 1-4 frames, and 2-6 questions per article. Quality over quantity.`;

// ============================================================
// Test Articles (built-in samples)
// ============================================================

const SAMPLE_ARTICLES: { title: string; url: string; content?: string }[] = [
  {
    title: "Sample: Karpathy LLM Wiki (short excerpt for testing)",
    url: "inline",
    content: `# LLM Wiki

The idea is simple: instead of using an LLM to answer questions about documents at query time (RAG), you use the LLM to process documents at ingest time, building up a structured wiki of knowledge that can be queried efficiently later.

Think of it like compilation vs interpretation. RAG is like an interpreted language - every time you ask a question, it re-reads and re-processes the relevant documents. An LLM Wiki is like a compiled language - you do the heavy processing once, and then queries are fast lookups into the compiled knowledge.

The key insight is that most knowledge work involves the same documents being queried many times. If you're a researcher, you read a paper once but reference its findings dozens of times. If you're an analyst, you process a dataset once but derive insights from it repeatedly. The compilation approach amortizes the cost of understanding across all future queries.

There are challenges: the compilation is lossy (you can't perfectly capture everything in a document), it's expensive upfront, and the compiled knowledge may become stale. But for many use cases, these tradeoffs are worth it. The compiled wiki becomes a "second brain" that actually works - not a graveyard of highlighted passages you'll never read again.

One important architectural decision is whether the wiki should store conclusions or evidence. I argue for evidence-first: store the key findings, data points, and arguments, not your interpretations of them. Interpretations change; evidence doesn't. This is analogous to how databases store normalized data, not materialized views.`,
  },
  {
    title: "Sample: Modern Hopfield Networks (synthetic for testing)",
    url: "inline",
    content: `# Modern Hopfield Networks and Transformer Attention

Ramsauer et al. (2020) demonstrated a remarkable mathematical equivalence: the update rule of modern Hopfield networks with exponential interaction functions is identical to the attention mechanism in Transformers. This finding has profound implications for understanding how large language models process and store information.

Classical Hopfield networks (1982) had severe capacity limitations - they could only store approximately 0.14N patterns for N neurons. Modern Hopfield networks, introduced by Krotov and Hopfield (2016) and further developed by Demircigil et al. (2017), use higher-order interaction functions that achieve exponential storage capacity.

The key insight is that softmax attention in Transformers can be rewritten as a single step of the modern Hopfield network update rule. When a Transformer processes a query against a set of key-value pairs, it is mathematically performing pattern retrieval in an associative memory. This means that every attention head in a Transformer is, in effect, a content-addressable memory system.

However, this equivalence has limitations. Bricken and Pehlevan (2021) showed that while the mathematical form is identical, Transformers and Hopfield networks differ in their learning dynamics. Transformers learn their stored patterns through backpropagation, while Hopfield networks traditionally use Hebbian learning. This means the patterns stored in a Transformer's attention are optimized for the training objective, not for faithful memory retrieval.

The practical implication is that retrieval accuracy in Transformers degrades as the number of stored patterns approaches the exponential capacity bound. For knowledge-intensive tasks, this suggests that external memory augmentation (RAG) may remain necessary even as model sizes grow, because the internal associative memory has fundamental capacity constraints.`,
  },
];

// ============================================================
// Core Logic
// ============================================================

// pi-ai: unified LLM provider interface
// getModel() returns a typed model reference; complete() sends the request
const model = getModel("anthropic", "claude-sonnet-4-6");

function getTextContent(response: AssistantMessage): string {
  return response.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
}

async function extractFromArticle(
  content: string,
  title: string
): Promise<ExtractionResult> {
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

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text];
  const jsonStr = jsonMatch[1] || text;

  try {
    return JSON.parse(jsonStr.trim()) as ExtractionResult;
  } catch (e) {
    console.error(`Failed to parse JSON for "${title}":`, e);
    console.error("Raw response:", text.substring(0, 500));
    return { claims: [], frames: [], questions: [] };
  }
}

// ============================================================
// Quality Assessment
// ============================================================

interface QualityReport {
  article_title: string;
  claim_count: number;
  frame_count: number;
  question_count: number;

  // Toulmin core completeness
  toulmin_core_completeness: number; // % of claims with statement + evidence + qualifier

  // Toulmin extended completeness
  toulmin_extended_completeness: number; // % of claims with warrant + rebuttals

  // Structure type distribution
  structure_type_distribution: Record<string, number>;
  structure_type_variety: number; // unique types used / 9

  // Elaboration coverage
  elaboration_completeness: number; // % of claims with all 5 dimensions filled

  // Voice distribution
  voice_distribution: Record<string, number>;

  // Qualifier distribution
  qualifier_distribution: Record<string, number>;

  // Issues found
  issues: string[];
}

function assessQuality(
  result: ExtractionResult,
  title: string
): QualityReport {
  const issues: string[] = [];

  // Toulmin core: statement + evidence_text + qualifier
  const claimsWithCore = result.claims.filter(
    (c) => c.statement?.length > 10 && c.evidence_text?.length > 10 && c.qualifier
  );
  const toulminCore = result.claims.length
    ? claimsWithCore.length / result.claims.length
    : 0;

  if (toulminCore < 0.8) {
    issues.push(
      `Toulmin core completeness ${(toulminCore * 100).toFixed(0)}% < 80% threshold`
    );
  }

  // Toulmin extended: warrant + rebuttals
  const claimsWithExtended = result.claims.filter(
    (c) => c.warrant_description && c.rebuttals?.length
  );
  const toulminExtended = result.claims.length
    ? claimsWithExtended.length / result.claims.length
    : 0;

  // Structure type
  const structDist: Record<string, number> = {};
  for (const c of result.claims) {
    const st = c.structure_type || "missing";
    structDist[st] = (structDist[st] || 0) + 1;
  }
  const validStructureTypes = new Set([
    "taxonomy", "causal", "description", "timeline",
    "argument", "content", "story", "process", "relationships",
  ]);
  const invalidTypes = Object.keys(structDist).filter(
    (t) => t !== "missing" && !validStructureTypes.has(t)
  );
  if (invalidTypes.length > 0) {
    issues.push(`Invalid structure_type values: ${invalidTypes.join(", ")}`);
  }
  if (structDist["missing"]) {
    issues.push(`${structDist["missing"]} claims missing structure_type`);
  }

  // Elaboration
  const validElabValues = {
    scope: ["big_picture", "intermediate", "detail"],
    importance: ["core", "supporting", "subsidiary"],
    scale: ["whole", "part", "sub_part"],
    generality: ["general", "specific", "exception"],
    context: ["wider", "mid", "narrow"],
  };

  let elaborationComplete = 0;
  for (const c of result.claims) {
    if (!c.elaboration) continue;
    const e = c.elaboration;
    const allValid =
      validElabValues.scope.includes(e.scope) &&
      validElabValues.importance.includes(e.importance) &&
      validElabValues.scale.includes(e.scale) &&
      validElabValues.generality.includes(e.generality) &&
      validElabValues.context.includes(e.context);
    if (allValid) elaborationComplete++;
  }
  const elabRate = result.claims.length
    ? elaborationComplete / result.claims.length
    : 0;

  if (elabRate < 0.6) {
    issues.push(
      `Elaboration completeness ${(elabRate * 100).toFixed(0)}% < 60% — consider making optional in v0.1`
    );
  }

  // Voice distribution
  const voiceDist: Record<string, number> = {};
  for (const c of result.claims) {
    const v = c.voice || "missing";
    voiceDist[v] = (voiceDist[v] || 0) + 1;
  }

  // Qualifier distribution
  const qualDist: Record<string, number> = {};
  for (const c of result.claims) {
    const q = c.qualifier || "missing";
    qualDist[q] = (qualDist[q] || 0) + 1;
  }

  // Frame quality
  if (result.frames.length === 0) {
    issues.push("No frames extracted");
  }
  for (const f of result.frames) {
    if (!f.sees || !f.ignores) {
      issues.push(`Frame "${f.name}" missing sees/ignores`);
    }
    if (!f.assumptions?.length) {
      issues.push(`Frame "${f.name}" missing assumptions`);
    }
  }

  // Question quality
  if (result.questions.length === 0) {
    issues.push("No questions extracted");
  }

  return {
    article_title: title,
    claim_count: result.claims.length,
    frame_count: result.frames.length,
    question_count: result.questions.length,
    toulmin_core_completeness: Math.round(toulminCore * 100),
    toulmin_extended_completeness: Math.round(toulminExtended * 100),
    structure_type_distribution: structDist,
    structure_type_variety:
      Math.round(
        (new Set(
          Object.keys(structDist).filter(
            (t) => t !== "missing" && validStructureTypes.has(t)
          )
        ).size /
          9) *
          100
      ),
    elaboration_completeness: Math.round(elabRate * 100),
    voice_distribution: voiceDist,
    qualifier_distribution: qualDist,
    issues,
  };
}

// ============================================================
// Consistency Test (run same article twice, compare)
// ============================================================

async function testConsistency(
  content: string,
  title: string
): Promise<{
  structure_type_agreement: number;
  qualifier_agreement: number;
  elaboration_agreement: number;
  claim_overlap: number;
}> {
  console.log(`  Running consistency test (2 extractions)...`);
  const [r1, r2] = await Promise.all([
    extractFromArticle(content, title),
    extractFromArticle(content, title),
  ]);

  // Compare claims by matching statements (fuzzy)
  let stMatches = 0;
  let qualAgree = 0;
  let structAgree = 0;
  let elabAgree = 0;
  let matched = 0;

  for (const c1 of r1.claims) {
    // Find best matching claim in r2
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
      if (c1.structure_type === best.claim.structure_type) structAgree++;
      if (
        c1.elaboration &&
        best.claim.elaboration &&
        c1.elaboration.scope === best.claim.elaboration.scope &&
        c1.elaboration.importance === best.claim.elaboration.importance
      )
        elabAgree++;
    }
  }

  const total = Math.max(matched, 1);
  return {
    claim_overlap: Math.round(
      (matched / Math.max(r1.claims.length, 1)) * 100
    ),
    qualifier_agreement: Math.round((qualAgree / total) * 100),
    structure_type_agreement: Math.round((structAgree / total) * 100),
    elaboration_agreement: Math.round((elabAgree / total) * 100),
  };
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size ? intersection.size / union.size : 0;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable not set");
    process.exit(1);
  }

  let articles = SAMPLE_ARTICLES;

  // Parse args
  if (args.includes("--file")) {
    const idx = args.indexOf("--file");
    const filePath = args[idx + 1];
    if (!filePath || !existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    articles = [
      {
        title: filePath.split("/").pop() || "custom",
        url: "file",
        content: readFileSync(filePath, "utf-8"),
      },
    ];
  }

  console.log("=== Lens Extraction Quality Spike ===\n");
  console.log(`Testing ${articles.length} article(s)\n`);

  const allResults: {
    article: string;
    extraction: ExtractionResult;
    quality: QualityReport;
    consistency?: Awaited<ReturnType<typeof testConsistency>>;
  }[] = [];

  for (const article of articles) {
    console.log(`\n--- ${article.title} ---\n`);
    const content = article.content || "(no content)";

    // Extract
    console.log("  Extracting...");
    const extraction = await extractFromArticle(content, article.title);
    console.log(
      `  Found: ${extraction.claims.length} claims, ${extraction.frames.length} frames, ${extraction.questions.length} questions`
    );

    // Assess quality
    const quality = assessQuality(extraction, article.title);

    // Consistency test
    const consistency = await testConsistency(content, article.title);

    // Print report
    console.log(`\n  Quality Report:`);
    console.log(
      `    Toulmin core completeness:     ${quality.toulmin_core_completeness}%`
    );
    console.log(
      `    Toulmin extended completeness: ${quality.toulmin_extended_completeness}%`
    );
    console.log(
      `    Structure type variety:        ${quality.structure_type_variety}% (of 9 types)`
    );
    console.log(
      `    Elaboration completeness:      ${quality.elaboration_completeness}%`
    );

    console.log(`\n  Consistency (same article, 2 runs):`);
    console.log(
      `    Claim overlap:                 ${consistency.claim_overlap}%`
    );
    console.log(
      `    Qualifier agreement:           ${consistency.qualifier_agreement}%`
    );
    console.log(
      `    Structure type agreement:      ${consistency.structure_type_agreement}%`
    );
    console.log(
      `    Elaboration agreement:         ${consistency.elaboration_agreement}%`
    );

    if (quality.issues.length > 0) {
      console.log(`\n  Issues:`);
      for (const issue of quality.issues) {
        console.log(`    ! ${issue}`);
      }
    }

    allResults.push({
      article: article.title,
      extraction,
      quality,
      consistency,
    });
  }

  // Summary
  console.log("\n\n=== SUMMARY ===\n");

  const avgToulminCore =
    allResults.reduce((s, r) => s + r.quality.toulmin_core_completeness, 0) /
    allResults.length;
  const avgElaboration =
    allResults.reduce((s, r) => s + r.quality.elaboration_completeness, 0) /
    allResults.length;
  const avgStructConsistency =
    allResults.reduce(
      (s, r) => s + (r.consistency?.structure_type_agreement || 0),
      0
    ) / allResults.length;
  const avgElabConsistency =
    allResults.reduce(
      (s, r) => s + (r.consistency?.elaboration_agreement || 0),
      0
    ) / allResults.length;

  console.log(
    `Avg Toulmin core completeness:     ${avgToulminCore.toFixed(0)}%  ${avgToulminCore >= 80 ? "PASS" : "FAIL (need >= 80%)"}`
  );
  console.log(
    `Avg Elaboration completeness:      ${avgElaboration.toFixed(0)}%  ${avgElaboration >= 60 ? "PASS" : "WARN (< 60%, consider making optional)"}`
  );
  console.log(
    `Avg Structure type consistency:    ${avgStructConsistency.toFixed(0)}%  ${avgStructConsistency >= 70 ? "PASS" : "WARN (< 70%, consider deferring)"}`
  );
  console.log(
    `Avg Elaboration consistency:       ${avgElabConsistency.toFixed(0)}%  ${avgElabConsistency >= 60 ? "PASS" : "WARN (< 60%, consider deferring)"}`
  );

  console.log("\n--- Schema Recommendations ---\n");

  if (avgToulminCore >= 80) {
    console.log(
      "  Toulmin core (statement/evidence/qualifier): KEEP in v0.1 schema"
    );
  } else {
    console.log(
      "  Toulmin core: FAILING — product viability at risk. Simplify prompt or reduce fields."
    );
  }

  const avgExtended =
    allResults.reduce(
      (s, r) => s + r.quality.toulmin_extended_completeness,
      0
    ) / allResults.length;
  if (avgExtended >= 50) {
    console.log("  Toulmin extended (warrant/rebuttals): KEEP as optional");
  } else {
    console.log("  Toulmin extended (warrant/rebuttals): DEFER to v0.2");
  }

  if (avgStructConsistency >= 70) {
    console.log("  Miller structure_type: KEEP in v0.1");
  } else {
    console.log(
      "  Miller structure_type: DEFER to v0.2 (consistency too low)"
    );
  }

  if (avgElabConsistency >= 60) {
    console.log("  Reif elaboration (5 dims): KEEP in v0.1");
  } else {
    console.log(
      "  Reif elaboration (5 dims): DEFER to v0.2 (consistency too low)"
    );
  }

  // Save results
  mkdirSync("spike/results", { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = `spike/results/${timestamp}.json`;
  writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`\nFull results saved to ${outPath}`);
}

main().catch(console.error);
