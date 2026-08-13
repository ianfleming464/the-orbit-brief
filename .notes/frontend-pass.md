# The Orbit Brief — Redesign Brief

*For an agent using the frontend-design skill. This is direction, not pixel spec. Do the token/brainstorm pass the skill asks for, then build. Where this brief pins something down, follow it; where it leaves an axis free, make a deliberate, subject-grounded choice — not a default.*

---

# Highest-value changes:

1. Replace starter prompts with proven evaluation questions:
    - Give me the most recent story you have.
    - What has NASA said about Moon Base?
    - What did articles from June say about Moon Base?
    - Tell me about TEMPO and air quality.

2. Add a “Start new question” button that clears the current answer and in-
    memory history—no reload.

3. Improve the loading copy to reflect the workflow, e.g. “Checking indexed
    sources…” rather than implying freshness.

4. Make sure the index boundary is visible somewhere small:
    “Answers are based on the currently indexed source corpus.”

## Subject, audience, job (pinned — don't re-open)

- **Subject:** a source-first index of recent astronomy/space news. It ingests trusted feeds (NASA, ESA, Launch Library) nightly and answers questions **grounded in those indexed sources**, with citations. Its soul is *showing its work* — every answer traces to a real source, and it says "not in the index" rather than bluffing.
- **Audience:** a curious space enthusiast, not a researcher. Calm, literate, wants signal over hype.
- **The page's one job:** let someone ask a question and get a **grounded answer with visible sources**. Everything on the page should build toward that moment.

## Keep (this is working — don't blow it up)

- The **source-first, quiet, editorial point of view.** The restraint is right.
- **Monospace as the system/utility voice** (labels, meta, counts). Lean into this as the "data/instrument" voice — it's the most subject-true thing here.
- Typography treated as the main design material, not decoration.

## The core problem to fix (this is a product problem, not taste)

The **answer and its sources are the most underdesigned thing on the page — and they're the entire point.** Right now the answer ("There are 23 articles indexed from June.") is plain flush-left text at the bottom, indistinguishable from everything else, **with no visible sources at all.** A grounded, source-first tool whose grounding is invisible undersells its whole thesis. The redesign's center of gravity is the **answer + sources surface** (spec below). Design the page around *that*, not around the hero.

## Aesthetic direction — get OFF the AI-default cluster

The current look (warm cream ground + high-contrast serif display + terracotta accent ≈ `#D97757`) is a known AI-generated default, and that accent is close to Anthropic's own — it reads as a tell to anyone design-literate. **Move off it deliberately.** Also avoid the other two defaults: near-black + acid-green/vermilion; and the hairline-rule broadsheet-newspaper pastiche.

Instead, ground the identity in the subject's real world. This product is an **index / catalogue / observation log** — a thing that records, dates, and numbers sources. Steer toward that vernacular: the observatory logbook, the star catalogue, the ephemeris table, the call-numbered library record. Precise, catalogued, quietly technical. That framing justifies dates, counts, and IDs as first-class visual citizens — which is exactly what this product is made of.

Take **one real, justifiable aesthetic risk**, and spend your boldness only there (see Signature). Keep everything else disciplined and quiet.

## Palette direction (guardrails, not locked tokens — finalise your own 4–6 named values)

- **Explicitly not** cream `#F4F1EA` + terracotta `#D97757`. Pick a different ground and a different signal.
- Choose a direction and commit fully to one:
  - **Cool paper + ink:** a cool off-white or pale grey-blue ground with deep ink/indigo text — the star-atlas-on-paper direction. Precise, cartographic.
  - **Observation-log dark:** a deep, desaturated night ground (not pure black) with warm-grey text — evoking a dark-adapted observatory. If you go dark, the accent should feel *functional* (a dimmed, dark-adaptation amber/red like real night-vision instrument lighting), **not** a bright punch color — that's what separates it from the black+vermilion default.
- **One** signal accent, subject-justified, used sparingly (links, the live citation marker, one state). No second accent.

## Type direction (fix the specific problems)

- **Kill the competing-serifs problem.** Right now "The Orbit Brief" and "What should we look up?" are two giant high-contrast serifs fighting for the same tier. Let **one** display moment win; step the other down clearly.
- Pair deliberately across **three roles**, and don't reach for the default high-contrast Didone/Times-style serif that ships with cluster #1:
  - **Display:** one characterful face with real personality, used with restraint. If you keep a serif, make it an unexpected one; a distinctive grotesque or a technical face is also fair game for a catalogue identity.
  - **Body:** a clean, readable complement — humanist sans or a workhorse text serif that is *not* the display face.
  - **Data/utility (mono):** keep the monospace for labels, dates, counts, IDs, citations. This is the instrument voice — use it consistently.

## Layout & hierarchy

- Establish a clear vertical rhythm and a real hierarchy: hero → ask → **answer/sources (the payload)** → index/meta.
- **Fix the overflow bug:** the right-aligned mono note is running off the edge ("INDEXED SOURC…"). It must wrap/contain responsibly at every width.
- Asymmetry is fine and on-brand, but the answer surface should feel like the destination the layout leads to, not an afterthought pinned to the bottom.

## Signature element (spend your boldness here)

Make the **citation/source record the memorable device.** Style each retrieved source like a **catalogue entry / observation-log line** — e.g. a call-number-style ID, source, date, in the mono voice — so that *grounding itself* becomes the page's signature look. This embodies "source-first" in the visual language instead of just claiming it in a tagline. This is the one place to be distinctive; keep everything around it quiet.

## The answer + sources component (spec — this is the centerpiece)

When a question is answered, render:

1. **The answer**, in a distinct, clearly-primary treatment (its own container/rhythm, set apart from the input and the index).
2. **The sources**, directly beneath, as a small stack of catalogue-style entries: each with **title, source (NASA/ESA/…), date**, and a link out. This is the "shows its work" moment — make it unmistakable and scannable.
3. **The abstention/deflection state is a first-class design state, not an error.** When the answer isn't in the index, the tool says so plainly and calmly ("Not in the current index.") — and this should look *intentional and trustworthy*, because clean abstention is the product's core value, not a failure. Design it with the same care as a successful answer.

## Copy & voice (design material, not decoration)

- **System voice**, plain and active. Buttons say what happens ("Look up" is good; keep that discipline through to results).
- **Empty / loading / abstention** are moments for direction, not mood. Loading: say what it's doing ("Searching the index…"). Empty: an invitation. Abstention: honest and specific ("Nothing in the index covers that yet."). Never apologetic, never vague.
- Name things by what the user controls (the "index," "sources"), not how it's built (no "vector store," "embeddings" in the UI).

## Quality floor (non-negotiable, don't announce it)

Responsive to mobile; visible keyboard focus; `prefers-reduced-motion` respected; any motion deliberate and minimal (over-animation reads as AI-generated). Match execution precision to the minimal direction — in a quiet design, spacing and type detail *are* the craft.

## Deliverable

Do the skill's two-pass process: a compact token system (named palette hexes, the 3 type roles, layout concept, the signature) reviewed against this brief to confirm it isn't a default — *then* build. State what you chose and why, especially how the palette and display face move off the cluster called out above.