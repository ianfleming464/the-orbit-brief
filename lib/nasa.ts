import crypto from "node:crypto";
import Parser from "rss-parser";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export type FeedItem = Parser.Item & {
  title?: string;
  link?: string;
  pubDate?: string;
};

export type NormalizedFeedItem = {
  title: string;
  canonicalUrl: string;
  publishedAt: Date;
};

const parser = new Parser<Record<string, never>, FeedItem>();

export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  ["utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"].forEach(
    (key) => url.searchParams.delete(key),
  );
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

export function hashContent(body: string): string {
  return crypto.createHash("sha256").update(body.trim()).digest("hex");
}

export function normalizeFeedItem(item: FeedItem): NormalizedFeedItem {
  if (!item.title?.trim()) throw new Error("Feed item is missing a title");
  if (!item.link) throw new Error(`Feed item "${item.title}" is missing a link`);
  if (!item.pubDate) throw new Error(`Feed item "${item.title}" is missing pubDate`);

  const publishedAt = new Date(item.pubDate);
  if (Number.isNaN(publishedAt.valueOf())) {
    throw new Error(`Feed item "${item.title}" has an invalid pubDate`);
  }

  return {
    title: item.title.trim(),
    canonicalUrl: normalizeUrl(item.link),
    publishedAt,
  };
}

export async function readFeed(feedUrl: string): Promise<NormalizedFeedItem[]> {
  const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`NASA feed returned HTTP ${response.status}`);
  const feed = await parser.parseString(await response.text());
  return feed.items.map(normalizeFeedItem);
}

function normalizeArticleText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function extractArticleBody(html: string, url: string): string {
  const document = new JSDOM(html, { url }).window.document;
  const nasaArticleBody = normalizeArticleText(
    document.querySelector("article .usa-article-content .entry-content")?.textContent,
  );
  const body = nasaArticleBody || normalizeArticleText(new Readability(document).parse()?.textContent);
  if (body.length < 200) throw new Error("Article extraction returned too little text");
  return body;
}

export async function extractArticle(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "The Orbit Brief/0.1 (NASA news reader)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Article returned HTTP ${response.status}`);

  return extractArticleBody(await response.text(), url);
}
