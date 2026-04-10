/**
 * Process Compilation Agent output into lens objects.
 *
 * Creates Claim/Frame/Question/Programme markdown files and indexes them.
 * Looks up existing Programmes by title before creating new ones.
 */

import { generateId, type Claim, type Frame, type Question, type Programme } from "../core/types";
import { saveObject, listObjects, readObject } from "../core/storage";
import type { CompilationResult } from "./compilation-agent";

export interface ProcessedObjects {
  claims: string[];
  frames: string[];
  questions: string[];
  programme?: string;
}

/** Find an existing programme by normalized title match */
function findExistingProgramme(suggestedTitle: string): string | undefined {
  const ids = listObjects("programme");
  const normalizedSuggested = suggestedTitle.toLowerCase().trim();

  for (const id of ids) {
    const obj = readObject(id);
    if (!obj) continue;
    const title = (obj.data.title || "").toLowerCase().trim();
    // Exact or substring match
    if (title === normalizedSuggested || title.includes(normalizedSuggested) || normalizedSuggested.includes(title)) {
      return id;
    }
  }
  return undefined;
}

export function processAgentOutput(
  result: CompilationResult,
  sourceId: string,
  onProgress?: (msg: string) => void,
): ProcessedObjects {
  const log = onProgress || (() => {});
  const now = new Date().toISOString();
  const processed: ProcessedObjects = { claims: [], frames: [], questions: [] };

  // Find or create Programme
  let programmeId: string | undefined;
  if (result.suggested_programme) {
    // Look up existing programme first
    programmeId = findExistingProgramme(result.suggested_programme);

    if (programmeId) {
      log(`Using existing Programme: ${programmeId}`);
    } else {
      programmeId = generateId("programme");
      const programme: Programme = {
        id: programmeId,
        type: "programme",
        title: result.suggested_programme,
        description: `Created from source ${sourceId}`,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      saveObject(programme, "");
      processed.programme = programmeId;
      log(`Created Programme: ${programmeId} — "${programme.title}"`);
    }
  }

  // Create Claims
  for (const ec of result.claims) {
    const id = generateId("claim");
    const claim: Claim = {
      id,
      type: "claim",
      statement: ec.statement,
      qualifier: ec.qualifier,
      voice: ec.voice,
      evidence: [{
        text: ec.evidence_text,
        source: sourceId,
        locator: ec.evidence_locator,
      }],
      structure_type: ec.structure_type as any,
      scope: ec.scope,
      programmes: programmeId ? [programmeId] : undefined,
      source: sourceId,
      status: "active",
      created_at: now,
    };

    const body = ec.warrant_description
      ? `${ec.statement}\n\nPerspective: ${ec.warrant_description}`
      : ec.statement;

    saveObject(claim, body);
    processed.claims.push(id);
  }
  log(`Created ${processed.claims.length} Claims`);

  // Create Frames
  for (const ef of result.frames) {
    const id = generateId("frame");
    const frame: Frame = {
      id,
      type: "frame",
      name: ef.name,
      sees: ef.sees,
      ignores: ef.ignores,
      assumptions: ef.assumptions,
      programmes: programmeId ? [programmeId] : undefined,
      source: sourceId,
      status: "active",
      created_at: now,
    };

    saveObject(frame, "");
    processed.frames.push(id);
  }
  log(`Created ${processed.frames.length} Frames`);

  // Create Questions
  for (const eq of result.questions) {
    const id = generateId("question");
    const question: Question = {
      id,
      type: "question",
      text: eq.text,
      question_status: eq.question_status,
      programmes: programmeId ? [programmeId] : undefined,
      source: sourceId,
      status: "active",
      created_at: now,
    };

    saveObject(question, "");
    processed.questions.push(id);
  }
  log(`Created ${processed.questions.length} Questions`);

  return processed;
}
