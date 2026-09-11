# ADR 0004 — Semantic interpretation with independently checked evidence

Status: Accepted · 2026-09-10

## Decision

Retain the official OpenAI SDK and Responses API behind an application port. The model extracts atomic requirements and interprets evidence. Pure TypeScript determines categories and checks source quotes with conservative typographic normalization. Do not use substring skill matching as a substitute for semantic interpretation (Java is not JavaScript).

Missing information is unknown, not contradictory. Indirect evidence does not prove the requested level. Exact quotes do not prove relevance. Unresolvable evidence for a proposed definite conclusion is `needsReview`, not evidence of a missing skill. Salary and work arrangements belong to preferences rather than the CV. No magic score or automated hiring decision.

Treat all imported text as untrusted data. No tool access in the analysis workflow; prompts reject document instructions. Validate model output, explicitly handle refusal/incomplete/invalid responses, bound tokens/time and disable SDK retries. Keep requested model configuration. Record prompt/schema version, provider response ID, tokens and duration with results. Do not expose raw provider errors or log CVs/requests.

Use `store:false`; do not describe it as a guarantee of zero provider retention. Document imports remain local and bounded; the extraction worker is not a security sandbox. Do not claim that prompt instructions eliminate injection or bias.

## Evaluation and limitations

Offline tests prove classification/transport behavior on controlled fixtures, not live model accuracy. Calibration cases represented in the prompt are not an independent benchmark. Keep held-out cases separate and report accuracy by case type, quote validity, false matches, latency and token use when running paid evaluations. A model/prompt change needs a documented evaluation result or a clear statement that live validation remains unperformed.

Before adding agents/tools: define permissions, bounded iteration/tool budgets, external action approval, failure recovery, traces and tool contract tests. Before RAG: define corpus provenance, access boundaries, retrieval evaluation and citation quality. These are future capability gates, not implemented features.

Source: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Structural conformance does not guarantee correct reasoning or factual conclusions.

## Amendment — Source-selected evidence and omission checks

A real test exposed paraphrased job quotes, an ellipsis in a profile quote, an omitted salary line and an unjustified comparison of a lower-bound fullstack duration with a backend minimum.

The provider selects passage IDs from a request-specific enum. For profile evidence it also supplies a short supporting quote: the adapter validates that quote against the selected passage, then the other profile passages if the ID was misplaced. Only conservative exact/typographic matching is allowed; invented quotes remain unverified. Job and preference quotes are materialized directly from selected IDs. The adapter builds a source catalog (complete profile sentences with preserved source offsets, and individual job lines), validates references and returns original source substrings to the domain. Multiple atomic technologies can reference the same original job sentence. The public response still contains readable quotations. Model interpretation remains necessary: valid IDs do not prove relevance.

Every non-heading job line must be referenced. An unreferenced line becomes `needsReview` with `MISSING_REQUIREMENT_ANALYSIS`; it is never silently dropped or turned into an invented conclusion. This checks passage coverage, not completeness of every atomic concept within a shared line. Model-guided decomposition still needs semantic evaluation.

Duration interpretation includes scope comparability and whether the candidate duration is exact, a lower bound or unknown. The domain prevents a definite comparison across incompatible scopes and conservatively rejects contradictions based only on an uncertain/lower-bound candidate duration. A lexical guard recognizes explicit numeric lower-bound notation in the cited source even if the model mislabels it. This is a duration safety rule, not a skill recognizer or a full temporal reasoning engine. It may require clarification for complex upper-bound/range requirements; it does not calculate overlapping employment periods.

Prompt version: `evidence-v3.3-source-ids`; output schema metadata: `analysis-v1.1`. No additional model call or automatic repair retry is introduced. Tests use fictional evidence and cover catalog selection, bad IDs, omitted conditions, lower bounds and exact comparable durations.

A missing described candidate fact also prevents a definite classification even if the model inconsistently labels the information as provided. Rejected model reasoning remains available but is explicitly labelled as not retained in the UI. Profile sentence segmentation masks soft line breaks only for boundary detection and slices the original source, so citations remain unchanged. Heading boundaries are preserved.

A targeted live retest of v3.3 returned four declared matches, six unknowns, no gaps and no review items, with source-grounded quotes. This is calibration on the reported case, not a held-out benchmark. Free-form explanations can still overstate evidence: the model described a lower bound as below a minimum despite correctly classifying the duration as unknown. Quote verification cannot establish semantic entailment or actual competence.

## Amendment — Preference comparisons and evidence diagnostics (2026-09-11)

Work mode is compared with the candidate preference, never with a presumed ability to adapt or a missing CV statement. For verified, unambiguous whole fields such as `Télétravail : hybride`, a pure domain comparison overrides model speculation and uses only the structured preference and job evidence. Selected modes are treated as requested constraints: different modes are a gap. Matching hybrid modes with an unspecified required number of remote days remain unknown. Missing preferences remain unknown. Negated, conditional and alternative wording is outside this narrow field parser and remains model-interpreted; this is not a general natural-language recognizer. Duplicate interpretations of one explicit work field are consolidated without merging shared technology requirements. More flexible preference choices need an explicit future input contract.

Unresolved profile excerpts now reach the domain verifier intact. An exact contiguous quote spanning catalog sentence boundaries can be validated against the complete original CV. Invalid proposals are retained only in verification diagnostics, never as verified citations. The UI marks only the missing evidence source as unverified and does not display a retained supported state for a review item.

Prompt `evidence-v3.4-preferences` reinforces preference comparisons and salary-unit uncertainty. Targeted live testing confirmed the remote/hybrid gap and valid technology excerpts, but still exposed overconfident salary and duration comparisons. These semantic limits remain unresolved; the prompt alone is not an enforcement mechanism for those conditions. No general accuracy claim is made.

## Amendment — Numeric policies and reliability gate (2026-09-11)

Successful integration alone does not establish reliability. Salary and backend-duration comparisons now replace model arithmetic and its explanation with pure, source-checked decisions. Fixed gross annual EUR amounts/ranges compare against the structured minimum; a range reaching the minimum means possible compatibility, never a guaranteed offer. Missing/unsupported units, bonuses mixed into totals, inverted ranges and missing preferences remain unknown. The accepted salary grammar is intentionally narrow and requires an explicit salary field, currency, annual gross basis and fixed component. It does not convert currencies, monthly amounts, net/gross pay or estimate salary.

For explicit minimum-backend requirements, comparable direct duration statements can support a match or gap. Lower bounds below a minimum cannot support a gap. General fullstack seniority, inferred job tenure, negations and unrecognised formulations remain unknown. Model-provided scope metadata alone is no longer sufficient for a numeric decision. This conservative grammar is not a general temporal parser; it can defer valid but more elaborate evidence rather than overclaiming. Original quotes are retained, and the user-facing explanation describes the limitation instead of repeating erroneous model arithmetic.

Prompt v3.5 distinguishes a relevant indirect fact from absent information. A v3.4 evaluation initially passed 3/4 reserved cases, with a safe but incorrectly labelled indirect fact. After using this feedback, the four cases passed on v3.5 and must now be treated as calibration regressions, not independent held-out evidence. Six additional acceptance cases were executed once. Five passed the initial single-finding evaluator. Manual inspection showed the sixth correctly decomposed unit/integration tests; the evaluator now accepts that complete alternative while rejecting omissions, swapped relations and unjustified global matches. Offline rescoring of the same recorded responses passed 6/6, without another model call. This grader change is disclosed rather than presented as six originally passing runs.

These small suites do not prove general semantic accuracy or stability across repeated runs. Phase progression requires review of remaining uncertainty, not an assertion of zero hallucinations. Document evidence remains declarative; no hiring decision is automated.

## Amendment — Repeated HTTP observations and source boundaries (2026-09-11)

The user requested repeated real API observations before release. A fixed matrix of 18 fictional scenarios now checks final categories, exact criterion counts, missing/extra criteria, source quotations and evidence presence for definite conclusions. Every repetition uses a fresh idempotency key; raw responses and metadata are saved after each request in timestamped ignored directories. Separate real HTTP checks verify replay and error statuses. These are separate from offline tests and do not run in CI.

The first 36-call baseline failed eight expectations, including invented salary/work criteria and a training-to-production false gap. The next 36-call run failed five: four omitted explicit salary analyses (safely exposed as review items) and one critical false Java match using an injected instruction as a quote. No baseline failure was deleted or rescored into a pass.

The prompt now limits criteria to the actual offer and relevant preferences. A conservative contradiction veto prevents nonnegative profile text from supporting a gap before independently checked numeric policies; it is not proof that a detected negation is relevant. Explicit work-mode alternatives and day ceilings have narrow supported grammars. Omitted explicit salary/work fields can be recovered by the existing source-checked pure policies without another model call; other omitted criteria still require review.

Known response-manipulation signatures are excluded from the profile passage catalog and independently rejected as candidate evidence in classification. Original user documents are not edited. The request preview exposes the actual remaining catalog. This is a limited denylist, not a general prompt-injection defence; educational quotations containing these signatures may also be excluded and require clarification. Arbitrary paraphrases, encodings, instructions in other sources and semantic relevance still require broader adversarial evaluation. Matching a quotation alone is never claimed to prove competence.

See RELIABILITY.md for immutable run locations, final counts, reproduction commands and remaining limits. The third run uses prompt v3.7 and unchanged expectations; fresh adversarial formulations are evaluated separately.
