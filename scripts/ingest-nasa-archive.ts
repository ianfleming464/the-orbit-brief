import "dotenv/config";

import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { ingestArticleItems } from "@/lib/ingest";
import { discoverNasaArchive } from "@/lib/nasa-archive";

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} must be a positive integer`);
  return value;
}

async function main() {
  try {
    const env = getEnv();
    const discovery = await discoverNasaArchive({
      archiveUrl: env.NASA_NEWS_ARCHIVE_URL,
      backfillDays: env.BACKFILL_DAYS,
      maxPages: readPositiveIntegerFlag("--pages", 30),
    });
    const ingestion = await ingestArticleItems(discovery.items);

    console.log(JSON.stringify({
      discovery: {
        pagesRead: discovery.pagesRead,
        discovered: discovery.items.length,
        failures: discovery.failures,
      },
      ingestion: ingestion.summary,
    }, null, 2));

    if (discovery.failures.length > 0 || ingestion.summary.failed > 0) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
