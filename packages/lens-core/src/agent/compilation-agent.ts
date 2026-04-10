/**
 * Compilation Agent.
 *
 * A short-lived agent that reads a source document, compares with existing
 * knowledge, and extracts NEW Claims, Frames, and Questions. It deduplicates
 * against existing Claims and identifies contradictions.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { paths } from "../core/paths";
import matter from "gray-matter";

// ============================================================
// Types for extraction output
// ============================================================

export interface ExtractedClaim {
  statement: string;
  qualifier: "certain" | "likely" | "presumably" | "tentative";
  voice: "extracted" | "restated" | "synthesized";
  scope: "big_picture" | "detail";
  evidence_text: string;
  evidence_locator?: string;
  structure_type?: string;
  warrant_description?: string;
  // Dedup/relation fields
  relation_to_existing?: "new" | "supports" | "contradicts" | "duplicate";
  existing_claim_id?: string; // if supports/contradicts/duplicate, which existing claim
}

export interface ExtractedFrame {
  name: string;
  sees: string;
  ignores: string;
  assumptions: string[];
}

export interface ExtractedQuestion {
  text: string;
  question_status: "open" | "tentative_answer";
}

export interface CompilationResult {
  claims: ExtractedClaim[];
  frames: ExtractedFrame[];
  questions: ExtractedQuestion[];
  suggested_programme?: string;
}

// ============================================================
// Tool schema
// ============================================================

const ExtractionSchema = Type.Object({
  claims: Type.Array(Type.Object({
    statement: Type.String(),
    qualifier: Type.Union([
      Type.Literal("certain"), Type.Literal("likely"),
      Type.Literal("presumably"), Type.Literal("tentative"),
    ]),
    voice: Type.Union([
      Type.Literal("extracted"), Type.Literal("restated"), Type.Literal("synthesized"),
    ]),
    scope: Type.Union([Type.Literal("big_picture"), Type.Literal("detail")]),
    evidence_text: Type.String(),
    evidence_locator: Type.Optional(Type.String()),
    structure_type: Type.Optional(Type.String()),
    warrant_description: Type.Optional(Type.String()),
    relation_to_existing: Type.Optional(Type.Union([
      Type.Literal("new"), Type.Literal("supports"),
      Type.Literal("contradicts"), Type.Literal("duplicate"),
    ])),
    existing_claim_id: Type.Optional(Type.String()),
  })),
  frames: Type.Array(Type.Object({
    name: Type.String(),
    sees: Type.String(),
    ignores: Type.String(),
    assumptions: Type.Array(Type.String()),
  })),
  questions: Type.Array(Type.Object({
    text: Type.String(),
    question_status: Type.Union([Type.Literal("open"), Type.Literal("tentative_answer")]),
  })),
  suggested_programme: Type.Optional(Type.String()),
});

// ============================================================
// Build existing knowledge context (FULL, not just 5 claims)
// ============================================================

interface ExistingClaim {
  id: string;
  statement: string;
  qualifier: string;
  scope: string;
}

function getExistingKnowledge(): { programmes: string[]; claims: ExistingClaim[] } {
  const programmes: string[] = [];
  const claims: ExistingClaim[] = [];

  // Read all programmes
  if (existsSync(paths.programmes)) {
    for (const f of readdirSync(paths.programmes).filter(f => f.endsWith(".md"))) {
      try {
        const content = readFileSync(join(paths.programmes, f), "utf-8");
        const parsed = matter(content);
        programmes.push(`${f.replace(".md", "")}: ${parsed.data.title || "(untitled)"}`);
      } catch {}
    }
  }

  // Read ALL claims (statement + qualifier + scope + id)
  if (existsSync(paths.claims)) {
    for (const f of readdirSync(paths.claims).filter(f => f.endsWith(".md"))) {
      try {
        const content = readFileSync(join(paths.claims, f), "utf-8");
        const parsed = matter(content);
        if (parsed.data.statement) {
          claims.push({
            id: f.replace(".md", ""),
            statement: parsed.data.statement,
            qualifier: parsed.data.qualifier || "tentative",
            scope: parsed.data.scope || "detail",
          });
        }
      } catch {}
    }
  }

  return { programmes, claims };
}

function formatExistingKnowledge(knowledge: { programmes: string[]; claims: ExistingClaim[] }): string {
  const parts: string[] = [];

  if (knowledge.programmes.length) {
    parts.push("EXISTING PROGRAMMES:");
    for (const p of knowledge.programmes) parts.push(`  - ${p}`);
  }

  if (knowledge.claims.length) {
    parts.push(`\nEXISTING CLAIMS (${knowledge.claims.length} total):`);
    parts.push("Check each new claim against these. Mark duplicates and contradictions.");
    for (const c of knowledge.claims) {
      parts.push(`  [${c.id}] [${c.qualifier}] [${c.scope}] "${c.statement}"`);
    }
  } else {
    parts.push("No existing claims. This is the first source being compiled.");
  }

  return parts.join("\n");
}

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are a Compilation Agent for lens, a structured cognition compiler.

Your task: read a source document, compare with existing knowledge, and extract ONLY genuinely new or conflicting insights.

## What to Extract

1. **Claims** — Falsifiable assertions with evidence
2. **Frames** — Perspectives the article uses
3. **Questions** — Genuine open questions raised

## CRITICAL: Deduplication

Before creating each claim, check the EXISTING CLAIMS list provided. For each potential claim:

- If an existing claim says essentially the SAME thing (even with different wording): set relation_to_existing="duplicate" and existing_claim_id to that claim's ID. Still include the evidence_text — it will be added to the existing claim as additional evidence.
- If an existing claim says something RELATED that this new evidence SUPPORTS: set relation_to_existing="supports" and existing_claim_id.
- If an existing claim says something this article CONTRADICTS: set relation_to_existing="contradicts" and existing_claim_id.
- If no existing claim is similar: set relation_to_existing="new" (or omit the field).

This is the most important part of your job. Do NOT create duplicate claims.

## Claim Rules
- statement: clear, falsifiable assertion
- evidence_text: verbatim quote from source (50-300 chars)
- qualifier: certain / likely / presumably / tentative
- voice: extracted / restated / synthesized
- scope: big_picture (overarching insight, key takeaway) / detail (specific evidence, supporting argument). Aim for 3-5 big_picture claims.
- structure_type: taxonomy / causal / description / timeline / argument / content / story / process / relationships
- warrant_description (optional): what perspective makes this valid

## Frame Rules
- name: 2-5 words
- sees: what this perspective reveals
- ignores: what it overlooks
- assumptions: what it takes for granted

## Question Rules
- Genuine OPEN questions the article raises but doesn't fully answer

## Standards
- 5-15 claims, 1-4 frames, 2-6 questions
- Quality over quantity — skip trivial claims
- SKIP claims that duplicate existing ones (mark as "duplicate" instead)

Call submit_extraction with your results.
If the document has a coherent theme, set suggested_programme to a descriptive title.
If an existing programme matches, use its exact title.`;

// ============================================================
// Run the Compilation Agent
// ============================================================

const VALID_STRUCTURE_TYPES = new Set([
  "taxonomy", "causal", "description", "timeline",
  "argument", "content", "story", "process", "relationships",
]);

export async function runCompilationAgent(
  sourceId: string,
  sourceTitle: string,
  sourceContent: string,
  onProgress?: (msg: string) => void,
): Promise<CompilationResult> {
  const log = onProgress || (() => {});

  log("Building knowledge context...");
  const knowledge = getExistingKnowledge();
  const knowledgeText = formatExistingKnowledge(knowledge);
  log(`Found ${knowledge.claims.length} existing claims, ${knowledge.programmes.length} programmes`);

  log("Starting Compilation Agent...");

  const result: CompilationResult = { claims: [], frames: [], questions: [] };
  let toolCalled = false;

  const submitTool: AgentTool<typeof ExtractionSchema> = {
    name: "submit_extraction",
    description: "Submit extracted Claims, Frames, and Questions from the source document. Mark duplicates and contradictions with existing claims.",
    label: "Submit Extraction",
    parameters: ExtractionSchema,
    execute: async (toolCallId, params) => {
      const p = params as CompilationResult;
      toolCalled = true;

      result.claims.push(...p.claims);
      result.frames.push(...p.frames);
      result.questions.push(...p.questions);
      if (p.suggested_programme && !result.suggested_programme) {
        result.suggested_programme = p.suggested_programme;
      }

      // Count relations
      const newCount = p.claims.filter(c => !c.relation_to_existing || c.relation_to_existing === "new").length;
      const dupCount = p.claims.filter(c => c.relation_to_existing === "duplicate").length;
      const supCount = p.claims.filter(c => c.relation_to_existing === "supports").length;
      const conCount = p.claims.filter(c => c.relation_to_existing === "contradicts").length;

      log(`Received: ${p.claims.length} claims (${newCount} new, ${dupCount} duplicate, ${supCount} supports, ${conCount} contradicts), ${p.frames.length} frames, ${p.questions.length} questions`);

      return {
        content: [{
          type: "text" as const,
          text: `Extraction received. ${newCount} new claims, ${dupCount} duplicates, ${supCount} supporting, ${conCount} contradicting.`,
        }],
        details: {},
      };
    },
  };

  const model = getModel("anthropic", "claude-sonnet-4-6");

  const agent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      tools: [submitTool],
      messages: [],
    },
    getApiKey: async (provider: string) => {
      if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY;
      return undefined;
    },
  });

  const userMessage = `## Existing Knowledge\n\n${knowledgeText}\n\n---\n\n## Source Document\n\n**Title**: ${sourceTitle}\n\n<source_document>\n${sourceContent}\n</source_document>\n\nExtract Claims, Frames, and Questions. For each claim, check against the existing claims list above and mark the relationship (new/duplicate/supports/contradicts).`;

  await agent.prompt(userMessage);
  await agent.waitForIdle();

  if (!toolCalled) {
    throw new Error("Compilation Agent did not produce any extraction.");
  }

  // Validate structure_type values
  for (const claim of result.claims) {
    if (claim.structure_type && !VALID_STRUCTURE_TYPES.has(claim.structure_type)) {
      claim.structure_type = undefined;
    }
  }

  log("Agent finished.");
  return result;
}
