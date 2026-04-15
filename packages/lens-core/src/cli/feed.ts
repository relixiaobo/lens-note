/**
 * lens feed <subcommand> — RSS feed management.
 *
 * lens feed add <rss-url>   — Subscribe to a feed
 * lens feed list             — List all subscriptions
 * lens feed check            — Check all feeds, ingest new articles
 * lens feed check --dry-run  — Check without ingesting
 * lens feed remove <id|url>  — Unsubscribe
 */

import { addFeed, listFeeds, removeFeed } from "../feeds/feed-store";
import { checkAllFeeds } from "../feeds/feed-checker";
import { ensureInitialized } from "../core/storage";
import { parseCliArgs, type CommandOptions } from "./commands";

export async function handleFeed(sub: string, args: string[], opts: CommandOptions) {
  ensureInitialized();

  const allArgs = sub ? [sub, ...args] : args;
  const { positional, flags } = parseCliArgs(allArgs);
  const mergedOpts: CommandOptions = { ...flags, json: opts.json || flags.json };
  const subcommand = positional[0];

  switch (subcommand) {
    case "add":
      return feedAdd(positional[1], mergedOpts);
    case "list":
      return feedList(mergedOpts);
    case "check":
      return feedCheck(mergedOpts);
    case "import":
      return feedImport(positional[1], mergedOpts);
    case "remove":
      return feedRemove(positional[1], mergedOpts);
    default:
      throw new Error(
        `Unknown feed subcommand: ${subcommand}\nUsage: lens feed add|list|check|import|remove`
      );
  }
}

async function feedAdd(url: string, opts: CommandOptions) {
  if (!url) throw new Error("Usage: lens feed add <rss-url|website-url>");

  let feedUrl = url;
  let feedTitle: string | undefined;

  // If URL doesn't look like a feed, try autodiscovery
  if (!url.match(/\.(xml|rss|atom|json)$/) && !url.includes("/feed") && !url.includes("/rss")) {
    const log = opts.json ? () => {} : (msg: string) => console.log(msg);
    log(`Checking ${url} for RSS feed...`);

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "lens/0.1", Accept: "text/html" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await resp.text();

      // Find <link rel="alternate" type="application/rss+xml"> or atom+xml
      const feedMatch = html.match(
        /<link[^>]*rel=["']alternate["'][^>]*type=["']application\/(rss|atom)\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/i
      ) || html.match(
        /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/(rss|atom)\+xml["'][^>]*>/i
      );

      if (feedMatch) {
        const href = feedMatch[2] || feedMatch[1];
        // Resolve relative URL
        feedUrl = href.startsWith("http") ? href : new URL(href, url).href;
        log(`  Discovered feed: ${feedUrl}`);
      } else {
        log(`  No RSS feed found. Subscribing to URL directly.`);
      }
    } catch {
      // Can't fetch — just use the URL as-is
    }
  }

  const feed = addFeed(feedUrl, feedTitle);

  if (opts.json) {
    console.log(JSON.stringify(feed, null, 2));
  } else {
    console.log(`Subscribed: ${feed.id}`);
    console.log(`  URL: ${feedUrl}`);
    console.log(`\nRun 'lens feed check' to fetch articles.`);
  }
}

async function feedImport(filePath: string, opts: CommandOptions) {
  if (!filePath) throw new Error("Usage: lens feed import <file.opml>");

  const { existsSync, readFileSync } = await import("fs");
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const { importOpml } = await import("../feeds/feed-store");
  const xml = readFileSync(filePath, "utf-8");
  const { added, skipped } = await importOpml(xml);

  if (opts.json) {
    console.log(JSON.stringify({
      imported: added.length,
      skipped: skipped.length,
      feeds: added.map((f) => ({ id: f.id, title: f.title, url: f.url })),
      skipped_titles: skipped,
    }, null, 2));
  } else {
    console.log(`Imported ${added.length} feed(s) from OPML:`);
    for (const f of added) {
      console.log(`  ✅ ${f.title || f.url}`);
    }
    if (skipped.length) {
      console.log(`\nSkipped ${skipped.length} (already subscribed):`);
      for (const s of skipped) {
        console.log(`  · ${s}`);
      }
    }
    console.log(`\nRun 'lens feed check --dry-run' to see available articles.`);
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

  const results = await checkAllFeeds(log);

  const allNew = results.flatMap((r) => r.articles);

  const errors = results.filter((r) => r.error).map((r) => ({ feed: r.feed.title || r.feed.url, error: r.error }));

  if (allNew.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ new_articles: 0, errors, results: [] }));
    } else {
      log("\nNo new articles found across all feeds.");
      if (errors.length) log(`(${errors.length} feed(s) had errors)`);
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

  // No auto-ingest — just report new articles.
  // Agents should call `lens fetch <url> --save` for each article they want to compile.
  if (opts.json) {
    console.log(
      JSON.stringify({ new_articles: allNew.length, articles: allNew }, null, 2)
    );
  } else {
    log(`\n${allNew.length} new article(s) found:\n`);
    for (const a of allNew) {
      log(`  "${a.title}"`);
      log(`    ${a.url}\n`);
    }
    log(`Use \`lens fetch <url> --save\` to save each article as a source.`);
  }
}

async function feedRemove(idOrUrl: string, opts: CommandOptions) {
  if (!idOrUrl) throw new Error("Usage: lens feed remove <id|url>");

  const removed = removeFeed(idOrUrl);
  if (!removed) {
    const available = listFeeds().map(f => ({ id: f.id, url: f.url, title: f.title }));
    const msg = available.length === 0
      ? `Feed not found: ${idOrUrl}. No feeds are currently subscribed.`
      : `Feed not found: ${idOrUrl}. Available feeds: ${available.map(f => f.id).join(", ")}`;
    throw new Error(msg);
  }

  if (opts.json) {
    console.log(JSON.stringify({ removed: removed.id, url: removed.url }));
  } else {
    console.log(`Removed feed: ${removed.id}`);
    console.log(`  URL: ${removed.url}`);
  }
}
