# NASA Astronomy Briefing — Clean Repo Setup and Incremental Build

## Goal

Create a Next.js app that turns full-text NASA news articles into a small daily briefing and a source-cited question experience. Keep each component understandable and independently testable.

## Stack and responsibilities

| Component | Responsibility | Why it belongs here |
| --- | --- | --- |
| Next.js (TypeScript, App Router) | UI, server endpoints, streaming answer route | One application for the small product surface. |
| PostgreSQL + Prisma | Canonical articles, chunks, ingestion runs | Exact dates, URLs, deduplication, retries, and auditability. |
| Pinecone | Embeddings and semantic candidate retrieval | Similarity search over article chunks. |
| OpenAI API | Embeddings and answer synthesis | Convert chunks to vectors; write an answer only from retrieved context. |
| Scheduled HTTP endpoint | Background ingestion trigger | A boring, deployable replacement for a long-running worker at MVP scale. |

Authentication is intentionally absent initially. Add a managed provider later only if accounts become a real requirement.

## Suggested repository shape

```text
app/
  page.tsx                       # briefing + chat screen
  api/chat/route.ts              # rules-first route, retrieval, streaming response
  api/ingest/nasa/route.ts       # protected scheduled/manual ingestion endpoint
components/
  briefing-list.tsx
  chat.tsx
lib/
  db.ts                          # Prisma client
  nasa.ts                        # RSS discovery + article fetch/extraction
  ingest.ts                      # idempotent ingestion pipeline
  retrieval.ts                   # SQL and Pinecone retrieval functions
  routing.ts                     # deterministic intent/date routing
  ai.ts                          # embedding + grounded-answer helpers
prisma/
  schema.prisma
scripts/
  ingest-nasa.ts                 # local development runner
tests/
  routing.test.ts
  ingest.test.ts
  retrieval.test.ts
```

## Architecture

```text
NASA RSS → scheduled ingestion endpoint → fetch article page → extract full body
                                                        ↓
                                             PostgreSQL (source of truth)
                                                        ↓
                              chunk + embed → Pinecone (semantic index)

User question → deterministic router ── recent/date ──→ PostgreSQL → streamed summary + citations
                                      └─ topic/follow-up → Pinecone → PostgreSQL → streamed answer + citations
```

### Minimum schema

`Article`: ID, source, title, canonical URL (unique), published timestamp, full text, content hash, extraction state, timestamps.

`ArticleChunk`: ID, article ID, chunk index, text, Pinecone vector ID, embedding version.

`IngestionRun`: ID, source, start/end timestamps, counts, status, and an error summary.

The database stays readable even if Pinecone is temporarily unavailable; indexing can retry without refetching the article.

## Critical flows

### Ingestion

1. Load the NASA RSS feed.
2. Canonicalise each URL and look it up in SQL.
3. Fetch and extract the full article page for new or changed entries.
4. Save article + chunks in a transaction where appropriate.
5. Create embeddings and upsert Pinecone vectors with `article_id` metadata.
6. Record success/failure in `IngestionRun`; retry failures on the next scheduled run.

Use URL uniqueness plus a content hash for idempotency. Do not replace an existing good body with an empty/failed extraction.

### Chat and streaming UI

The UI sends a question to `/api/chat`. `routing.ts` checks explicit cues such as “today,” “latest,” and “this week”; a date intent queries SQL directly. Other supported questions retrieve chunk candidates from Pinecone, load full article records from SQL, and pass only that context to the answer generator. Stream text to the browser and render compact source links when complete.

For unsupported requests, return a short boundary message rather than inventing an answer.

## Incremental build plan

### 0. Foundation

Create the Next.js app, environment validation, PostgreSQL database, Prisma schema/migration, and a simple page showing an empty state. Add a local script that proves database connectivity.

### 1. Data before chat

Implement RSS discovery, article-page extraction, SQL upsert, and a basic recent-articles list. Verify a second run produces no duplicate records. This is the first usable checkpoint: browse full NASA articles in one place.

### 2. Briefing

Add a deterministic “recent NASA news” SQL query and a server-side summary with article links. Verify date boundaries manually and with a test.

### 3. Semantic follow-up

Add chunking, embeddings, Pinecone upsert, and topic-based retrieval. Keep a small fixture corpus and test that known questions return the expected article IDs.

### 4. Streamed answers

Add the chat UI and streaming endpoint. Require retrieved context and citations in every substantive answer. Test the loading, empty, error, and no-results states.

### 5. Scheduling and operational basics

Protect the ingestion endpoint with a scheduler secret, configure a daily schedule, record run outcomes, and expose a minimal internal ingestion status view or log. Add a manual trigger for development only.

## Small acceptance checklist

- A scheduled or manual run stores full bodies for new NASA articles.
- Re-running does not create duplicate canonical URLs.
- “What happened this week?” comes from a SQL date query.
- A topic question retrieves a relevant stored article through Pinecone, then answers with a NASA link.
- When retrieval is empty, the app says so rather than making a claim.
- Ingestion failures are visible and retryable.

## Environment variables

```text
DATABASE_URL=
PINECONE_API_KEY=
PINECONE_INDEX=
OPENAI_API_KEY=
INGESTION_SECRET=
NASA_RSS_URL=
```

Never expose these in the browser bundle. Keep scheduler authentication server-side.

## Deferred decisions

- Choose the hosting/database vendor based on the deploy path you already understand.
- Pick the exact extraction technique after testing it on representative NASA pages.
- Add an evaluation dashboard only after the handful of hand-written checks are running reliably.

## Source basis

This setup applies the cohort notes’ data-first and freshness guidance, while keeping the design-document scope narrow: retrieve → answer first, with no agent requirement.
