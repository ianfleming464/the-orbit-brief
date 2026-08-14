# Presentation runbook

Use this as a five-minute prompt card. Do not read it word for word.

## 1. Open with the problem

“The Orbit Brief is a source-grounded space-news question app. I wanted to
learn the architecture behind a medical RAG app by building a smaller version
around NASA news, where every answer leads back to the source record.”

Show the home screen. Point out that it says it searches the current source
index, rather than claiming to search the whole web.

## 2. Show the data path

“NASA RSS gives me fresh items, but it could not provide the historical
backfill I needed. I used the official NASA archive for the initial 90 days.
The app stores canonical articles in Postgres, extracts clean body text, chunks
it on sentence boundaries, embeds each chunk with OpenAI, then stores the
vectors in Pinecone.”

The useful numbers are:

- 81 canonical articles
- 204 dense vectors
- May 15 to August 11, 2026
- `text-embedding-3-small`, 1536 dimensions, cosine similarity

“SQL is the source of truth. Pinecone is a derived semantic-search index.”

## 3. Explain the agent workflow

```text
question → selector → SQL and/or RAG → aggregator → validated answer + source cards
```

“The selector does not answer. It produces a Zod-validated decision: SQL,
RAG, both, or neither. SQL handles exact facts such as counts and latest
stories. RAG handles meaning-based questions. The aggregator sees only typed
evidence and returns JSON. The server validates source IDs before the UI
renders a link.”

Mention the terminal logs: selector means the routing decision; workflow is
the route controller; SQL is the safe fixed Prisma query plan; aggregator is
the final grounded answer step.

## 4. Run three questions

1. `How many articles are indexed from June?`
   SQL only. A count needs a database filter, not semantic similarity.
2. `What has NASA said about Moon Base?`
   RAG only. Show the answer and source cards.
3. `What did articles from June say about Moon Base?`
   Both. SQL finds June article IDs, RAG finds chunks, and the app keeps only
   chunks from those SQL-selected articles before aggregation.

Optional boundary test: `What is the capital of France?` shows a truthful
no-result rather than inventing an answer.

## 5. Name a real challenge and decision

“The June and Moon Base evaluation exposed an important limitation. Dense
retrieval found semantically relevant Moon Base material from May even though
the question said June. Reranking would only change the order of those results.
I needed a hard eligibility constraint. For the MVP, SQL supplies the allowed
article IDs and the application filters the RAG results before the model sees
them.”

“I skipped Pinecone metadata date filters because the current 204-vector corpus
does not justify reindexing numeric timestamps. The SQL-first constraint is
easy to inspect and test.”

## 6. Defend the deliberate omissions

- No streaming: the app returns validated JSON, so the answer and sources
  arrive together. Streaming needs an event protocol for partial text, stage
  state, sources, and errors. It would add demo risk without changing answer
  quality.
- No reranker: evaluation has not shown a case where the right source enters
  the candidate set but ranks too low. The June bug was a filtering problem.
- No web agent: the current corpus boundary stays explicit. A future web route
  needs an allowlist, provenance labels, prompt-injection handling, and a clear
  decision about whether discovered content enters the corpus.

## 7. Close with next versions

“The core vertical slice works. Next I would add a measured reranking test, an
allowlisted web fallback for corpus misses, a controlled ingestion trigger or
schedule, and streaming only after I define a structured event contract. I
also added LangSmith workflow tracing so I can inspect route choices, full
provider prompts and outputs, and evidence counts during evaluation.”

## Defence notes for questions

### Why this chunking strategy?

“I extract clean article body text, split it at sentence boundaries into chunks
of roughly 1,500 characters, prefix title context, and use no overlap. That
keeps passages readable, avoids chopping a sentence in half, and avoids paying
to embed repeated overlap. It is a practical baseline for this small news
corpus, not a claim that one chunk size suits every document type.”

### Why these models?

- `text-embedding-3-small` creates the 1,536-dimension dense vectors. It is a
  cost-conscious semantic-search baseline for the capstone.
- `gpt-5-mini` runs the selector and SQL planner. Those jobs require a concise,
  structured decision, not polished prose.
- `gpt-4o` runs the aggregator at temperature `0`. It produces the final
  grounded answer from supplied evidence with stable output settings.

### Why SQL as well as Pinecone?

“SQL is the canonical Article store. It gives exact counts, dates, latest-story
ordering, source filtering, canonical URLs, content hashes, and ingestion
state. Pinecone is a derived semantic-search index over article chunks.”

“I could have used Pinecone metadata and stable vector IDs for overwrites, as
Brian suggested. SQL is not strictly required for idempotency alone. It earns
its place because it also provides durable source records and exact structured
queries. The canonical URL and content hash identify whether an article is new
or changed; deterministic vector IDs make the derived Pinecone upserts safe.”

### Is SQL overkill for the public question flow?

“Possibly. Most realistic visitor questions are semantic: ‘What is new about
the Moon?’ or ‘Tell me about TEMPO.’ RAG plus explicit date/source metadata
filters could handle much of that public experience. SQL still gives me the
canonical ingestion store, content hashes, source records, refresh state, and
exact queries when they matter.”

“The selector demonstrates structured retrieval beside semantic retrieval,
which was part of the capstone learning goal. If real user behaviour showed
that nearly every query was semantic, I would keep SQL for ingestion and
administration but simplify the runtime path toward RAG with explicit metadata
filters.”

### Why dense retrieval for this small corpus?

- “This is a small, single-source corpus. Dense retrieval gives the most useful
  first capability: visitors can ask naturally phrased topic questions without
  knowing NASA’s exact wording.”
- “The expected questions are conceptual, such as ‘What is new about Europa?’
  or ‘Tell me about air-quality missions,’ rather than exact keyword searches.”
- “Dense vectors cope with paraphrase and related language. ‘Pollution from
  orbit’ can still retrieve TEMPO content.”
- “Sparse or hybrid retrieval would add another system to tune, evaluate,
  explain, and pay for. I would add it only if evaluation showed dense search
  missing important acronyms, mission names, or exact phrases.”
- “With 204 vectors, dense top-K retrieval is fast, inspectable, and easy to
  evaluate manually.”

### Small-corpus defence for the SQL specialist

- “SQL remains valuable behind the scenes for ingestion, canonical URLs,
  content hashes, dates, and source records.”
- “The SQL specialist may be more public-runtime architecture than this small
  app needs. It remains useful in the capstone because it demonstrates the
  difference between structured constraints and semantic meaning.”
- “The June evaluation gave it a practical purpose: dense retrieval did not
  enforce the date boundary, while SQL supplied a small, testable eligibility
  set before aggregation.”

### Why not make every piece a tool call?

“The current selector chooses typed SQL and RAG functions, so it already makes
an explicit routing decision. OpenAI tool calling could make that orchestration
more formal later, but it would be a refactor rather than a missing product
capability. I kept the first learning version inspectable.”

### Why no reranker?

“A reranker only reorders candidates that retrieval already found. TEMPO did
not show a ranking failure. The June and Moon Base issue was a hard date
constraint problem: relevant May chunks arrived because dense retrieval does
not enforce dates. SQL eligibility filtering solved the right problem.”

## Next-version sequence

1. Add an operator-controlled feed refresh, then schedule it nightly. Show
   users when the index last refreshed; do not let public users start costly,
   concurrent ingestion runs.
2. Add LangSmith feedback controls such as useful / not useful on each answer.
   Pass the trace ID to a server feedback endpoint, keep the API key private,
   and use the feedback to compare weak routes or retrievals. LangSmith can
   attach feedback to a root trace or a child stage.
3. Run a measured reranking experiment only if an evaluation proves that the
   expected source enters the candidate set but ranks too low.
4. Extend the corpus to ESA through a source adapter. Preserve publisher,
   canonical URL, source-specific identity, and provenance on every article
   and chunk. SQL source filtering then becomes more useful.
5. Add an explicit allowlisted web-search route for corpus misses. Label its
   output `web_discovery`, protect against prompt injection, and decide whether
   approved discoveries should enter the indexed corpus.

## Before you present

```bash
npm run dev
npm test -- --run
npm run lint
```

Open the app once and run the three questions above. Keep the terminal visible
for one route log. If you enable LangSmith, set these local `.env` variables and
run one request before class:

```bash
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_key_here
LANGSMITH_PROJECT=the-orbit-brief
```
