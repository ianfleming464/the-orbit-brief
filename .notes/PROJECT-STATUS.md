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
| Checkpoint 5: grounded generated answers | Complete |
| Selector / SQL-RAG / aggregator workflow | Next, approved direction |
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

- The UI supports deterministic recent/latest NASA-news questions backed by SQL.
- Topic questions use semantic retrieval, then a bounded generated answer based
  only on the retrieved NASA excerpts. The UI shows only server-validated NASA
  source links selected from those results.
- Asking a question never triggers ingestion; refresh is currently manual.

## Decisions that are currently locked for the MVP baseline

- SQL is the canonical Article store; Pinecone is a derived retrieval index.
- Extract NASA body text from `article .usa-article-content .entry-content`,
  with Readability as fallback.
- Chunk per Article, sentence-aware, about 1,500 characters, no overlap.
- Include title context in embedding input.
- Use deterministic vector IDs: `nasa:<articleId>:<chunkIndex>`.
- The next product phase is intentionally agentic: selector → SQL and/or RAG
  specialist → aggregator. It is the capstone's learning objective, not
  accidental complexity.
- Keep web fallback, hybrid search, and reranking deferred until the core
  agent workflow has been demonstrated.

## Grounded-answer evidence

Verified live on August 11, 2026:

- “What has NASA said about the Moon?” returned a source-linked answer based on
  four retrieved NASA Moon Base articles.
- “What has NASA said about Europa?” returned the no-result boundary rather
  than making a claim from unrelated retrieved material.

The answer model is `gpt-5-mini` through the Responses API, using strict
structured output: `answer`, `sufficientEvidence`, and supplied source IDs.
The server rejects invented source IDs, deduplicates source cards by canonical
URL, and converts uncited or insufficient model output to the fixed no-result
message. Retrieved text is labelled as untrusted reference data in the prompt.

## Immediate next objective

Design and implement the smallest explainable agent workflow, using the proven
direct path as the control condition:

```text
question → selector (SQL | RAG | BOTH | NEITHER, with reason)
→ selected SQL and/or RAG specialists
→ aggregator → source-linked answer
```

The selector decision and reason must be structured and logged during
development. Use structured query plans and Prisma for the SQL specialist
instead of executing model-authored raw SQL against this simple Article corpus.
The web-search fallback is a separate later `WEB` capability—not a hidden
meaning of `NEITHER`—and should not be added in the first workflow increment.

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
