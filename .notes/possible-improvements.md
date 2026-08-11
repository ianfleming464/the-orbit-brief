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

- Prefer SQL for exact counts, date listings, and source listings.
- Use a Pinecone metadata filter when semantic RAG also needs a hard boundary,
  for example: “What did articles from June say about Moon Base?”
- Let the selector/SQL specialist produce a Zod-validated filter/query plan.
  Do not infer a date, publisher, or topic that the user did not state.
- Start with a single date-bound RAG experiment and compare filtered versus
  unfiltered retrieval before generalising the feature.
