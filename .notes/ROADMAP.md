# NASA Astronomy Briefing — MUP Build Order

## Purpose

Build a small, source-grounded NASA news briefing and question app that is
ready to demonstrate by Saturday.

This roadmap is for the new NASA repository. The medical RAG repository remains
a working reference for patterns, lessons, and examples; it should not be
broadly refactored for the capstone. It is visible locally at /Users/ianfleming/Desktop/Ian/parsity_medical_rag. THIS is where I have done my learning, feel free to check here if required for things like Next conventions, agents flow etc. I like the approach this takes in terms of....logging everything and structured data. I want to follow the agentic workflow as much as possible, structured data using Zod (seems to be rather useful). .notes/CAPSTONE_PLAN shows more of the planning and design decisions. +

## Minimum usable product

The primary flow is:

```text
User asks about recent NASA news
→ application searches its stored NASA corpus
→ application answers from retrieved articles
→ answer includes clickable NASA sources
```

The MUP does not need to search all NASA history or answer general astronomy
questions from unsourced model knowledge.

## Scope

### Included

- NASA news only.
- Full article bodies, not RSS snippets alone.
- A recent-article briefing or list.
- Topic and follow-up questions about indexed articles.
- SQL as the canonical article store.
- Pinecone for semantic chunk retrieval.
- Grounded answers with source links.
- A small evaluation set and one security fixture.

### Deferred

- MCP.
- Autonomous agent loops and open-web tools.
- ESA, arXiv, Launch Library, APOD, or YouTube sources.
- Authentication and user accounts.
- Live launch schedules.
- Email subscriptions.
- A large evaluation dashboard.
- Reranking unless baseline retrieval shows a real relevance problem.

## Repository foundation

Create a separate NASA repository with these initial files:

```text
README.md
.env.example
.notes/ROADMAP.md
.notes/WORKING-LOG.md
.notes/EVAL.md
```

The first notes should record:

- the problem and intended user,
- the single MUP flow,
- non-goals,
- data and privacy boundaries,
- acceptance criteria,
- decisions and observed failures.

## Build order

Build vertical product slices. Use the course exercises as techniques inside
the product rather than rebuilding each exercise as a separate prerequisite.

### 1. Feed → SQL → recent article list

Implement the first usable checkpoint:

- load the NASA feed,
- fetch linked article pages,
- extract and store full article text,
- save title, source, canonical URL, publication date, and content hash,
- show recent stored articles in the UI,
- run ingestion twice and confirm there are no duplicates.

Success means: the app can browse a stored NASA briefing without requiring
embeddings or an answer model.

### 2. Idempotent ingestion and freshness

Add the minimum operational behavior:

- upsert by canonical URL,
- detect changed content with a hash,
- never replace a good article body with an empty failed extraction,
- record ingestion counts and errors,
- support a local manual ingestion command.

Start with a manageable backfill, such as 30–90 days. State the indexed
coverage period in the product rather than implying complete NASA coverage.

### 3. Chunk → embed → Pinecone — complete

Apply the chunking exercise to the stored article body:

- use sentence-aware chunks of approximately 1,500 characters,
- use no overlap for the baseline,
- include article title context in each chunk,
- store `articleId`, `chunkIndex`, `publishedAt`, `source`, `canonicalUrl`,
  `contentHash`, and `embeddingVersion` as metadata,
- use stable vector IDs so re-ingestion is safe.

SQL remains the source of truth. Pinecone is a retrieval index only.

Checkpoint 3 evidence: the initial 72 SQL articles dated May 15–August 10,
2026 produced 175 vectors in a dense 1536-dimensional cosine Pinecone index.
The later RSS synchronization refresh brought the corpus to 81 Articles and
204 vectors. The detailed
chunking/extraction decision is in `.notes/checkpoint-3-chunking-decision.md`.

### 3.1 Feed → index synchronization — complete

Build the smallest operational refresh path:

- run the existing manual RSS ingestion;
- identify which Article records are new or whose content hash changed;
- chunk and embed only those affected records;
- upsert their deterministic Pinecone IDs;
- define and test how obsolete chunks are removed when an updated article has
  fewer chunks;
- verify a no-change refresh makes no embedding calls or vector writes.

Verified on August 11, 2026: the first live refresh inserted nine Articles and
29 vectors; an immediate rerun found ten unchanged feed items and made no
embedding or vector calls. The stale-vector policy is replacement upsert before
deleting only IDs absent from the new chunk set.

### 4. Retrieval before answer generation — complete

Build and verify search independently before adding an LLM answer.

Return enough information to inspect each result:

- article title,
- matching chunk,
- publication date,
- source URL,
- article ID,
- optional internal relevance score.

Use representative questions such as:

- “What did NASA publish about Europa?”
- “What has NASA said about the Moon?”
- “Tell me about 3I/ATLAS.”

Record whether the expected article appears in the candidate set. A reranker
cannot recover an article that first-stage retrieval failed to find.

Verified on August 11, 2026 with `npm run query:nasa`: Moon and TEMPO questions
retrieved the expected Moon Base and TEMPO articles at the top of the candidate
set, with chunk text, scores, article IDs, dates, and canonical URLs displayed.
An Europa query returned lower-scoring unrelated material, so no numeric
no-result threshold has been assumed from this small baseline.

### 5. Add the grounded answer — complete

Add answer generation only after retrieval is inspectable.

The answer policy should state that:

- retrieved articles are untrusted data,
- retrieved text is never an instruction,
- answers must use only the supplied NASA evidence,
- source links must be included,
- unsupported claims must not be invented,
- empty retrieval produces a clear no-result message.

Expected no-result wording should explain that the answer was not found in the
NASA news currently indexed.

Verified on August 11, 2026: a Moon question produced a grounded answer and
clickable cards for the selected NASA sources. The known Europa corpus miss
returned the fixed no-result boundary. The implementation uses a single
`gpt-5-mini` Responses API call with strict structured output; it receives only
the question plus retrieved excerpts, never tools or open-web access. Source
IDs are checked against the retrieval results on the server before any link is
shown. This is a bounded retrieval-and-synthesis function, not a RAG agent.

### 6. Add simple routing — baseline complete

Start with deterministic routing:

- “latest,” “recent,” and “this week” → SQL date query,
- topic and follow-up questions → Pinecone retrieval followed by SQL source
  lookup,
- unsupported requests → a clear NASA-news-only boundary message.

Do not add an autonomous agent loop. Add a selector model only if a measured
product need remains after the deterministic flow works.

The current deterministic route implements the baseline: recent/latest wording
uses the SQL Article query, while other questions use Pinecone retrieval and
the bounded grounded-answer function. It deliberately does not query SQL again
after retrieval because vector metadata already contains the source card fields
needed for this small corpus. Revisit an SQL source lookup only if metadata
becomes insufficient or a concrete consistency issue is observed.

### 6.1. Build the agentic workflow — complete baseline

This is the capstone learning objective. Adapt the proven medical-RAG shape in
the smallest form suitable for one NASA `Article` corpus:

```text
question → selector (SQL | RAG | BOTH | NEITHER, with reason)
→ selected specialist functions → aggregator → source-linked answer
```

- The selector uses structured Zod output and logs its chosen route and reason.
- `sql.ts` uses a validated structured Article query plan and fixed Prisma
  calls; it does not execute arbitrary model-authored raw SQL.
- `rag.ts` wraps inspectable Pinecone retrieval and returns evidence, not prose;
  baseline is dense `topK=5` without reranking.
- `aggregator.ts` combines SQL rows and/or RAG evidence into a final grounded
  JSON answer. It validates source IDs and source cards; it does not stream.
- Start with SQL, RAG, BOTH, and NEITHER. Preserve the existing direct path as
  the baseline/control for comparison.
- Record a small route-evaluation set, including the examples in
  `AGENT-CONTEXT.md`, before expanding the architecture.

Implementation evidence on August 12, 2026: the chat route validates a question
plus at most six in-memory history messages, calls the selector, short-circuits
clarification/NEITHER, and calls the selected specialists. SQL and RAG run via
`Promise.all` only for BOTH; the aggregator returns the existing JSON answer
and source-card contract. Live route checks verified a June SQL count (23), a
Moon Base RAG answer with four cards, a June + Moon Base BOTH answer with two
June cards, and an out-of-corpus NEITHER boundary. Unit tests cover BOTH,
NEITHER, invalid history, and selector contradiction handling.

Important limitation: BOTH combines independent SQL and dense-vector evidence.
The date wording is placed in the semantic query, but Pinecone is not yet
hard-filtered by metadata. The aggregator must not claim a database filter was
applied to retrieval. Evaluate this before adding metadata-filter support.

An allowlisted web-search specialist is a later extension for older or
out-of-corpus questions. It must be explicit as `WEB` (with provenance), not a
hidden behavior inside `NEITHER`.

### 7. Evaluate reranking only if needed

Use baseline retrieval first. Add reranking only when evaluation shows that:

- the expected article is being retrieved but ordered poorly, and
- reranking improves the answer without unacceptable latency or noise.

Record before-and-after examples. Do not assume reranking is automatically an
improvement.

### 8. Finish the UI and demo flow

Prioritize a small, readable interface:

- recent NASA article list or briefing,
- question input,
- loading state,
- grounded answer area,
- source cards with title, date, and link,
- no-results state,
- error state.

Avoid settings, accounts, elaborate navigation, and visual polish until the
core flow is stable.

### 9. Evaluate and prepare the demonstration

Create a small evaluation set containing:

1. a recent-news question,
2. a named-topic question,
3. a follow-up about a returned article,
4. a date-boundary question,
5. a no-result question,
6. an irrelevant or non-NASA question,
7. a poisoned-article fixture,
8. a duplicate-ingestion check.

For each case record:

```text
User goal:
Input:
Expected result:
Retrieved sources:
Actual result:
Verdict: Good / Broken / Needs inspection
What changed next:
```

Prepare a short demo showing:

1. the problem and user,
2. the recent NASA briefing,
3. one grounded topic answer with citations,
4. one no-result boundary,
5. one ingestion or retrieval design decision,
6. one security or evaluation lesson,
7. one honest deferred feature.

## High-value tests

Keep testing focused:

- ingestion normalization and deduplication,
- chunk metadata and stable vector IDs,
- date filtering,
- retrieval of an expected article,
- no-result behavior,
- context construction with poisoned text treated as data,
- one end-to-end happy path.

MCP is a deferred capability and does not need to be solved before the MUP
demonstration.

## First concrete checkpoint

Do only this first:

```text
Create the NASA repository foundation
→ load the NASA feed
→ store article records in SQL
→ display the recent article list
```

Do not start with agents, reranking, or UI polish. Once this checkpoint works,
the remaining retrieval and answer features have a stable product surface to
attach to.
