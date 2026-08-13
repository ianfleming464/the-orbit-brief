/**
 * SQL specialist — structured Article queries only.
 *
 * The model chooses a small validated query plan. This module executes that
 * plan with fixed Prisma calls; it never executes model-authored SQL.
 */

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { formatConversationHistory, type ChatMessage } from "@/lib/agents/selector";
import { db } from "@/lib/db";
import { getIndexingEnv } from "@/lib/env";

export const SQL_MODEL = "gpt-5-mini";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const articleQueryPlanSchema = z.object({
  operation: z.enum(["count", "list", "coverage"])
    .describe("The fixed Article query operation to execute."),
  publishedFrom: isoDateSchema.nullable()
    .describe("Inclusive UTC publication date in YYYY-MM-DD, or null."),
  publishedTo: isoDateSchema.nullable()
    .describe("Inclusive UTC publication date in YYYY-MM-DD, or null."),
  source: z.string().trim().min(1).max(100).nullable()
    .describe("An explicit publisher/source constraint, or null."),
  titleQuery: z.string().trim().min(1).max(200).nullable()
    .describe("Explicit title words for an exact title lookup, or null."),
  limit: z.number().int().min(1).max(20)
    .describe("Maximum Article records to return for list; use 10 when unspecified."),
  sort: z.enum(["newest", "oldest"])
    .describe("Publication-date order for a list query."),
}).superRefine((plan, context) => {
  if (plan.publishedFrom && plan.publishedTo && plan.publishedFrom > plan.publishedTo) {
    context.addIssue({ code: "custom", message: "publishedFrom must not be after publishedTo.", path: ["publishedTo"] });
  }
  if (plan.operation !== "list" && plan.titleQuery) {
    context.addIssue({ code: "custom", message: "titleQuery is only supported for list operations.", path: ["titleQuery"] });
  }
});

export type ArticleQueryPlan = z.infer<typeof articleQueryPlanSchema>;

export type SqlArticle = {
  id: string;
  title: string;
  source: string;
  canonicalUrl: string;
  publishedAt: Date;
};

export type SqlResult =
  | { kind: "count"; count: number; plan: ArticleQueryPlan }
  | { kind: "list"; articles: SqlArticle[]; plan: ArticleQueryPlan }
  | { kind: "coverage"; articleCount: number; earliestPublishedAt: Date | null; latestPublishedAt: Date | null; sources: string[]; plan: ArticleQueryPlan };

export const sqlInstructions = `You are the SQL specialist for The Orbit Brief.
You do not answer the user. You produce one safe, structured query plan for the
application's canonical Article store. The application executes the plan itself;
you never write SQL, Prisma code, or prose.

The Article store contains only indexed news records with these usable fields:
- source: publisher name, currently NASA for all indexed records;
- title: article title;
- canonicalUrl: source URL;
- publishedAt: article publication timestamp;
- body: full article text, which is NOT available to this specialist for
  semantic/topic search.

Allowed operations:
- count: exact number of indexed Articles matching explicit date/source filters;
- list: Article cards matching explicit date/source/title filters;
- coverage: corpus count, earliest/latest publication date, and source names.

Rules:
- Use this specialist only for exact structured questions, not “what do the
  articles say about…” topic questions.
- Preserve only constraints the user explicitly states or that a clear follow-up
  references from the supplied history. Never invent dates, source names, or
  title words.
- Dates must be UTC calendar dates in YYYY-MM-DD. The current UTC date is
  supplied in the request to resolve phrases such as “today” or “this week.”
- For list, choose newest unless the user asks for oldest; use limit 10 unless
  the user requests a smaller number. For count and coverage, still return a
  valid limit even though it is not used.
- titleQuery is only for a request that explicitly identifies an article by its
  title. A topic phrase such as “Moon Base” is not a title lookup: leave
  titleQuery null, even when the question also asks about that topic.
- Return data matching the schema exactly.`;

export const sqlPlanningExamples = `
Examples:

Question: How many articles are indexed from June?
Plan: operation=count, publishedFrom=2026-06-01, publishedTo=2026-06-30,
source=null, titleQuery=null, limit=10, sort=newest.

Question: What did articles from June say about Moon Base?
Plan: operation=list, publishedFrom=2026-06-01, publishedTo=2026-06-30,
source=null, titleQuery=null, limit=10, sort=newest. “Moon Base” is a semantic
topic for the RAG specialist, not a titleQuery.

Question: What are the five most recent indexed stories?
Plan: operation=list, publishedFrom=null, publishedTo=null, source=null,
titleQuery=null, limit=5, sort=newest.`;

export function startOfUtcDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function startOfNextUtcDay(date: string): Date {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

export function buildArticleWhere(plan: ArticleQueryPlan) {
  const publishedAt = {
    ...(plan.publishedFrom ? { gte: startOfUtcDay(plan.publishedFrom) } : {}),
    ...(plan.publishedTo ? { lt: startOfNextUtcDay(plan.publishedTo) } : {}),
  };

  return {
    ...(Object.keys(publishedAt).length > 0 ? { publishedAt } : {}),
    ...(plan.source ? { source: { equals: plan.source, mode: "insensitive" as const } } : {}),
    ...(plan.titleQuery ? { title: { contains: plan.titleQuery, mode: "insensitive" as const } } : {}),
  };
}

export async function createArticleQueryPlan(
  question: string,
  history: ChatMessage[] = [],
  openai: OpenAI,
  now = new Date(),
): Promise<ArticleQueryPlan> {
  const response = await openai.responses.parse({
    model: SQL_MODEL,
    instructions: `${sqlInstructions}${sqlPlanningExamples}`,
    input: `Current UTC date: ${now.toISOString().slice(0, 10)}\n\nConversation history:\n${formatConversationHistory(history)}\n\nUser question: ${question}`,
    text: { format: zodTextFormat(articleQueryPlanSchema, "orbit_brief_article_query_plan"), verbosity: "low" },
  });

  if (!response.output_parsed) throw new Error("OpenAI returned no SQL query plan");
  return articleQueryPlanSchema.parse(response.output_parsed);
}

export async function runSql(question: string, history: ChatMessage[] = []): Promise<SqlResult> {
  const env = getIndexingEnv();
  const plan = await createArticleQueryPlan(question, history, new OpenAI({ apiKey: env.OPENAI_API_KEY }));
  const where = buildArticleWhere(plan);

  console.info("\n[sql]", {
    operation: plan.operation,
    publishedFrom: plan.publishedFrom,
    publishedTo: plan.publishedTo,
    source: plan.source,
    titleQuery: plan.titleQuery,
    limit: plan.limit,
    sort: plan.sort,
  });

  if (plan.operation === "count") {
    return { kind: "count", count: await db.article.count({ where }), plan };
  }

  if (plan.operation === "coverage") {
    const [summary, sourceRows] = await Promise.all([
      db.article.aggregate({ where, _count: { _all: true }, _min: { publishedAt: true }, _max: { publishedAt: true } }),
      db.article.findMany({ where, select: { source: true }, distinct: ["source"], orderBy: { source: "asc" } }),
    ]);
    return {
      kind: "coverage",
      articleCount: summary._count._all,
      earliestPublishedAt: summary._min.publishedAt,
      latestPublishedAt: summary._max.publishedAt,
      sources: sourceRows.map((row) => row.source),
      plan,
    };
  }

  const articles = await db.article.findMany({
    where,
    take: plan.limit,
    orderBy: { publishedAt: plan.sort === "newest" ? "desc" : "asc" },
    select: { id: true, title: true, source: true, canonicalUrl: true, publishedAt: true },
  });
  return { kind: "list", articles, plan };
}
