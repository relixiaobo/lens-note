/**
 * RSS/Atom feed checker.
 *
 * Fetches feeds, finds new articles, returns them for ingestion.
 * Uses feedsmith for parsing (supports RSS, Atom, RDF, JSON Feed).
 */

import { detectAtomFeed, detectRssFeed, detectRdfFeed, detectJsonFeed, parseAtomFeed, parseRssFeed, parseRdfFeed, parseJsonFeed } from "feedsmith";
import { listFeeds, updateFeed, isIngested, type Feed } from "./feed-store";

interface ParsedFeed {
  title: string;
  items: { url: string; title: string; published?: string }[];
}

/** Auto-detect feed format and parse */
function parseFeedXml(xml: string): ParsedFeed {
  // Try each format
  if (detectAtomFeed(xml)) {
    const feed = parseAtomFeed(xml);
    return {
      title: feed.title || "",
      items: (feed.entries || []).map((e) => ({
        url: e.links?.find((l: any) => l.rel === "alternate" || !l.rel)?.href || e.links?.[0]?.href || "",
        title: e.title || "",
        published: e.published ? String(e.published) : undefined,
      })),
    };
  }

  if (detectRssFeed(xml)) {
    const feed = parseRssFeed(xml);
    return {
      title: feed.title || "",
      items: (feed.items || []).map((i) => ({
        url: i.link || "",
        title: i.title || "",
        published: i.pubDate ? String(i.pubDate) : undefined,
      })),
    };
  }

  if (detectRdfFeed(xml)) {
    const feed = parseRdfFeed(xml);
    return {
      title: feed.title || "",
      items: (feed.items || []).map((i) => ({
        url: i.link || "",
        title: i.title || "",
      })),
    };
  }

  if (detectJsonFeed(xml)) {
    const feed = parseJsonFeed(xml);
    return {
      title: feed.title || "",
      items: (feed.items || []).map((i) => ({
        url: i.url || "",
        title: i.title || "",
        published: i.date_published ? String(i.date_published) : undefined,
      })),
    };
  }

  throw new Error("Unrecognized feed format");
}

export interface NewArticle {
  feedId: string;
  feedTitle: string;
  url: string;
  title: string;
  published?: string;
}

/** Check a single feed for new articles */
async function checkFeed(feed: Feed): Promise<NewArticle[]> {
  const headers: Record<string, string> = {
    "User-Agent": "lens/0.3 (knowledge graph)",
  };

  // Conditional fetch: use etag/last_modified if available
  if (feed.etag) headers["If-None-Match"] = feed.etag;
  if (feed.last_modified) headers["If-Modified-Since"] = feed.last_modified;

  const response = await fetch(feed.url, { headers, signal: AbortSignal.timeout(15000) });

  // 304 Not Modified
  if (response.status === 304) {
    updateFeed(feed.id, { last_checked_at: new Date().toISOString() });
    return [];
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${feed.url}`);
  }

  const xml = await response.text();

  // Detect format and parse
  const parsed = parseFeedXml(xml);

  // Update feed metadata
  const updates: Partial<Feed> = {
    last_checked_at: new Date().toISOString(),
  };

  const etag = response.headers.get("etag");
  const lastMod = response.headers.get("last-modified");
  if (etag) updates.etag = etag;
  if (lastMod) updates.last_modified = lastMod;

  if (!feed.title && parsed.title) {
    updates.title = parsed.title;
  }

  updateFeed(feed.id, updates);

  // Find new articles
  const newArticles: NewArticle[] = [];

  for (const item of parsed.items) {
    if (!item.url) continue;
    if (isIngested(feed.id, item.url)) continue;

    newArticles.push({
      feedId: feed.id,
      feedTitle: feed.title || parsed.title || feed.url,
      url: item.url,
      title: item.title || item.url,
      published: item.published,
    });
  }

  return newArticles;
}

/** Check ALL feeds for new articles */
export async function checkAllFeeds(
  onProgress?: (msg: string) => void,
): Promise<{ feed: Feed; articles: NewArticle[]; error?: string }[]> {
  const log = onProgress || (() => {});
  const feeds = listFeeds();

  if (feeds.length === 0) {
    log("No feeds subscribed. Use: lens feed add <rss-url>");
    return [];
  }

  const results: { feed: Feed; articles: NewArticle[]; error?: string }[] = [];

  for (const feed of feeds) {
    log(`Checking: ${feed.title || feed.url}...`);
    try {
      const articles = await checkFeed(feed);
      results.push({ feed, articles });
      if (articles.length > 0) {
        log(`  ${articles.length} new article(s)`);
      } else {
        log(`  No new articles`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  Error: ${msg}`);
      results.push({ feed, articles: [], error: msg });
    }
  }

  return results;
}
