# The Orbit Brief — Working Log

## 2026-08-09 — Repository foundation

- Created a clean capstone repository shell separate from the medical RAG app.
- Copied the NASA capstone planning materials into `.notes/CAPSTONE_PLAN/`.
- Established the first checkpoint: NASA feed → SQL article records → recent
  article list.
- Deferred MCP, autonomous agents, additional sources, and reranking unless
  evaluation justifies them.

## 2026-08-09 — Checkpoint 1 implementation

- Inspected `/Users/ianfleming/Desktop/nasa-spike`; it uses `rss-parser` with
  `https://www.nasa.gov/news-release/feed` and reads title, publication date,
  link, and snippet fields.
- A live feed check returned 10 mixed NASA Science, image-article,
  photojournal, and mission/education items. The endpoint's 90-day historical
  retention is not yet confirmed, so `BACKFILL_DAYS` is configurable.
- Checkpoint 1 stores complete article records in hosted PostgreSQL through
  Prisma. Chunk metadata is intentionally deferred until article text is
  inspected for the later Pinecone checkpoint.
- Hosted database migration completed successfully. The first ingestion stored
  10 articles with 0 failures; the second stored 0 new articles and reported
  all 10 as unchanged, confirming URL/hash idempotency.
- The manual scripts explicitly load `.env` with `dotenv`; their async entry
  points use `main()` because the repository runs TypeScript scripts as
  CommonJS through `tsx`.

## 2026-08-09 — Product interaction direction

- `.env.local` is not required for this repository. Keep one ignored root
  `.env` because Prisma CLI and Next.js both load it; remove the duplicate
  `.env.local` after confirming its values are copied.
- The current recent-article page is a data-foundation view, not the final MUP
  experience. The intended product is a chat-first NASA briefing app with a
  question input and four or five deterministic starter prompts.
- The first starter prompt should be “Show me the latest NASA news.” It should
  query stored SQL records and return source-linked articles. A separate
  refresh/ingestion action may update the corpus; asking a question should not
  silently trigger a slow external feed crawl.
- This preserves the agentic-chat direction while keeping the first working
  route rules-first and inspectable. Topic retrieval, embeddings, and agent
  orchestration remain later slices.

## 2026-08-10 — Checkpoint 2 implementation

- Added a chat-first client shell with five starter prompts and a question input.
- Recent/latest wording is classified deterministically and queries the five
  newest SQL Article records; the response includes clickable NASA source cards.
- Unsupported topic questions remain explicitly bounded until semantic
  retrieval exists. Asking a question never triggers ingestion; the manual
  `npm run ingest:nasa` command remains the separate refresh operation.
- Added explicit loading, empty, invalid, unsupported, and database-error
  states, plus unit coverage for routing, validation, and deterministic copy.

## 2026-08-10 — Follow-up UX notes

- The current corpus contains the latest 10 articles from the last manual
  ingestion; the chat query does not automatically refresh NASA data. User-facing
  wording should continue to distinguish “latest indexed” from live/current news.
- Future freshness UX is undecided: consider whether showing the most recent
  indexed articles by default is useful, or whether the app should make the
  indexed coverage and refresh action more prominent first.
- Starter prompts currently overlap in meaning. Revisit them later with more
  distinct user intents once topic retrieval and broader question support exist.

## 2026-08-10 — Capstone architecture clarification

- The deterministic recent-news route is early scaffolding. The intended
  capstone workflow follows the Parsity medical RAG pattern: a structured
  selector chooses SQL, RAG, BOTH, or NEITHER; SQL and RAG workers can run in
  parallel; an aggregator returns the grounded, source-linked answer.
- SQL remains the canonical store for exact date/source queries, article
  metadata, URL/content-hash idempotency, ingestion tracking, and source lookup.
- Recorded Brian Jenney's web-search fallback feedback in `.notes/AGENT-CONTEXT.md`:
  consider an allowlisted web-discovery path for corpus misses later, with
  explicit provenance such as `nasa_official` versus `web_discovery` and a
  separate retrieval-method field.
