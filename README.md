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
