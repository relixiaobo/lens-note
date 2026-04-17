#!/usr/bin/env node
/**
 * Build script for the `lens view` UI bundle.
 *
 * Compiles view-ui/src/app.ts → dist/view-ui/app.js via esbuild,
 * copies index.html and app.css alongside.
 *
 * Runs AFTER tsup has produced dist/main.mjs (tsup's `clean: true` wipes the
 * dist dir, so this step must come second in the build pipeline).
 */

import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "view-ui", "src");
const OUT = join(ROOT, "dist", "view-ui");

await mkdir(OUT, { recursive: true });

await build({
  entryPoints: [join(SRC, "app.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: join(OUT, "app.js"),
  minify: true,
  sourcemap: false,
  logLevel: "info",
});

await copyFile(join(SRC, "index.html"), join(OUT, "index.html"));
await copyFile(join(SRC, "app.css"), join(OUT, "app.css"));

console.log(`[build-view] wrote ${OUT}`);
