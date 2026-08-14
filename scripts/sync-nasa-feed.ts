import "dotenv/config";

import { Pinecone } from "@pinecone-database/pinecone";

import { db } from "@/lib/db";
import { getIndexingEnv } from "@/lib/env";
import { ingestNasa } from "@/lib/ingest";
import { getOpenAI } from "@/lib/openai";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/vector-index";
import { syncChangedArticles } from "@/lib/vector-sync";

async function main() {
  try {
    const ingestion = await ingestNasa();
    if (ingestion.changedArticles.length === 0) {
      console.log(JSON.stringify({ ingestion: ingestion.summary, vectorSync: null }, null, 2));
      return;
    }

    const env = getIndexingEnv();
    const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    const description = await pinecone.describeIndex(env.PINECONE_INDEX);
    if (description.dimension !== EMBEDDING_DIMENSIONS || description.metric !== "cosine" || !description.host) {
      throw new Error("Pinecone index must be a 1536-dimensional cosine index with a data-plane host");
    }
    const index = pinecone.index({ host: description.host });
    const vectorSync = await syncChangedArticles(ingestion.changedArticles, {
      embed: async (input) => {
        const response = await getOpenAI().embeddings.create({
          model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, input,
        });
        return {
          embeddings: [...response.data].sort((a, b) => a.index - b.index).map((item) => item.embedding),
          promptTokens: response.usage.prompt_tokens,
        };
      },
      upsert: (records) => index.upsert({ records }),
      listIds: async (prefix) => {
        const ids: string[] = [];
        let paginationToken: string | undefined;
        do {
          const page = await index.listPaginated({ prefix, paginationToken });
          ids.push(...(page.vectors ?? []).flatMap((vector) => vector.id ? [vector.id] : []));
          paginationToken = page.pagination?.next;
        } while (paginationToken);
        return ids;
      },
      deleteIds: (ids) => index.deleteMany({ ids }),
    });
    console.log(JSON.stringify({ ingestion: ingestion.summary, vectorSync }, null, 2));
    if (ingestion.summary.failed > 0) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
