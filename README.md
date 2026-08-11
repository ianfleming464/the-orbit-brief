# The Orbit Brief

## A daily astronomy briefing grounded in trusted sources

The Orbit Brief is a small, source-grounded NASA news briefing and question
app. It answers questions from the NASA news currently indexed by the app and
links back to the source articles.

This repository is the capstone build. The medical RAG repository is a working
reference for retrieval, metadata, grounding, evaluation, and security
patterns; it is not the application being modified here.

## Current MUP

```text
User asks about recent NASA news
→ the app searches its stored NASA corpus
→ the app answers from retrieved articles
→ the answer includes clickable NASA sources
```

## Current implementation

```text
NASA RSS + official archive → SQL Article corpus → sentence-aware chunks
→ OpenAI embeddings → Pinecone semantic index
```

Checkpoint 3 is complete: the SQL corpus contains 72 NASA articles dated May
15–August 10, 2026, represented by 175 Pinecone vectors. The current UI still
supports deterministic recent-news questions; semantic retrieval and generated
answers remain intentionally separate upcoming work.

The next implementation increment is feed-to-index synchronization: a manual
RSS refresh must identify new or changed SQL articles, generate their current
chunks, and safely update the corresponding Pinecone vectors without reindexing
the entire corpus by default. Retrieval, answer generation, selector agents,
and web fallback are not part of that increment.

The complete build order is in [.notes/ROADMAP.md](.notes/ROADMAP.md).
The intended selector/SQL/RAG/aggregator architecture and future web-search
fallback are recorded in [.notes/AGENT-CONTEXT.md](.notes/AGENT-CONTEXT.md).

The implementation uses a hosted PostgreSQL database through Prisma as the
canonical Article store. `BACKFILL_DAYS` controls the manual RSS/archive window
and `RETENTION_DAYS` controls optional cleanup. The RSS feed is a freshness
source; the official NASA news-release archive supplied the initial 90-day
backfill.

### Run Checkpoint 1 locally

After creating a hosted PostgreSQL database, copy `.env.example` to `.env` and
set `DATABASE_URL`. A root `.env` is used here because both Prisma CLI and
Next.js load it. Keep it local and never commit it. Then run:

```bash
npm install
npx prisma migrate dev --name init
npm run ingest:nasa
npm run dev
```

Open `http://localhost:3000` to view the SQL-backed article list. Run
`npm run ingest:nasa` a second time to verify unchanged URLs are reported as
unchanged rather than inserted again. The retention command is intentionally
manual: run `npm run retention:nasa` only after choosing the desired
`RETENTION_DAYS` value.

The current article list is the data-foundation screen, not the final product
experience. The intended MUP interaction is a chat-first NASA briefing screen:
users can type a question or choose a small set of starter prompts such as
“Show me the latest NASA news.” Recent/latest prompts will use SQL-backed
article records; ingestion remains a separate refresh operation rather than a
hidden side effect of every chat question.

### Chat-first briefing shell

The current chat slice supports recent-news questions only. Questions containing
“latest,” “recent,” “newest,” “today,” or “this week” query the five newest SQL
articles and return clickable NASA source cards. Topic retrieval, embeddings,
agents, and answer generation are intentionally deferred from the chat flow.

The chat never runs ingestion. To refresh the stored corpus during development,
run `npm run ingest:nasa` separately. An empty database, unsupported question,
loading request, and database failure each have an explicit user-facing state.

### Checkpoint 3 development

The RSS feed is a current-items source, not a historical backfill. The official
NASA news-release archive was validated as a viable 90-day discovery source:
on August 11, 2026 it returned 62 dated releases from May 15 to August 10 with
zero date-parsing failures. Discovery is read-only; it does not yet extract
article bodies or write SQL records. Reproduce that 90-day check with:

```bash
BACKFILL_DAYS=90 npm run discover:nasa-archive -- --pages 10
```

After reviewing that output, run the manual archive backfill to extract each
candidate's full body and upsert it into the existing SQL Article store. It
uses the same canonical-URL and content-hash idempotency as RSS ingestion, so
rerunning it reports unchanged articles rather than duplicating them:

```bash
BACKFILL_DAYS=90 npm run ingest:nasa-archive -- --pages 10
```

This command writes SQL records and makes network requests to each archive
article. Review its JSON summary before starting Pinecone work.

The initial 90-day run inserted 62 archive articles successfully on August 11,
2026. Re-running the same command is safe: matching content is reported as
unchanged rather than duplicated.

Chunking decisions for the later Pinecone index are documented in
[.notes/checkpoint-3-chunking-decision.md](.notes/checkpoint-3-chunking-decision.md).

Inspect the chunking effect against the current SQL corpus without writing data
or calling an external service:

```bash
npm run inspect:nasa-chunks
```

Use `--limit 3` to inspect more articles or `--max-chars 800` to see how a
smaller chunk boundary changes the output:

```bash
npm run inspect:nasa-chunks -- --limit 3 --max-chars 800
```

Prepare the exact records that will later be embedded and upserted, without
creating a Pinecone index or sending data to OpenAI:

```bash
npm run prepare:nasa-index
```

Before the index-creation step, install the official SDKs and set the server-only
`OPENAI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX` values in `.env`:

```bash
npm install openai @pinecone-database/pinecone
```

Create a Pinecone serverless index manually with the name `nasa-news`, dense
vectors, 1536 dimensions, and cosine similarity. Do not choose an integrated
embedding index: this project generates embeddings with OpenAI. After setting
the two API keys and index name in `.env`, first index a bounded sample:

```bash
npm run index:nasa -- --limit 10
```

Review the JSON count and records in Pinecone, then index the full SQL corpus:

```bash
npm run index:nasa -- --all
```

The command verifies index dimension/metric before calling OpenAI, embeds in
25-record batches, validates embedding dimensions, and upserts deterministic
vector IDs. Reruns overwrite matching IDs. A later reindex process must delete
obsolete vectors if a changed article produces fewer chunks; that destructive
maintenance path is deliberately outside this first controlled write.

### First live indexing evidence

The first controlled run completed on August 11, 2026. Ten recent SQL articles
produced 17 sentence-aware vectors and used 3,963 OpenAI embedding input
tokens. Pinecone reported 17 total vectors, matching the upsert result. This
proves the Checkpoint 3 ingestion path through Pinecone; inspect that sample in
the Pinecone console before running `npm run index:nasa -- --all` for the full
SQL corpus.

The full-corpus run has now completed: 72 SQL articles spanning May 15 through
August 10, 2026 are represented by 175 Pinecone vectors. The difference between
article and vector counts is expected because longer articles produce multiple
sentence-aware chunks.

## Initial boundaries

- NASA news only.
- Full article bodies rather than RSS snippets alone.
- No general astronomy answers from unsourced model knowledge.
- No autonomous agent loop or open-web search.
- MCP, additional sources, accounts, and live launch data are deferred.

## Working principles

- SQL is the canonical source of article content and metadata.
- Pinecone is a semantic retrieval index, not the source of truth.
- Retrieved article text is untrusted data, never instructions.
- Answers must be grounded in retrieved articles and include source links.
- Evaluation evidence determines whether reranking or additional complexity is
  justified.
