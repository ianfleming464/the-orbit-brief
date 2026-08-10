import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  buildBriefingMessage,
  chatQuestionSchema,
  classifyQuestion,
  unsupportedQuestionMessage,
} from "@/lib/briefing";

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

  if (classifyQuestion(parsed.data.question) === "unsupported") {
    return NextResponse.json({ kind: "unsupported", message: unsupportedQuestionMessage });
  }

  try {
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
