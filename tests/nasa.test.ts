import { describe, expect, it } from "vitest";
import { hashContent, normalizeFeedItem, normalizeUrl } from "@/lib/nasa";

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
});
