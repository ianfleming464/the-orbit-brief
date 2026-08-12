import { describe, expect, it } from "vitest";

import { formatConversationHistory, normalizeSelectorPlan, routeForPlan, selectorPlanSchema } from "@/lib/agents/selector";

describe("selector plan contract", () => {
  it.each([
    [{ useSql: true, useRag: false }, "SQL"],
    [{ useSql: false, useRag: true }, "RAG"],
    [{ useSql: true, useRag: true }, "BOTH"],
    [{ useSql: false, useRag: false }, "NEITHER"],
  ] as const)("derives %s from executable booleans", (plan, expectedRoute) => {
    expect(routeForPlan(plan)).toBe(expectedRoute);
  });

  it("accepts a SQL-only plan with no semantic query", () => {
    expect(selectorPlanSchema.parse({
      useSql: true, useRag: false, reason: "The question asks for an exact article count.",
      semanticQuery: null, clarificationQuestion: null,
    }).semanticQuery).toBeNull();
  });

  it("rejects selector plans with inconsistent route fields", () => {
    expect(selectorPlanSchema.safeParse({
      useSql: false, useRag: true, reason: "This needs semantic retrieval.",
      semanticQuery: null, clarificationQuestion: null,
    }).success).toBe(false);
    expect(selectorPlanSchema.safeParse({
      useSql: true, useRag: false, reason: "This needs a count.",
      semanticQuery: null, clarificationQuestion: "Which date range?",
    }).success).toBe(false);
  });

  it("keeps only the most recent bounded conversation history", () => {
    const history = Array.from({ length: 7 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `Message ${index + 1}`,
    }));

    const formatted = formatConversationHistory(history);
    expect(formatted).not.toContain("Message 1");
    expect(formatted).toContain("Message 2");
    expect(formatted).toContain("Message 7");
  });

  it("keeps an executable route when a model returns a contradictory clarification", () => {
    expect(normalizeSelectorPlan({
      useSql: true,
      useRag: true,
      reason: "The question has both a date and topic.",
      semanticQuery: "Moon Base in June",
      clarificationQuestion: "Which June?",
    }).clarificationQuestion).toBeNull();
  });
});
