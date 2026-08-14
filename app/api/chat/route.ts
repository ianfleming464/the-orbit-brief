import { NextResponse } from "next/server";
import { z } from "zod";

import { aggregate } from "@/lib/agents/aggregator";
import { select } from "@/lib/agents/selector";
import { HYBRID_RAG_CANDIDATE_TOP_K, restrictRagToArticleIds, runRag } from "@/lib/agents/rag";
import { runSql } from "@/lib/agents/sql";
import { chatQuestionSchema } from "@/lib/briefing";
import { traceStage, traceWorkflow } from "@/lib/observability";

const chatRequestSchema = chatQuestionSchema.extend({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2_000),
  })).max(6).default([]),
});

const neitherMessage = "I can help with questions about the space-news sources currently indexed here.";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { kind: "invalid", message: "Send a question about indexed space news." },
      { status: 400 },
    );
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { kind: "invalid", message: parsed.error.issues[0]?.message ?? "Send a valid question." },
      { status: 400 },
    );
  }

  try {
    const result = await traceWorkflow(
      { questionCharacters: parsed.data.question.length, historyMessageCount: parsed.data.messages.length },
      async () => {
        const plan = await traceStage(
          "selector",
          { questionCharacters: parsed.data.question.length, historyMessageCount: parsed.data.messages.length },
          () => select(parsed.data.question, parsed.data.messages),
          (selection) => ({ route: selection.route, useSql: selection.useSql, useRag: selection.useRag }),
        );
        console.info("\n[workflow]", {
          route: plan.route,
          useSql: plan.useSql,
          useRag: plan.useRag,
          reason: plan.reason,
        });

        if (plan.clarificationQuestion) {
          return { kind: "clarification" as const, message: plan.clarificationQuestion, sources: [] };
        }

        if (!plan.useSql && !plan.useRag) {
          return { kind: "no_result" as const, message: neitherMessage, sources: [] };
        }

        const [sqlResult, retrievedRagResult] = await Promise.all([
          plan.useSql
            ? traceStage(
              "SQL specialist",
              { questionCharacters: parsed.data.question.length, historyMessageCount: parsed.data.messages.length },
              () => runSql(parsed.data.question, parsed.data.messages),
              (sql) => ({ resultKind: sql.kind, recordCount: sql.kind === "list" ? sql.articles.length : sql.kind === "count" ? sql.count : sql.articleCount }),
            )
            : undefined,
          plan.useRag
            ? traceStage(
              "RAG specialist",
              { semanticQueryCharacters: plan.semanticQuery!.length, topK: plan.useSql ? HYBRID_RAG_CANDIDATE_TOP_K : 5 },
              () => runRag(plan.semanticQuery!, plan.useSql ? HYBRID_RAG_CANDIDATE_TOP_K : undefined),
              (rag) => ({ retrievalMethod: rag.retrievalMethod, matchCount: rag.matches.length }),
            )
            : undefined,
        ]);

        const ragResult = sqlResult?.kind === "list" && retrievedRagResult
          ? restrictRagToArticleIds(retrievedRagResult, sqlResult.articles.map((article) => article.id))
          : retrievedRagResult;

        if (sqlResult?.kind === "list" && retrievedRagResult) {
          console.info("\n[workflow: hybrid evidence]", {
            sqlEligibleArticles: sqlResult.articles.length,
            retrievedCandidates: retrievedRagResult.matches.length,
            retainedCandidates: ragResult?.matches.length ?? 0,
            constraint: "Only RAG chunks from SQL-listed articles are sent to the aggregator.",
          });
        }

        return traceStage(
          "aggregator",
          {
            sqlResultKind: sqlResult?.kind ?? null,
            ragMatchCount: ragResult?.matches.length ?? 0,
            historyMessageCount: parsed.data.messages.length,
          },
          () => aggregate({
            question: parsed.data.question,
            history: parsed.data.messages,
            sqlResult,
            ragResult,
          }),
          (answer) => ({ answerKind: answer.kind, sourceCount: answer.sources.length }),
        );
      },
      (answer) => ({ answerKind: answer.kind, sourceCount: answer.sources.length }),
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[workflow] failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { kind: "error", message: "The request could not be completed. Check configured services and try again." },
      { status: 500 },
    );
  }
}
