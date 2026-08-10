import { describe, expect, it } from "vitest";

import { chunkArticle, splitSentences } from "@/lib/chunking";

const article = {
  id: "article-1",
  title: "NASA studies a distant world",
  source: "NASA",
  canonicalUrl: "https://www.nasa.gov/example",
  publishedAt: new Date("2026-08-10T12:00:00Z"),
  body: "First complete sentence. Second complete sentence. Third complete sentence.",
  contentHash: "content-hash",
};

describe("NASA article chunking", () => {
  it("keeps complete sentences together when they fit", () => {
    expect(chunkArticle(article, { maxChars: 50 }).map((chunk) => chunk.content)).toEqual([
      "First complete sentence. Second complete sentence.",
      "Third complete sentence.",
    ]);
  });

  it("keeps article metadata, title context, and deterministic IDs", () => {
    const [chunk] = chunkArticle(article);
    expect(chunk).toMatchObject({
      id: "nasa:article-1:0",
      embeddingText: expect.stringContaining("Title: NASA studies a distant world"),
      metadata: {
        articleId: "article-1",
        chunkIndex: 0,
        canonicalUrl: "https://www.nasa.gov/example",
        contentHash: "content-hash",
      },
    });
  });

  it("splits an oversized sentence at word boundaries", () => {
    const chunks = chunkArticle({ ...article, body: "one two three four five six seven eight" }, { maxChars: 15 });
    expect(chunks.map((chunk) => chunk.content)).toEqual(["one two three", "four five six", "seven eight"]);
    expect(chunks.every((chunk) => !chunk.content.startsWith(" ") && !chunk.content.endsWith(" "))).toBe(true);
  });

  it("does not overlap adjacent chunks", () => {
    const chunks = chunkArticle({ ...article, body: "Alpha beta gamma. Delta epsilon zeta." }, { maxChars: 20 });
    expect(chunks.map((chunk) => chunk.content)).toEqual(["Alpha beta gamma.", "Delta epsilon zeta."]);
  });

  it("normalises the flattened stored article text into sentences", () => {
    expect(splitSentences(" First story.\n\nSecond story!  ")).toEqual(["First story.", "Second story!"]);
  });
});
