import { describe, expect, it } from "vitest";

import { buildBriefingMessage, chatQuestionSchema, classifyQuestion } from "@/lib/briefing";

describe("briefing question routing", () => {
  it.each([
    "Show me the latest NASA news",
    "What did NASA publish this week?",
    "Give me recent NASA stories",
    "What's new today?",
  ])("routes recent question: %s", (question) => {
    expect(classifyQuestion(question)).toBe("recent");
  });

  it("routes topic questions to semantic retrieval", () => {
    expect(classifyQuestion("Tell me about Europa")).toBe("topic");
  });

  it("validates and trims a question at the API boundary", () => {
    expect(chatQuestionSchema.parse({ question: "  latest NASA news  " }).question).toBe("latest NASA news");
    expect(chatQuestionSchema.safeParse({ question: "" }).success).toBe(false);
  });

  it("describes empty and populated briefings deterministically", () => {
    expect(buildBriefingMessage(0)).toContain("no NASA articles");
    expect(buildBriefingMessage(5)).toContain("5 most recent");
  });
});
