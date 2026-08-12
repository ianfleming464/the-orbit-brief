# The Orbit Brief — Evaluation Log

Record representative questions and ingestion checks here. Do not include
secrets or unnecessary raw content.

```text
User goal:
Input:
Expected result:
Retrieved sources:
Actual result:
Verdict: Good / Broken / Needs inspection
What changed next:
```

## Initial evaluation set

- Recent NASA news question.
- Named-topic question, such as Europa or 3I/ATLAS.
- Follow-up about a returned article.
- Date-boundary question.
- No-result question.
- Irrelevant or non-NASA question.
- Duplicate-ingestion check.
- Poisoned-article security fixture.

## Agent-route evaluation set — 2026-08-12

Run these from the chat UI with the browser dev tools and terminal visible.
Record the returned cards and the `[selector]`, `[workflow]`, `[sql]`, `[rag]`,
and `[aggregator]` log lines under the template above.

| Expected route | Question | Check |
| --- | --- | --- |
| SQL | `How many articles are indexed from June?` | Exact count; no source cards required. |
| SQL | `What are the five most recent indexed stories?` | Five date-ordered cards. |
| RAG | `What has NASA said about Moon Base?` | Grounded summary with relevant Moon Base cards. |
| RAG | `Tell me about TEMPO and air quality.` | Topic answer cites TEMPO evidence, not generic space news. |
| BOTH | `What did articles from June say about Moon Base?` | Date/topic answer; inspect cards and logs carefully because metadata filtering is not yet implemented. |
| BOTH | `What did NASA publish this week about lunar landers?` | Structured time constraint plus semantic topic; check the selector reason. |
| NEITHER | `What is the capital of France?` | Corpus boundary; no SQL/RAG/aggregator logs after the selector. |
| NEITHER | `Write me a poem about Saturn.` | Corpus boundary; no invented answer. |

Follow-up check: first ask `What has NASA said about Moon Base?`, then ask
`Which missions are involved?`. The request should include no more than the
last six in-memory messages and use the earlier Moon Base context. This is
context for routing and phrasing, not new factual evidence.
