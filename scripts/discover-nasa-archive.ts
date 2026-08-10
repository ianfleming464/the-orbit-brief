import "dotenv/config";

import { getEnv } from "@/lib/env";
import { discoverNasaArchive } from "@/lib/nasa-archive";

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} must be a positive integer`);
  return value;
}

async function main() {
  const env = getEnv();
  const result = await discoverNasaArchive({
    archiveUrl: env.NASA_NEWS_ARCHIVE_URL,
    backfillDays: env.BACKFILL_DAYS,
    maxPages: readPositiveIntegerFlag("--pages", 30),
  });

  console.log(JSON.stringify({
    pagesRead: result.pagesRead,
    discovered: result.items.length,
    oldest: result.items.at(-1)?.publishedAt.toISOString() ?? null,
    newest: result.items[0]?.publishedAt.toISOString() ?? null,
    failures: result.failures,
    items: result.items,
  }, null, 2));
}

void main();
