import "dotenv/config";

import { chunkArticle, DEFAULT_CHUNK_MAX_CHARS } from "@/lib/chunking";
import { db } from "@/lib/db";

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;

  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} must be a positive integer`);
  return value;
}

function preview(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}…`;
}

async function main() {
  const limit = readPositiveIntegerFlag("--limit", 1);
  const maxChars = readPositiveIntegerFlag("--max-chars", DEFAULT_CHUNK_MAX_CHARS);
  const previewChars = readPositiveIntegerFlag("--preview-chars", 500);
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

  if (articles.length === 0) {
    console.log("No SQL articles are available. Run npm run ingest:nasa first.");
    return;
  }

  for (const article of articles) {
    const chunks = chunkArticle(article, { maxChars });
    console.log(`\n${"=".repeat(80)}`);
    console.log(`ARTICLE: ${article.title}`);
    console.log(`SOURCE: ${article.source} | ${article.publishedAt.toISOString()}`);
    console.log(`URL: ${article.canonicalUrl}`);
    console.log(`BEFORE: ${article.body.length} characters of flattened article text`);
    console.log(preview(article.body, previewChars));
    console.log(`\nAFTER: ${chunks.length} sentence-aware chunk(s), max ${maxChars} characters each`);

    for (const chunk of chunks) {
      console.log(`\n[${chunk.id}] ${chunk.content.length} characters`);
      console.log(`CONTENT: ${preview(chunk.content, previewChars)}`);
      console.log(`EMBEDDING CONTEXT: ${preview(chunk.embeddingText, previewChars)}`);
      console.log(`METADATA: ${JSON.stringify(chunk.metadata)}`);
    }
  }
}

void main().finally(() => db.$disconnect());
