import { NextResponse } from "next/server";
import OpenAI from "openai";

import { db } from "@/lib/db";
import {
  buildBriefingMessage,
  chatQuestionSchema,
  classifyQuestion,
} from "@/lib/briefing";
import { getIndexingEnv } from "@/lib/env";
import { generateGroundedAnswer } from "@/lib/grounded-answer";
import { retrieveNasa } from "@/lib/nasa-retrieval";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { kind: "invalid", message: "Send a question about NASA news." },
      { status: 400 },
    );
  }

  const parsed = chatQuestionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { kind: "invalid", message: parsed.error.issues[0]?.message ?? "Send a valid question." },
      { status: 400 },
    );
  }

  try {
    if (classifyQuestion(parsed.data.question) === "topic") {
      const matches = await retrieveNasa(parsed.data.question);
      const env = getIndexingEnv();
      const answer = await generateGroundedAnswer(
        parsed.data.question,
        matches,
        new OpenAI({ apiKey: env.OPENAI_API_KEY }),
      );
      return NextResponse.json(answer);
    }

    const articles = await db.article.findMany({
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, title: true, source: true, canonicalUrl: true, publishedAt: true },
    });

    return NextResponse.json({
      kind: articles.length === 0 ? "empty" : "briefing",
      message: buildBriefingMessage(articles.length),
      articles,
    });
  } catch {
    return NextResponse.json(
      { kind: "error", message: "The NASA index could not be reached. Check the database and try again." },
      { status: 500 },
    );
  }
}
