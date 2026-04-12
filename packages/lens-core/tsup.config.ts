import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  outExtension: () => ({ js: ".mjs" }),
  clean: true,
  splitting: false,
  // better-sqlite3: native binding, must stay external
  // gray-matter: uses CJS require("fs"), can't bundle in ESM
  external: ["better-sqlite3", "gray-matter"],
  noExternal: [
    "ulid",
    "turndown",
    "defuddle",
    "linkedom",
    "feedsmith",
  ],
});
