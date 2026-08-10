import { JSDOM } from "jsdom";

import { normalizeUrl, type NormalizedFeedItem } from "@/lib/nasa";

export type ArchiveDiscoveryResult = {
  items: NormalizedFeedItem[];
  pagesRead: number;
  failures: string[];
};

type ArchiveLink = {
  title: string;
  canonicalUrl: string;
};

type FetchPage = (url: string) => Promise<string>;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function findDatePublished(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const date = findDatePublished(entry);
      if (date) return date;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.datePublished === "string") return record.datePublished;

  for (const child of Object.values(record)) {
    const date = findDatePublished(child);
    if (date) return date;
  }
  return null;
}

function isNewsReleaseUrl(url: URL): boolean {
  return (
    url.hostname === "www.nasa.gov" &&
    url.pathname.startsWith("/news-release/") &&
    url.pathname !== "/news-release/" &&
    !url.pathname.startsWith("/news-release/page/")
  );
}

export function parseArchiveLinks(html: string, pageUrl: string): ArchiveLink[] {
  const document = new JSDOM(html, { url: pageUrl }).window.document;
  const links = new Map<string, ArchiveLink>();

  for (const anchor of document.querySelectorAll("a[href]")) {
    const url = new URL(anchor.getAttribute("href")!, pageUrl);
    if (!isNewsReleaseUrl(url)) continue;

    const title = anchor.textContent?.replace(/\s+/g, " ").trim();
    if (!title) continue;

    const canonicalUrl = normalizeUrl(url.toString());
    links.set(canonicalUrl, { title, canonicalUrl });
  }

  return [...links.values()];
}

export function parseArchiveArticle(html: string, articleUrl: string): NormalizedFeedItem {
  const document = new JSDOM(html, { url: articleUrl }).window.document;
  const title = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
  if (!title) throw new Error("Archive article is missing an h1 title");

  const structuredDate = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => {
      try {
        return findDatePublished(JSON.parse(script.textContent ?? ""));
      } catch {
        return null;
      }
    })
    .find((value): value is string => value !== null);

  const publishedAt =
    parseDate(structuredDate) ??
    parseDate(document.querySelector('meta[property="article:published_time"]')?.getAttribute("content")) ??
    parseDate(document.querySelector("time[datetime]")?.getAttribute("datetime"));

  if (!publishedAt) throw new Error("Archive article is missing a valid publication date");

  return { title, canonicalUrl: normalizeUrl(articleUrl), publishedAt };
}

export async function fetchNasaPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "The Orbit Brief/0.1 (NASA news archive reader)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`NASA archive returned HTTP ${response.status}`);
  return response.text();
}

function pageUrl(archiveUrl: string, page: number): string {
  const base = new URL(archiveUrl);
  base.pathname = `${base.pathname.replace(/\/$/, "")}${page === 1 ? "/" : `/page/${page}/`}`;
  return base.toString();
}

export async function discoverNasaArchive(
  options: {
    archiveUrl: string;
    backfillDays: number;
    maxPages?: number;
    fetchPage?: FetchPage;
    now?: Date;
  },
): Promise<ArchiveDiscoveryResult> {
  const { archiveUrl, backfillDays, maxPages = 30, fetchPage = fetchNasaPage, now = new Date() } = options;
  const cutoff = now.valueOf() - backfillDays * 24 * 60 * 60 * 1000;
  const items = new Map<string, NormalizedFeedItem>();
  const failures: string[] = [];
  const seenUrls = new Set<string>();
  let pagesRead = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const listingUrl = pageUrl(archiveUrl, page);
    const links = parseArchiveLinks(await fetchPage(listingUrl), listingUrl);
    pagesRead += 1;
    if (links.length === 0) break;

    let allItemsPrecedeCutoff = true;
    for (const link of links) {
      if (seenUrls.has(link.canonicalUrl)) continue;
      seenUrls.add(link.canonicalUrl);

      try {
        const item = parseArchiveArticle(await fetchPage(link.canonicalUrl), link.canonicalUrl);
        if (item.publishedAt.valueOf() >= cutoff) {
          allItemsPrecedeCutoff = false;
          items.set(item.canonicalUrl, item);
        }
      } catch (error) {
        failures.push(`${link.canonicalUrl}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    if (allItemsPrecedeCutoff) break;
  }

  return {
    items: [...items.values()].sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf()),
    pagesRead,
    failures,
  };
}
