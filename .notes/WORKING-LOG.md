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

## 2026-08-10 — Checkpoint 3 approved plan

Approved implementation sequence:

1. Investigate whether an official NASA archive/API can provide the intended
   historical backfill. Do not add broader web sources at this stage.
2. Build and test local sentence-aware chunking before paid embedding calls.
3. Add dense OpenAI embeddings and a dedicated Pinecone index with controlled
   batch indexing and deterministic IDs.
4. Inspect vector counts and metadata, then record the Checkpoint 3 evidence.

Checkpoint 3 stops before semantic query evaluation, selectors, SQL/RAG agents,
web fallback, aggregation, or answer generation.

### Approved chunking rules

- Keep each article separate; never cross article boundaries.
- Accumulate complete sentences up to approximately 1,500 characters.
- Split an unusually long individual sentence only at word boundaries.
- Include article title context in the embedding text.
- Use no overlap initially to avoid duplicate vectors and cost.
- Use dense `text-embedding-3-small` vectors at 1536 dimensions.
- Preserve article ID, chunk index, title, source, canonical URL,
  publication date, content hash, and embedding version as metadata.
- Use deterministic IDs such as `nasa:<articleId>:<chunkIndex>`.

SQL remains canonical for Article records and Pinecone remains a derived index.
The current stored bodies have flattened whitespace, so sentence boundaries are
the reliable structure; paragraph restoration is deferred.

## 2026-08-10 — Backfill viability investigation

- The configured `NASA_RSS_URL` currently exposes only 10 distinct items, with
  a live date range of August 7–10, 2026. The existing SQL corpus contains 10
  records spanning August 6–8, so `BACKFILL_DAYS=180` cannot create a 180-day
  corpus from the RSS endpoint alone.
- NASA provides an official `2026 NASA News Releases` archive page and a
  paginated `news-release/page/N/` listing. The archive contains dated releases
  from July and earlier, demonstrating a plausible official historical source
  for the intended backfill.
- Decision: investigate the archive pagination and article-link extraction as
  the next implementation increment before embedding. Do not add broader web
  sources. If the archive proves stable, extend the existing NASA ingestion
  adapter; otherwise retain the current 10-item corpus as a technical fixture
  and document the coverage limitation.

## 2026-08-10 — Archive discovery increment complete

- Added a read-only NASA archive discovery path using official paginated
  `/news-release/page/N/` listings. It accepts only canonical NASA news-release
  URLs, then reads each article title and publication date from the article page.
- The existing RSS ingestion path remains unchanged and is still the freshness
  source. Archive discovery is intentionally a dry-run command until its live
  output is reviewed; it does not write SQL records.
- Fixture tests cover archive-navigation exclusion, article publication-date
  parsing, and backfill-window filtering. The initial live run remains pending
  because this environment cannot resolve NASA from local shell commands.

## 2026-08-10 — Local chunking increment complete

- Added the approved pure sentence-aware chunker: it keeps Article boundaries,
  packs complete sentences to an approximately 1,500-character limit, splits
  exceptional long sentences at word boundaries, includes title context for
  embeddings, and uses no overlap.
- Added deterministic IDs (`nasa:<articleId>:<chunkIndex>`) and preserves
  article provenance, content hash, and embedding version per chunk.
- Added `.notes/checkpoint-3-chunking-decision.md` so the implementation HOW,
  WHY, alternatives, and Parsity precedent are easy to find for future agents
  and the capstone presentation.
- Local tests cover sentence packing, long-sentence fallback, no-overlap,
  deterministic metadata, and flattened-whitespace handling.

## 2026-08-10 — Pre-index record contract complete

- Added `npm run inspect:nasa-chunks` to display an Article before chunking and
  the resulting chunk boundaries, embedding context, IDs, and metadata after
  chunking. It is read-only and useful for explaining the decision in a demo.
- Added `npm run prepare:nasa-index`, a read-only dry run that builds the exact
  records intended for Pinecone: deterministic ID, title-prefixed embedding
  text, and inspectable metadata including the chunk text.
- Decision: retain chunk text in vector metadata. SQL remains canonical, but
  retrieval results can later show the exact matched evidence and citation
  without hidden reconstruction. The storage trade-off is acceptable for this
  small, bounded corpus.
- `.env.example` now declares the server-only OpenAI and Pinecone variables.
  No index was created and no embeddings or vectors were written. SDK
  installation remains pending because this environment cannot resolve the npm
  registry; do not hand-edit the lockfile to work around that.
- Verified lint, TypeScript, production build, and 21 unit tests.

## 2026-08-10 — Checkpoint 3 handover

- Wrote `.notes/next-session-prompt.md` as the next-session handover. It records
  the stopping point (before Pinecone index creation), the approved chunking and
  SQL decisions, the available inspection commands, setup values needed, and the
  narrow next vector-write task.
