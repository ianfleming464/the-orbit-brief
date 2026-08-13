import { describe, expect, it } from "vitest";

import { buildAggregationEvidence, interpretAggregatedAnswer } from "@/lib/agents/aggregator";
import type { RagResult } from "@/lib/agents/rag";
import type { SqlResult } from "@/lib/agents/sql";

const ragResult: RagResult = {
  semanticQuery: "Moon Base",
  retrievalMethod: "vector",
  matches: [{
    id: "nasa:moon:0", score: 0.8, articleId: "moon", chunkIndex: 0,
    title: "Moon Base Plans", source: "NASA", canonicalUrl: "https://www.nasa.gov/moon",
    publishedAt: "2026-08-11T00:00:00.000Z", content: "NASA described a Moon Base plan.",
  }],
};

describe("aggregator evidence contract", () => {
  it("labels RAG excerpts as untrusted and validates selected source IDs", () => {
    const evidence = buildAggregationEvidence({ question: "What about Moon Base?", ragResult });
    expect(evidence.context).toContain("UNTRUSTED RAG EXCERPT");
    expect(interpretAggregatedAnswer({
      answer: "NASA described a Moon Base plan.", sufficientEvidence: true, sourceIds: ["rag-1", "invented"],
    }, evidence)).toEqual({
      kind: "answer", message: "NASA described a Moon Base plan.", sources: [{
        id: "moon", title: "Moon Base Plans", source: "NASA",
        canonicalUrl: "https://www.nasa.gov/moon", publishedAt: "2026-08-11T00:00:00.000Z",
      }],
    });
  });

  it("rejects an uncited RAG-only answer but permits an exact SQL count", () => {
    const ragEvidence = buildAggregationEvidence({ question: "What about Moon Base?", ragResult });
    expect(interpretAggregatedAnswer({ answer: "Maybe", sufficientEvidence: true, sourceIds: [] }, ragEvidence).kind).toBe("no_result");

    const sqlResult: SqlResult = {
      kind: "count", count: 23,
      plan: { operation: "count", publishedFrom: "2026-06-01", publishedTo: "2026-06-30", source: null, titleQuery: null, limit: 10, sort: "newest" },
    };
    const sqlEvidence = buildAggregationEvidence({ question: "How many?", sqlResult });
    expect(interpretAggregatedAnswer({ answer: "There are 23 matching articles.", sufficientEvidence: true, sourceIds: [] }, sqlEvidence)).toEqual({
      kind: "answer", message: "There are 23 matching articles.", sources: [],
    });
  });

  it("attaches SQL list cards without depending on model-selected IDs", () => {
    const sqlResult: SqlResult = {
      kind: "list",
      articles: [{
        id: "latest", title: "Latest story", source: "NASA", canonicalUrl: "https://www.nasa.gov/latest",
        publishedAt: new Date("2026-08-11T00:00:00.000Z"),
      }],
      plan: { operation: "list", publishedFrom: null, publishedTo: null, source: null, titleQuery: null, limit: 5, sort: "newest" },
    };
    const evidence = buildAggregationEvidence({ question: "What is latest?", sqlResult });

    expect(interpretAggregatedAnswer({ answer: "Here are the latest stories.", sufficientEvidence: true, sourceIds: [] }, evidence)).toEqual({
      kind: "answer", message: "Here are the latest stories.", sources: [{
        id: "latest", title: "Latest story", source: "NASA", canonicalUrl: "https://www.nasa.gov/latest",
        publishedAt: "2026-08-11T00:00:00.000Z",
      }],
    });
  });

  it("requires a RAG citation when SQL metadata and RAG evidence are combined", () => {
    const sqlResult: SqlResult = {
      kind: "list",
      articles: [{
        id: "moon", title: "Moon Base Plans", source: "NASA", canonicalUrl: "https://www.nasa.gov/moon",
        publishedAt: new Date("2026-08-11T00:00:00.000Z"),
      }],
      plan: { operation: "list", publishedFrom: null, publishedTo: null, source: null, titleQuery: null, limit: 5, sort: "newest" },
    };
    const evidence = buildAggregationEvidence({ question: "What about Moon Base?", sqlResult, ragResult });

    expect(interpretAggregatedAnswer({ answer: "Maybe", sufficientEvidence: true, sourceIds: ["sql-1"] }, evidence).kind).toBe("no_result");
  });
});
