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

## First checkpoint

```text
NASA feed → SQL article records → recent article list
```

The complete build order is in [.notes/ROADMAP.md](.notes/ROADMAP.md).
The intended selector/SQL/RAG/aggregator architecture and future web-search
fallback are recorded in [.notes/AGENT-CONTEXT.md](.notes/AGENT-CONTEXT.md).

The first implementation uses a hosted PostgreSQL database through Prisma. Set
`DATABASE_URL`, then run the manual ingestion command to populate the SQL
corpus. `BACKFILL_DAYS` controls the feed window and `RETENTION_DAYS` controls
the optional cleanup command. The current NASA feed may not expose 90 days of
history; that coverage limitation is recorded as an ingestion risk until the
archive source is confirmed.

Chunking, embeddings, Pinecone, chat, and agent workflows begin only after the
stored article text has been inspected in a later checkpoint.

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
Pinecone, agents, and answer generation are intentionally deferred.

The chat never runs ingestion. To refresh the stored corpus during development,
run `npm run ingest:nasa` separately. An empty database, unsupported question,
loading request, and database failure each have an explicit user-facing state.

### Checkpoint 3 development

The RSS feed is a current-items source, not a historical backfill. Use the
official NASA news-release archive discovery command to inspect the available
historical window before it is written to the SQL corpus:

```bash
npm run discover:nasa-archive -- --pages 20
```

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
