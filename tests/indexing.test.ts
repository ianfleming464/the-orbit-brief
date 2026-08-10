import { describe, expect, it } from "vitest";

import { prepareArticleIndexRecords, prepareIndexRecords } from "@/lib/indexing";

const article = {
  id: "article-1",
  title: "NASA studies a distant world",
  source: "NASA",
  canonicalUrl: "https://www.nasa.gov/example",
  publishedAt: new Date("2026-08-10T12:00:00Z"),
  body: "First sentence. Second sentence.",
  contentHash: "content-hash",
};

describe("prepared Pinecone records", () => {
  it("keeps the embedding text separate from inspectable retrieval metadata", () => {
    const [record] = prepareArticleIndexRecords(article);
    expect(record).toMatchObject({
      id: "nasa:article-1:0",
      embeddingText: "Title: NASA studies a distant world\n\nFirst sentence. Second sentence.",
      metadata: {
        articleId: "article-1",
        content: "First sentence. Second sentence.",
        contentHash: "content-hash",
      },
    });
  });

  it("retains deterministic IDs across a multi-article batch", () => {
    const records = prepareIndexRecords([article, { ...article, id: "article-2" }]);
    expect(records.map((record) => record.id)).toEqual(["nasa:article-1:0", "nasa:article-2:0"]);
  });
});
