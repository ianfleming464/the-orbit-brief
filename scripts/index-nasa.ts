import "dotenv/config";

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

import { db } from "@/lib/db";
import { getIndexingEnv } from "@/lib/env";
import { prepareIndexRecords } from "@/lib/indexing";
import {
  batchRecords,
  createPineconeVectorRecords,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/lib/vector-index";

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} must be a positive integer`);
  return value;
}

function readArticleLimit(): number | undefined {
  if (process.argv.includes("--all")) {
    if (process.argv.includes("--limit")) throw new Error("Use either --all or --limit, not both");
    return undefined;
  }
  return readPositiveIntegerFlag("--limit", 10);
}

async function main() {
  const env = getIndexingEnv();
  const articleLimit = readArticleLimit();
  const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  const indexDescription = await pinecone.describeIndex(env.PINECONE_INDEX);

  if (indexDescription.dimension !== EMBEDDING_DIMENSIONS || indexDescription.metric !== "cosine") {
    throw new Error(
      `Pinecone index must use dimension ${EMBEDDING_DIMENSIONS} and cosine metric; found ${indexDescription.dimension} and ${indexDescription.metric}`,
    );
  }
  if (!indexDescription.host) throw new Error(`Pinecone index "${env.PINECONE_INDEX}" has no data-plane host`);

  const articles = await db.article.findMany({
    orderBy: { publishedAt: "desc" },
    ...(articleLimit ? { take: articleLimit } : {}),
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
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const index = pinecone.index({ host: indexDescription.host });
  let embedded = 0;
  let promptTokens = 0;

  for (const batch of batchRecords(records)) {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      input: batch.map((record) => record.embeddingText),
    });
    const embeddings = [...response.data]
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
    const vectors = createPineconeVectorRecords(batch, embeddings);

    await index.upsert({ records: vectors });
    embedded += vectors.length;
    promptTokens += response.usage.prompt_tokens;
  }

  const stats = await index.describeIndexStats();
  console.log(JSON.stringify({
    articles: articles.length,
    vectorsUpserted: embedded,
    promptTokens,
    embeddingModel: EMBEDDING_MODEL,
    index: env.PINECONE_INDEX,
    totalVectorCount: stats.totalRecordCount ?? null,
  }, null, 2));
}

void main().finally(() => db.$disconnect());
