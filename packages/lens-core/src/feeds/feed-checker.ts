/**
 * RSS/Atom feed checker.
 *
 * Fetches feeds, finds new articles, returns them for ingestion.
 */

import Parser from "rss-parser";
import { listFeeds, updateFeed, isIngested, markIngested, type Feed } from "./feed-store";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "lens/0.1 (structured cognition compiler)",
  },
});

export interface NewArticle {
  feedId: string;
  feedTitle: string;
  url: string;
  title: string;
  published?: string;
}

/** Check a single feed for new articles */
async function checkFeed(feed: Feed): Promise<NewArticle[]> {
  const result = await parser.parseURL(feed.url);

  // Update feed title if not set
  if (!feed.title && result.title) {
    updateFeed(feed.id, { title: result.title });
  }

  const newArticles: NewArticle[] = [];

  for (const item of result.items) {
    const url = item.link;
    if (!url) continue;

    // Skip already ingested
    if (isIngested(feed.id, url)) continue;

    newArticles.push({
      feedId: feed.id,
      feedTitle: feed.title || result.title || feed.url,
      url,
      title: item.title || url,
      published: item.pubDate || item.isoDate,
    });
  }

  // Update last checked timestamp
  updateFeed(feed.id, { last_checked_at: new Date().toISOString() });

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
        log(`  Found ${articles.length} new article(s)`);
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
