# Product and Learning Backlog

These are deliberate later investigations, not requirements for the first
selector → SQL/RAG → aggregator increment.

## Agent-work UX: progress and errors

- Show an accessible “Thinking…” state and small progress animation immediately
  after a question is submitted.
- After the agent workflow exists, expose only truthful stage labels such as
  “Choosing an approach,” “Searching indexed sources,” and “Combining evidence.”
- Replace progress with a clear retry/error state for database, vector-index,
  provider, or aggregation failures. Never expose prompts, chain-of-thought, or
  raw provider errors.

The first workflow version should keep its complete JSON response and use a
simple loading indicator. It can simulate a progressive text reveal only as
visual polish after the full answer arrives; that is not true streaming and
does not reduce perceived wait-to-first-result. A later streaming checkpoint
should use structured stream events/SSE for text, stage changes, sources, and
completion. Response headers are only suitable for small metadata known before
the stream starts.

## LangSmith observability and evaluation

The MVP now has optional LangSmith tracing around each chat workflow. When
`LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`, and optionally
`LANGSMITH_PROJECT` are set, it records summary selector, SQL/RAG, and
aggregator stages plus full nested OpenAI requests and responses. That includes
questions, history, prompts, retrieval excerpts, and answer text, so keep the
project private and choose a retention policy before public deployment.

Use it first as an evaluation aid: compare selector route, SQL plan, retrieved
match count, hybrid retention count in terminal logs, and final source count.
Only create a LangSmith dataset after the manual evaluation questions and
expected outcomes are stable. This avoids treating a changing prompt set as a
benchmark.

## User journey map

Document and test these core journeys before broad UI polish:

1. **Briefing reader** — scans recent indexed stories and opens sources.
2. **Topic investigator** — asks a semantic question and follows citations.
3. **Exact-information seeker** — asks date, count, source, or coverage
   questions handled by SQL.
4. **Combined questioner** — needs an exact constraint plus article meaning.
5. **Corpus miss** — receives a truthful no-result; future `WEB` may help.
6. **Operational failure** — receives an actionable error/retry state.

## Reranking experiment

Reranking is worth trying for learning, but not as an assumed improvement.
Record baseline ranks for a compact evaluation set first. Compare a reranker
only when the expected article is already in the Pinecone candidate set but is
poorly ordered. It cannot recover an article that first-stage retrieval missed.
Keep before/after source ranks, answer quality, latency, and cost in
`.notes/EVAL.md`, then write a decision note whether the experiment is kept or
rejected.

## Metadata hard filtering

Metadata is useful for explicit constraints that semantic similarity must not
guess. The relevant current fields are `publishedAt`, `source`, and `articleId`;
future web results will also need provenance/source-type metadata.

### Decision after the first agent evaluation: defer until after the demo

The current BOTH flow is correct without a Pinecone filter: SQL identifies the
eligible Article IDs, RAG retrieves 20 candidates, and the app retains only the
first five chunks belonging to those Articles. This is deterministic,
inspectable, tested, and adequate for the 204-vector MVP corpus.

Pinecone supports metadata filters, including string `$in` for the existing
`articleId` field. That means an ID-set filter could move the current constraint
into the vector query without a reindex. It could reduce irrelevant candidates
and become more valuable as the corpus grows. It does not add semantic quality;
it only enforces eligibility earlier.

Direct date-range filtering is more work. The current `publishedAt` metadata is
an ISO string; Pinecone range operators require numeric values. It would require
adding an explicit numeric publication timestamp to every chunk, re-upserting
the whole index, extending the typed retrieval-filter contract, and adding
integration tests. That is a reasonable future experiment, not a Thursday MVP
change.

Adopt a Pinecone filter only when one of these is true:

- the SQL eligible set commonly exceeds the 20 retrieved candidates;
- post-retrieval filtering causes demonstrable latency/cost problems;
- the corpus is large enough that reduced candidate retrieval materially helps;
- a measured evaluation shows a date/source constrained query still lacks
  enough eligible evidence.

Keep SQL for exact counts, date listings, and source listings. Any future
filter must come from an explicit user constraint represented in the validated
SQL/selector plan; never infer dates, publishers, or topics.
