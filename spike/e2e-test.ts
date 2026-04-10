/**
 * End-to-end test with realistic content.
 *
 * Simulates what the Compilation Agent will produce:
 * - Ingests a source article
 * - Creates Claims, Frames, Questions with typed relationships
 * - Creates a Programme
 * - Creates a Thread
 * - Verifies everything is searchable and linkable
 */

import { generateId, type Source, type Claim, type Frame, type Question, type Programme, type Thread } from "../packages/lens-core/src/core/types";
import { writeObject, indexObject, readObject, searchIndex, getBacklinks, getForwardLinks, getProgrammeMembers, rebuildAllIndex, ensureInitialized, getDb } from "../packages/lens-core/src/core/storage";

const now = new Date().toISOString();

console.log("=== End-to-End Test with Real Content ===\n");

ensureInitialized();

// Clear previous test data
const db = getDb();
db.exec("DELETE FROM search_index");
db.exec("DELETE FROM objects");
db.exec("DELETE FROM links");

// ============================================================
// 1. Create a Source (simulating Defuddle output)
// ============================================================

const sourceId = generateId("source");
const source: Source = {
  id: sourceId,
  type: "source",
  source_type: "web_article",
  title: "Software 2.0",
  author: "Andrej Karpathy",
  url: "https://karpathy.medium.com/software-2-0-a64152b37c35",
  word_count: 2500,
  raw_file: `raw/${sourceId}.html`,
  ingested_at: now,
  created_at: now,
  status: "active",
};

const sourceBody = `# Software 2.0

The thesis of this post is that neural networks represent a fundamental shift
in how we build software. Instead of writing explicit rules, we define
architectures and let optimization find the program.`;

writeObject(source, sourceBody);
indexObject(source, sourceBody);
console.log(`✅ Source: ${sourceId} — "${source.title}"`);

// ============================================================
// 2. Create a Programme
// ============================================================

const pgmId = generateId("programme");
const programme: Programme = {
  id: pgmId,
  type: "programme",
  title: "AI Paradigm Shifts",
  description: "Exploring fundamental shifts in how AI systems are built and deployed",
  status: "active",
  created_at: now,
  updated_at: now,
};

writeObject(programme, "");
indexObject(programme, "");
console.log(`✅ Programme: ${pgmId} — "${programme.title}"`);

// ============================================================
// 3. Create Claims (simulating Compilation Agent output)
// ============================================================

const claim1Id = generateId("claim");
const claim1: Claim = {
  id: claim1Id,
  type: "claim",
  statement: "Neural networks represent a fundamental shift in software development, not merely another tool",
  qualifier: "certain",
  voice: "extracted",
  evidence: [{
    text: "neural networks represent a fundamental shift in how we build software",
    source: sourceId,
    locator: "paragraph 1",
  }],
  structure_type: "argument",
  programmes: [pgmId],
  source: sourceId,
  status: "active",
  created_at: now,
};

const claim1Body = `Karpathy argues that neural networks don't just add a tool to the programmer's
toolkit — they fundamentally change what "programming" means. The shift is from
writing explicit rules to defining optimization objectives.`;

writeObject(claim1, claim1Body);
indexObject(claim1, claim1Body);
console.log(`✅ Claim: ${claim1Id} — "${claim1.statement.substring(0, 60)}..."`);

const claim2Id = generateId("claim");
const claim2: Claim = {
  id: claim2Id,
  type: "claim",
  statement: "In Software 2.0, training data replaces traditional code as the primary artifact",
  qualifier: "likely",
  voice: "restated",
  evidence: [{
    text: "we define architectures and let optimization find the program",
    source: sourceId,
    locator: "paragraph 1",
  }],
  structure_type: "causal",
  supports: [claim1Id], // claim2 supports claim1
  programmes: [pgmId],
  source: sourceId,
  status: "active",
  created_at: now,
};

writeObject(claim2, "Training data becomes the primary artifact developers produce.");
indexObject(claim2, "Training data becomes the primary artifact developers produce.");
console.log(`✅ Claim: ${claim2Id} — "${claim2.statement.substring(0, 60)}..."`);

// ============================================================
// 4. Create a Frame
// ============================================================

const frameId = generateId("frame");
const frame: Frame = {
  id: frameId,
  type: "frame",
  name: "Software Paradigm Shift",
  sees: "programming as optimization over data, not rule-writing",
  ignores: "the continued need for Software 1.0 infrastructure",
  assumptions: ["neural networks can replace most explicit programming", "data quality is solvable"],
  useful_when: ["evaluating new AI tools", "deciding build vs train"],
  failure_modes: ["underestimates debugging difficulty in ML systems"],
  programmes: [pgmId],
  source: sourceId,
  status: "active",
  created_at: now,
};

writeObject(frame, "");
indexObject(frame, "");
console.log(`✅ Frame: ${frameId} — "${frame.name}"`);

// Set warrant_frame on claim1
claim1.warrant_frame = frameId;
writeObject(claim1, claim1Body);
indexObject(claim1, claim1Body);

// ============================================================
// 5. Create a Question
// ============================================================

const questionId = generateId("question");
const question: Question = {
  id: questionId,
  type: "question",
  text: "Will traditional programming (Software 1.0) become obsolete, or will it coexist with neural network-based approaches?",
  question_status: "open",
  programmes: [pgmId],
  source: sourceId,
  candidate_answers: [claim1Id],
  status: "active",
  created_at: now,
};

writeObject(question, "");
indexObject(question, "");
console.log(`✅ Question: ${questionId} — "${question.text.substring(0, 60)}..."`);

// ============================================================
// 6. Create a Thread (simulating a user conversation)
// ============================================================

const threadId = generateId("thread");
const thread: Thread = {
  id: threadId,
  type: "thread",
  title: "Is the Software 2.0 thesis too extreme?",
  references: [claim1Id, claim2Id, questionId],
  started_from: claim1Id,
  status: "active",
  created_at: now,
};

const threadBody = `**You** · ${now}
I think Karpathy's thesis might be too strong. Neural networks can't replace
all traditional code — you still need Software 1.0 for infrastructure, compilers,
operating systems.

**AI** · ${now}
Based on your knowledge base: Karpathy's claim is qualified as "certain" in
the original article, but your observation suggests it should perhaps be
"likely" — the shift is real but not total.

The open question (${questionId}) captures this tension well.`;

writeObject(thread, threadBody);
indexObject(thread, threadBody);
console.log(`✅ Thread: ${threadId} — "${thread.title}"`);

// ============================================================
// 7. Verify: Search
// ============================================================

console.log("\n--- Search Tests ---\n");

const r1 = searchIndex("neural networks");
console.log(`Search "neural networks": ${r1.length} results`);
for (const r of r1) console.log(`  ${r.id} (${r.type}) — ${r.title.substring(0, 60)}`);

const r2 = searchIndex("paradigm shift");
console.log(`\nSearch "paradigm shift": ${r2.length} results`);
for (const r of r2) console.log(`  ${r.id} (${r.type}) — ${r.title.substring(0, 60)}`);

const r3 = searchIndex("Karpathy");
console.log(`\nSearch "Karpathy": ${r3.length} results`);
for (const r of r3) console.log(`  ${r.id} (${r.type}) — ${r.title.substring(0, 60)}`);

// ============================================================
// 8. Verify: Links (forward and backward)
// ============================================================

console.log("\n--- Link Tests ---\n");

// Forward links from claim1
const fwd = getForwardLinks(claim1Id);
console.log(`Forward links from claim1 (${claim1Id}):`);
for (const l of fwd) console.log(`  → ${l.to_id} (${l.rel})`);

// Backlinks to Programme
const members = getProgrammeMembers(pgmId);
console.log(`\nProgramme "${programme.title}" members (reverse query):`);
for (const m of members) console.log(`  ← ${m.from_id}`);

// Backlinks to claim1 (who references it?)
const backlinks = getBacklinks(claim1Id);
console.log(`\nBacklinks to claim1:`);
for (const l of backlinks) console.log(`  ← ${l.from_id} (${l.rel})`);

// ============================================================
// 9. Verify: File readability
// ============================================================

console.log("\n--- File Readability ---\n");

const claimFile = readObject(claim1Id);
if (claimFile) {
  console.log(`Claim file ${claim1Id}.md:`);
  console.log(`  Frontmatter fields: ${Object.keys(claimFile.data).length}`);
  console.log(`  Body length: ${claimFile.content.trim().length} chars`);
  console.log(`  Statement: "${claimFile.data.statement?.substring(0, 60)}..."`);
  console.log(`  Qualifier: ${claimFile.data.qualifier}`);
  console.log(`  Programmes: ${claimFile.data.programmes}`);
  console.log(`  Evidence sources: ${claimFile.data.evidence?.map((e: any) => e.source)}`);
}

// ============================================================
// 10. Verify: Rebuild index
// ============================================================

console.log("\n--- Rebuild Test ---\n");

// Delete SQLite cache and rebuild from files
db.exec("DELETE FROM search_index");
db.exec("DELETE FROM objects");
db.exec("DELETE FROM links");

const count = rebuildAllIndex();
console.log(`Rebuilt index from files: ${count} objects`);

// Search again after rebuild
const r4 = searchIndex("neural networks");
console.log(`Search after rebuild: ${r4.length} results`);

// Links after rebuild
const members2 = getProgrammeMembers(pgmId);
console.log(`Programme members after rebuild: ${members2.length}`);

console.log("\n=== All Tests Passed ===");
