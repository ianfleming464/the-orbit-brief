import { describe, expect, it } from "vitest";
import { extractArticleBody, hashContent, normalizeFeedItem, normalizeUrl } from "@/lib/nasa";

const nasaArticleHtml = `
  <article>
    <aside class="article-meta-item">Lauren E. Low Aug 10, 2026 RELEASE 26-063</aside>
    <div class="usa-article-content"><div class="entry-content">
      <p>NASA announced a new mission to study the solar system with a broad set of instruments and public data. The mission will share observations with researchers around the world and give students new ways to learn about the science behind exploration.</p>
      <p>The team will begin its next phase of testing this autumn, with updates published as the schedule develops. NASA expects the work to support future missions and build a clearer picture of how our planetary neighborhood changes over time.</p>
    </div></div>
    <section class="article_a">Share Details Last Updated Aug 10, 2026 Location</section>
  </article>
`;

describe("NASA feed normalization", () => {
  it("removes tracking parameters and fragments from URLs", () => {
    expect(normalizeUrl("https://www.nasa.gov/story/?utm_source=feed#top")).toBe("https://www.nasa.gov/story");
  });
  it("normalizes valid feed items", () => {
    const item = normalizeFeedItem({ title: "  NASA story  ", link: "https://www.nasa.gov/story/", pubDate: "Fri, 07 Aug 2026 18:57:34 +0000" });
    expect(item.title).toBe("NASA story");
    expect(item.canonicalUrl).toBe("https://www.nasa.gov/story");
    expect(item.publishedAt.toISOString()).toBe("2026-08-07T18:57:34.000Z");
  });
  it("rejects incomplete feed items", () => {
    expect(() => normalizeFeedItem({ title: "Missing link" })).toThrow("missing a link");
  });
  it("creates the same hash for surrounding whitespace", () => {
    expect(hashContent(" NASA story ")).toBe(hashContent("NASA story"));
  });
  it("prefers NASA's published article body over surrounding page chrome", () => {
    const body = extractArticleBody(nasaArticleHtml, "https://www.nasa.gov/news-release/example");
    expect(body).toContain("NASA announced a new mission");
    expect(body).not.toContain("Lauren E. Low");
    expect(body).not.toContain("Share Details");
  });
});
