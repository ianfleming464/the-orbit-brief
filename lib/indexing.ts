import { chunkArticle, type ArticleChunk, type ArticleForChunking } from "@/lib/chunking";

export type PreparedVectorRecord = {
  id: string;
  embeddingText: string;
  metadata: ArticleChunk["metadata"] & {
    content: string;
  };
};

export function prepareArticleIndexRecords(article: ArticleForChunking): PreparedVectorRecord[] {
  return chunkArticle(article).map((chunk) => ({
    id: chunk.id,
    embeddingText: chunk.embeddingText,
    metadata: {
      ...chunk.metadata,
      content: chunk.content,
    },
  }));
}

export function prepareIndexRecords(articles: ArticleForChunking[]): PreparedVectorRecord[] {
  return articles.flatMap(prepareArticleIndexRecords);
}
