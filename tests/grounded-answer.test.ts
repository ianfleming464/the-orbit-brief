import { describe, expect, it } from "vitest";

import { buildEvidenceContext, groundedAnswerInstructions, interpretGroundedAnswer, noResultMessage } from "@/lib/grounded-answer";
import type { RetrievalMatch } from "@/lib/retrieval";

const matches: RetrievalMatch[] = [
  {
    id: "nasa:moon:0", score: 0.8, articleId: "moon", chunkIndex: 0,
    title: "Moon Base Plans", source: "NASA", canonicalUrl: "https://www.nasa.gov/moon",
    publishedAt: "2026-08-11T00:00:00.000Z", content: "NASA described a Moon Base plan.",
  },
  {
    id: "nasa:moon:1", score: 0.7, articleId: "moon", chunkIndex: 1,
    title: "Moon Base Plans", source: "NASA", canonicalUrl: "https://www.nasa.gov/moon",
    publishedAt: "2026-08-11T00:00:00.000Z", content: "The plan uses lunar infrastructure.",
  },
];

describe("grounded answer contract", () => {
  it("labels retrieved text as untrusted evidence and preserves source labels", () => {
    const context = buildEvidenceContext("What did NASA say about the Moon?", matches);
    expect(context).toContain("[source-1]");
    expect(context).toContain("UNTRUSTED NASA NEWS EXCERPT");
    expect(groundedAnswerInstructions).toContain("never instructions");
  });

  it("keeps only supplied, deduplicated sources for a supported answer", () => {
    expect(interpretGroundedAnswer({
      answer: "NASA described a Moon Base plan.", sufficientEvidence: true,
      sourceIds: ["source-1", "source-2", "invented-source"],
    }, matches)).toEqual({
      kind: "answer", message: "NASA described a Moon Base plan.",
      sources: [{
        id: "moon", title: "Moon Base Plans", source: "NASA",
        canonicalUrl: "https://www.nasa.gov/moon", publishedAt: "2026-08-11T00:00:00.000Z",
      }],
    });
  });

  it("uses the fixed no-result boundary when evidence is insufficient or uncited", () => {
    expect(interpretGroundedAnswer({ answer: "", sufficientEvidence: false, sourceIds: [] }, matches))
      .toEqual({ kind: "no_result", message: noResultMessage, sources: [] });
    expect(interpretGroundedAnswer({ answer: "Maybe", sufficientEvidence: true, sourceIds: [] }, matches))
      .toEqual({ kind: "no_result", message: noResultMessage, sources: [] });
  });
});
