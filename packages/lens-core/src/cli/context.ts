/**
 * lens context "<query>" — Assemble agent-ready context pack.
 *
 * Searches for relevant Claims/Frames/Questions, inlines evidence,
 * returns structured JSON. This is THE primary agent interface.
 */

import { searchIndex, getObjectFromCache, getBacklinks, ensureInitialized } from "../core/storage";
import type { Claim, Frame, Question, Programme } from "../core/types";
import type { CommandOptions } from "./commands";

interface ContextClaim {
  id: string;
  statement: string;
  qualifier: string;
  voice: string;
  structure_type?: string;
  evidence: { text: string; source: string; locator?: string }[];
  warrant_frame?: { id: string; name: string; sees: string } | null;
  programmes: string[];
}

interface ContextFrame {
  id: string;
  name: string;
  sees: string;
  ignores: string;
  assumptions: string[];
}

interface ContextQuestion {
  id: string;
  text: string;
  status: string;
  current_position?: string;
}

/** Hydrate a Claim into a ContextClaim with inlined warrant frame */
function hydrateClaim(claim: Claim): ContextClaim {
  let warrantFrame: ContextClaim["warrant_frame"] = null;
  if (claim.warrant_frame) {
    const wf = getObjectFromCache(claim.warrant_frame);
    if (wf && wf.obj.type === "frame") {
      const f = wf.obj as Frame;
      warrantFrame = { id: f.id, name: f.name, sees: f.sees };
    }
  }
  return {
    id: claim.id,
    statement: claim.statement,
    qualifier: claim.qualifier,
    voice: claim.voice,
    structure_type: claim.structure_type,
    evidence: claim.evidence || [],
    warrant_frame: warrantFrame,
    programmes: claim.programmes || [],
  };
}

export async function assembleContext(query: string, opts: CommandOptions) {
  ensureInitialized();

  const results = searchIndex(query);

  // Dedup sets
  const claimMap = new Map<string, ContextClaim>();
  const frameMap = new Map<string, ContextFrame>();
  const questionMap = new Map<string, ContextQuestion>();
  const programmeSet = new Map<string, string>();

  /** Add a claim if not already seen */
  function addClaim(claim: Claim) {
    if (claimMap.has(claim.id)) return;
    claimMap.set(claim.id, hydrateClaim(claim));
    for (const pgmId of claim.programmes || []) trackProgramme(pgmId);
  }

  function addFrame(frame: Frame) {
    if (frameMap.has(frame.id)) return;
    frameMap.set(frame.id, {
      id: frame.id, name: frame.name, sees: frame.sees,
      ignores: frame.ignores, assumptions: frame.assumptions || [],
    });
  }

  function addQuestion(q: Question) {
    if (questionMap.has(q.id)) return;
    questionMap.set(q.id, {
      id: q.id, text: q.text, status: q.question_status,
      current_position: q.current_position,
    });
  }

  function trackProgramme(pgmId: string) {
    if (programmeSet.has(pgmId)) return;
    const pgm = getObjectFromCache(pgmId);
    if (pgm && pgm.obj.type === "programme") {
      programmeSet.set(pgmId, (pgm.obj as Programme).title);
    }
  }

  /** Pull ALL members of a programme */
  function expandProgramme(pgmId: string) {
    trackProgramme(pgmId);
    const members = getBacklinks(pgmId);
    for (const m of members) {
      if (m.rel !== "programme") continue;
      const cached = getObjectFromCache(m.from_id);
      if (!cached) continue;
      switch (cached.obj.type) {
        case "claim": addClaim(cached.obj as Claim); break;
        case "frame": addFrame(cached.obj as Frame); break;
        case "question": addQuestion(cached.obj as Question); break;
      }
    }
  }

  // Process search results
  for (const r of results) {
    const cached = getObjectFromCache(r.id);
    if (!cached) continue;

    switch (cached.obj.type) {
      case "claim": addClaim(cached.obj as Claim); break;
      case "frame": addFrame(cached.obj as Frame); break;
      case "question": addQuestion(cached.obj as Question); break;
      case "programme": expandProgramme(cached.obj.id); break;
      case "source": break; // sources contribute through their claims
    }
  }

  const pack = {
    query,
    timestamp: new Date().toISOString(),
    claims: Array.from(claimMap.values()),
    frames: Array.from(frameMap.values()),
    questions: Array.from(questionMap.values()),
    programmes: Array.from(programmeSet.entries()).map(([id, title]) => ({ id, title })),
    total_results: claimMap.size + frameMap.size + questionMap.size,
  };

  console.log(JSON.stringify(pack, null, 2));
}
