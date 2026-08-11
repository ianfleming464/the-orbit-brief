import { describe, expect, it } from "vitest";

import type { PreparedVectorRecord } from "@/lib/indexing";
import {
  batchRecords,
  createPineconeVectorRecords,
  EMBEDDING_DIMENSIONS,
} from "@/lib/vector-index";

const record: PreparedVectorRecord = {
  id: "nasa:article:0",
  embeddingText: "Title: Example\n\nExample content.",
  metadata: {
    articleId: "article",
    chunkIndex: 0,
    title: "Example",
    source: "NASA",
    canonicalUrl: "https://www.nasa.gov/example",
    publishedAt: "2026-08-10T00:00:00.000Z",
    contentHash: "hash",
    embeddingVersion: "text-embedding-3-small:1536:v1",
    content: "Example content.",
  },
};

describe("vector indexing helpers", () => {
  it("keeps bounded batches in input order", () => {
    expect(batchRecords([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("pairs embedding values with deterministic index records", () => {
    const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1);
    expect(createPineconeVectorRecords([record], [values])).toEqual([
      { id: record.id, values, metadata: record.metadata },
    ]);
  });

  it("rejects missing or incorrectly sized embeddings before upsert", () => {
    expect(() => createPineconeVectorRecords([record], [])).toThrow("Embedding count mismatch");
    expect(() => createPineconeVectorRecords([record], [[0.1]])).toThrow("expected 1536");
  });
});
