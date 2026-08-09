# NASA Astronomy Briefing — Working Plan

## Product boundary

Build a small, source-grounded briefing app for **NASA news only**. A user can ask what NASA published recently or ask a follow-up about a NASA story. The app responds from stored NASA article content and links back to the source.

This is a minimum usable product, not a general astronomy assistant. It does not promise answers outside the ingested NASA corpus.

## The first usable slice

- Ingest NASA news feed entries on a schedule.
- Fetch each linked article page and extract the **full article body**; the RSS entry is only a discovery signal.
- Store the canonical article in SQL.
- Show a recent-articles briefing and support a small chat box for corpus-grounded questions.
- Cite the NASA article(s) used for each answer.

Example supported questions:

- “What did NASA publish this week?”
- “Summarise the latest story about Europa.”
- “Tell me more about this article.”

## Honest non-goals

- No ESA, arXiv, Launch Library, APOD, or YouTube in the first build.
- No live launch schedule or real-time space-event claims.
- No autonomous agent or open-web search.
- No authentication unless it becomes necessary for deployment.
- No claim that every answer has a primary paper.

## Data model and retrieval roles

SQL is the source of truth. One `articles` record holds the source, canonical URL, title, publication time, full extracted text, extraction status, and a content hash. Related chunk records retain chunk order and the vector ID used for indexing.

Pinecone is a retrieval index only. It stores embeddings for article chunks plus enough metadata to return the SQL record and apply simple source/date filters. It is not the canonical content database.

## Rules-first request routing

Use predictable routing before asking a model to decide:

1. Questions about recent/latest/this week → SQL date query, then summarise those article records.
2. Questions about a named topic or a follow-up → Pinecone semantic retrieval, then load the matching canonical articles from SQL.
3. Unsupported questions → say that the current corpus covers NASA news only.

This keeps date filtering and source attribution deterministic, while embeddings are used for semantic discovery.

## Ingestion and freshness

A scheduled job reads the NASA RSS feed, normalises each item, and upserts by canonical URL. For new or changed items it fetches the article page, extracts the full body, computes a content hash, saves the SQL record, chunks the text, and upserts the corresponding vectors. Failures are recorded for retry; a failed page must never replace a previously good article body.

Start with one scheduled run per day. Manual “run ingestion now” is useful during development. A nightly job is sufficient for the stated product promise; it is not marketed as real time.

## Chunking and metadata

Start simple: split cleaned article body into overlapping chunks at paragraph boundaries where possible. Preserve the title and source context in each embedding input. Tune chunk size only after testing retrieval on real questions.

Per-chunk metadata: `article_id`, `chunk_index`, `source`, `published_at`, `canonical_url`, `content_hash`, and `embedding_version`.

## Quality checks

Keep a small, hand-written set of questions with expected supporting articles. Check that ingestion avoids duplicates, a date query returns the intended period, semantic retrieval finds the expected story, and the final answer cites only retrieved NASA articles. Log ingestion counts/errors and retrieval IDs; avoid logging user question content by default.

## Later phases — only after the slice works

1. Add ESA as a second source using the same canonical SQL model.
2. Add Launch Library as a separate structured, time-sensitive data path—not semantic news retrieval.
3. Add optional arXiv links only where a reliable relationship can be established.
4. Consider APOD or YouTube transcripts after their rights, extraction, and retrieval behavior are understood.

## Decisions still open

- The specific NASA news feed and article extractor will be confirmed in the spike.
- The SQL provider and deployment scheduler will be chosen for the simplest hosted setup.
- Embedding model choice follows a small relevance/cost test, not an assumption.

## Source basis

- Brian’s template asks for data, freshness, chunking/metadata, vector-store, workflow, and evaluation choices; this plan keeps those decisions intentionally high level.
- Cohort notes: “minimum usable product,” “start with the data,” and data freshness/ingestion are the organising constraints.
