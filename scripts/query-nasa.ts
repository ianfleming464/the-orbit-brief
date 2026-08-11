import "dotenv/config";

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

import { getIndexingEnv } from "@/lib/env";
import { toRetrievalMatches } from "@/lib/retrieval";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/vector-index";

function readRequiredFlag(flag: string): string {
  const index = process.argv.indexOf(flag);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value?.trim()) throw new Error(`${flag} is required`);
  return value.trim();
}

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0 || value > 20) throw new Error(`${flag} must be an integer from 1 to 20`);
  return value;
}

async function main() {
  const question = readRequiredFlag("--question");
  const topK = readPositiveIntegerFlag("--top-k", 5);
  const env = getIndexingEnv();
  const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  const description = await pinecone.describeIndex(env.PINECONE_INDEX);
  if (description.dimension !== EMBEDDING_DIMENSIONS || description.metric !== "cosine" || !description.host) {
    throw new Error("Pinecone index must be a 1536-dimensional cosine index with a data-plane host");
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const embedding = await openai.embeddings.create({
    model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, input: question,
  });
  if (embedding.data[0]?.embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("OpenAI returned an embedding with an unexpected dimension");
  }

  const index = pinecone.index({ host: description.host });
  const result = await index.query({ vector: embedding.data[0].embedding, topK, includeMetadata: true });
  console.log(JSON.stringify({
    question,
    topK,
    embeddingModel: EMBEDDING_MODEL,
    promptTokens: embedding.usage.prompt_tokens,
    matches: toRetrievalMatches(result.matches),
  }, null, 2));
}

void main();
