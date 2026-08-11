import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

import { getIndexingEnv } from "@/lib/env";
import { toRetrievalMatches, type RetrievalMatch } from "@/lib/retrieval";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/vector-index";

export async function retrieveNasa(question: string, topK = 5): Promise<RetrievalMatch[]> {
  const env = getIndexingEnv();
  const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  const description = await pinecone.describeIndex(env.PINECONE_INDEX);

  if (description.dimension !== EMBEDDING_DIMENSIONS || description.metric !== "cosine" || !description.host) {
    throw new Error("Pinecone index must be a 1536-dimensional cosine index with a data-plane host");
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const embedding = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    input: question,
  });
  const vector = embedding.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("OpenAI returned an embedding with an unexpected dimension");
  }

  const index = pinecone.index({ host: description.host });
  const result = await index.query({ vector, topK, includeMetadata: true });
  return toRetrievalMatches(result.matches);
}
