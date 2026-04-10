/**
 * Compilation Agent.
 *
 * A short-lived agent that reads a source document, uses lens CLI tools
 * to explore existing knowledge, and extracts new Notes.
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

export interface ExtractedNote {
  text: string;
  role?: "claim" | "frame" | "question" | "observation" | "connection";
  qualifier?: "certain" | "likely" | "presumably" | "tentative";
  voice?: "extracted" | "restated" | "synthesized";
  scope?: "big_picture" | "detail";
  evidence_text?: string;
  evidence_locator?: string;
  structure_type?: string;
  sees?: string;
  ignores?: string;
  assumptions?: string[];
  question_status?: "open" | "tentative_answer";
  bridges?: string[];
  relation_to_existing?: "new" | "supports" | "contradicts" | "duplicate";
  existing_claim_id?: string;
}

export interface CompilationResult {
  notes: ExtractedNote[];
}

// ============================================================
// Tool schemas
// ============================================================

const ExtractionSchema = Type.Object({
  notes: Type.Array(Type.Object({
    text: Type.String(),
    role: Type.Optional(Type.Union([
      Type.Literal("claim"), Type.Literal("frame"),
      Type.Literal("question"), Type.Literal("observation"),
      Type.Literal("connection"),
    ])),
    qualifier: Type.Optional(Type.Union([
      Type.Literal("certain"), Type.Literal("likely"),
      Type.Literal("presumably"), Type.Literal("tentative"),
    ])),
    voice: Type.Optional(Type.Union([
      Type.Literal("extracted"), Type.Literal("restated"), Type.Literal("synthesized"),
    ])),
    scope: Type.Optional(Type.Union([Type.Literal("big_picture"), Type.Literal("detail")])),
    evidence_text: Type.Optional(Type.String()),
    evidence_locator: Type.Optional(Type.String()),
    structure_type: Type.Optional(Type.String()),
    sees: Type.Optional(Type.String()),
    ignores: Type.Optional(Type.String()),
    assumptions: Type.Optional(Type.Array(Type.String())),
    question_status: Type.Optional(Type.Union([Type.Literal("open"), Type.Literal("tentative_answer")])),
    bridges: Type.Optional(Type.Array(Type.String())),
    relation_to_existing: Type.Optional(Type.Union([
      Type.Literal("new"), Type.Literal("supports"),
      Type.Literal("contradicts"), Type.Literal("duplicate"),
    ])),
    existing_claim_id: Type.Optional(Type.String()),
  })),
});

const LensQuerySchema = Type.Object({
  command: Type.String({ description: "A lens CLI command to run, e.g.: lens list notes --scope big_picture --json" }),
});

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are a thinking partner for lens, a structured cognition compiler — like Luhmann's Zettelkasten.

You are NOT an extractor that mines articles for facts. You are a THINKER who reads articles and writes your own thoughts — connecting new ideas to existing knowledge.

## Your Tools

1. **lens_query**: Run lens CLI commands to explore existing knowledge.
   - lens list claims --scope big_picture --json   (see core beliefs)
   - lens search "keyword" --json                   (find related notes)
   - lens show <id> --json                           (read a note in full)
   - lens links <id> --json                          (see connections — FOLLOW THEM)
   - lens context "topic" --json                     (get assembled context)
   - lens list notes --role structure_note --json       (see index entry points)

2. **submit_extraction**: Submit your notes.

## Your Process — Think Like Luhmann

1. Read the source document
2. Identify key themes
3. DEEPLY explore existing knowledge:
   - Search by theme keywords
   - When you find a related note, READ IT (lens show)
   - Then FOLLOW ITS LINKS (lens links) to discover connected notes
   - Read those too. Build a thorough picture of what's already known.
   - Don't stop at keyword search — trace the web of connections.
4. Think: "What does this article MEAN in the context of what I already know?"
5. Write notes that are YOUR THOUGHTS triggered by the reading:
   - NOT summaries of what the article says
   - BUT insights about how new ideas connect to, support, contradict, or extend existing knowledge
   - Each note is an independent thought — understandable on its own
6. Link each note to existing notes it relates to (supports/contradicts/refines/related)

## What Makes a Good Note

A good note is NOT "the article says X." A good note is:
- A connection you discovered: "A's argument has the same structure as B's, which suggests..."
- A tension you noticed: "A claims X, but existing note Y says the opposite..."
- A genuinely new insight: something not already captured, that would change how you think
- A new perspective: a way of seeing that none of the existing notes express

## When NOT to Write a Note

- The article says something you already have a note about → DON'T create a duplicate. Set relation_to_existing="duplicate" with the existing_claim_id to add this as new evidence.
- The article restates common knowledge → skip
- The article makes a point that's trivially obvious → skip

## How Many Notes?

Write as many as you have GENUINE THOUGHTS. Could be 1. Could be 8. Don't force it.
An article that mostly covers known territory might produce 1 note (a new connection) and 3 duplicates (new evidence for existing notes).
A breakthrough article might produce 6 genuinely new thoughts.
The number follows from thinking, not from a target.

## Note Fields
- text: your thought (a complete, self-contained idea)
- evidence_text: verbatim quote from the article that triggered this thought (50-300 chars)
- qualifier: how confident you are (certain/likely/presumably/tentative)
- voice: synthesized (your own thinking) / extracted (directly from article) / restated (rephrased)
- scope: big_picture (core insight) / detail (supporting point)
- structure_type: taxonomy/causal/description/timeline/argument/content/story/process/relationships
- relation_to_existing: new / supports / contradicts / duplicate
- existing_claim_id: if supports/contradicts/duplicate, which existing note

## Frame Fields (only if the article introduces a genuinely novel perspective)
- sees / ignores / assumptions

## Question Fields (only if the article raises a genuinely open question)
- question_status

## Bridge Fields (only if you discover a connection between two existing notes)
- bridges: list of note IDs that this note connects`;

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

  const result: CompilationResult = { notes: [] };
  let toolCalled = false;

  // Tool 1: submit_extraction
  const submitTool: AgentTool<typeof ExtractionSchema> = {
    name: "submit_extraction",
    description: "Submit extracted Notes. Each note is a single thought with optional role-specific fields. Mark duplicates and contradictions with existing notes.",
    label: "Submit Extraction",
    parameters: ExtractionSchema,
    execute: async (toolCallId, params) => {
      const p = params as CompilationResult;
      toolCalled = true;

      result.notes.push(...p.notes);

      const newCount = p.notes.filter(n => !n.relation_to_existing || n.relation_to_existing === "new").length;
      const dupCount = p.notes.filter(n => n.relation_to_existing === "duplicate").length;
      const supCount = p.notes.filter(n => n.relation_to_existing === "supports").length;
      const conCount = p.notes.filter(n => n.relation_to_existing === "contradicts").length;

      log(`Received: ${p.notes.length} notes (${newCount} new, ${dupCount} dup, ${supCount} supports, ${conCount} contradicts)`);

      return {
        content: [{ type: "text" as const, text: `Extraction received. ${newCount} new, ${dupCount} duplicates, ${supCount} supporting, ${conCount} contradicting.` }],
        details: {},
      };
    },
  };

  // Tool 2: lens_query — run any lens CLI command
  const lensQueryTool: AgentTool<typeof LensQuerySchema> = {
    name: "lens_query",
    description: "Run a lens CLI command to explore existing knowledge. The command must start with 'lens' and include '--json'. Examples: 'lens list notes --scope big_picture --json', 'lens search \"quality\" --json', 'lens show note_01 --json', 'lens links note_01 --json'",
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
          content: [{ type: "text" as const, text: "Error: only read commands are allowed (list, show, search, links, context, status)" }],
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

  // User message: just the source document. No manually injected existing notes.
  const userMessage = `## Source Document to Compile\n\n**Title**: ${sourceTitle}\n**Source ID**: ${sourceId}\n\n<source_document>\n${sourceContent}\n</source_document>\n\nFirst, use lens_query to explore what's already in the knowledge base about the topics in this article. Then think deeply and submit your notes. Call submit_extraction with your results.`;

  await agent.prompt(userMessage);
  await agent.waitForIdle();

  if (!toolCalled) {
    throw new Error("Compilation Agent did not produce any extraction.");
  }

  // Validate structure_type
  for (const note of result.notes) {
    if (note.structure_type && !VALID_STRUCTURE_TYPES.has(note.structure_type)) {
      note.structure_type = undefined;
    }
  }

  log("Agent finished.");
  return result;
}
