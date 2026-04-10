/**
 * Feed subscription storage.
 *
 * Stores RSS/Atom feed subscriptions in ~/.lens/feeds.json.
 * Tracks which articles have already been ingested (by URL).
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { paths } from "../core/paths";
import { ulid } from "ulid";

export interface Feed {
  id: string;
  url: string;
  title?: string; // auto-populated on first fetch
  added_at: string;
  last_checked_at?: string;
  ingested_urls: string[]; // URLs already ingested (dedup)
}

interface FeedStore {
  feeds: Feed[];
}

const feedsPath = join(paths.root, "feeds.json");

function load(): FeedStore {
  if (!existsSync(feedsPath)) return { feeds: [] };
  return JSON.parse(readFileSync(feedsPath, "utf-8"));
}

function save(store: FeedStore) {
  writeFileSync(feedsPath, JSON.stringify(store, null, 2), "utf-8");
}

export function addFeed(url: string): Feed {
  const store = load();

  // Check for duplicate
  const existing = store.feeds.find((f) => f.url === url);
  if (existing) throw new Error(`Feed already subscribed: ${url} (id: ${existing.id})`);

  const feed: Feed = {
    id: `feed_${ulid()}`,
    url,
    added_at: new Date().toISOString(),
    ingested_urls: [],
  };

  store.feeds.push(feed);
  save(store);
  return feed;
}

export function listFeeds(): Feed[] {
  return load().feeds;
}

export function removeFeed(idOrUrl: string): Feed | null {
  const store = load();
  const index = store.feeds.findIndex((f) => f.id === idOrUrl || f.url === idOrUrl);
  if (index === -1) return null;
  const [removed] = store.feeds.splice(index, 1);
  save(store);
  return removed;
}

export function updateFeed(id: string, updates: Partial<Feed>) {
  const store = load();
  const feed = store.feeds.find((f) => f.id === id);
  if (!feed) return;
  Object.assign(feed, updates);
  save(store);
}

export function markIngested(feedId: string, url: string) {
  const store = load();
  const feed = store.feeds.find((f) => f.id === feedId);
  if (!feed) return;
  if (!feed.ingested_urls.includes(url)) {
    feed.ingested_urls.push(url);
  }
  save(store);
}

export function isIngested(feedId: string, url: string): boolean {
  const store = load();
  const feed = store.feeds.find((f) => f.id === feedId);
  return feed?.ingested_urls.includes(url) ?? false;
}
