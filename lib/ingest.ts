import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { extractArticle, hashContent, readFeed, type NormalizedFeedItem } from "@/lib/nasa";

export type IngestionSummary = {
  discovered: number;
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
  failures: string[];
};

function isWithinBackfill(item: NormalizedFeedItem, backfillDays: number): boolean {
  return item.publishedAt.valueOf() >= Date.now() - backfillDays * 24 * 60 * 60 * 1000;
}

export async function ingestArticleItems(items: NormalizedFeedItem[]): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    discovered: items.length, inserted: 0, updated: 0, unchanged: 0, failed: 0, failures: [],
  };

  for (const item of items) {
    try {
      const existing = await db.article.findUnique({
        where: { canonicalUrl: item.canonicalUrl },
        select: { id: true, contentHash: true },
      });
      const body = await extractArticle(item.canonicalUrl);
      const contentHash = hashContent(body);
      if (existing?.contentHash === contentHash) {
        summary.unchanged += 1;
        continue;
      }

      await db.article.upsert({
        where: { canonicalUrl: item.canonicalUrl },
        create: {
          source: "NASA", title: item.title, canonicalUrl: item.canonicalUrl,
          publishedAt: item.publishedAt, body, contentHash, extractionState: "complete",
        },
        update: {
          title: item.title, publishedAt: item.publishedAt, body, contentHash,
          extractionState: "complete",
        },
      });
      if (existing) summary.updated += 1;
      else summary.inserted += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push(
        `${item.canonicalUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }
  return summary;
}

export async function ingestNasa(): Promise<IngestionSummary> {
  const env = getEnv();
  const feedItems = (await readFeed(env.NASA_RSS_URL)).filter((item) =>
    isWithinBackfill(item, env.BACKFILL_DAYS),
  );
  return ingestArticleItems(feedItems);
}
