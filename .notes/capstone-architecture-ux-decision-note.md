# Capstone Architecture & UX Decision Note

## Purpose

This note captures the current architectural and product thinking for
the space/astronomy RAG capstone. It is intended as a decision aid, not
a fixed specification.

The key shift is to design the application around its **user-facing
purpose** rather than reproducing the architecture of the medical-notes
RAG application used during the cohort.

------------------------------------------------------------------------

## 1. The user-facing problem

The application is intended to help someone answer:

> **What has been happening in space and astronomy recently, and what
> can I learn about the developments that interest me?**

The useful product concept is therefore closer to an **up-to-date
space-intelligence briefing and investigation tool** than a generic
chatbot over a database.

There are two natural modes of use.

### Discovery

The user is interested in space but does not necessarily know what to
ask.

Examples:

-   What interesting developments have happened recently?
-   What's new in exoplanet research?
-   What's happening with 3I/ATLAS?
-   What recent discoveries should I know about?

The interface should give the user useful starting points rather than
confronting them only with an empty chat box.

### Investigation

The user has a specific subject in mind and wants to explore it.

Examples:

-   Why is 3I/ATLAS interesting?
-   Have there been recent JWST findings about exoplanet atmospheres?
-   What has NASA said recently about a particular mission?

The free-text input supports this mode.

------------------------------------------------------------------------

## 2. UX direction

The original UX mirrored the cohort medical-notes application:

-   empty chat input;
-   several predefined/example questions;
-   different questions demonstrating SQL, RAG or hybrid retrieval.

That interaction model made sense for the medical application because
the underlying corpus naturally consisted of structured patient records
and notes.

It should not automatically dictate this application's UX.

### Proposed MVP home screen

Keep the UI deliberately simple:

``` text
What's happening in space?

Recent space and astronomy information from the last 90 days.

[ Ask about recent space & astronomy developments... ]

Explore the latest

[ What's new in exoplanet research? ]
[ What's happening with 3I/ATLAS? ]
[ What recent discoveries should I know about? ]
[ What has changed recently in <suitable topic>? ]

Corpus updated: <date>
<optional simple corpus/source information>
```

The suggested questions are **entry points**, not demonstrations of
backend technologies.

Clicking one can simply submit a normal question through the same
routing pipeline as manually entered text.

The UI does not need to expose whether SQL, RAG, web search, or another
mechanism answered the question.

------------------------------------------------------------------------

## 3. Do we actually need SQL?

### Why SQL exists currently

The first implementation followed the architecture learned in the
cohort:

``` text
RSS/API
  ↓
SQL
  ↓
chunking
  ↓
embeddings
  ↓
Pinecone
```

This was reasonable as a first implementation because it provided a
familiar architecture.

However, it creates an important question:

> **What capability would the application lose if SQL were removed?**

If SQL currently exists primarily to:

-   temporarily persist fetched RSS/API items;
-   provide IDs;
-   prevent duplicate ingestion;
-   support placeholder/example queries copied from the medical-app
    interaction model;

then it may not justify the additional infrastructure.

### Why SQL made sense in the medical application

For medical notes, relational persistence is naturally part of the
domain:

``` text
Medical records / notes
        ↓
       SQL       ← source of truth / structured querying
        ↓
chunk + embed
        ↓
     Pinecone    ← semantic retrieval index
```

SQL and Pinecone provide distinct capabilities.

The fact that this architecture was appropriate there does **not** imply
that every RAG application requires SQL.

------------------------------------------------------------------------

## 4. Potential simplified ingestion architecture

For the space application, the ingestion path could potentially be:

``` text
RSS / API
    ↓
normalise
    ↓
chunk
    ↓
embed
    ↓
Pinecone
```

Useful Pinecone metadata could include fields such as:

``` text
source
sourceId
url
title
publishedAt
chunkIndex
contentHash/version (if useful)
```

Stable vector IDs can provide idempotency, conceptually:

``` text
<source-id>:<chunk-index>
```

or another deterministic scheme derived from the source document and
chunk.

This allows repeated ingestion runs to update/upsert predictable records
rather than blindly creating duplicates.

Brian's suggestion to track source IDs through vector metadata therefore
raises a legitimate possibility that SQL is unnecessary for the MVP.

------------------------------------------------------------------------

## 5. When SQL *would* still be justified

SQL should remain if it provides a real user-facing capability that
semantic retrieval does not provide well.

For example:

``` text
"How many launches occurred in the last 30 days?"
```

or:

``` text
"Show the five most recent launches ordered by date."
```

These are structured/filtering/aggregation problems and may naturally
belong in SQL or a structured external API.

By contrast:

``` text
"What have recent sources said about 3I/ATLAS?"
```

is naturally a semantic retrieval/RAG problem.

The decision should therefore be driven by **question type**, not by a
desire to demonstrate a SQL agent.

### Decision principle

Do not keep SQL because:

> "The architecture should contain a SQL agent."

Keep SQL only if:

> "Users need to ask questions for which relational/structured querying
> is the appropriate capability."

If no important MVP question requires SQL, removing it is legitimate
simplification.

------------------------------------------------------------------------

## 6. Possible query architecture

A later architecture may look conceptually like:

``` text
                       ┌──────────────┐
User question ────────►│ Router /     │
                       │ Selector     │
                       └──────┬───────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
          RAG path      Structured path    Live/web path
         (Pinecone)      (if required)     (if required)
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                     synthesis / answer
                              │
                              ▼
                     streamed response
                     with useful sources
```

However, this is a **possible later architecture**, not a requirement
for the next checkpoint.

Avoid adding specialist agents simply because they make the architecture
look more sophisticated.

For each proposed agent/tool/path, ask:

> **Does this capability solve a real class of user questions?**

Also ask whether an actual agent is necessary. Deterministic routing or
ordinary tool selection may be simpler, more reliable, and sufficient
for the MUP.

------------------------------------------------------------------------

## 7. RAG vs live information

A useful distinction may eventually be:

### Corpus/RAG

Use when the question can be answered from the ingested recent corpus.

Example:

> What have recent sources reported about 3I/ATLAS?

### Live/web retrieval

Use when:

-   the required information is newer than the corpus;
-   the question explicitly asks for current information;
-   the corpus cannot adequately answer it.

Example:

> What is the latest update today on 3I/ATLAS?

### Structured retrieval

Only add if there are genuinely structured questions for which it is
useful.

The system does not need every route merely to demonstrate that routing
exists.

------------------------------------------------------------------------

## 8. Important caveat: "Give me a briefing"

The product concept is a briefing tool, but a fully open-ended prompt
such as:

> Give me the most important space news this week.

is deceptively difficult to implement well using basic vector similarity
search.

A good briefing may require:

-   recency weighting;
-   ranking;
-   diversity across topics;
-   deduplication;
-   definitions of "importance";
-   potentially retrieval from many parts of the corpus rather than the
    nearest few chunks.

For the MUP, avoid allowing this apparently simple feature to create a
large secondary engineering project.

Suggested home-screen prompts can instead be specific enough to retrieve
reliably while still supporting discovery.

A more sophisticated generated briefing can be a later enhancement.

------------------------------------------------------------------------

## 9. Immediate technical checkpoint

Do **not** solve the complete multi-agent architecture yet.

The next checkpoint should prove the core RAG path.

### Goal

> **Prove that recent source content can be ingested into Pinecone and
> retrieved usefully.**

### Work

1.  Decide on a sufficiently good chunking strategy.
2.  Decide whether SQL contributes anything necessary to this ingestion
    path.
3.  Create/configure the Pinecone index.
4.  Run the intended \~90-day ingestion.
5.  Normalise source documents.
6.  Chunk the content.
7.  Generate embeddings.
8.  Upsert vectors with useful metadata and deterministic IDs.
9.  Inspect what actually landed in Pinecone.
10. Run real retrieval tests against the corpus.
11. Record observations and decisions in the working log.

The objective is not architectural perfection. It is a functioning and
understood vertical slice.

------------------------------------------------------------------------

## 10. Architecture principle for the capstone

The project should demonstrate **understanding rather than component
count**.

Removing an unnecessary database, agent, abstraction, or service is not
making the capstone less sophisticated if the removal follows from
understanding its role.

A defensible engineering explanation would be:

> We initially persisted feed items in SQL because this mirrored the
> cohort architecture. During implementation, we determined that
> relational persistence was not providing a necessary user-facing
> capability for the MVP. The ingestion pipeline was therefore
> simplified, with deterministic vector IDs and metadata providing
> ingestion identity/idempotency. Structured storage can be introduced
> later if structured query requirements emerge.

That decision arguably demonstrates more architectural understanding
than retaining SQL solely because it was present in the reference
implementation.

------------------------------------------------------------------------

## 11. Product/architecture decision test

When considering a feature or architectural component, ask these
questions in order:

1.  **What user problem does this solve?**
2.  **What type of question or interaction requires it?**
3.  **Can the current simpler architecture already handle that?**
4.  **Does this need an agent, or would deterministic logic/tool
    selection suffice?**
5.  **Is it required for the MUP, or merely interesting?**
6.  **Does adding it increase the probability of having a working,
    understood application by the deadline?**

If there is no convincing answer to question 1 or 2, the component
probably does not belong in the MUP.

------------------------------------------------------------------------

## 12. Current working hypothesis

The simplest coherent MUP may be:

``` text
Recent trusted space/astronomy sources
              ↓
       ingestion pipeline
              ↓
      chunk + embeddings
              ↓
           Pinecone
              ↓
       retrieval / RAG
              ↓
          OpenAI
              ↓
  streamed, sourced answer
```

with a user interface consisting of:

``` text
brief product explanation
          +
free-text question input
          +
useful suggested questions
          +
clean streamed answers/sources
```

Routing, live search, structured querying, aggregation and more
sophisticated briefing generation should be added **only where concrete
user-facing requirements justify them**.

------------------------------------------------------------------------

## 13. Key unresolved questions

These should be resolved incrementally through implementation rather
than all upfront:

-   Is SQL providing any necessary capability after the placeholder
    questions are removed?
-   What chunk size/structure works best for the actual RSS/API
    documents?
-   What metadata is necessary for provenance, filtering and
    idempotency?
-   What retrieval strategy produces useful answers from the 90-day
    corpus?
-   Which real user questions cannot be answered well through RAG alone?
-   Does the application genuinely require live web retrieval for the
    MUP?
-   If multiple retrieval paths exist, is deterministic routing
    sufficient?
-   What should qualify as a source/citation in the final answer?
-   How much "briefing" functionality can be delivered reliably without
    introducing ranking/diversity complexity?

These questions should inform later checkpoints after the basic Pinecone
retrieval path is proven.

------------------------------------------------------------------------

## Bottom line

**Do not reproduce the medical RAG architecture simply because it is
familiar.**

Start from the product:

> Someone interested in space opens the application because they want to
> discover what has been happening recently or investigate a recent
> topic.

Then add only the architecture necessary to support that experience.

The immediate priority is therefore not SQL agents, web agents,
selectors or aggregators.

It is:

> **Get the recent corpus into Pinecone, retrieve useful material from
> it, and prove that the central RAG experience works.**

Everything else can earn its place afterwards.

------------------------------------------------------------------------

## 14. Discovery / presentation narrative

This architectural evolution should be preserved as part of the
project's **discovery and decision-making record**, rather than
presenting the final architecture as though it was known from the
beginning.

The discarded or questioned architecture is useful evidence of
engineering reasoning.

### Initial assumption

Mirror the cohort medical RAG architecture:

-   ingest source material into SQL;
-   use SQL, RAG and potentially hybrid retrieval routes;
-   provide predefined questions that demonstrate those different
    capabilities.

### Problem discovered

The architecture was beginning to drive the product rather than the
product driving the architecture.

SQL existed partly because the reference medical application used it.
The predefined questions also existed partly because they provided
convenient demonstrations of the available retrieval mechanisms.

This raised a more fundamental question:

> **Are these components solving requirements of this application, or
> are they present because they were part of the architecture we
> learned?**

### Reframing

Return to the user-facing reason for opening the application:

> **A person interested in space wants to discover what has happened
> recently and investigate recent topics that interest them.**

The interaction model and retrieval architecture should follow from that
requirement.

### Decision direction

-   RAG/Pinecone has a clear role for semantic investigation of the
    recent corpus.
-   SQL should remain only if genuinely structured user questions
    require relational querying.
-   Live retrieval/web search should be added only if the corpus cannot
    satisfy an important class of current-information questions.
-   Routing, aggregation and specialist agents should similarly earn
    their place through concrete user requirements.
-   Suggested questions should help users discover useful things to ask,
    rather than exist primarily to demonstrate backend technologies.

### Engineering principle

> **Demonstrate understanding through justified architectural decisions,
> rather than demonstrating sophistication through the number of
> components.**

Removing an unnecessary component can be a stronger engineering decision
than retaining it simply to reproduce a reference architecture.

### Consequence

The immediate implementation priority becomes proving the simplest
valuable vertical slice:

``` text
recent sources
    ↓
ingestion
    ↓
chunking + embeddings
    ↓
Pinecone
    ↓
retrieval / RAG
    ↓
useful sourced response
```

Only after this works should additional retrieval paths be introduced in
response to observed limitations or explicit product requirements.

### Why this matters for the presentation

Do not retrospectively remove the uncertainty or intermediate
architecture from the project story.

A useful presentation narrative is:

> **Initial assumption → implementation/questioning → problem discovered
> → product reframing → architectural decision → consequence**

For example:

> We initially persisted feed data in SQL because this mirrored the
> medical RAG architecture used in the cohort. During implementation, we
> questioned what user-facing capability SQL was actually providing.
> That exposed a broader issue: parts of the product experience were
> being designed around demonstrating SQL/RAG/hybrid retrieval rather
> than around why somebody would use the application. We reframed the
> product around discovery and investigation of recent space
> developments, then allowed each architectural component to justify
> itself against those requirements.

This is more informative than simply presenting the final architecture
and saying that Pinecone was chosen for vector retrieval. It
demonstrates iteration, trade-off analysis, and the ability to challenge
an inherited technical assumption.

### Suggested format for future discovery decisions

As additional decisions arise, record them using:

1.  **Context** --- what was being built or considered?
2.  **Initial approach/assumption** --- what did we originally intend to
    do?
3.  **Question/problem discovered** --- what caused us to reconsider?
4.  **Decision** --- what did we choose?
5.  **Rationale** --- why?
6.  **Consequence/trade-off** --- what becomes simpler, harder, gained
    or lost?
7.  **Revisit when** --- what future requirement would justify
    reconsidering the decision?

The discovery document should therefore capture not only *what was
built*, but also **why the architecture changed while the product became
better understood**.
