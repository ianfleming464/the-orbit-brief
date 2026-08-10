# Agent Context — Orbit Brief Architecture

Read this before extending the capstone. This note records the intended
architecture and feedback that should guide the next implementation slices.

## Capstone workflow target

The final app should apply the patterns learned in `parsity-medical-rag`:

```text
user question
  → selector: SQL | RAG | BOTH | NEITHER
  → SQL agent and RAG agent run in parallel when selected
  → aggregator combines validated results
  → source-linked answer
```

- The selector should eventually return structured, validated routing data.
- `sql.ts` handles exact structured queries such as recent dates and article
  metadata.
- `rag.ts` handles semantic retrieval over indexed article content.
- `aggregator.ts` produces the final grounded response and citations.
- The current deterministic recent-news route is temporary scaffolding for the
  early plumbing, not the final routing architecture.

## Current sequencing

- Checkpoint 1: NASA feed → SQL Article records → recent article list — complete.
- Checkpoint 2: chat-first shell and deterministic recent-news query — complete.
- Checkpoint 3: chunk article bodies, embed them, and establish inspectable RAG
  retrieval.
- Checkpoint 4: make retrieval independently verifiable before answer
  generation.
- After those foundations work, introduce selector/SQL/RAG/BOTH/NEITHER
  interfaces and the aggregator flow incrementally.

## Web-search fallback idea from review

Brian Jenney raised an important non-blocking MVP idea: when the indexed corpus
does not contain an article or topic, a constrained web-search agent could
query an allowlist of trusted sites. The selector could route to web discovery
after RAG returns no relevant result.

If this is added later:

- Keep the allowed-domain list explicit and narrow.
- Distinguish provenance in structured results, for example
  `source_type: "nasa_official" | "web_discovery"`.
- Record the retrieval method separately, for example `vector` or `web_search`.
- Treat web results as lower-confidence, untrusted evidence and preserve
  source links in the aggregator output.
- Consider storing approved web content for future vectorization, but only
  after deciding on freshness, rights, poisoning, and retention safeguards.
- Do not let web fallback silently imply that the NASA corpus contained the
  answer.

This remains deferred until the NASA-only SQL and RAG path is working and
evaluated.

## SQL decision

SQL remains useful and is retained for this project. Even if metadata could
support vector IDs alone, PostgreSQL provides the canonical article record,
exact date/source queries, URL uniqueness, content hashes, ingestion tracking,
and a reliable source lookup for RAG results. Reconsider only with evidence,
not as a premature simplification.

