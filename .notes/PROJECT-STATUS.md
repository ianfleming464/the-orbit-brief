# The Orbit Brief — Project Status

**Last updated:** 2026-08-11  
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
| Checkpoint 5: grounded generated answers | Next |
| Selector / SQL-RAG / aggregator / web fallback | Deferred |

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

- The UI supports deterministic recent/latest NASA-news questions backed by SQL.
- The semantic corpus is populated, but there is **no retrieval UI or generated
  answer path yet**.
- Asking a question never triggers ingestion; refresh is currently manual.

## Decisions that are currently locked for the MVP baseline

- SQL is the canonical Article store; Pinecone is a derived retrieval index.
- Extract NASA body text from `article .usa-article-content .entry-content`,
  with Readability as fallback.
- Chunk per Article, sentence-aware, about 1,500 characters, no overlap.
- Include title context in embedding input.
- Use deterministic vector IDs: `nasa:<articleId>:<chunkIndex>`.
- Keep agentic routing, web fallback, hybrid search, reranking, and answer
  generation out of the current synchronization increment.

## Immediate next objective

Build a bounded **grounded answer** path from retrieved evidence:

```text
Question → semantic retrieval → supplied NASA evidence
→ grounded answer with clickable source links
```

It must treat retrieved content as untrusted data, answer only from supplied
evidence, return a clear no-result response when retrieval is insufficient, and
include the matching NASA source links. Do not add a selector or agent loop.

Only then decide whether grounded answer generation and the eventual agentic
flow solve an observed product need.

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
npm test -- --run
npm run lint
```
