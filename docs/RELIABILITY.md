# Reliability observations

These are real HTTP calls through the local Express API to the configured OpenAI provider, using fictional documents. Expectations were fixed before each dataset was executed. Repetitions use distinct idempotency keys. Failed baselines remain intact.

## Observed progression

| Run                                  | Scenarios × repetitions | Conforming responses | Prompt                          | Median model latency |
| ------------------------------------ | ----------------------- | -------------------- | ------------------------------- | -------------------- |
| Initial baseline                     | 18 × 2                  | 28/36                | `evidence-v3.5-reliability`     | 2.46 s               |
| After scope/contradiction fixes      | 18 × 2                  | 31/36                | `evidence-v3.6-scope`           | 2.49 s               |
| After omission/source-boundary fixes | 18 × 3                  | 54/54                | `evidence-v3.7-source-boundary` | 2.45 s               |
| Additional adversarial formulations  | 4 × 2                   | 8/8                  | `evidence-v3.7-source-boundary` | 2.12 s               |

The final two runs met all 62 category, criterion-coverage and quotation checks (54 calibration responses and 8 additional responses). This is not a statistical guarantee of general accuracy or immunity to prompt injection. The calibration set informed fixes; the four additional scenarios were not used to tune those fixes.

## Failure analysis and fixes

- Baseline: seven extra/miscombined-criterion failures and one false production gap. In total eight failed responses; individual records are the authoritative source.
- Second run: four omitted salary analyses were exposed as review items, and one injected instruction was incorrectly used as a Java competency declaration.
- Fixes: constrain the requested scope; veto unsupported nonnegative skill contradictions; compare explicit work-mode choices/day ceilings; recover omitted explicit salary/work conditions using verified source fields; filter and reject known response-manipulation signatures.
- Manual inspection of one complete repetition also found an inflated offer paraphrase. The adapter now uses the original offer text for the summary; this final presentation change is covered by an offline regression and does not change the scored categories. Model reasoning remains separately available and can still be imperfect.

## Final matrix

| Scenario                | Conforming repetitions |
| ----------------------- | ---------------------- |
| javascript-not-java     | 3/3                    |
| java-explicit-negation  | 3/3                    |
| typescript-positive     | 3/3                    |
| compound-technologies   | 3/3                    |
| rag-course              | 3/3                    |
| rag-production          | 3/3                    |
| duration-fullstack      | 3/3                    |
| duration-exact-gap      | 3/3                    |
| salary-range-compatible | 3/3                    |
| salary-range-below      | 3/3                    |
| salary-missing-units    | 3/3                    |
| salary-bonus-total      | 3/3                    |
| remote-hybrid-gap       | 3/3                    |
| remote-choice           | 3/3                    |
| hybrid-days-gap         | 3/3                    |
| preference-missing      | 3/3                    |
| injection-at-end        | 3/3                    |
| typescript-wrapped      | 3/3                    |

## Real HTTP contract checks

One additional real analysis returned 200. A request using the same key/input returned 200 with `Idempotency-Replayed: true` and an identical response including the provider response ID. Changed input with that key returned 409, invalid input returned 400, and a missing local guard returned 403. This observes replay behavior, not provider billing internals.

Total for this work: 134 scenario analyses plus one contract-check analysis (135 provider responses). Four further HTTP control requests exercised replay/errors without new provider response IDs.

## Reproduce and inspect

Start the API before running these explicit, potentially billable commands:

```sh
npm run eval:api
EVAL_REPETITIONS=3 npm run eval:api
EVAL_SUITE=adversarial npm run eval:api
npm run eval:api-contract
```

Raw artifacts (ignored by Git; fictional inputs only):

- [api-1789115944499](../artifacts/evaluations/api-1789115944499/observations.json)
- [api-1789116220668](../artifacts/evaluations/api-1789116220668/observations.json)
- [api-1789116520394](../artifacts/evaluations/api-1789116520394/observations.json)
- [api-1789116678841](../artifacts/evaluations/api-1789116678841/observations.json)

## Practical limits

The checks verify expected categories, complete criterion counts, source-quote presence and trace metadata; they do not prove semantic entailment of every sentence. A denylist catches some explicit manipulations and can exclude educational quotations; arbitrary encodings/paraphrases and attacks in other sources remain unproven. Numeric/work-mode grammars intentionally defer unsupported wording. Rare variability remains possible despite three passing repetitions. The model never verifies the candidate’s actual competence.

Final offline verification: 52 backend/evaluation tests and 4 React tests passed (56 total), along with types, lint, architecture, OpenAPI consistency, formatting and production build.

## v0.2 provider adapter verification (2026-09-11)

`npm run eval:providers` executes fictional cases through the actual LangChain
adapters for each locally configured provider. It never runs in CI. The first
OpenAI attempt was rejected before generation because a nested nullable object
lacked `additionalProperties:false`. The schema is now explicitly strict and an
offline test checks the serialized full schema, not just a minimal example.

After correction, five OpenAI smoke checks passed: JavaScript does not establish
Java, explicit TypeScript practice, remote/hybrid preference mismatch, salary
without units, and quoted public-offer field extraction. Model returned:
`gpt-4.1-mini-2025-04-14`. Local observations:
`artifacts/evaluations/providers-1789127930495/observations.json`.
These are migration smoke/calibration checks, not a new independent benchmark or
a general reliability claim. The earlier v3.7 calibration record remains relevant
but does not establish Anthropic parity.

No Anthropic or LangSmith key was configured for this run. Both provider adapters
have simulated HTTP serialization, schema parsing, token accounting, invalid-output
and no-retry tests. OpenAI tests explicitly assert Responses transport and
`store:false`. Incomplete outputs are rejected even if their JSON parses. LangSmith
is checked through a fake sink for privacy and failure isolation; hosted delivery
has not been tested. A configured model is not necessarily available to an account.

## Public-offer relevance observations (2026-09-11)

Two paid product-adapter observations used a fictional Camille profile and the public Hellowork offer 83003216, not a private CV. Raw outputs remain in ignored local artifacts.

- `job-relevance-1789146567660`: combined preparation/comparison excluded real duties and conditions among 54 context passages. Rejected approach; failure retained.
- `job-relevance-1789146719386`: separate job-only preparation classified 20 headings/company passages as context. Manual inspection found duties retained. Comparison returned 8 matches, 3 unknowns and 37 omitted passages, exposed as partial coverage. Duration: 28.8 seconds; 5,874 input and 2,372 output tokens across both calls. This is not a complete-analysis pass or an accuracy benchmark.

Reproduce explicitly with `node --env-file-if-exists=.env scripts/eval-job-relevance.ts https://www.hellowork.com/fr-fr/emplois/83003216.html`. Current runs perform one preparation call plus bounded comparison batches, all potentially billable and fetches a changing public source. Broader semantic regression and repeated multi-provider validation remain necessary before claiming general reliability.

## v0.3 completion checks (2026-09-12)

The same public offer and fictional profile now use required passage keys in batches of eight. Run `job-relevance-1789222611534` returned 34 matches, 28 unknowns, no gaps, no verification findings and **zero omitted retained passages** (62 findings; 20 context passages). Combined model duration was 93.4 seconds, with 34,442 input and 8,937 output tokens. This demonstrates passage coverage on this observation, not exhaustive atomic decomposition or semantic correctness. The source can change and model relevance classification can still exclude a real criterion; the UI lets users reinclude an original context passage explicitly.

The first new provider smoke run (`providers-1789223166962`) passed 4/5 cases: spurious duration metadata downgraded a direct TypeScript statement. The domain now ignores duration metadata when the offer criterion has no duration requirement. Its regression test passes, and the fresh unchanged smoke suite passed **5/5** (`providers-1789223317343`). Failed observations were retained.

Six additional real comparisons passed in `release-1789223652493`: three fictional scenarios repeated twice. They check a Java declaration separately attributed from a JavaScript-only CV, RAG training remaining unknown for production experience, and atomic Java/TypeScript/Node.js/PostgreSQL comparison (three matches and one unknown). These small development evaluations are not an independent general-accuracy benchmark. Reproduce with `node --env-file-if-exists=.env scripts/eval-release.ts`; provider keys must be configured and calls are billable.

Artifacts above live under ignored `artifacts/evaluations/<run>/`; they are local observations, not files distributed with the repository. No private CV was used in these release evaluations. Anthropic live parity and hosted LangSmith delivery remain untested because their keys were not configured.

A clean source copy without keys, storage or dependencies passed `npm ci`, production build and startup under Node 24.18.0. The production server served the built React app and initialized SQLite with analysis correctly reported as unconfigured. This installation check ran on macOS, not Windows or Linux.

The final real HTTP regression replay `api-1789224139293` passed **18/18** unchanged historical scenarios (one repetition each) on `evidence-v4-required-passages`. This covers salary units/ranges/bonuses, work arrangements, duration scope, technology distinctions, RAG and the known injection regression. It is a regression replay, not a fresh held-out benchmark or a broad injection audit.

Final v0.3 local verification: **79 backend/evaluation tests, 9 React tests and 7 browser scenarios** passed (95 total), plus strict types, lint, architecture boundaries, OpenAPI drift, formatting and production build. The browser run used installed Chrome on macOS; CI independently installs Chromium on Linux.

## v0.4 resumability observation (2026-09-12)

`node --env-file-if-exists=.env scripts/eval-resume.ts` uses a fictional TypeScript profile and performs a deliberate interruption after preparation has completed and been checkpointed. The explicit second invocation resumes with that saved checkpoint. Run `resume-1789234420111` passed: preparation response identity was retained, one comparison completed, the final result contained one supported finding and no verification issues. Stored responses numbered two (preparation and comparison); combined completed-call duration was 4.5 seconds, with 2,177 input and 181 output tokens. Artifacts remain ignored locally.

This observes interruption between completed stages, not cancellation of a provider's billable in-flight work. Fake transport tests separately observe abort signaling, checkpoint counts and no repeated validated calls. The underlying semantic prompt is unchanged from v0.3; this is a workflow regression check, not a new semantic benchmark. Anthropic and hosted LangSmith still lack live verification.

The v0.4 offline suite includes 87 backend/evaluation tests, 9 React tests and 9 browser scenarios (105 total), with campaign source isolation in both directions, v0.3 database migration, transactional rollback, checkpoints, cancellation, stale commands, graceful/hard-stop recovery and deduplication after lost storage acknowledgement. Browser coverage includes mobile campaign layout, two independently saved comparisons and local member CV import. Strict types, lint, architecture, OpenAPI drift, formatting and production build are required before publication.

## Source integrity regression — 2026-09-12

Run `node --env-file-if-exists=.env scripts/eval-source-integrity.ts` explicitly
for paid calls. The two fictional cases run twice with fresh requests: accented
React/Node.js evidence plus an exact repeated job duty and absent Java; hiring
interview logistics versus an employee duty conducting technical interviews.

The first run passed 4/4 with unchanged expectations, no gaps or unverified quotes:
`artifacts/evaluations/source-integrity-1789236633867/observations.json`.
This is targeted calibration, not a held-out benchmark. No private CV was sent for
this evaluation. The reported user's completed historical result was inspected
locally and remains immutable. Its input accents were intact but some output
quotations were damaged. Raw completed provider payloads are unavailable, so their
origin cannot be established retrospectively. Offline adapter tests cover Unicode
round trips, explicit rejection of corrupted text without retries, and preservation
of unresolved quotes when letters are missing. Semantic duplicates and conflicting
JobPosting/prose requirements remain an explicit limitation.

## Canonical planning and model comparison — 2026-09-12

The source-integrity script now includes a third fictional scenario: repeated degree
wording and Node.js practice, explicit fullstack duration, differing 3-year/12-month
thresholds, residence in France versus workplace Nice, TELECOMMUTE with hybrid/day
preferences and an additional onsite statement, and salary with incomplete units.
The existing two scenarios are unchanged. Each scenario runs twice, with fresh
requests and unchanged final expected counts. Counts are supplemented by independent
quote checks and a required source warning in the conflicting-metadata scenario;
they are not a general semantic entailment grader.

Preserved intermediate runs:

- `source-integrity-1789240074267`: GPT-4.1-mini, 3/6; includes a rejected corrupted
  response, duplicate Node.js and an erroneous backend-only policy applied to fullstack.
- `source-integrity-1789240158248`: GPT-5.4, 4/6; no corrupted output, but over-separation
  of generic Node.js practice and over-conservative general-duration interpretation.

After correcting backend scope and clarifying generic practice versus explicit
advanced requirements, the identical final code, prompts and six expectations gave:

- `source-integrity-1789240266947`: GPT-5.4, **6/6**, 3.1–15.6 seconds per analysis;
  32,881 input and 4,964 output tokens across six completed analyses.
- `source-integrity-1789240320422`: GPT-4.1-mini, **2/6**, including another explicitly
  rejected corrupted response. Failed cases remain in the recorded observations.

Reproduce separately using `OPENAI_MODEL=gpt-5.4 node --env-file-if-exists=.env
scripts/eval-source-integrity.ts` and the same command with `gpt-4.1-mini`. Both are
paid operations; never run automatically in CI. The model change is a calibrated
product default, not evidence of universal accuracy. No private CV was used in this
comparison. Semantic over-grouping, missing atomic concepts within a covered paragraph,
provider errors and ambiguous candidate preferences remain limitations requiring review.

A subsequent real dossier verification (private snapshot retained locally only)
revealed two further errors despite the fictional comparison passing: a JSON-LD
salary minimum was interpreted as a maximum, and an employer HR certification was
turned into a candidate criterion. The failed saved analysis remains immutable.
The independent salary policy now treats `baseSalary` like other salary fields:
without a supported fixed gross annual basis it stays unknown, regardless of the
model's proposed match/gap. Job relevance instructions distinguish employer-brand
promises from candidate duties. A fourth fictional scenario covers both observed
errors; its introduction is additional calibration, not a held-out evaluation.

The expanded four-case suite passed **8/8** with GPT-5.4:
`source-integrity-1789240649722`. The real follow-up then contained no salary gap,
no unverified quotations and no employer HR certification criterion; source
experience-threshold warnings remained visible. A remaining over-split degree/level
prompted a fifth fixture with concatenated imported degree and duration wording.
With planning prompt `atomic-criteria-v3-qualified-atoms`, the targeted new case
passed **2/2**: `source-integrity-1789240844772`. A degree and its Bac+5 qualifier,
like a language and its proficiency, must remain one criterion. The earlier 8-case
run preceded that final prompt clarification and is not relabelled as a fresh run.
Use EVAL_FILTER=degree-level-is-one-qualified-criterion for the targeted paid test.
The default suite now has five scenarios, each repeated twice. No automatic paid
retry or hidden correction of failed history occurs.

The last private-dossier follow-up completed with 9 matches, 9 unknowns, no gaps
and no unverified quotations. It retained one sourced experience warning, kept
salary unknown, removed the employer HR-label criterion and kept the engineering
degree with its Bac+5 qualifier. The differently worded postgraduate credential
remained separate because equivalence across qualifications is not established.
These are observed counts, not verified candidate competence or an accuracy score.
The saved user snapshot remains local and is not a public evaluation fixture.
