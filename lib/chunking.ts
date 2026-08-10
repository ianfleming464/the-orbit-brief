export const DEFAULT_CHUNK_MAX_CHARS = 1_500;
export const EMBEDDING_VERSION = "text-embedding-3-small:1536:v1";

export type ArticleForChunking = {
  id: string;
  title: string;
  source: string;
  canonicalUrl: string;
  publishedAt: Date;
  body: string;
  contentHash: string;
};

export type ArticleChunk = {
  id: string;
  content: string;
  embeddingText: string;
  metadata: {
    articleId: string;
    chunkIndex: number;
    title: string;
    source: string;
    canonicalUrl: string;
    publishedAt: string;
    contentHash: string;
    embeddingVersion: string;
  };
};

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function splitSentences(value: string): string[] {
  const text = normaliseWhitespace(value);
  if (!text) return [];

  return text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map(normaliseWhitespace).filter(Boolean) ?? [];
}

function splitLongSentence(sentence: string, maxChars: number): string[] {
  const words = sentence.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    current = word;
  }

  if (current) chunks.push(current);
  return chunks;
}

function packSentences(sentences: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  function flush() {
    if (current) chunks.push(current);
    current = "";
  }

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      flush();
      chunks.push(...splitLongSentence(sentence, maxChars));
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      flush();
      current = sentence;
    }
  }

  flush();
  return chunks;
}

export function chunkArticle(
  article: ArticleForChunking,
  options: { maxChars?: number; embeddingVersion?: string } = {},
): ArticleChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_CHUNK_MAX_CHARS;
  if (!Number.isInteger(maxChars) || maxChars <= 0) {
    throw new Error("maxChars must be a positive integer");
  }

  const contentChunks = packSentences(splitSentences(article.body), maxChars);
  const embeddingVersion = options.embeddingVersion ?? EMBEDDING_VERSION;

  return contentChunks.map((content, chunkIndex) => ({
    id: `nasa:${article.id}:${chunkIndex}`,
    content,
    embeddingText: `Title: ${article.title}\n\n${content}`,
    metadata: {
      articleId: article.id,
      chunkIndex,
      title: article.title,
      source: article.source,
      canonicalUrl: article.canonicalUrl,
      publishedAt: article.publishedAt.toISOString(),
      contentHash: article.contentHash,
      embeddingVersion,
    },
  }));
}
