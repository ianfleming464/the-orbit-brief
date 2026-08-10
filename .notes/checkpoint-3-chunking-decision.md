# Checkpoint 3 — Chunking Decision

## Context

NASA Article bodies are stored as complete extracted text, but the current
extractor normalises whitespace and removes paragraph breaks. The first vector
index needs a predictable, inspectable baseline before retrieval is evaluated.

## Decision

Create sentence-aware chunks of approximately 1,500 characters, with no overlap
and dense embeddings only.

```text
one Article
  → normalise whitespace
  → split into sentences
  → pack complete sentences up to 1,500 characters
  → split an unusually long sentence at word boundaries
  → add title context for the embedding input
```

Each chunk carries `articleId`, `chunkIndex`, `title`, `source`, canonical URL,
publication date, content hash, and embedding version. Its vector ID is
`nasa:<articleId>:<chunkIndex>`.

## Why

- Sentence boundaries are the only reliable semantic structure in the current
  stored data. Claiming paragraph-aware chunks would be inaccurate.
- A 1,500-character limit is a transparent context-versus-precision compromise
  and follows the successful Parsity Bible exercise precedent without adding a
  tokenizer just for this small corpus.
- Title context gives semantic retrieval the article subject without polluting
  the displayed source excerpt.
- No overlap avoids immediate duplicate vectors, cost, and near-duplicate
  search results. Add it only if retrieval evaluation exposes boundary misses.
- Dense-only vectors establish the semantic baseline. Sparse/hybrid search adds
  lexical weighting decisions that belong to later retrieval evaluation.

## Alternatives deferred

- Preserve paragraphs and re-ingest historical articles.
- Token-count-based chunk sizing.
- Chunk overlap.
- Sparse or hybrid vectors.
- LLM-driven semantic chunking.

Revisit these only with retrieval evidence or when extraction quality becomes a
concrete product limitation.
