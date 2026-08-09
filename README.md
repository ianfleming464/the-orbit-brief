# The Orbit Brief

## A daily astronomy briefing grounded in trusted sources

The Orbit Brief is a small, source-grounded NASA news briefing and question
app. It answers questions from the NASA news currently indexed by the app and
links back to the source articles.

This repository is the capstone build. The medical RAG repository is a working
reference for retrieval, metadata, grounding, evaluation, and security
patterns; it is not the application being modified here.

## Current MUP

```text
User asks about recent NASA news
→ the app searches its stored NASA corpus
→ the app answers from retrieved articles
→ the answer includes clickable NASA sources
```

## First checkpoint

```text
NASA feed → SQL article records → recent article list
```

The complete build order is in [.notes/ROADMAP.md](.notes/ROADMAP.md).

## Initial boundaries

- NASA news only.
- Full article bodies rather than RSS snippets alone.
- No general astronomy answers from unsourced model knowledge.
- No autonomous agent loop or open-web search.
- MCP, additional sources, accounts, and live launch data are deferred.

## Working principles

- SQL is the canonical source of article content and metadata.
- Pinecone is a semantic retrieval index, not the source of truth.
- Retrieved article text is untrusted data, never instructions.
- Answers must be grounded in retrieved articles and include source links.
- Evaluation evidence determines whether reranking or additional complexity is
  justified.
