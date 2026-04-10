/**
 * lens feed <subcommand> — RSS feed management.
 *
 * lens feed add <rss-url>   — Subscribe to a feed
 * lens feed list             — List all subscriptions
 * lens feed check            — Check all feeds, ingest new articles
 * lens feed check --dry-run  — Check without ingesting
 * lens feed remove <id|url>  — Unsubscribe
 */

import { addFeed, listFeeds, removeFeed, markIngested } from "../feeds/feed-store";
import { checkAllFeeds } from "../feeds/feed-checker";
import { ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";

export async function handleFeed(sub: string, args: string[], opts: CommandOptions) {
  ensureInitialized();

  const allArgs = sub ? [sub, ...args] : args;
  const { positional, flags } = parseCliArgs(allArgs);
  const mergedOpts = { ...opts, ...flags };
  const subcommand = positional[0];

  switch (subcommand) {
    case "add":
      return feedAdd(positional[1], mergedOpts);
    case "list":
      return feedList(mergedOpts);
    case "check":
      return feedCheck(mergedOpts);
    case "remove":
      return feedRemove(positional[1], mergedOpts);
    default:
      throw new Error(
        `Unknown feed subcommand: ${subcommand}\nUsage: lens feed add|list|check|remove`
      );
  }
}

async function feedAdd(url: string, opts: CommandOptions) {
  if (!url) throw new Error("Usage: lens feed add <rss-url>");

  const feed = addFeed(url);

  if (opts.json) {
    console.log(JSON.stringify(feed, null, 2));
  } else {
    console.log(`Subscribed to feed: ${feed.id}`);
    console.log(`  URL: ${url}`);
    console.log(`\nRun 'lens feed check' to fetch and ingest articles.`);
  }
}

async function feedList(opts: CommandOptions) {
  const feeds = listFeeds();

  if (opts.json) {
    console.log(JSON.stringify({ count: feeds.length, feeds }, null, 2));
  } else {
    if (feeds.length === 0) {
      console.log("No feeds subscribed. Use: lens feed add <rss-url>");
      return;
    }
    console.log(`${feeds.length} feed(s):\n`);
    for (const f of feeds) {
      console.log(`  ${f.id}`);
      console.log(`    ${f.title || "(title unknown)"}`);
      console.log(`    URL: ${f.url}`);
      console.log(`    Added: ${f.added_at}`);
      console.log(`    Last checked: ${f.last_checked_at || "never"}`);
      console.log(`    Ingested: ${f.ingested_urls.length} articles\n`);
    }
  }
}

async function feedCheck(opts: CommandOptions) {
  const dryRun = opts["dry-run"] === true;
  const log = opts.json ? () => {} : (msg: string) => console.log(msg);

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set. Required for ingesting articles.");
  }

  const results = await checkAllFeeds(log);

  const allNew = results.flatMap((r) => r.articles);

  if (allNew.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ new_articles: 0, results: [] }));
    } else {
      log("\nNo new articles found across all feeds.");
    }
    return;
  }

  if (dryRun) {
    if (opts.json) {
      console.log(
        JSON.stringify({ dry_run: true, new_articles: allNew.length, articles: allNew }, null, 2)
      );
    } else {
      log(`\n${allNew.length} new article(s) found (dry run, not ingesting):\n`);
      for (const a of allNew) {
        log(`  "${a.title}"`);
        log(`    ${a.url}`);
        log(`    From: ${a.feedTitle}\n`);
      }
    }
    return;
  }

  // Ingest new articles
  log(`\nIngesting ${allNew.length} new article(s)...\n`);
  const { ingestSource } = await import("./ingest");

  let success = 0;
  let failed = 0;
  const ingestResults: { url: string; title: string; status: string; error?: string }[] = [];

  for (const article of allNew) {
    log(`--- ${article.title} ---`);
    try {
      await ingestSource(article.url, { ...opts, json: false });
      markIngested(article.feedId, article.url);
      success++;
      ingestResults.push({ url: article.url, title: article.title, status: "ok" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  FAILED: ${msg}\n`);
      failed++;
      ingestResults.push({ url: article.url, title: article.title, status: "error", error: msg });
      // Mark as ingested anyway to avoid retrying broken URLs
      markIngested(article.feedId, article.url);
    }
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        { new_articles: allNew.length, success, failed, results: ingestResults },
        null,
        2
      )
    );
  } else {
    log(`\nDone: ${success} ingested, ${failed} failed out of ${allNew.length} new articles.`);
  }
}

async function feedRemove(idOrUrl: string, opts: CommandOptions) {
  if (!idOrUrl) throw new Error("Usage: lens feed remove <id|url>");

  const removed = removeFeed(idOrUrl);
  if (!removed) throw new Error(`Feed not found: ${idOrUrl}`);

  if (opts.json) {
    console.log(JSON.stringify({ removed: removed.id, url: removed.url }));
  } else {
    console.log(`Removed feed: ${removed.id}`);
    console.log(`  URL: ${removed.url}`);
  }
}
