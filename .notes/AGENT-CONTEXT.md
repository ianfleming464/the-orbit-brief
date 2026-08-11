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

- This workflow is the capstone's central learning objective. The existing
  direct SQL/RAG routes are a working control condition, not the intended final
  architecture.
- The selector returns structured, Zod-validated routing data: `SQL`, `RAG`,
  `BOTH`, or `NEITHER`, plus a concise reason and an optional improved semantic
  query. Its decision and reason are logged during development.
- `sql.ts` handles exact structured Article queries: dates, source, counts,
  titles, and indexed-coverage questions. For this one-table MVP, it should
  produce a validated structured query plan executed through Prisma—not
  model-authored raw SQL.
- `rag.ts` handles semantic retrieval over indexed article content and returns
  evidence/source records, not a final answer.
- `aggregator.ts` receives the selected specialist outputs and produces the
  final grounded response and validated citations. Streaming is optional; do
  not add a streaming library solely to mirror the medical project.
- `BOTH` must be implemented honestly: the aggregator should explain the
  limits of its SQL and semantic evidence rather than pretend parallel results
  are a perfectly joined data set.

## Current sequencing

- Checkpoint 1: NASA feed → SQL Article records → recent article list — complete.
- Checkpoint 2: chat-first shell and deterministic recent-news query — complete.
- Checkpoint 3: chunk article bodies, embed them, and establish inspectable RAG
  retrieval.
- Checkpoint 4: make retrieval independently verifiable before answer
  generation.
- The next phase is to introduce selector/SQL/RAG/BOTH/NEITHER interfaces and
  the aggregator flow incrementally. Do not overengineer workers, queues,
  durable run storage, or a framework around these four functions.

## First agent-workflow question set

Use these as the initial routing examples and later evaluation fixtures:

| Route | Example |
| --- | --- |
| SQL | “How many NASA articles are indexed from June?” |
| SQL | “What did NASA publish this week?” |
| RAG | “What has NASA said about Moon Base?” |
| RAG | “Tell me about TEMPO and air quality.” |
| BOTH | “What did NASA publish in June about Moon Base, and what do those articles say?” |
| NEITHER | “What is the capital of France?” |
| Future WEB | “What did NASA say about Europa in 2021?” |

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

This remains deferred until the NASA-only selector/SQL/RAG/aggregator workflow
is working. When introduced, expose it as an explicit `WEB` route or fallback
outcome; do not silently treat it as `NEITHER` or claim the indexed corpus
answered the question.

## SQL decision

SQL remains useful and is retained for this project. Even if metadata could
support vector IDs alone, PostgreSQL provides the canonical article record,
exact date/source queries, URL uniqueness, content hashes, ingestion tracking,
and a reliable source lookup for RAG results. Reconsider only with evidence,
not as a premature simplification.
