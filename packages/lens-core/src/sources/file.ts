/**
 * Local file ingestion (markdown / plain text).
 */

import { readFileSync, existsSync } from "fs";
import { basename, extname } from "path";

export interface FileExtractionResult {
  title: string;
  markdown: string;
  wordCount: number;
  originalPath: string;
}

export function extractLocalFile(filePath: string): FileExtractionResult {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath, ext);

  if (ext !== ".md" && ext !== ".txt" && ext !== ".text" && ext !== ".markdown") {
    throw new Error(`Unsupported file type: ${ext}. Supported: .md, .txt, .text, .markdown`);
  }

  return {
    title: name,
    markdown: content,
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
    originalPath: filePath,
  };
}
