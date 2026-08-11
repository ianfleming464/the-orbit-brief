import type { PreparedVectorRecord } from "@/lib/indexing";

type ChunkMetadata = PreparedVectorRecord["metadata"];

export type RetrievalMatch = {
  id: string;
  score: number;
  articleId: string;
  chunkIndex: number;
  title: string;
  source: string;
  canonicalUrl: string;
  publishedAt: string;
  content: string;
};

export function toRetrievalMatches(
  matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }>,
): RetrievalMatch[] {
  return matches.flatMap((match) => {
    const metadata = match.metadata as Partial<ChunkMetadata> | undefined;
    if (
      !metadata || typeof metadata.articleId !== "string" || typeof metadata.chunkIndex !== "number" ||
      typeof metadata.title !== "string" || typeof metadata.source !== "string" ||
      typeof metadata.canonicalUrl !== "string" || typeof metadata.publishedAt !== "string" ||
      typeof metadata.content !== "string"
    ) return [];

    return [{
      id: match.id, score: match.score ?? 0, articleId: metadata.articleId,
      chunkIndex: metadata.chunkIndex, title: metadata.title, source: metadata.source,
      canonicalUrl: metadata.canonicalUrl, publishedAt: metadata.publishedAt, content: metadata.content,
    }];
  });
}
