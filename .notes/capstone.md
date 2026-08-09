# Capstone Working Document

This is a living document for shaping, building, testing, and explaining the
capstone. Update it after meaningful decisions, experiments, or user feedback.

## 1. Problem to solve

> _Write the one-sentence problem here._

- Who has this problem?
- What do they do today instead?
- Why is the problem worth solving now?

## 2. User and outcome

| Item | Decision |
| --- | --- |
| Primary user | _TBD_ |
| User’s goal | _TBD_ |
| Desired outcome | _TBD_ |
| Success signal | _TBD_ |
| Explicit non-goal | _TBD_ |

## 3. Product shape

### Smallest useful version

> _Describe the one end-to-end user flow that must work before adding polish._

```text
User action → application decision/retrieval → user reviews result → outcome
```

### Constraints and guardrails

- Start with the smallest useful workflow; avoid a broad rewrite.
- Keep secrets server-side and out of logs, notes, commits, and browser code.
- Minimize PII. Do not send clinical reasons or unnecessary user data to third
  parties.
- Real-world actions require explicit human confirmation.
- Use deterministic validation at system boundaries; do not rely on prompts
  alone for security or correctness.

## 4. Architecture decisions to reuse

| Pattern | Why it worked in Homework 3 | Capstone question |
| --- | --- | --- |
| Zod at boundaries | Validates browser requests and LLM structured output | Which inputs/outputs must be checked? |
| SQL + RAG separation | Hard structured filters and soft narrative retrieval have different jobs | Does the capstone need both sources? |
| Metadata filters | Makes explicit inclusion/exclusion deterministic before retrieval | Which metadata is safe and useful to filter on? |
| Human confirmation | Prevents the model from creating real-world side effects autonomously | Which actions need a review step? |
| Evaluation log | Turns prompt changes into tested hypotheses | What are the 5–10 representative user cases? |
| Deterministic UI copy | Avoids internal JSON or placeholder language reaching users | Which messages should not be model-generated? |

## 5. Candidate improvements to evaluate

These are ideas, not commitments. See [possible-improvements.md](possible-improvements.md)
for details.

- Extract explicit query metadata before RAG retrieval, then apply it as a
  Pinecone hard filter.
- Use few-shot examples selected from evaluated failures instead of growing one
  huge prompt.
- Retrieve the database schema at runtime for a text-to-SQL agent; do not paste
  a stale schema into a prompt.
- Add a polished, accessible “Thinking…” state before the first streamed chunk.
- Expand scheduler capabilities only in separate, human-confirmed checkpoints:
  consented contact data, availability, cancellation, and rescheduling.
- Consider tool calling only if model-selected capability sequencing materially
  improves the product; retain validation and human gates.

## 6. MVP backlog

### Now

- [ ] Define the problem, user, and one end-to-end flow.
- [ ] Choose the smallest feature slice.
- [ ] Write five representative user scenarios, including one failure case.
- [ ] Identify data sources, secrets, and privacy boundaries.

### Next

- [ ] Implement the happy path.
- [ ] Add one high-value test or repeatable manual test.
- [ ] Capture good and bad live examples.
- [ ] Tighten the smallest observed weak point.

### Later / only if evidence supports it

- [ ] Metadata extraction before RAG.
- [ ] Tool-calling refactor.
- [ ] Expanded scheduling actions.
- [ ] UI polish beyond the core flow.

## 7. Decision log

Add one short entry per meaningful decision.

| Date | Decision | Why / evidence | Trade-off |
| --- | --- | --- | --- |
| 2026-08-01 | Created capstone working document | Establish a shared place to iterate from class discussion to implementation | Intentionally incomplete until the capstone problem is selected |

## 8. Evaluation evidence

For each tested flow, record:

```text
User goal:
Input:
Expected result:
Actual result:
Verdict: Good / Broken / Needs inspection
What changed next:
```

## 9. Demo / case-study outline

1. Problem and user.
2. The one working end-to-end flow.
3. Architecture decision and why it was appropriate.
4. A real evaluation or failure that changed the design.
5. Trade-off and next improvement.
