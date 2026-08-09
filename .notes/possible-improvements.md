# Possible Improvements

Ideas to consider for the capstone after Homework 3. These are proposals, not
approved implementation work.

## Metadata extraction before RAG retrieval

### The idea

Add a small, structured-output step before vector search that reads the **user
query** and extracts only explicit metadata constraints, for example:

```ts
{
  firstName: string | null,
  lastName: string | null,
  gender: 'male' | 'female' | null,
  race: string | null,
}
```

If the query says “What do Angel Reinger’s notes say about smoking?”, the
extraction step could return Angel’s first and last name. Pinecone would apply
those exact metadata filters before semantic retrieval and reranking. The vector
search would then compare smoking-related notes only within Angel’s notes.

### How this differs from the current project

The current [patient-filter.ts](../lib/patient-filter.ts) does **not** infer
metadata from natural language. It safely builds a Pinecone filter from IDs
already supplied by application code:

- Hybrid retrieval can include known patient IDs with `patientId: { $in: [...] }`.
- An explicit “different patient” follow-up can exclude prior RAG evidence with
  `patientId: { $nin: [...] }`.

That is deliberate and reliable because the IDs come from real retrieved note
metadata, not model-generated prose. See [vector-search.ts](../lib/vector-search.ts)
and [rag.ts](../lib/agents/rag.ts).

The proposed extraction step would be a new capability: it would turn explicit
user wording such as a patient name, gender, or race into additional hard
metadata constraints. It should never extract metadata from the final answer;
it should extract only from the user’s request before retrieval.

### Why it could help

- Named-patient note questions become more precise.
- Metadata narrows the candidate set before embedding search and reranking.
- It combines hard constraints (for example, a named patient) with soft
  semantic matching (for example, “struggling to breathe”).
- It fits the existing architecture: the vector index already stores
  `patientId`, first/last name, age, gender, race, city, state, source, and
  current medications. See [scripts/vectorize.ts](../scripts/vectorize.ts).

### Risks and guardrails

- Only apply a filter when the user clearly supplied it. A guessed name or
  demographic could wrongly hide relevant notes.
- Validate the extraction with Zod and drop `null` fields before filtering.
- Map informal wording only to known stored values; maintain a small test set
  for those mappings.
- Keep the current explicit `patientId` exclusion for “different patient”
  follow-ups. Metadata extraction complements it; it does not replace it.
- Log the inferred filters privately for debugging, but do not expose internal
  retrieval details in normal user-facing answers.

### Small capstone experiment

1. Add a `RagFiltersSchema` and `extractRagFilters(query)` function using
   structured output at temperature `0`.
2. Start with first name and last name only; add demographics only after tests
   prove they map to the actual stored metadata values.
3. Extend `buildPatientMetadataFilter()` so it combines the existing inclusion
   or exclusion IDs with explicit extracted metadata using `$and`.
4. Add unit tests for no filter, named patient, existing different-patient
   exclusion, and a combined filter.
5. Live-test exact named-patient note queries alongside the existing unfiltered
   version. Keep the feature only if it improves precision without causing
   false exclusions.

### Reference

Brian Jenney’s working-pipeline gist includes an `extractRagFilters()` example:
[Parsity Medical RAG working pipeline](https://gist.github.com/BrianJenney/2f521a5ef7f368b3a35c443a789f181b).

Its useful idea is the separation of responsibilities:

```text
user query → structured metadata extraction → Pinecone hard filter
          → semantic vector search → reranking → grounded answer
```

The capstone should keep this project’s existing privacy boundary and
human-confirmed scheduling flow unchanged.

## Runtime SQL schema grounding

### Guardrail

Do **not** copy a fixed database schema into a long SQL-agent system prompt.
Instead, retrieve the current schema at runtime with an `introspectSchema()`
helper and include that current result in the SQL-generation context.

### Why

The schema is part of the application’s changing source of truth. If a table,
column, relationship, or field name changes, a hard-coded prompt becomes stale
and the model can generate invalid SQL. Runtime introspection lets the SQL
agent see the schema that actually exists at the time it writes its query.

### Reference and capstone approach

Brian Jenney’s gist uses this pattern in its SQL example: it calls
`introspectSchema()` before asking the model to create SQL. For a capstone,
keep the helper read-only, limit the returned schema to the tables the agent is
allowed to query, and retain the existing read-only SQL validation rules. Test a
schema change deliberately to confirm the agent receives the updated shape.

## Streaming “Thinking…” state

### The idea

While the application is waiting for the first streamed answer chunk, show a
small, intentional “Thinking…” indicator in the assistant-message area. Once
text starts streaming, replace it with the actual answer.

### Why

SQL, RAG, reranking, and aggregation can take a few seconds. A visible progress
state reassures the user that their request was received and that the app is
working, rather than looking frozen.

### Guardrails

- Keep the wording neutral: “Thinking…” or “Looking into that…”; do not imply a
  diagnosis, a completed search, or that an appointment has been booked.
- Replace the indicator immediately when the first text chunk arrives.
- Keep a distinct error state if the request fails; a spinner must not continue
  forever or conceal an error.
- Preserve the existing scheduling confirmation card as the only indicator that
  a booking is ready for human review.

### Small implementation direction

`app/page.tsx` already tracks `isStreaming` and renders a placeholder while the
last assistant message is empty. The capstone improvement is visual polish: add
a subtle animated dots/spinner treatment and accessible status text, without
changing the retrieval or booking workflow.

## Scheduler improvements inspired by the reference implementation

### The useful ideas

Brian Jenney’s Cal.com example accepts optional attendee email, phone number,
and appointment notes; it normalizes phone numbers to E.164 and sends an
explicit attendee language. Those are useful product ideas for a future,
authorized scheduling experience.

### What to keep from this project

The current Homework 3 implementation is intentionally safer for synthetic
data: it uses a developer-owned test inbox and sends only a synthetic patient
name plus a neutral source marker to Cal.com. It deliberately does **not** send
the clinical reason as calendar metadata. Keep the existing human confirmation
card and server-side API key boundary unchanged.

### Capstone direction

1. Add optional contact fields only if the product has a lawful, consented,
   verified source for real patient contact data. Never invent or fall back to a
   placeholder patient email in production.
2. If SMS reminders are enabled, validate and normalize a user-provided phone
   number to E.164 before sending it to Cal.com.
3. Make event-type selection explicit rather than relying on one global default
   when the product needs appointment categories or durations.
4. Show the returned booking reference and a safe reschedule/cancel link only
   to an authorized user; do not expose booking URLs in general chat history.
5. Add cancellation and rescheduling as separate, human-confirmed actions with
   their own validation, audit trail, and provider-error states.
6. If availability lookup is added, query only approved event types, display
   available slots in the browser timezone, and re-check availability when the
   user confirms because a slot can be taken in the meantime.

### Trade-off

These additions make scheduling more useful, but they also introduce personal
contact data, consent, authorization, and calendar-race concerns. Build them as
small separate checkpoints, not as an extension of the model’s power to book
autonomously.
