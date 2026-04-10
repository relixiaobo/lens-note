/**
 * File system paths for lens data.
 */

import { join, resolve } from "path";
import { homedir } from "os";

export const LENS_HOME = join(homedir(), ".lens");

export const paths = {
  root: LENS_HOME,
  sources: join(LENS_HOME, "sources"),
  claims: join(LENS_HOME, "claims"),
  frames: join(LENS_HOME, "frames"),
  questions: join(LENS_HOME, "questions"),
  programmes: join(LENS_HOME, "programmes"),
  threads: join(LENS_HOME, "threads"),
  raw: join(LENS_HOME, "raw"),
  db: join(LENS_HOME, "index.sqlite"),
  config: join(LENS_HOME, "config.yaml"),
} as const;

/** Strict ID format: prefix_ULID (only alphanumeric + underscore) */
const VALID_ID_PATTERN = /^(src|clm|frm|q|pgm|thr)_[A-Z0-9]{26}$/;

const dirMap: Record<string, string> = {
  src: paths.sources,
  clm: paths.claims,
  frm: paths.frames,
  q: paths.questions,
  pgm: paths.programmes,
  thr: paths.threads,
};

/** Get the file path for a lens object by its ID. Validates against path traversal. */
export function objectPath(id: string): string {
  if (!VALID_ID_PATTERN.test(id)) {
    throw new Error(`Invalid object ID format: "${id}" (expected: prefix_ULID, e.g. clm_01HXY2K8WJ3F6N9Q0V5T7M2R8Z)`);
  }

  const prefix = id.split("_")[0];
  const dir = dirMap[prefix];
  if (!dir) throw new Error(`Unknown ID prefix: ${prefix} (from ${id})`);

  const filePath = join(dir, `${id}.md`);

  // Double-check resolved path stays within expected directory
  const resolved = resolve(filePath);
  if (!resolved.startsWith(resolve(dir))) {
    throw new Error(`Path traversal detected: ${id}`);
  }

  return filePath;
}

/** All object directories */
export const objectDirs = [
  paths.sources,
  paths.claims,
  paths.frames,
  paths.questions,
  paths.programmes,
  paths.threads,
  paths.raw,
] as const;
