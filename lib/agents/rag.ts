/**
 * RAG specialist — deterministic semantic retrieval only.
 *
 * It wraps the existing inspectable Pinecone retrieval path and returns ordered
 * evidence records. It does not rerank, generate prose, or decide citations;
 * those are separate decisions for later checkpoints.
 */

import { retrieveNasa } from "@/lib/nasa-retrieval";
import type { RetrievalMatch } from "@/lib/retrieval";

export const DEFAULT_RAG_TOP_K = 5;

export type RagResult = {
  semanticQuery: string;
  retrievalMethod: "vector";
  matches: RetrievalMatch[];
};

export function createRagResult(semanticQuery: string, matches: RetrievalMatch[]): RagResult {
  return { semanticQuery, retrievalMethod: "vector", matches };
}

export async function runRag(semanticQuery: string, topK = DEFAULT_RAG_TOP_K): Promise<RagResult> {
  if (!semanticQuery.trim()) throw new Error("A semantic query is required");
  if (!Number.isInteger(topK) || topK < 1 || topK > 20) {
    throw new Error("topK must be an integer from 1 to 20");
  }

  const matches = await retrieveNasa(semanticQuery.trim(), topK);
  const result = createRagResult(semanticQuery.trim(), matches);

  console.info("[rag]", JSON.stringify({
    semanticQuery: result.semanticQuery,
    retrievalMethod: result.retrievalMethod,
    matches: result.matches.map((match) => ({
      id: match.id,
      score: match.score,
      articleId: match.articleId,
      title: match.title,
      publishedAt: match.publishedAt,
    })),
  }));

  return result;
}
