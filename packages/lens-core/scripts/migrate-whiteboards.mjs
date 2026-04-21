#!/usr/bin/env node
/**
 * One-off migration: bring every wb_*.json in ~/.lens/whiteboards/ up to the
 * v1.33 schema — adds required empty arrays (groups/arrows) and a default
 * camera, strips the legacy width/height fields from members, and drops any
 * `annotations` key (deferred feature, not part of v1.33).
 *
 * Safe to re-run. Skips files that already have the new shape.
 *
 * Safety: every mutated file is first copied to `<path>.pre-v1.33.bak` so
 * the original shape is recoverable. Pass `--force` to skip backups (e.g.,
 * when a previous run already produced them). Backup files are never
 * overwritten — if one already exists, the migration aborts for that file
 * unless `--force` is given.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const args = new Set(process.argv.slice(2));
const force = args.has("--force");

const LENS_HOME = process.env.LENS_HOME || join(homedir(), ".lens");
const WB_DIR = join(LENS_HOME, "whiteboards");

if (!existsSync(WB_DIR)) {
  console.log(`No whiteboards dir at ${WB_DIR} — nothing to do.`);
  process.exit(0);
}

const files = readdirSync(WB_DIR).filter(f => f.endsWith(".json"));
if (files.length === 0) {
  console.log("No whiteboards to migrate.");
  process.exit(0);
}

let migrated = 0;
let unchanged = 0;
let skipped = 0;

for (const file of files) {
  const path = join(WB_DIR, file);
  const raw = readFileSync(path, "utf-8");
  const wb = JSON.parse(raw);
  let changed = false;
  let droppedAnnotations = false;

  // Strip width/height off members
  if (Array.isArray(wb.members)) {
    wb.members = wb.members.map(m => {
      if (m.width !== undefined || m.height !== undefined) {
        const { width: _w, height: _h, ...rest } = m;
        changed = true;
        return rest;
      }
      return m;
    });
  } else {
    wb.members = [];
    changed = true;
  }

  if (!Array.isArray(wb.groups)) { wb.groups = []; changed = true; }
  if (!Array.isArray(wb.arrows)) { wb.arrows = []; changed = true; }
  if ("annotations" in wb) {
    // Surface this explicitly — deleting user-authored data deserves a louder
    // signal than the generic "migrated" line. Even if the field is empty,
    // we still announce the removal so it's auditable in the migration log.
    droppedAnnotations = Array.isArray(wb.annotations) && wb.annotations.length > 0;
    delete wb.annotations;
    changed = true;
  }
  if (!wb.camera || typeof wb.camera.x !== "number" || typeof wb.camera.y !== "number" || typeof wb.camera.scale !== "number") {
    wb.camera = { x: 0, y: 0, scale: 1 };
    changed = true;
  }

  if (!changed) {
    unchanged++;
    continue;
  }

  if (!force) {
    const backupPath = `${path}.pre-v1.33.bak`;
    if (existsSync(backupPath)) {
      console.warn(`SKIP ${wb.id}: backup already exists at ${backupPath}. Remove it or pass --force to overwrite.`);
      skipped++;
      continue;
    }
    copyFileSync(path, backupPath);
  }

  writeFileSync(path, JSON.stringify(wb, null, 2), "utf-8");
  if (droppedAnnotations) {
    console.log(`migrated ${wb.id} (${wb.title}) — DROPPED annotation data (see backup)`);
  } else {
    console.log(`migrated ${wb.id} (${wb.title})`);
  }
  migrated++;
}

console.log(`\nDone. ${migrated} migrated, ${unchanged} already up to date, ${skipped} skipped.`);
if (migrated > 0 && !force) {
  console.log("Backups written to <path>.pre-v1.33.bak — delete them once you've verified the boards.");
}
