import { prepareArticleIndexRecords } from "@/lib/indexing";
import type { ChangedArticle } from "@/lib/ingest";
import { batchRecords, createPineconeVectorRecords } from "@/lib/vector-index";

export type VectorSyncAdapters = {
  embed: (input: string[]) => Promise<{ embeddings: number[][]; promptTokens: number }>;
  upsert: (records: ReturnType<typeof createPineconeVectorRecords>) => Promise<void>;
  listIds: (prefix: string) => Promise<string[]>;
  deleteIds: (ids: string[]) => Promise<void>;
};

export type VectorSyncSummary = {
  articlesInserted: number;
  articlesUpdated: number;
  vectorsUpserted: number;
  vectorsDeleted: number;
  promptTokens: number;
};

export async function syncChangedArticles(
  articles: ChangedArticle[],
  adapters: VectorSyncAdapters,
): Promise<VectorSyncSummary> {
  const summary: VectorSyncSummary = {
    articlesInserted: 0, articlesUpdated: 0, vectorsUpserted: 0, vectorsDeleted: 0, promptTokens: 0,
  };

  for (const article of articles) {
    const records = prepareArticleIndexRecords(article);
    if (records.length === 0) throw new Error(`Article ${article.id} produced no index records`);
    const existingIds = article.change === "updated" ? await adapters.listIds(`nasa:${article.id}:`) : [];

    for (const batch of batchRecords(records)) {
      const response = await adapters.embed(batch.map((record) => record.embeddingText));
      await adapters.upsert(createPineconeVectorRecords(batch, response.embeddings));
      summary.vectorsUpserted += batch.length;
      summary.promptTokens += response.promptTokens;
    }

    const currentIds = new Set(records.map((record) => record.id));
    const staleIds = existingIds.filter((id) => !currentIds.has(id));
    if (staleIds.length > 0) {
      await adapters.deleteIds(staleIds);
      summary.vectorsDeleted += staleIds.length;
    }
    if (article.change === "inserted") summary.articlesInserted += 1;
    else summary.articlesUpdated += 1;
  }

  return summary;
}
