/**
 * Lens Benchmark Suite
 *
 * Tests: binary startup, search latency, ingest speed, RSS check speed,
 * cache size, compilation quality metrics.
 *
 * Usage:
 *   bun run spike/benchmark.ts
 *   bun run spike/benchmark.ts --with-ingest   # include live ingest tests (costs API $)
 */

import { execSync } from "child_process";
import { statSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const LENS = join(import.meta.dir, "../packages/lens-core/src/main.ts");
const LENS_HOME = join(process.env.HOME || "~", ".lens");

function run(cmd: string, timeout = 30000): { stdout: string; ms: number } {
  const start = Date.now();
  const stdout = execSync(`bun run ${LENS} ${cmd}`, {
    timeout,
    encoding: "utf-8",
    env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` },
  });
  return { stdout, ms: Date.now() - start };
}

function runN(cmd: string, n: number): number[] {
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    times.push(run(cmd).ms);
  }
  return times;
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function p50(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

function dirSize(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    try { total += statSync(p).size; } catch {}
  }
  return total;
}

console.log("=== Lens Benchmark Suite ===\n");

// Ensure lens is initialized
if (!existsSync(join(LENS_HOME, "config.yaml"))) {
  run("init");
}

// ============================================================
// 1. CLI Startup Time
// ============================================================
console.log("1. CLI Startup Time (lens --version)");
const startupTimes = runN("--version", 10);
console.log(`   Avg: ${avg(startupTimes).toFixed(0)}ms`);
console.log(`   P50: ${p50(startupTimes)}ms`);
console.log(`   Min: ${Math.min(...startupTimes)}ms`);
console.log(`   Max: ${Math.max(...startupTimes)}ms\n`);

// ============================================================
// 2. Status Command Latency
// ============================================================
console.log("2. Status Command (lens status)");
const statusTimes = runN("status", 5);
console.log(`   Avg: ${avg(statusTimes).toFixed(0)}ms`);
console.log(`   P50: ${p50(statusTimes)}ms\n`);

// ============================================================
// 3. Search Latency (FTS5)
// ============================================================
const claimCount = countFiles(join(LENS_HOME, "claims"));
console.log(`3. Search Latency (FTS5, ${claimCount} claims in DB)`);

if (claimCount > 0) {
  const searchTimes = runN('search "quality"', 5);
  console.log(`   "quality": Avg ${avg(searchTimes).toFixed(0)}ms, P50 ${p50(searchTimes)}ms`);

  const searchTimes2 = runN('search "neural network"', 5);
  console.log(`   "neural network": Avg ${avg(searchTimes2).toFixed(0)}ms, P50 ${p50(searchTimes2)}ms`);

  const emptyTimes = runN('search "xyznonexistent"', 5);
  console.log(`   (no results): Avg ${avg(emptyTimes).toFixed(0)}ms, P50 ${p50(emptyTimes)}ms`);
} else {
  console.log("   Skipped (no claims in DB). Ingest an article first.");
}
console.log();

// ============================================================
// 4. Context Command Latency
// ============================================================
console.log("4. Context Command (lens context)");
if (claimCount > 0) {
  const ctxTimes = runN('context "quality" --scope big_picture', 5);
  console.log(`   --scope big_picture: Avg ${avg(ctxTimes).toFixed(0)}ms, P50 ${p50(ctxTimes)}ms`);

  const ctxAllTimes = runN('context "quality"', 5);
  console.log(`   (all scopes): Avg ${avg(ctxAllTimes).toFixed(0)}ms, P50 ${p50(ctxAllTimes)}ms`);
} else {
  console.log("   Skipped (no claims).");
}
console.log();

// ============================================================
// 5. Programme Show Latency
// ============================================================
console.log("5. Programme Commands");
const pgmListResult = run("programme list --json");
console.log(`   programme list: ${pgmListResult.ms}ms`);

try {
  const pgms = JSON.parse(pgmListResult.stdout);
  if (pgms.count > 0) {
    const pgmId = pgms.programmes[0].id;
    const pgmShowTimes = runN(`programme show ${pgmId}`, 5);
    console.log(`   programme show: Avg ${avg(pgmShowTimes).toFixed(0)}ms, P50 ${p50(pgmShowTimes)}ms`);
  }
} catch {}
console.log();

// ============================================================
// 6. Digest Command Latency
// ============================================================
console.log("6. Digest Command");
const digestTimes = runN("digest", 5);
console.log(`   digest (today): Avg ${avg(digestTimes).toFixed(0)}ms, P50 ${p50(digestTimes)}ms`);
const digestWeekTimes = runN("digest week", 5);
console.log(`   digest week: Avg ${avg(digestWeekTimes).toFixed(0)}ms, P50 ${p50(digestWeekTimes)}ms`);
console.log();

// ============================================================
// 7. Rebuild Index
// ============================================================
console.log("7. Rebuild Index");
const rebuildTimes = runN("rebuild-index", 3);
console.log(`   Avg: ${avg(rebuildTimes).toFixed(0)}ms (${claimCount} claims)`);
console.log();

// ============================================================
// 8. Storage Metrics
// ============================================================
console.log("8. Storage Metrics");
const sqliteSize = existsSync(join(LENS_HOME, "index.sqlite"))
  ? statSync(join(LENS_HOME, "index.sqlite")).size
  : 0;
const walSize = existsSync(join(LENS_HOME, "index.sqlite-wal"))
  ? statSync(join(LENS_HOME, "index.sqlite-wal")).size
  : 0;

console.log(`   Sources:     ${countFiles(join(LENS_HOME, "sources"))} files, ${(dirSize(join(LENS_HOME, "sources")) / 1024).toFixed(1)} KB`);
console.log(`   Claims:      ${countFiles(join(LENS_HOME, "claims"))} files, ${(dirSize(join(LENS_HOME, "claims")) / 1024).toFixed(1)} KB`);
console.log(`   Frames:      ${countFiles(join(LENS_HOME, "frames"))} files, ${(dirSize(join(LENS_HOME, "frames")) / 1024).toFixed(1)} KB`);
console.log(`   Questions:   ${countFiles(join(LENS_HOME, "questions"))} files, ${(dirSize(join(LENS_HOME, "questions")) / 1024).toFixed(1)} KB`);
console.log(`   Programmes:  ${countFiles(join(LENS_HOME, "programmes"))} files`);
console.log(`   SQLite cache: ${(sqliteSize / 1024).toFixed(1)} KB + ${(walSize / 1024).toFixed(1)} KB WAL`);
console.log(`   Raw files:   ${(dirSize(join(LENS_HOME, "raw")) / 1024).toFixed(1)} KB`);
console.log();

// ============================================================
// 9. Compiled Binary Size
// ============================================================
console.log("9. Binary");
const binaryPath = join(import.meta.dir, "../dist/lens");
if (existsSync(binaryPath)) {
  console.log(`   Size: ${(statSync(binaryPath).size / 1024 / 1024).toFixed(1)} MB`);

  // Binary startup
  const binTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    execSync(`${binaryPath} --version`, { encoding: "utf-8" });
    binTimes.push(Date.now() - start);
  }
  console.log(`   Startup: Avg ${avg(binTimes).toFixed(0)}ms, P50 ${p50(binTimes)}ms`);
} else {
  console.log("   Not compiled. Run: bun build --compile packages/lens-core/src/main.ts --outfile dist/lens");
}
console.log();

// ============================================================
// 10. Compilation Quality (from existing data)
// ============================================================
console.log("10. Compilation Quality (from existing data)");
if (claimCount > 0) {
  const claimsDir = join(LENS_HOME, "claims");
  const files = readdirSync(claimsDir).filter((f) => f.endsWith(".md"));

  let bigPicture = 0;
  let detail = 0;
  let withEvidence = 0;
  let withStructureType = 0;
  const qualifiers: Record<string, number> = {};

  for (const f of files) {
    const content = require("fs").readFileSync(join(claimsDir, f), "utf-8");
    if (content.includes("scope: big_picture")) bigPicture++;
    else detail++;
    if (content.includes("evidence:")) withEvidence++;
    if (content.includes("structure_type:")) withStructureType++;

    const qMatch = content.match(/qualifier:\s*(\w+)/);
    if (qMatch) qualifiers[qMatch[1]] = (qualifiers[qMatch[1]] || 0) + 1;
  }

  const sourceCount = countFiles(join(LENS_HOME, "sources"));
  console.log(`   Sources: ${sourceCount}`);
  console.log(`   Claims per source: ${(claimCount / Math.max(sourceCount, 1)).toFixed(1)}`);
  console.log(`   Scope: ${bigPicture} big_picture, ${detail} detail (${((bigPicture / claimCount) * 100).toFixed(0)}% overview)`);
  console.log(`   With evidence: ${withEvidence}/${claimCount} (${((withEvidence / claimCount) * 100).toFixed(0)}%)`);
  console.log(`   With structure_type: ${withStructureType}/${claimCount} (${((withStructureType / claimCount) * 100).toFixed(0)}%)`);
  console.log(`   Qualifier distribution: ${Object.entries(qualifiers).map(([k, v]) => `${k}=${v}`).join(", ")}`);
}
console.log();

console.log("=== Benchmark Complete ===");
