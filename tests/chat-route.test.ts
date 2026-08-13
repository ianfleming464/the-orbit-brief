import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, runSql, runRag, restrictRagToArticleIds, aggregate } = vi.hoisted(() => ({
  select: vi.fn(),
  runSql: vi.fn(),
  runRag: vi.fn(),
  restrictRagToArticleIds: vi.fn((result) => result),
  aggregate: vi.fn(),
}));

vi.mock("@/lib/agents/selector", () => ({ select }));
vi.mock("@/lib/agents/sql", () => ({ runSql }));
vi.mock("@/lib/agents/rag", () => ({
  HYBRID_RAG_CANDIDATE_TOP_K: 20,
  runRag,
  restrictRagToArticleIds,
}));
vi.mock("@/lib/agents/aggregator", () => ({ aggregate }));

import { POST } from "@/app/api/chat/route";

function request(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("agentic chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs SQL and RAG concurrently for a BOTH plan, then aggregates their typed results", async () => {
    select.mockResolvedValue({ useSql: true, useRag: true, route: "BOTH", reason: "Date plus topic.", semanticQuery: "Moon Base", clarificationQuestion: null });
    runSql.mockResolvedValue({ kind: "list", articles: [{ id: "moon", title: "Moon Base", source: "NASA", canonicalUrl: "https://nasa.gov/moon", publishedAt: new Date("2026-06-01") }] });
    runRag.mockResolvedValue({ semanticQuery: "Moon Base", retrievalMethod: "vector", matches: [] });
    aggregate.mockResolvedValue({ kind: "answer", message: "Two articles discuss Moon Base.", sources: [] });

    const response = await POST(request({
      question: "What did articles from June say about Moon Base?",
      messages: [{ role: "user", content: "Show me June articles." }],
    }));

    expect(runSql).toHaveBeenCalledWith("What did articles from June say about Moon Base?", [{ role: "user", content: "Show me June articles." }]);
    expect(runRag).toHaveBeenCalledWith("Moon Base", 20);
    expect(restrictRagToArticleIds).toHaveBeenCalledWith(
      { semanticQuery: "Moon Base", retrievalMethod: "vector", matches: [] },
      ["moon"],
    );
    expect(aggregate).toHaveBeenCalledWith(expect.objectContaining({
      question: "What did articles from June say about Moon Base?",
      sqlResult: expect.objectContaining({ kind: "list" }),
      ragResult: { semanticQuery: "Moon Base", retrievalMethod: "vector", matches: [] },
    }));
    await expect(response.json()).resolves.toEqual({ kind: "answer", message: "Two articles discuss Moon Base.", sources: [] });
  });

  it("short-circuits NEITHER without specialist or aggregator calls", async () => {
    select.mockResolvedValue({ useSql: false, useRag: false, route: "NEITHER", reason: "Outside the corpus.", semanticQuery: null, clarificationQuestion: null });

    const response = await POST(request({ question: "What is the capital of France?" }));

    expect(runSql).not.toHaveBeenCalled();
    expect(runRag).not.toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      kind: "no_result",
      message: "I can help with questions about the space-news sources currently indexed here.",
      sources: [],
    });
  });

  it("rejects histories longer than six messages", async () => {
    const response = await POST(request({
      question: "Any news?",
      messages: Array.from({ length: 7 }, () => ({ role: "user", content: "Earlier question" })),
    }));

    expect(response.status).toBe(400);
    expect(select).not.toHaveBeenCalled();
  });
});
