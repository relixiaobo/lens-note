#!/usr/bin/env node
/**
 * Build script for the `lens view` UI bundle.
 *
 * Compiles view-ui/src/app.ts → dist/view-ui/app.js via esbuild. The React
 * Flow renderer (whiteboard-rf.tsx) is imported lazily from app.ts when the
 * user opts into ?engine=rf; esbuild bundles it alongside.
 *
 * Static files (index.html, app.css) are copied. React Flow's stylesheet is
 * copied out of node_modules so index.html can link it directly — avoids
 * CSS-import bundling so our hand-written app.css stays unaffected.
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
  jsx: "automatic",
  jsxDev: false,
  // React, react-dom, and @xyflow/react all branch on process.env.NODE_ENV.
  // Without this define, the bundle pulls in dev-only paths that also throw
  // at runtime because `process` doesn't exist in the browser.
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

await copyFile(join(SRC, "index.html"), join(OUT, "index.html"));
await copyFile(join(SRC, "app.css"), join(OUT, "app.css"));

// React Flow stylesheet — pulled from node_modules at build time.
const RF_CSS = join(ROOT, "node_modules", "@xyflow", "react", "dist", "style.css");
await copyFile(RF_CSS, join(OUT, "xyflow.css"));

console.log(`[build-view] wrote ${OUT}`);
