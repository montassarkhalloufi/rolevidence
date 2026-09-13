# Live verification — 2026-09-13

Scope: public source release of the local, single-user application. Real calls
were explicitly authorized and used fictional repository scenarios. They can incur
provider charges; this report does not claim a cost total or general AI accuracy.
The test server used a separate temporary SQLite database, not the user's storage.

## Offline and browser verification

- `npm run quality`: TypeScript, ESLint, dependency direction, generated OpenAPI,
  formatting, 112 backend tests, 13 UI tests and production build.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: nine browser journeys covering
  both campaign roles, save/reopen, history, deletion, clarification, report/backup
  exports and restoration, cancellation/resume, keyboard focus and responsive UI.
- `node --experimental-test-coverage --test tests/*.test.ts`: 95.30% lines,
  89.45% branches and 93.54% functions across the files loaded by this backend
  suite. This is not whole-application coverage or a claim that every branch is
  tested. Offer-import routes and the telemetry module reach 100% line coverage.
- New offer-import route tests verify rejection before transport, source validation,
  discarded invented fields, replay, changed-input conflict and cached failures.
- New telemetry tests exercise the actual serialized HTTP payload, EU endpoint,
  empty inputs/outputs, failure status, pending-event cap, released capacity,
  timeout, disabled redirects, safe errors and absence of transport retries.

## Real observations

| Capability                             | Observation                                                                                                                                       | Local evidence                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| OpenAI GPT-5.4 and GPT-4.1-mini        | Four analyses and one offer extraction per model: 10/10                                                                                           | `providers-1789289595296/observations.json`                                      |
| Anthropic Claude Sonnet 4.6            | Four analyses and one offer extraction: 5/5                                                                                                       | `providers-1789289762317/observations.json`                                      |
| OpenAI HTTP stress suite               | All 18 scenarios, one repetition: 18/18                                                                                                           | `api-1789289780972/observations.json`                                            |
| Anthropic HTTP stress suite            | All 18 scenarios, one repetition: 18/18                                                                                                           | `api-1789290142704/observations.json`                                            |
| OpenAI separate adversarial suite      | Four scenarios, one repetition: 4/4                                                                                                               | `api-1789289907214/observations.json`                                            |
| Anthropic separate adversarial suite   | Four scenarios, one repetition: 4/4                                                                                                               | `api-1789290353368/observations.json`                                            |
| Real HTTP contract                     | Successful analysis, identical replay, 409 conflict, 400 invalid input, 403 missing local header                                                  | `api-contract-1789289983113.json`                                                |
| Anthropic checkpoint resume            | Interruption after relevance, preserved first response identity and successful remaining comparison                                               | `resume-1789290010480/observation.json`, `live-verification/resume-rescore.json` |
| EU LangSmith                           | 59 inspected runs included Anthropic, OpenAI and the corrected direct transport; all input/output maps empty, no provider response ID in metadata | `live-verification/langsmith.json`                                               |
| Built application and document uploads | HTML/bootstrap return 200; real TXT/PDF/DOCX fixtures extract TypeScript text                                                                     | `live-verification/production-http.json`                                         |
| Public HTTPS retrieval                 | Actual pinned transport retrieves example.com HTML                                                                                                | Direct local observation, 559 bytes                                              |

Evidence paths are relative to ignored `artifacts/evaluations/`. Raw responses
remain local and are not published with the source. The initial combined provider
run stopped on Anthropic authentication after ten successful OpenAI observations;
its ten records are not evidence of an Anthropic success. After the owner replaced
the invalid key, the separate Anthropic suite passed.

The resume grader was temporarily changed to expect three stages, producing a
false failure. Inspection showed the single-line offer correctly uses two stages
because canonical planning is intentionally skipped for this case. The existing
two-stage grader was restored and the same observation rescored without another
paid call. The original failed observation is preserved, with the reason separately
recorded; this is not presented as an originally passing grader execution.

## Corrections discovered by verification

The LangSmith key authenticated against the EU endpoint and returned 403 against
the default US endpoint. Only the ignored local .env was changed to the verified
EU URL; .env.example and operations documentation explain regional configuration.

The installed LangSmith SDK overwrites the no-retry setting for direct createRun
calls. Replace that path with the documented content-free REST request. One event
has one request, a two-second deadline and no redirects. Telemetry remains
asynchronous, bounded and isolated from analysis. Live ingestion of the corrected
transport succeeded. ADR 0005 records this narrowly scoped transport decision.

The HTTP evaluation script now accepts EVAL_PROVIDER and EVAL_MODEL together, so
both providers can be assessed using exactly the same scenarios and grader:

```sh
EVAL_PROVIDER=anthropic EVAL_MODEL=claude-sonnet-4-6 EVAL_REPETITIONS=1 npm run eval:api
EVAL_PROVIDER=anthropic EVAL_MODEL=claude-sonnet-4-6 EVAL_SUITE=adversarial EVAL_REPETITIONS=1 npm run eval:api
```

Start an isolated local API first. Run suites sequentially against it. Omit the
selection variables to retain the configured default provider. One repetition
is a bounded release observation; use repeated independent cases for broader claims.

## Public repository checks and remaining limits

- GitHub repository visibility is public and the repository has an MIT license.
- All 20 reachable commits were scanned for the three currently configured keys
  and common OpenAI/Anthropic/LangSmith/private-key patterns: zero matches.
  This scoped check is not a universal secret-detection guarantee.
- Runtime keys, SQLite databases and evaluation artifacts are ignored. Published
  document fixtures are fictional. No runtime/private data is included in this change.
- `npm audit --omit=dev`: zero known vulnerabilities at the time of this check.
- GitHub main had successful Linux quality/browser CI for the existing merge.
  Main-branch protection was disabled when inspected; repository settings were not
  changed. A passing workflow does not enforce mandatory review by itself.
- Windows, Firefox/Safari, full screen-reader accessibility, every external job
  site, real in-flight cancellation billing and arbitrary model/prompt attacks
  remain outside verified coverage. No public application hosting was performed.
- Trace delivery is best effort and may be lost during shutdown or remote failure.
  Small live suites are calibration observations, not a semantic parity guarantee.
