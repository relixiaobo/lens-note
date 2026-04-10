/**
 * Compilation Agent.
 *
 * A short-lived agent that reads a source document, uses lens CLI tools
 * to explore existing knowledge, and extracts new Claims/Frames/Questions.
 *
 * The Agent has access to:
 * - submit_extraction tool (to submit results)
 * - bash tool (to run lens CLI commands for exploring existing knowledge)
 *
 * The Agent decides what to search, what to compare, how deep to explore.
 * As LLMs improve, the Agent's exploration gets better — zero code changes.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { execSync } from "child_process";

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
  relation_to_existing?: "new" | "supports" | "contradicts" | "duplicate";
  existing_claim_id?: string;
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
// Tool schemas
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

const LensQuerySchema = Type.Object({
  command: Type.String({ description: "A lens CLI command to run, e.g.: lens list claims --scope big_picture --json" }),
});

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are a Compilation Agent for lens, a structured cognition compiler.

Your task: read a source document, explore existing knowledge, and extract ONLY genuinely new or conflicting insights.

## Your Tools

1. **lens_query**: Run any lens CLI command to explore existing knowledge. Examples:
   - lens list programmes --json          (see all research themes)
   - lens list claims --scope big_picture --json  (see core beliefs)
   - lens list claims --programme pgm_01 --json   (see claims in a programme)
   - lens search "keyword" --json         (find claims by keyword)
   - lens show clm_01 --json              (see full details of a claim)
   - lens links clm_01 --json             (see what's connected to a claim)
   - lens context "topic" --json          (get assembled context on a topic)

2. **submit_extraction**: Submit your extracted Claims, Frames, and Questions.

## Your Process

1. Read the source document provided
2. Identify key topics in the document
3. Use lens_query to explore what's already known about those topics
4. Compare the document's claims against existing knowledge
5. Extract ONLY what's genuinely new, supporting, or contradicting
6. Submit via submit_extraction

## Deduplication Rules

For each claim you consider extracting:
- Search for related existing claims using lens_query
- If an existing claim says essentially the SAME thing: mark relation_to_existing="duplicate" and set existing_claim_id. Still include evidence_text (it will be added as new evidence).
- If an existing claim is SUPPORTED by new evidence: mark "supports" with existing_claim_id
- If an existing claim is CONTRADICTED: mark "contradicts" with existing_claim_id
- If genuinely new: mark "new" (or omit the field)

## Claim Fields
- statement: clear, falsifiable assertion
- evidence_text: verbatim quote from source (50-300 chars)
- qualifier: certain / likely / presumably / tentative
- voice: extracted / restated / synthesized
- scope: big_picture (key takeaway, 3-5 per article) / detail (supporting evidence)
- structure_type: taxonomy / causal / description / timeline / argument / content / story / process / relationships

## Frame Fields
- name: 2-5 words
- sees / ignores / assumptions

## Question Fields
- text: genuine open question the article raises
- question_status: open / tentative_answer

## Standards
- 5-15 claims, 1-4 frames, 2-6 questions
- Quality over quantity — skip trivial claims
- SKIP claims that duplicate existing ones (mark as "duplicate")
- If the document matches an existing programme, use its exact title for suggested_programme`;

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

  log("Starting Compilation Agent...");

  const result: CompilationResult = { claims: [], frames: [], questions: [] };
  let toolCalled = false;

  // Tool 1: submit_extraction
  const submitTool: AgentTool<typeof ExtractionSchema> = {
    name: "submit_extraction",
    description: "Submit extracted Claims, Frames, and Questions. Mark duplicates and contradictions with existing claims.",
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

      const newCount = p.claims.filter(c => !c.relation_to_existing || c.relation_to_existing === "new").length;
      const dupCount = p.claims.filter(c => c.relation_to_existing === "duplicate").length;
      const supCount = p.claims.filter(c => c.relation_to_existing === "supports").length;
      const conCount = p.claims.filter(c => c.relation_to_existing === "contradicts").length;

      log(`Received: ${p.claims.length} claims (${newCount} new, ${dupCount} dup, ${supCount} supports, ${conCount} contradicts), ${p.frames.length} frames, ${p.questions.length} questions`);

      return {
        content: [{ type: "text" as const, text: `Extraction received. ${newCount} new, ${dupCount} duplicates, ${supCount} supporting, ${conCount} contradicting.` }],
        details: {},
      };
    },
  };

  // Tool 2: lens_query — run any lens CLI command
  const lensQueryTool: AgentTool<typeof LensQuerySchema> = {
    name: "lens_query",
    description: "Run a lens CLI command to explore existing knowledge. The command must start with 'lens' and include '--json'. Examples: 'lens list claims --scope big_picture --json', 'lens search \"quality\" --json', 'lens show clm_01 --json', 'lens links clm_01 --json'",
    label: "Query Lens Knowledge Base",
    parameters: LensQuerySchema,
    execute: async (toolCallId, params) => {
      let cmd = params.command.trim();

      // Ensure --json flag
      if (!cmd.includes("--json")) cmd += " --json";

      // Security: only allow lens commands
      if (!cmd.startsWith("lens ")) {
        return {
          content: [{ type: "text" as const, text: "Error: command must start with 'lens'" }],
          details: {},
        };
      }

      // Don't allow write commands
      if (cmd.includes("ingest") || cmd.includes("note") || cmd.includes("init") || cmd.includes("feed")) {
        return {
          content: [{ type: "text" as const, text: "Error: only read commands are allowed (list, show, search, links, context, programme, status)" }],
          details: {},
        };
      }

      try {
        // Run via the current process's bun
        const bunPath = process.execPath || "bun";
        const mainPath = new URL("../main.ts", import.meta.url).pathname;
        const lensCmd = cmd.replace(/^lens\s+/, "");
        const output = execSync(`"${bunPath}" run "${mainPath}" ${lensCmd}`, {
          encoding: "utf-8",
          timeout: 10000,
          env: { ...process.env },
        });

        log(`  lens_query: ${cmd.substring(0, 60)}...`);

        return {
          content: [{ type: "text" as const, text: output.substring(0, 8000) }], // cap output
          details: {},
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error running command: ${msg.substring(0, 500)}` }],
          details: {},
        };
      }
    },
  };

  const model = getModel("anthropic", "claude-sonnet-4-6");

  const agent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      tools: [submitTool, lensQueryTool],
      messages: [],
    },
    getApiKey: async (provider: string) => {
      if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY;
      return undefined;
    },
  });

  // User message: just the source document. No manually injected existing claims.
  const userMessage = `## Source Document to Compile\n\n**Title**: ${sourceTitle}\n**Source ID**: ${sourceId}\n\n<source_document>\n${sourceContent}\n</source_document>\n\nFirst, use lens_query to explore what's already in the knowledge base about the topics in this article. Then extract Claims, Frames, and Questions, marking relationships to existing claims. Call submit_extraction with your results.`;

  await agent.prompt(userMessage);
  await agent.waitForIdle();

  if (!toolCalled) {
    throw new Error("Compilation Agent did not produce any extraction.");
  }

  // Validate structure_type
  for (const claim of result.claims) {
    if (claim.structure_type && !VALID_STRUCTURE_TYPES.has(claim.structure_type)) {
      claim.structure_type = undefined;
    }
  }

  log("Agent finished.");
  return result;
}
