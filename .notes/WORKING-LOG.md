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

## 2026-08-11 — Archive discovery dry run

- Ran `npm run discover:nasa-archive -- --pages 20` without SQL writes. It read
  two archive pages and found 20 canonical NASA news-release links.
- The current publication-date parser accepted one July 29 item and rejected 19
  articles as missing a valid date. Archive link discovery is viable, but the
  article-date extraction is not yet robust enough for a backfill.
- Decision: do not write archive records or begin archive chunking. Inspect a
  failed article's actual date markup, add a targeted parser fallback, and rerun
  this dry run before deciding whether to ingest the 90-day archive corpus.

## 2026-08-11 — Archive date-parser correction

- Investigation of a rejected official NASA release showed its publication date
  is rendered as a human-readable value such as `Aug 10, 2026` inside
  `article .article-meta-item .heading-12.text-uppercase`, rather than in
  JSON-LD, OpenGraph metadata, or a `time[datetime]` element.
- Added that template-specific fallback after the structured date sources. It
  accepts only a parseable value within the article metadata area, so labels
  such as `RELEASE` and release numbers are ignored; it does not scan arbitrary
  page text for dates.
- NASA's displayed day-only dates are parsed explicitly as UTC. This avoids a
  local-timezone shift changing a date at the 90-day cutoff; timestamp-bearing
  structured metadata continues to use its supplied timezone information.
- Added a fixture test for this markup. The archive discovery command remains
  read-only; rerun it next to validate the 90-day candidate volume before any
  SQL ingestion or vector work.

## 2026-08-11 — 90-day archive backfill validated

- Ran `BACKFILL_DAYS=90 npm run discover:nasa-archive -- --pages 10` without
  changing the saved environment or writing SQL. It read eight archive pages,
  found 62 official NASA releases from May 15 through August 10, and reported
  zero failures.
- The official archive is therefore viable for the intended 90-day corpus.
  This validates discovery only: the candidate pages have not yet had their
  article bodies extracted, been upserted into SQL, chunked, embedded, or sent
  to Pinecone.
- Next recommendation: add one small archive backfill ingestion command that
  reuses the existing article-body extractor and SQL URL/content-hash
  idempotency. Keep it explicitly manual and inspect its dry-run/result before
  starting Pinecone work.

## 2026-08-11 — Archive backfill command implemented

- Added `npm run ingest:nasa-archive`, an explicit manual command that discovers
  official archive candidates in the configured window, extracts each full
  article body, and writes them through the existing SQL Article upsert path.
- Refactored the RSS storage loop into `ingestArticleItems`, which both RSS and
  archive ingestion now use. Canonical URL and content hash remain the single
  idempotency mechanism; no archive-only table, IDs, or duplicate persistence
  model was introduced.
- The command reports discovery and ingestion results separately and exits
  non-zero if discovery or body extraction has failures. It has not been run
  against the database in this increment. Use the documented `BACKFILL_DAYS=90`
  command only after reviewing the read-only discovery result.

## 2026-08-11 — Initial archive backfill completed

- Ran `BACKFILL_DAYS=90 npm run ingest:nasa-archive -- --pages 10`. The command
  read eight official archive pages, discovered 62 releases, and inserted all
  62 full article records into SQL with zero discovery or extraction failures.
  No Pinecone or OpenAI calls were made.
- A read-only chunk inspection confirmed the new data participates in the
  approved sentence-aware chunking path. The current Readability extraction
  includes some NASA CMS chrome (byline/release metadata at the start and
  footer text at the end) in the stored body. This does not invalidate the
  archive backfill, but it is a real retrieval-quality concern before vectors
  are generated.
- Recommendation: inspect and tighten the NASA article-body extraction in one
  small, testable increment before embedding this corpus. Do not silently
  change chunking rules to compensate for source-page chrome.

## 2026-08-11 — Extraction-quality decision

- Live NASA release markup has a stable published-body boundary at
  `article .usa-article-content .entry-content`; the previous generic
  Readability-only extraction included surrounding article metadata and footer
  details in its text.
- Decision: prefer that NASA-specific body selector when it contains
  substantive text, with Readability retained as a fallback for pages using a
  different structure. This is a small, source-bound adapter rather than a
  new ingestion abstraction.
- Editorial content inside the published body (for example image credits or
  press contacts) remains intact. The objective is to remove page chrome, not
  perform lossy editorial rewriting. Re-run the idempotent archive backfill
  after verification so the changed content hashes refresh the stored records.

## 2026-08-11 — Archive body refresh completed

- Verified the NASA body-selector extraction with focused unit tests, then ran
  the 90-day archive command again. It discovered 62 releases and updated all
  62 existing SQL records in place, with zero failures and no duplicate rows.
- Read-only chunk inspection confirms that byline/release metadata and the
  Share/Details footer no longer enter chunk text. An image credit and published
  editorial/contact text remain by design; they are inside the article body and
  are materially less harmful than the removed page chrome.
- Updated the Checkpoint 3 chunking decision note to make the extraction
  boundary explicit. The corpus is now ready for Pinecone configuration and
  the later controlled embedding/upsert increment; no vectors have been made.

## 2026-08-11 — Controlled vector writer prepared

- Installed the official OpenAI and Pinecone SDKs and added `npm run index:nasa`.
  It is a CLI-only, bounded writer: `--limit 10` is the default and `--all` is
  explicit for the full corpus.
- Before any OpenAI embedding call, the writer verifies that the manually
  created Pinecone index is dense, 1536-dimensional, and cosine-based. It then
  embeds title-prefixed chunks with `text-embedding-3-small`, validates every
  returned vector dimension, and upserts the existing deterministic IDs in
  batches of 25.
- Deterministic IDs make same-content reruns overwrite safely. A future content
  revision that reduces an article's chunk count needs a deliberate stale-vector
  cleanup/reindex operation; it is not added here because this first index is
  empty and the cleanup would be destructive complexity without MVP evidence.
- No API keys or Pinecone index are configured in this workspace yet, so no
  embeddings or vectors have been created.

## 2026-08-11 — First Pinecone write verified

- With the manually created `nasa-news` index and local server-only keys in
  place, ran `npm run index:nasa -- --limit 10`. The writer verified the index
  contract, embedded the ten most recent SQL articles with
  `text-embedding-3-small`, and upserted 17 dense vectors.
- OpenAI reported 3,963 input tokens. Pinecone reported a total vector count of
  17, matching the writer's upsert count. This is the first paid/external write
  for Checkpoint 3 and confirms the corpus → chunk → embed → Pinecone path.
- Decision: stop after this bounded sample for review. Do not index the full
  corpus or begin retrieval/answer generation until the sample is inspected and
  approved.

## 2026-08-11 — Full Checkpoint 3 corpus indexed

- After sample inspection, the full writer run upserted 175 Pinecone records.
  Read-only verification confirms 72 SQL Article records spanning May 15 to
  August 10, 2026 and a Pinecone total vector count of 175.
- This represents the validated 90-day official archive backfill (62 archive
  releases) plus 10 distinct RSS-origin records already in the SQL corpus.
  The 175 vectors are expected to exceed the 72 articles because the approved
  sentence-aware chunker emits multiple chunks for longer bodies.
- Checkpoint 3's ingestion/indexing vertical slice is complete. Retrieval
  quality evaluation and any answer-generation work remain a later, separate
  checkpoint.

## 2026-08-11 — Checkpoint 3 pause / next-session direction

- Checkpoint 3 is complete and committed as `0311f5f` (`feat: index NASA
  backfill in Pinecone`). The canonical SQL corpus has 72 Articles and the
  derived Pinecone index has 175 vectors; the 10-article sample was manually
  inspected for clean sentence boundaries and metadata.
- Next increment: design and implement manual RSS feed-to-index synchronization.
  It must update only new or changed Article records, avoid embeddings on an
  unchanged refresh, and explicitly handle stale chunks after a shortened
  article update. Start by inspecting the existing RSS ingestion and index
  writer; do not assume a new table or agent is necessary.
- Later, after synchronization is understood, build inspectable semantic
  retrieval before answer generation. Agentic selector/RAG/SQL/aggregation and
  web fallback remain future architecture, not the immediate next task.

## 2026-08-11 — Documentation consolidation

- Added `.notes/PROJECT-STATUS.md` as the single short current-state page:
  completed checkpoints, verified corpus/index counts, MVP decisions, immediate
  next objective, and a map to deeper documents.
- Decision: use Project Status first for orientation, Roadmap for intended
  sequence, Working Log for evidence/history, and focused decision notes for
  rationale. This reduces the need to reconstruct state from scattered files.

## 2026-08-11 — Checkpoint 3.1 RSS-to-index synchronization complete

- Added `npm run sync:nasa-feed`, a single explicit manual refresh path. RSS
  ingestion returns the changed Article records in memory; only those records
  are chunked, embedded, and upserted to Pinecone.
- For updates, the sync lists the deterministic vector-ID prefix, upserts all
  replacement chunks, then deletes only IDs no longer produced. This preserves
  the previous vectors if embedding/upsert fails before replacement completes.
- Live verification: the first run discovered ten feed items, inserted nine
  SQL Articles, and upserted 29 vectors using 7,786 embedding tokens. An
  immediate rerun found ten unchanged items and returned `vectorSync: null`,
  confirming no OpenAI/Pinecone work on an unchanged refresh.
- Next checkpoint: build an inspectable semantic retrieval CLI. Do not add
  answer generation or agentic orchestration yet.

## 2026-08-11 — Checkpoint 4 semantic retrieval complete

- Added `npm run query:nasa -- --question "..." --top-k 5`. It embeds one
  question, queries Pinecone, and prints each candidate's similarity score,
  chunk text, article ID, title, publication date, and canonical source URL.
- Live baseline checks: Moon and TEMPO questions returned the expected related
  articles at the top of the result set. A likely corpus miss (Europa) returned
  lower-scoring unrelated material, so a no-result score threshold is deferred
  until a small evaluation set provides evidence for one.
- Retrieval is deliberately a CLI inspection path only. Next is a bounded,
  source-linked answer-generation slice; selector, SQL/RAG agents, aggregation,
  and web fallback remain deferred.

## 2026-08-11 — Checkpoint 5 grounded answer complete

- Added one shared `retrieveNasa` service so the existing inspection CLI and
  chat route execute the same dense Pinecone retrieval path. This is a small
  code-boundary refactor, not a new worker or retrieval agent.
- Topic questions now retrieve five candidates and make one `gpt-5-mini`
  Responses API call. Its strict structured result contains an answer,
  an evidence-sufficiency decision, and source IDs. The model receives only the
  question and retrieved excerpts; no tools, SQL access, web access, or agent
  loop are available to it.
- Retrieved excerpts are explicitly marked as untrusted reference data, never
  instructions. The server permits only source IDs that match the retrieved
  records, deduplicates matching chunks into canonical NASA source cards, and
  returns a fixed no-result message if evidence is insufficient, empty, or
  uncited.
- Live verification: “What has NASA said about the Moon?” returned a grounded
  answer with four NASA Moon Base sources. “What has NASA said about Europa?”
  returned the no-result boundary, despite Pinecone having lower-scoring
  unrelated candidates. This demonstrates the intended baseline behavior, not
  a claim that first-stage retrieval has perfect no-result detection.
- Added unit coverage for untrusted-evidence labelling, source-ID validation
  and de-duplication, and no-result conversion. Full verification passed:
  33 unit tests, ESLint, and production build.
- Decision: retain this single retrieval-and-synthesis path for the MVP. Do not
  introduce a selector, SQL/RAG worker split, aggregator, web fallback,
  hybrid/sparse index, or reranker until a small evaluation set identifies a
  measured need.

## 2026-08-11 — Agentic architecture direction approved

- Clarified the product goal: the selector → SQL/RAG → aggregator architecture
  is the point of the capstone and learning exercise. The direct grounded-RAG
  route is now the useful working control condition, not the final destination.
- Agreed first workflow scope: a structured selector chooses `SQL`, `RAG`,
  `BOTH`, or `NEITHER` and records a concise reason; selected specialists run;
  an aggregator returns the final grounded, source-linked answer.
- Decision: keep the SQL specialist constrained to a validated structured
  Article query plan executed with Prisma. This keeps the agent boundary and
  learning value without adding unsafe arbitrary text-to-SQL execution to a
  one-table MVP.
- Decision: defer web search until the core agent workflow works. Older or
  out-of-corpus questions can later use an explicit `WEB` route/fallback with
  trusted-domain provenance, never a silent answer under `NEITHER`.
