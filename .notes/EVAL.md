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
| BOTH | `What did articles from June say about Moon Base?` | Date/topic answer; logs should show SQL-eligible RAG filtering before aggregation. |
| BOTH | `What did NASA publish this week about lunar landers?` | Structured time constraint plus semantic topic; check the selector reason. |
| NEITHER | `What is the capital of France?` | Corpus boundary; no SQL/RAG/aggregator logs after the selector. |
| NEITHER | `Write me a poem about Saturn.` | Corpus boundary; no invented answer. |

Follow-up check: first ask `What has NASA said about Moon Base?`, then ask
`Which missions are involved?`. The request should include no more than the
last six in-memory messages and use the earlier Moon Base context. This is
context for routing and phrasing, not new factual evidence.

### 2026-08-13 : MANUAL EVAL TESTS

Query:
`How many articles are indexed from June?`

Response:
There are 23 articles indexed from June.

Logs:
 ✓ Compiled /api/chat in 142ms (1164 modules)

[selector] {
  route: 'SQL',
  useSql: true,
  useRag: false,
  reason: 'User requests an exact count of articles from June — use the SQL Article store for precise date-filtered counts.',
  semanticQuery: null
}

[workflow] {
  route: 'SQL',
  useSql: true,
  useRag: false,
  reason: 'User requests an exact count of articles from June — use the SQL Article store for precise date-filtered counts.'
}

[sql] {
  operation: 'count',
  publishedFrom: '2026-06-01',
  publishedTo: '2026-06-30',
  source: null,
  titleQuery: null,
  limit: 10,
  sort: 'newest'
}

[aggregator] { kind: 'answer', sourceCount: 0, sourceIds: [] }
 POST /api/chat 200 in 10579ms


Query: `What are the five most recent indexed stories?`

Response (see ./.notes/pic-1.png - todo: structure/format the response?):
1. NASA Shares Station Research Today Supporting Moon, Mars Tomorrow - Published: 2026-08-11 2. Curiosity Blog, Sols 4968-4974: Rock Climbing Towards the Discontinuity - Published: 2026-08-11 3. APOD: 2026 August 11 – Six Moons of Saturn - Published: 2026-08-11 4. Bountiful Roebuck Bay - Published: 2026-08-11 5. Community College Instructors Bring Astronomy Textbook Into 21st Century - Published: 2026-08-10


Logs:
[selector] {
  route: 'SQL',
  useSql: true,
  useRag: false,
  reason: 'User asks for the five most recent indexed stories; the SQL article store provides exact, structured recent/latest article metadata.',
  semanticQuery: null
}

[workflow] {
  route: 'SQL',
  useSql: true,
  useRag: false,
  reason: 'User asks for the five most recent indexed stories; the SQL article store provides exact, structured recent/latest article metadata.'
}

[sql] {
  operation: 'list',
  publishedFrom: null,
  publishedTo: null,
  source: null,
  titleQuery: null,
  limit: 5,
  sort: 'newest'
}

[aggregator] { kind: 'answer', sourceCount: 0, sourceIds: [] }
 POST /api/chat 200 in 8838ms

Query:
`What has NASA said about Moon Base?`

Response:
NASA has announced plans for the Moon Base, a long-term lunar exploration initiative aimed at enabling sustained human presence and expanded scientific and commercial activity at the lunar South Pole. The initiative includes new contracts for lunar rovers and uncrewed cargo landers, with missions targeting the Shackleton Connecting Ridge to demonstrate capabilities for future Artemis missions. The Moon Base will serve as humanity’s first outpost on another celestial world, with missions designed to prepare for future crewed missions to Mars.

Logs:
[selector] {
  route: 'RAG',
  useSql: false,
  useRag: true,
  reason: "User requests what the indexed NASA articles say about 'Moon Base' — requires semantic retrieval of article content.",
  semanticQuery: 'NASA statements about Moon base / lunar base / Artemis lunar base plans and updates'
}

[workflow] {
  route: 'RAG',
  useSql: false,
  useRag: true,
  reason: "User requests what the indexed NASA articles say about 'Moon Base' — requires semantic retrieval of article content."
}

[rag] {
  semanticQuery: 'NASA statements about Moon base / lunar base / Artemis lunar base plans and updates',
  retrievalMethod: 'vector',
  matches: [
    {
      id: 'nasa:cmsonebj2001elx93kz4wm07s:0',
      score: 0.725156844,
      articleId: 'cmsonebj2001elx93kz4wm07s',
      title: 'NASA Provides Update on Moon Base Rovers, Landers, Missions',
      publishedAt: '2026-05-26T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsonecwe001nlx930a48u452:0',
      score: 0.721468806,
      articleId: 'cmsonecwe001nlx930a48u452',
      title: 'NASA to Provide Update on Moon Base Strategy, Missions',
      publishedAt: '2026-05-20T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsonebj2001elx93kz4wm07s:1',
      score: 0.698001146,
      articleId: 'cmsonebj2001elx93kz4wm07s',
      title: 'NASA Provides Update on Moon Base Rovers, Landers, Missions',
      publishedAt: '2026-05-26T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsone7yo000rlx9349tlpv9z:0',
      score: 0.697152078,
      articleId: 'cmsone7yo000rlx9349tlpv9z',
      title: 'NASA to Share Latest Moon Base Mission Progress',
      publishedAt: '2026-06-24T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsone77f000mlx937nujtktr:3',
      score: 0.674486399,
      articleId: 'cmsone77f000mlx937nujtktr',
      title: 'NASA Awards More Moon Base Science, Previews New Opportunities',
      publishedAt: '2026-06-30T18:48:09.000Z'
    }
  ]
}

[aggregator] {
  kind: 'answer',
  sourceCount: 2,
  sourceIds: [ 'cmsonebj2001elx93kz4wm07s', 'cmsone7yo000rlx9349tlpv9z' ]
}

Query:
`Tell me about TEMPO and air quality.`

Response:
NASA's TEMPO (Tropospheric Emissions: Monitoring of Pollution) mission provides near-real-time air quality measurements across North America. The TEMPO-Lab tool, developed with NASA funding, allows educators and teens to explore this data, helping them investigate local air quality issues. The initiative aims to empower youth to understand and act on air quality challenges in their communities by using authentic NASA data.



Logs:
[selector] {
  route: 'RAG',
  useSql: false,
  useRag: true,
  reason: 'User asks what the indexed articles say about TEMPO and air quality—requires semantic retrieval of article content.',
  semanticQuery: 'TEMPO instrument air quality NASA TEMPO air pollution'
}

[workflow] {
  route: 'RAG',
  useSql: false,
  useRag: true,
  reason: 'User asks what the indexed articles say about TEMPO and air quality—requires semantic retrieval of article content.'
}

[rag] {
  semanticQuery: 'TEMPO instrument air quality NASA TEMPO air pollution',
  retrievalMethod: 'vector',
  matches: [
    {
      id: 'nasa:cmsm01d1t0006lxn401auwhms:0',
      score: 0.681744158,
      articleId: 'cmsm01d1t0006lxn401auwhms',
      title: 'Educators & Teens Get Hands-On With TEMPO Data to Help Investigate Local Air Quality',
      publishedAt: '2026-08-06T19:33:32.000Z'
    },
    {
      id: 'nasa:cmsm01d1t0006lxn401auwhms:1',
      score: 0.630552053,
      articleId: 'cmsm01d1t0006lxn401auwhms',
      title: 'Educators & Teens Get Hands-On With TEMPO Data to Help Investigate Local Air Quality',
      publishedAt: '2026-08-06T19:33:32.000Z'
    },
    {
      id: 'nasa:cmsm01d1t0006lxn401auwhms:2',
      score: 0.601442695,
      articleId: 'cmsm01d1t0006lxn401auwhms',
      title: 'Educators & Teens Get Hands-On With TEMPO Data to Help Investigate Local Air Quality',
      publishedAt: '2026-08-06T19:33:32.000Z'
    },
    {
      id: 'nasa:cmsone900000ylx9387iih19t:1',
      score: 0.430812865,
      articleId: 'cmsone900000ylx9387iih19t',
      title: 'NASA Announces Public-Private Partnership to Advance Mars Science',
      publishedAt: '2026-06-17T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsm01chf0005lxn4siss4ev5:2',
      score: 0.426798105,
      articleId: 'cmsm01chf0005lxn4siss4ev5',
      title: 'Sensing the Poles’ Hidden Heat',
      publishedAt: '2026-08-07T04:00:00.000Z'
    }
  ]
}

[aggregator] {
  kind: 'answer',
  sourceCount: 1,
  sourceIds: [ 'cmsm01d1t0006lxn401auwhms' ]
}
 POST /api/chat 200 in 7866ms

 Query:
`What did articles from June say about Moon Base?`

 Response:
 In June 2026, NASA announced new scientific missions for the Moon Base, awarding contracts for lunar rovers and landers. These missions aim to enhance scientific and commercial activities on the lunar surface, particularly at the South Pole. NASA is also exploring additional payload opportunities and developing infrastructure to support sustained human presence on the Moon, which will serve as a foundation for future crewed missions to Mars. The agency is focusing on building a network of environmental data and location markers on the Moon, akin to weather stations on Earth, to better understand potential hazards and improve mission reliability.


 Logs:
 [selector] {
  route: 'BOTH',
  useSql: true,
  useRag: true,
  reason: 'Use SQL to find indexed articles published in June, then use semantic retrieval to extract what those June articles say about Moon Base.',
  semanticQuery: 'What do these June articles say about the Moon Base, lunar base, or Artemis lunar outpost?'
}

[workflow] {
  route: 'BOTH',
  useSql: true,
  useRag: true,
  reason: 'Use SQL to find indexed articles published in June, then use semantic retrieval to extract what those June articles say about Moon Base.'
}

[sql] {
  operation: 'list',
  publishedFrom: '2026-06-01',
  publishedTo: '2026-06-30',
  source: null,
  titleQuery: null,
  limit: 10,
  sort: 'newest'
}

[rag] {
  semanticQuery: 'What do these June articles say about the Moon Base, lunar base, or Artemis lunar outpost?',
  retrievalMethod: 'vector',
  matches: [
    {
      id: 'nasa:cmsonebj2001elx93kz4wm07s:0',
      score: 0.686843634,
      articleId: 'cmsonebj2001elx93kz4wm07s',
      title: 'NASA Provides Update on Moon Base Rovers, Landers, Missions',
      publishedAt: '2026-05-26T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsonebj2001elx93kz4wm07s:1',
      score: 0.654894,
      articleId: 'cmsonebj2001elx93kz4wm07s',
      title: 'NASA Provides Update on Moon Base Rovers, Landers, Missions',
      publishedAt: '2026-05-26T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsone77f000mlx937nujtktr:3',
      score: 0.635264277,
      articleId: 'cmsone77f000mlx937nujtktr',
      title: 'NASA Awards More Moon Base Science, Previews New Opportunities',
      publishedAt: '2026-06-30T18:48:09.000Z'
    },
    {
      id: 'nasa:cmsonecwe001nlx930a48u452:0',
      score: 0.626357615,
      articleId: 'cmsonecwe001nlx930a48u452',
      title: 'NASA to Provide Update on Moon Base Strategy, Missions',
      publishedAt: '2026-05-20T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsone77f000mlx937nujtktr:1',
      score: 0.625218928,
      articleId: 'cmsone77f000mlx937nujtktr',
      title: 'NASA Awards More Moon Base Science, Previews New Opportunities',
      publishedAt: '2026-06-30T18:48:09.000Z'
    }
  ]
}

[aggregator] {
  kind: 'answer',
  sourceCount: 2,
  sourceIds: [ 'cmsone77f000mlx937nujtktr', 'cmsone71r000llx9392cwe8sz' ]
}
 POST /api/chat 200 in 19186ms

Query:
`What did NASA publish this week about lunar landers?`

Response:
I couldn’t find an answer to that in the currently indexed sources.

Logs:
[selector] {
  route: 'BOTH',
  useSql: true,
  useRag: true,
  reason: 'SQL will restrict the indexed NASA articles to those published this week; RAG will retrieve and summarize what those articles say about lunar landers.',
  semanticQuery: "NASA lunar landers details in this week's articles"
}

[workflow] {
  route: 'BOTH',
  useSql: true,
  useRag: true,
  reason: 'SQL will restrict the indexed NASA articles to those published this week; RAG will retrieve and summarize what those articles say about lunar landers.'
}

[sql] {
  operation: 'list',
  publishedFrom: '2026-08-10',
  publishedTo: '2026-08-13',
  source: 'NASA',
  titleQuery: null,
  limit: 10,
  sort: 'newest'
}

[rag] {
  semanticQuery: "NASA lunar landers details in this week's articles",
  retrievalMethod: 'vector',
  matches: [
    {
      id: 'nasa:cmsone77f000mlx937nujtktr:2',
      score: 0.618356,
      articleId: 'cmsone77f000mlx937nujtktr',
      title: 'NASA Awards More Moon Base Science, Previews New Opportunities',
      publishedAt: '2026-06-30T18:48:09.000Z'
    },
    {
      id: 'nasa:cmsone77f000mlx937nujtktr:3',
      score: 0.607671678,
      articleId: 'cmsone77f000mlx937nujtktr',
      title: 'NASA Awards More Moon Base Science, Previews New Opportunities',
      publishedAt: '2026-06-30T18:48:09.000Z'
    },
    {
      id: 'nasa:cmsonebj2001elx93kz4wm07s:2',
      score: 0.606435835,
      articleId: 'cmsonebj2001elx93kz4wm07s',
      title: 'NASA Provides Update on Moon Base Rovers, Landers, Missions',
      publishedAt: '2026-05-26T00:00:00.000Z'
    },
    {
      id: 'nasa:cmsone77f000mlx937nujtktr:0',
      score: 0.59305352,
      articleId: 'cmsone77f000mlx937nujtktr',
      title: 'NASA Awards More Moon Base Science, Previews New Opportunities',
      publishedAt: '2026-06-30T18:48:09.000Z'
    },
    {
      id: 'nasa:cmsonebj2001elx93kz4wm07s:3',
      score: 0.585854471,
      articleId: 'cmsonebj2001elx93kz4wm07s',
      title: 'NASA Provides Update on Moon Base Rovers, Landers, Missions',
      publishedAt: '2026-05-26T00:00:00.000Z'
    }
  ]
}

[aggregator] { kind: 'no_result', sourceCount: 0, sourceIds: [] }
 POST /api/chat 200 in 22759ms


Query:
`What is the capital of France?`

Response:
I can help with questions about the space-news sources currently indexed here.

Logs:
[selector] {
  route: 'NEITHER',
  useSql: false,
  useRag: false,
  reason: 'General knowledge question outside the NASA-indexed astronomy/space-news corpus; no corpus retrieval needed.',
  semanticQuery: null
}

[workflow] {
  route: 'NEITHER',
  useSql: false,
  useRag: false,
  reason: 'General knowledge question outside the NASA-indexed astronomy/space-news corpus; no corpus retrieval needed.'
}
 POST /api/chat 200 in 4273ms

Query:
`Write me a poem about Saturn.`

Response:
I can help with questions about the space-news sources currently indexed here.

Logs:
[selector] {
  route: 'NEITHER',
  useSql: false,
  useRag: false,
  reason: "Creative writing request (poem) that doesn't ask about the indexed NASA articles; no corpus retrieval required.",
  semanticQuery: null
}

[workflow] {
  route: 'NEITHER',
  useSql: false,
  useRag: false,
  reason: "Creative writing request (poem) that doesn't ask about the indexed NASA articles; no corpus retrieval required."
}
 POST /api/chat 200 in 5439ms

### Evaluation outcome and MVP correction

- SQL, RAG, BOTH, NEITHER, and no-result behavior all worked in the first
  manual round. TEMPO showed a useful retrieval pattern: the relevant chunks
  ranked clearly above unrelated lower-score candidates, so reranking is not
  justified by this evidence.
- The first June + Moon Base hybrid run exposed that query wording alone does
  not apply a hard date constraint to vector retrieval: May chunks appeared in
  the RAG candidate list. The aggregator's source cards could therefore mix
  SQL-list metadata with semantic evidence.
- Correction tested on August 13: for BOTH list results, the app now retrieves
  20 RAG candidates and deterministically retains only the first five whose
  Article IDs appear in the SQL list. The re-run logged five retained June
  chunks and cited June 24/30 source cards. This is deterministic filtering,
  not reranking and not Pinecone metadata filtering.
- SQL-only list results now attach their known Article cards in the application,
  even if the aggregator returns no IDs. This makes the recent-stories UI
  source-linked and avoids relying on the model for a deterministic list.

Query:
`Give me the most recent story you have`.

Response:
The most recent story is titled "NASA Shares Station Research Today Supporting Moon, Mars Tomorrow," published on August 11, 2026. It discusses how current research on the International Space Station is aiding future missions to the Moon and Mars.

Logs:

[selector] {
  route: 'SQL',
  useSql: true,
  useRag: false,
  reason: 'User requests the single most recent indexed story; this is a structured/latest-article query suited to the SQL article store.',
  semanticQuery: null
}

[workflow] {
  route: 'SQL',
  useSql: true,
  useRag: false,
  reason: 'User requests the single most recent indexed story; this is a structured/latest-article query suited to the SQL article store.'
}

[sql] {
  operation: 'list',
  publishedFrom: null,
  publishedTo: null,
  source: null,
  titleQuery: null,
  limit: 1,
  sort: 'newest'
}

[aggregator] {
  kind: 'answer',
  sourceCount: 1,
  sourceIds: [ 'cmsorgo4d0000lxvb139sxkbj' ]
}
 POST /api/chat 200 in 8765ms
