import { NextResponse } from "next/server";
import { z } from "zod";

import { aggregate } from "@/lib/agents/aggregator";
import { select } from "@/lib/agents/selector";
import { runRag } from "@/lib/agents/rag";
import { runSql } from "@/lib/agents/sql";
import { chatQuestionSchema } from "@/lib/briefing";

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
    const plan = await select(parsed.data.question, parsed.data.messages);
    console.info("[workflow]", JSON.stringify({
      route: plan.route,
      useSql: plan.useSql,
      useRag: plan.useRag,
      reason: plan.reason,
    }));

    if (plan.clarificationQuestion) {
      return NextResponse.json({ kind: "clarification", message: plan.clarificationQuestion });
    }

    if (!plan.useSql && !plan.useRag) {
      return NextResponse.json({ kind: "no_result", message: neitherMessage, sources: [] });
    }

    const [sqlResult, ragResult] = await Promise.all([
      plan.useSql ? runSql(parsed.data.question, parsed.data.messages) : undefined,
      plan.useRag ? runRag(plan.semanticQuery!) : undefined,
    ]);

    return NextResponse.json(await aggregate({
      question: parsed.data.question,
      history: parsed.data.messages,
      sqlResult,
      ragResult,
    }));
  } catch (error) {
    console.error("[workflow] failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { kind: "error", message: "The request could not be completed. Check configured services and try again." },
      { status: 500 },
    );
  }
}
