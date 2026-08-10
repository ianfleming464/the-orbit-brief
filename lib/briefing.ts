import { z } from "zod";

export const chatQuestionSchema = z.object({
  question: z.string().trim().min(1, "Ask a question about NASA news.").max(300),
});

export type QuestionIntent = "recent" | "unsupported";

const recentQuestionPattern =
  /\b(latest|recent|newest|today|this week|what(?:'s| is) new)\b/i;

export function classifyQuestion(question: string): QuestionIntent {
  return recentQuestionPattern.test(question) ? "recent" : "unsupported";
}

export function buildBriefingMessage(articleCount: number): string {
  if (articleCount === 0) return "There are no NASA articles in the index yet.";
  return `Here are the ${articleCount} most recent NASA stories currently indexed.`;
}

export const unsupportedQuestionMessage =
  "I can answer questions about recent NASA news currently indexed here. Try asking for the latest or recent NASA stories.";
