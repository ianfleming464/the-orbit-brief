# The Orbit Brief — Project Status

**Last updated:** 2026-08-12
**Use this page first** for the current project state. Use the working log for
the supporting chronology and evidence.

## Product in one sentence

A source-grounded NASA briefing app that helps people discover recent space
news and investigate topics using an indexed, trusted NASA corpus.

## Current state

| Area | Status |
| --- | --- |
| Checkpoint 1: RSS/archive → SQL Article corpus | Complete |
| Checkpoint 2: deterministic recent-news chat shell | Complete |
| Checkpoint 3: clean extraction → chunks → OpenAI → Pinecone | Complete |
| Checkpoint 3.1: RSS feed-to-index synchronization | Complete |
| Checkpoint 4: inspectable semantic retrieval | Complete |
| Checkpoint 5: grounded generated answers | Complete |
| Selector / SQL-RAG / aggregator modules | Complete and chat-integrated |
| Chat-route agent orchestration | Complete baseline; manual evaluation next |
| Allowlisted web-search fallback | Deferred until core workflow works |

## Verified corpus and index

- **81** canonical SQL `Article` records.
- **204** dense Pinecone vectors.
- Coverage: **May 15–August 11, 2026**.
- Sources: **62** official NASA news-release archive items plus **10** distinct
  RSS-origin items.
- Embeddings: `text-embedding-3-small`, **1536** dimensions, cosine similarity.

The article count and vector count intentionally differ: longer Articles produce
multiple sentence-aware chunks.

## Current app capability

- Each request is validated, then the selector chooses `SQL`, `RAG`, `BOTH`,
  or `NEITHER`. Selected specialists return typed evidence; the JSON aggregator
  returns the answer and only server-validated source cards.
- The browser retains at most six in-memory user/assistant messages for
  follow-ups. This context is not persisted as a transcript.
- `BOTH` runs SQL and RAG concurrently. They are independent evidence sets:
  the aggregator must not claim an SQL constraint was applied to Pinecone
  retrieval. Hard vector metadata filters remain deferred.
- Terminal logs show the selector plan, SQL plan, RAG result summary, and
  aggregator source IDs, without raw article excerpts or secrets.
- Asking a question never triggers ingestion; refresh is currently manual.

## Decisions that are currently locked for the MVP baseline

- SQL is the canonical Article store; Pinecone is a derived retrieval index.
- Extract NASA body text from `article .usa-article-content .entry-content`,
  with Readability as fallback.
- Chunk per Article, sentence-aware, about 1,500 characters, no overlap.
- Include title context in embedding input.
- Use deterministic vector IDs: `nasa:<articleId>:<chunkIndex>`.
- The agent modules follow selector → SQL and/or RAG specialist → aggregator.
  This is the capstone's learning objective, not accidental complexity.
- Keep web fallback, hybrid search, and reranking deferred until the core
  agent workflow has been demonstrated.

## Grounded-answer evidence

Verified live on August 11, 2026:

- “What has NASA said about the Moon?” returned a source-linked answer based on
  four retrieved NASA Moon Base articles.
- “What has NASA said about Europa?” returned the no-result boundary rather
  than making a claim from unrelated retrieved material.

The integrated aggregator uses `gpt-4o` at temperature 0 through the Responses
API, using strict structured output: `answer`, `sufficientEvidence`, and
supplied source IDs. Selector and SQL planning use `gpt-5-mini`.
The server rejects invented source IDs, deduplicates source cards by canonical
URL, and converts uncited or insufficient model output to the fixed no-result
message. Retrieved text is labelled as untrusted reference data in the prompt.

## Immediate next objective

Manually evaluate the integrated four-route workflow in the development UI:

```text
question → selector (SQL | RAG | BOTH | NEITHER, with reason)
→ selected SQL and/or RAG specialists
→ aggregator → source-linked answer
```

Record the route, terminal trace, answer, and source cards for the SQL, RAG,
BOTH, and NEITHER cases in `EVAL.md`. Pay particular attention to whether the
cited sources support date-bound hybrid answers. The web-search fallback is a
separate later `WEB` capability—not a hidden meaning of `NEITHER`.

The first workflow returns complete validated JSON with a truthful “Thinking…”
state. Streaming the aggregator is a separate polish/demo checkpoint after the
workflow is correct; it will require structured stream events for text, stages,
source cards, and errors.

## Deferred product and learning backlog

- Agent-work progress/error UX and a full user-journey map.
- A measured reranking experiment where baseline retrieval contains, but
  misorders, the expected source.
- Explicit hard metadata filters for dates, source, and known article IDs;
  SQL remains preferred for exact counts and listings.

Details and guardrails are in [possible-improvements.md](possible-improvements.md).

## Document map

- [ROADMAP.md](ROADMAP.md) — planned checkpoints and scope.
- [WORKING-LOG.md](WORKING-LOG.md) — dated decisions, commands, and evidence.
- [checkpoint-3-chunking-decision.md](checkpoint-3-chunking-decision.md) —
  chunking/extraction HOW and WHY.
- [capstone-architecture-ux-decision-note.md](capstone-architecture-ux-decision-note.md)
  — discovery context and product/architecture questions; not a fixed spec.
- [AGENT-CONTEXT.md](AGENT-CONTEXT.md) — deferred selector/RAG/SQL/web ideas.
- `next-session-prompt.md` — ignored personal handover for the next chat.

## Useful commands

```bash
npm run ingest:nasa
npm run ingest:nasa-archive -- --pages 10
npm run inspect:nasa-chunks -- --limit 3
npm run prepare:nasa-index
npm run index:nasa -- --limit 10
npm run sync:nasa-feed
npm run query:nasa -- --question "What has NASA said about the Moon?"
npm run dev
npm test -- --run
npm run lint
```
