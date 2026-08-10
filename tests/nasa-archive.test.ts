import { describe, expect, it } from "vitest";

import { discoverNasaArchive, parseArchiveArticle, parseArchiveLinks } from "@/lib/nasa-archive";

const archiveHtml = `
  <a href="/news-release/example-release/">Example release</a>
  <a href="/news-release/page/2/">Older releases</a>
  <a href="/news-release/">News releases</a>
`;

const currentArticleHtml = `
  <h1>Example release</h1>
  <script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-08-01T12:00:00Z"}</script>
`;

const oldArticleHtml = `
  <h1>Older release</h1>
  <time datetime="2026-01-01T12:00:00Z"></time>
`;

describe("NASA news-release archive discovery", () => {
  it("keeps canonical article links and excludes archive navigation", () => {
    expect(parseArchiveLinks(archiveHtml, "https://www.nasa.gov/news-release/")).toEqual([
      { title: "Example release", canonicalUrl: "https://www.nasa.gov/news-release/example-release" },
    ]);
  });

  it("reads title and publication date from an article page", () => {
    expect(parseArchiveArticle(currentArticleHtml, "https://www.nasa.gov/news-release/example-release/")).toMatchObject({
      title: "Example release",
      canonicalUrl: "https://www.nasa.gov/news-release/example-release",
    });
  });

  it("filters discovered articles to the requested backfill window", async () => {
    const pages = new Map<string, string>([
      ["https://www.nasa.gov/news-release/", archiveHtml],
      ["https://www.nasa.gov/news-release/example-release", currentArticleHtml],
      ["https://www.nasa.gov/news-release/older-release", oldArticleHtml],
    ]);
    const fetchPage = async (url: string) => {
      if (url === "https://www.nasa.gov/news-release/page/2/") {
        return '<a href="/news-release/older-release/">Older release</a>';
      }
      const page = pages.get(url);
      if (!page) throw new Error(`unexpected URL ${url}`);
      return page;
    };

    const result = await discoverNasaArchive({
      archiveUrl: "https://www.nasa.gov/news-release/",
      backfillDays: 30,
      maxPages: 3,
      fetchPage,
      now: new Date("2026-08-10T00:00:00Z"),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Example release");
    expect(result.pagesRead).toBe(2);
  });
});
