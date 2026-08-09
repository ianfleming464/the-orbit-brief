import "dotenv/config";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";

async function main() {
  try {
    const env = getEnv();
    const cutoff = new Date(Date.now() - env.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db.article.deleteMany({ where: { publishedAt: { lt: cutoff } } });
    console.log(`Deleted ${result.count} article(s) older than ${cutoff.toISOString()}.`);
  } finally {
    await db.$disconnect();
  }
}

void main();
