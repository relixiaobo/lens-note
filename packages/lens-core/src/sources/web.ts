/**
 * Web article extraction.
 *
 * Pipeline: fetch HTML → Defuddle extracts article → Turndown converts to markdown
 */

import Defuddle from "defuddle";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export interface WebExtractionResult {
  title: string;
  author?: string;
  description?: string;
  domain?: string;
  published?: string;
  language?: string;
  wordCount: number;
  markdown: string;
  rawHtml: string;
}

export async function extractWebArticle(url: string): Promise<WebExtractionResult> {
  // Fetch
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const rawHtml = await response.text();

  // Parse with linkedom + Defuddle
  const { document } = parseHTML(rawHtml);
  const defuddle = new Defuddle(document, { url });
  const result = defuddle.parse();

  if (!result.content) {
    throw new Error(`Defuddle could not extract content from ${url}`);
  }

  // Convert HTML content to markdown
  const markdown = turndown.turndown(result.content);

  return {
    title: result.title || url,
    author: result.author || undefined,
    description: result.description || undefined,
    domain: result.domain || undefined,
    published: result.published || undefined,
    language: result.language || undefined,
    wordCount: result.wordCount || markdown.split(/\s+/).length,
    markdown,
    rawHtml,
  };
}
