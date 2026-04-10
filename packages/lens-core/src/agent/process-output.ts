/**
 * Process Compilation Agent output into lens objects.
 *
 * Handles 4 relationship types from the Agent:
 * - "new": Create a new Claim
 * - "duplicate": Add evidence to an existing Claim (don't create new)
 * - "supports": Create new Claim + set supports field linking to existing
 * - "contradicts": Create new Claim + set contradicts field on both
 */

import { readFileSync, writeFileSync } from "fs";
import matter from "gray-matter";
import { generateId, type Claim, type Frame, type Question, type Programme } from "../core/types";
import { saveObject, listObjects, readObject } from "../core/storage";
import { objectPath } from "../core/paths";
import type { CompilationResult, ExtractedClaim } from "./compilation-agent";

export interface ProcessedObjects {
  claims_new: string[];
  claims_reinforced: string[]; // existing claims that got new evidence
  claims_contradicted: string[]; // pairs [new, existing]
  claims_skipped: number; // duplicates where evidence was merged
  frames: string[];
  questions: string[];
  programme?: string;
}

function findExistingProgramme(suggestedTitle: string): string | undefined {
  const ids = listObjects("programme");
  const normalized = suggestedTitle.toLowerCase().trim();
  for (const id of ids) {
    const obj = readObject(id);
    if (!obj) continue;
    const title = (obj.data.title || "").toLowerCase().trim();
    if (title === normalized || title.includes(normalized) || normalized.includes(title)) {
      return id;
    }
  }
  return undefined;
}

/** Append evidence to an existing Claim's markdown file */
function appendEvidenceToClaim(claimId: string, newEvidence: { text: string; source: string; locator?: string }) {
  const filePath = objectPath(claimId);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);

  // Add to evidence array
  const evidence = parsed.data.evidence || [];
  evidence.push(newEvidence);
  parsed.data.evidence = evidence;

  // Rewrite file
  const content = matter.stringify(parsed.content, parsed.data);
  writeFileSync(filePath, content, "utf-8");
}

/** Add a contradicts reference to an existing Claim */
function addContradictsToClaim(claimId: string, contradictingId: string) {
  const filePath = objectPath(claimId);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);

  const contradicts = parsed.data.contradicts || [];
  if (!contradicts.includes(contradictingId)) {
    contradicts.push(contradictingId);
    parsed.data.contradicts = contradicts;
    const content = matter.stringify(parsed.content, parsed.data);
    writeFileSync(filePath, content, "utf-8");
  }
}

export function processAgentOutput(
  result: CompilationResult,
  sourceId: string,
  onProgress?: (msg: string) => void,
): ProcessedObjects {
  const log = onProgress || (() => {});
  const now = new Date().toISOString();
  const processed: ProcessedObjects = {
    claims_new: [], claims_reinforced: [], claims_contradicted: [],
    claims_skipped: 0, frames: [], questions: [],
  };

  // Find or create Programme
  let programmeId: string | undefined;
  if (result.suggested_programme) {
    programmeId = findExistingProgramme(result.suggested_programme);
    if (programmeId) {
      log(`Using existing Programme: ${programmeId}`);
    } else {
      programmeId = generateId("programme");
      const programme: Programme = {
        id: programmeId, type: "programme",
        title: result.suggested_programme,
        description: `Created from source ${sourceId}`,
        status: "active", created_at: now, updated_at: now,
      };
      saveObject(programme, "");
      processed.programme = programmeId;
      log(`Created Programme: ${programmeId} — "${programme.title}"`);
    }
  }

  // Process Claims
  for (const ec of result.claims) {
    const relation = ec.relation_to_existing || "new";
    const existingId = ec.existing_claim_id;

    switch (relation) {
      case "duplicate": {
        // Merge evidence into existing claim, don't create new
        if (existingId) {
          try {
            appendEvidenceToClaim(existingId, {
              text: ec.evidence_text,
              source: sourceId,
              locator: ec.evidence_locator,
            });
            processed.claims_reinforced.push(existingId);
            log(`  📎 Reinforced: ${existingId} — added evidence`);
          } catch (e) {
            // If existing claim not found, create as new
            createNewClaim(ec, sourceId, programmeId, now, processed, log);
          }
        }
        processed.claims_skipped++;
        break;
      }

      case "supports": {
        // Create new claim with supports field
        const id = createNewClaim(ec, sourceId, programmeId, now, processed, log);
        if (existingId && id) {
          // Update the new claim's supports field
          try {
            const filePath = objectPath(id);
            const raw = readFileSync(filePath, "utf-8");
            const parsed = matter(raw);
            parsed.data.supports = [existingId];
            writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
          } catch {}
          log(`  ↗ Supports: ${existingId}`);
        }
        break;
      }

      case "contradicts": {
        // Create new claim + set contradicts on both
        const id = createNewClaim(ec, sourceId, programmeId, now, processed, log);
        if (existingId && id) {
          try {
            // Mark new claim as contradicting existing
            const filePath = objectPath(id);
            const raw = readFileSync(filePath, "utf-8");
            const parsed = matter(raw);
            parsed.data.contradicts = [existingId];
            writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");

            // Mark existing claim as contradicted by new
            addContradictsToClaim(existingId, id);
          } catch {}
          processed.claims_contradicted.push(id, existingId);
          log(`  🔥 Contradicts: ${existingId}`);
        }
        break;
      }

      case "new":
      default: {
        createNewClaim(ec, sourceId, programmeId, now, processed, log);
        break;
      }
    }
  }

  log(`Claims: ${processed.claims_new.length} new, ${processed.claims_reinforced.length} reinforced, ${processed.claims_skipped} duplicates merged, ${processed.claims_contradicted.length / 2} contradictions`);

  // Create Frames
  for (const ef of result.frames) {
    const id = generateId("frame");
    const frame: Frame = {
      id, type: "frame",
      name: ef.name, sees: ef.sees, ignores: ef.ignores, assumptions: ef.assumptions,
      programmes: programmeId ? [programmeId] : undefined,
      source: sourceId, status: "active", created_at: now,
    };
    saveObject(frame, "");
    processed.frames.push(id);
  }
  log(`Created ${processed.frames.length} Frames`);

  // Create Questions
  for (const eq of result.questions) {
    const id = generateId("question");
    const question: Question = {
      id, type: "question",
      text: eq.text, question_status: eq.question_status,
      programmes: programmeId ? [programmeId] : undefined,
      source: sourceId, status: "active", created_at: now,
    };
    saveObject(question, "");
    processed.questions.push(id);
  }
  log(`Created ${processed.questions.length} Questions`);

  return processed;
}

function createNewClaim(
  ec: ExtractedClaim,
  sourceId: string,
  programmeId: string | undefined,
  now: string,
  processed: ProcessedObjects,
  log: (msg: string) => void,
): string {
  const id = generateId("claim");
  const claim: Claim = {
    id, type: "claim",
    statement: ec.statement,
    qualifier: ec.qualifier,
    voice: ec.voice,
    scope: ec.scope,
    evidence: [{ text: ec.evidence_text, source: sourceId, locator: ec.evidence_locator }],
    structure_type: ec.structure_type as any,
    programmes: programmeId ? [programmeId] : undefined,
    source: sourceId, status: "active", created_at: now,
  };

  const body = ec.warrant_description
    ? `${ec.statement}\n\nPerspective: ${ec.warrant_description}`
    : ec.statement;

  saveObject(claim, body);
  processed.claims_new.push(id);
  return id;
}
