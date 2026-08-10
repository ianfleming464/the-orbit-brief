import "dotenv/config";

import { db } from "@/lib/db";
import { prepareIndexRecords } from "@/lib/indexing";

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;

  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} must be a positive integer`);
  return value;
}

async function main() {
  const limit = readPositiveIntegerFlag("--limit", 10);
  const sampleSize = readPositiveIntegerFlag("--sample", 3);
  const articles = await db.article.findMany({
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      source: true,
      canonicalUrl: true,
      publishedAt: true,
      body: true,
      contentHash: true,
    },
  });
  const records = prepareIndexRecords(articles);

  console.log(JSON.stringify({
    dryRun: true,
    articles: articles.length,
    records: records.length,
    uniqueRecordIds: new Set(records.map((record) => record.id)).size,
    sample: records.slice(0, sampleSize),
  }, null, 2));
}

void main().finally(() => db.$disconnect());
