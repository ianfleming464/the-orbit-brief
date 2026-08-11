import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NASA_RSS_URL: z.string().url().default("https://www.nasa.gov/news-release/feed"),
  NASA_NEWS_ARCHIVE_URL: z.string().url().default("https://www.nasa.gov/news-release/"),
  BACKFILL_DAYS: z.coerce.number().int().positive().default(180),
  RETENTION_DAYS: z.coerce.number().int().positive().default(180),
});

const indexingEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX: z.string().min(1),
});

export function getEnv() {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NASA_RSS_URL: process.env.NASA_RSS_URL,
    NASA_NEWS_ARCHIVE_URL: process.env.NASA_NEWS_ARCHIVE_URL,
    BACKFILL_DAYS: process.env.BACKFILL_DAYS,
    RETENTION_DAYS: process.env.RETENTION_DAYS,
  });
}

export function getIndexingEnv() {
  return indexingEnvSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
  });
}
