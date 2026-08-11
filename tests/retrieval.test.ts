import { describe, expect, it } from "vitest";

import { toRetrievalMatches } from "@/lib/retrieval";

describe("retrieval match mapping", () => {
  it("keeps inspectable source metadata with the similarity score", () => {
    expect(toRetrievalMatches([{
      id: "nasa:article:1", score: 0.84,
      metadata: {
        articleId: "article", chunkIndex: 1, title: "Example", source: "NASA",
        canonicalUrl: "https://www.nasa.gov/example", publishedAt: "2026-08-11T00:00:00.000Z",
        content: "Relevant evidence.", contentHash: "hash", embeddingVersion: "version",
      },
    }])).toEqual([{
      id: "nasa:article:1", score: 0.84, articleId: "article", chunkIndex: 1,
      title: "Example", source: "NASA", canonicalUrl: "https://www.nasa.gov/example",
      publishedAt: "2026-08-11T00:00:00.000Z", content: "Relevant evidence.",
    }]);
  });

  it("excludes malformed vector metadata instead of inventing a citation", () => {
    expect(toRetrievalMatches([{ id: "bad", score: 0.5, metadata: { title: "Incomplete" } }])).toEqual([]);
  });
});
