# Reliability observations — 2026-09-11

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
