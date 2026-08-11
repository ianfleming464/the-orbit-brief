import { z } from "zod";

export const chatQuestionSchema = z.object({
  question: z.string().trim().min(1, "Ask a question about indexed space news.").max(300),
});

export type QuestionIntent = "recent" | "topic";

const recentQuestionPattern =
  /\b(latest|recent|newest|today|this week|what(?:'s| is) new)\b/i;

export function classifyQuestion(question: string): QuestionIntent {
  return recentQuestionPattern.test(question) ? "recent" : "topic";
}

export function buildBriefingMessage(articleCount: number): string {
  if (articleCount === 0) return "There are no stories in the index yet.";
  return `Here are the ${articleCount} most recent stories currently indexed.`;
}
