import { describe, expect, it } from "vitest";

import { articleQueryPlanSchema, buildArticleWhere, startOfNextUtcDay, startOfUtcDay } from "@/lib/agents/sql";

describe("SQL specialist query contract", () => {
  const listPlan = {
    operation: "list" as const,
    publishedFrom: "2026-06-01",
    publishedTo: "2026-06-30",
    source: "NASA",
    titleQuery: null,
    limit: 10,
    sort: "newest" as const,
  };

  it("turns inclusive calendar dates into a safe UTC Prisma filter", () => {
    expect(buildArticleWhere(articleQueryPlanSchema.parse(listPlan))).toEqual({
      publishedAt: { gte: new Date("2026-06-01T00:00:00.000Z"), lt: new Date("2026-07-01T00:00:00.000Z") },
      source: { equals: "NASA", mode: "insensitive" },
    });
    expect(startOfUtcDay("2026-06-01")).toEqual(new Date("2026-06-01T00:00:00.000Z"));
    expect(startOfNextUtcDay("2026-06-30")).toEqual(new Date("2026-07-01T00:00:00.000Z"));
  });

  it("rejects impossible date ranges and semantic title search on non-list operations", () => {
    expect(articleQueryPlanSchema.safeParse({ ...listPlan, publishedFrom: "2026-07-01" }).success).toBe(false);
    expect(articleQueryPlanSchema.safeParse({ ...listPlan, operation: "count", titleQuery: "Moon" }).success).toBe(false);
  });
});
