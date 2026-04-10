/**
 * Compilation Agent.
 *
 * A short-lived agent that reads a source document, explores existing
 * knowledge in ~/.lens/, and extracts Claims, Frames, and Questions.
 *
 * Uses pi-agent-core for the agent loop and pi-ai for LLM calls.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { paths } from "../core/paths";

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
    scope: Type.Union([
      Type.Literal("big_picture"), Type.Literal("detail"),
    ]),
    evidence_text: Type.String(),
    evidence_locator: Type.Optional(Type.String()),
    structure_type: Type.Optional(Type.String()),
    warrant_description: Type.Optional(Type.String()),
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
// Build existing knowledge context
// ============================================================

function getExistingKnowledgeSummary(): string {
  const parts: string[] = [];

  if (existsSync(paths.programmes)) {
    const pgms = readdirSync(paths.programmes).filter(f => f.endsWith(".md"));
    if (pgms.length > 0) {
      parts.push("Existing Programmes:");
      for (const f of pgms.slice(0, 10)) {
        try {
          const content = readFileSync(join(paths.programmes, f), "utf-8");
          const titleMatch = content.match(/title:\s*['"]?(.+?)['"]?\s*$/m);
          parts.push(`- ${f.replace(".md", "")}: ${titleMatch?.[1] || "(untitled)"}`);
        } catch {}
      }
    }
  }

  if (existsSync(paths.claims)) {
    const claimCount = readdirSync(paths.claims).filter(f => f.endsWith(".md")).length;
    if (claimCount > 0) {
      parts.push(`\nExisting Claims: ${claimCount} total`);
      const files = readdirSync(paths.claims).filter(f => f.endsWith(".md")).slice(-5);
      for (const f of files) {
        try {
          const content = readFileSync(join(paths.claims, f), "utf-8");
          const stmtMatch = content.match(/statement:\s*[>|]?\s*\n?\s*(.+)/m);
          if (stmtMatch) parts.push(`- "${stmtMatch[1].substring(0, 80)}"`);
        } catch {}
      }
    }
  }

  if (parts.length === 0) {
    return "No existing knowledge yet. This is the first source being compiled.";
  }

  return parts.join("\n");
}

// ============================================================
// System prompt (static — source content goes in user message)
// ============================================================

const SYSTEM_PROMPT = `You are a Compilation Agent for lens, a structured cognition compiler.

Your task: read a source document and extract structured knowledge objects.

## What to Extract

1. **Claims** — Falsifiable assertions with evidence
2. **Frames** — Perspectives the article uses
3. **Questions** — Genuine open questions raised

## Claim Rules
- statement: clear, falsifiable assertion
- evidence_text: verbatim quote from source (50-300 chars)
- qualifier: certain / likely / presumably / tentative
- voice: extracted / restated / synthesized
- scope: big_picture (overarching insight, the key takeaway) / detail (specific evidence, data point, supporting argument). Aim for 3-5 big_picture claims and the rest as detail.
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
- Quality over quantity
- Every claim grounded in source text

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
  const existingKnowledge = getExistingKnowledgeSummary();

  log("Starting Compilation Agent...");

  // Accumulated result (merge across multiple tool calls)
  const result: CompilationResult = { claims: [], frames: [], questions: [] };
  let toolCalled = false;

  const submitTool: AgentTool<typeof ExtractionSchema> = {
    name: "submit_extraction",
    description: "Submit extracted Claims, Frames, and Questions from the source document",
    label: "Submit Extraction",
    parameters: ExtractionSchema,
    execute: async (toolCallId, params) => {
      const p = params as CompilationResult;
      toolCalled = true;

      // Merge (not replace) — agent may call multiple times for long docs
      result.claims.push(...p.claims);
      result.frames.push(...p.frames);
      result.questions.push(...p.questions);
      if (p.suggested_programme && !result.suggested_programme) {
        result.suggested_programme = p.suggested_programme;
      }

      log(`Received: ${p.claims.length} claims, ${p.frames.length} frames, ${p.questions.length} questions`);

      return {
        content: [{
          type: "text" as const,
          text: `Extraction received: ${p.claims.length} claims, ${p.frames.length} frames, ${p.questions.length} questions. Total so far: ${result.claims.length} claims, ${result.frames.length} frames, ${result.questions.length} questions.`,
        }],
        details: {},
      };
    },
  };

  const model = getModel("anthropic", "claude-sonnet-4-6");

  const agent = new Agent({
    initialState: {
      // System prompt is STATIC — no untrusted content here
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

  // User message contains the source content (isolated from system prompt)
  const userMessage = `## Existing Knowledge\n\n${existingKnowledge}\n\n---\n\n## Source Document\n\n**Title**: ${sourceTitle}\n\n<source_document>\n${sourceContent}\n</source_document>\n\nExtract Claims, Frames, and Questions from the source document above. Call submit_extraction with your results.`;

  await agent.prompt(userMessage);
  await agent.waitForIdle();

  if (!toolCalled) {
    throw new Error("Compilation Agent did not produce any extraction. The LLM may have refused or encountered an error.");
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
