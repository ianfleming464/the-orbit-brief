import { describe, expect, it } from "vitest";

import { createRagResult, DEFAULT_RAG_TOP_K } from "@/lib/agents/rag";
import type { RetrievalMatch } from "@/lib/retrieval";

const matches: RetrievalMatch[] = [
  {
    id: "nasa:moon:1", score: 0.82, articleId: "moon", chunkIndex: 1,
    title: "Moon Base", source: "NASA", canonicalUrl: "https://www.nasa.gov/moon",
    publishedAt: "2026-08-11T00:00:00.000Z", content: "Second retrieved chunk.",
  },
  {
    id: "nasa:moon:0", score: 0.71, articleId: "moon", chunkIndex: 0,
    title: "Moon Base", source: "NASA", canonicalUrl: "https://www.nasa.gov/moon",
    publishedAt: "2026-08-11T00:00:00.000Z", content: "First retrieved chunk.",
  },
];

describe("RAG specialist contract", () => {
  it("preserves Pinecone result order and provenance without reranking", () => {
    expect(createRagResult("Moon Base", matches)).toEqual({
      semanticQuery: "Moon Base",
      retrievalMethod: "vector",
      matches,
    });
  });

  it("uses a bounded default candidate count", () => {
    expect(DEFAULT_RAG_TOP_K).toBe(5);
  });
});
