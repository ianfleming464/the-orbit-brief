import { describe, expect, it } from "vitest";

import type { ChangedArticle } from "@/lib/ingest";
import { EMBEDDING_DIMENSIONS } from "@/lib/vector-index";
import { syncChangedArticles } from "@/lib/vector-sync";

const article: ChangedArticle = {
  id: "article", change: "updated", title: "Example", source: "NASA",
  canonicalUrl: "https://www.nasa.gov/example", publishedAt: new Date("2026-08-10T00:00:00Z"),
  body: "A complete first sentence. A complete second sentence.", contentHash: "changed",
};

describe("vector synchronization", () => {
  it("does nothing when ingestion reports no changed articles", async () => {
    const calls: string[] = [];
    const summary = await syncChangedArticles([], {
      embed: async () => { calls.push("embed"); return { embeddings: [], promptTokens: 0 }; },
      upsert: async () => { calls.push("upsert"); }, listIds: async () => [], deleteIds: async () => { calls.push("delete"); },
    });
    expect(summary.vectorsUpserted).toBe(0);
    expect(calls).toEqual([]);
  });

  it("upserts replacements before deleting obsolete chunk IDs", async () => {
    const calls: string[] = [];
    const summary = await syncChangedArticles([article], {
      embed: async () => ({ embeddings: [Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1)], promptTokens: 12 }),
      upsert: async () => { calls.push("upsert"); },
      listIds: async () => ["nasa:article:0", "nasa:article:1"],
      deleteIds: async (ids) => { calls.push(`delete:${ids.join(",")}`); },
    });
    expect(calls).toEqual(["upsert", "delete:nasa:article:1"]);
    expect(summary).toMatchObject({ articlesUpdated: 1, vectorsUpserted: 1, vectorsDeleted: 1, promptTokens: 12 });
  });
});
