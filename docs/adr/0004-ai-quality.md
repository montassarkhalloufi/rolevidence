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

## Amendment — Job relevance before comparison (2026-09-11)

Product analysis uses a fixed two-call workflow. A job-only structured model classifies original passage IDs as candidate criteria, job conditions, headings, company background or publication metadata. It never sees the candidate CV. Only uniquely classified context passages are excluded from comparison; missing or duplicate classifications retain the passage. Invalid IDs reject the response. Context quotations remain available in result metadata and in a separate UI disclosure. Original source text and saved snapshots are unchanged.

This is semantic classification, not keyword filtering. The HTML adapter selects recognized JobPosting content fields to avoid copying publisher identifiers, dates and logos; free-text relevance remains model-driven. Ambiguous passages must be retained. A wrong but schema-valid context classification remains a risk: source validation cannot prove relevance.

Comparison covers the retained catalog. Unreferenced retained passages still produce MISSING_REQUIREMENT_ANALYSIS internally, displayed together as a partial-coverage notice, separately from evidence-verification findings and their counts. This is passage coverage, not proof of exhaustive atomic decomposition. No automatic repair, paid retry or agent loop is added. Each call is bounded to 120 seconds and 9,000 output tokens; totals include both calls.

The first combined classification/comparison experiment wrongly excluded real duties and was rejected. The separate job-only experiment on a long public offer preserved duties but comparison still omitted 37 passages. This limitation is exposed, not counted as successful complete analysis. See RELIABILITY.md.

## Amendment — Required passage coverage and clarification sources (2026-09-12)

Replace one unbounded comparison response with sequential groups of eight passages (maximum 16 groups). Each request-specific JSON schema requires every passage ID and a nonempty finding array. Map job quotations from the owning key. Failure rejects the analysis, never triggers an automatic paid repair. This fixed bounded workflow is not an agent loop. More calls trade cost/latency for verifiable passage coverage; atomic semantic completeness and correct conclusions remain unproven by structure.

Clarifications have separate C references and source quotes. Human-requested job passage reinclusion is honored only for exact source passages. Sources, overrides and statements belong to the immutable snapshot and input fingerprint. An observed model error attached duration metadata to a TypeScript criterion; duration rules now require duration information in the job before changing that conclusion.

## Amendment — Output integrity and repeated sources (2026-09-12)

A saved real result contained missing diacritics and U+0002 in candidate quotations
and interpretations while its immutable input texts were intact. Completed jobs do
not retain raw provider responses, so the stored result alone cannot attribute the
corruption to generation or decoding. Provider-adapter regression tests now verify
Unicode round trips through both actual LangChain integrations with mocked HTTP.

Reject parsed responses containing unexpected C0 controls, DEL or the Unicode
replacement character before checkpointing or accepting results. Tabs and line
breaks remain allowed. Recheck resumed checkpoint values. Never repair such text,
automatically retry a paid call, or relax quotation matching. Missing letters
without a control character remain detectable only through quotation verification;
this guard is not a general semantic or spelling validator.

Identical trimmed offer lines share one comparison entry, keeping the first original
ID and leaving the saved document unchanged. Distinct wording and conflicting
structured/prose requirements remain separate; this is not semantic deduplication.
The job-only relevance model can mark hiring logistics as recruitment_process;
employee duties involving interviews and mixed passages must remain retained.
Prompt versions change to invalidate incompatible interrupted checkpoints. Existing
completed snapshots remain immutable and require an explicit new analysis.

## Amendment — Canonical criteria before evidence comparison

After job-only relevance selection, a fixed job-only planning call creates atomic
criteria and groups equivalent mentions while retaining every original source ID.
It has no CV or preference access. All retained passage IDs must be covered;
unknown references or missing passage coverage reject the analysis. One source
paragraph can support multiple atomic criteria. Distinct levels, durations, locations
and work arrangements remain separate. Differences between prose and structured
metadata produce sourced offer warnings, outside candidate conclusion counts.

Comparison runs in batches of eight canonical criteria, at most 128 criteria,
with exactly one finding per planned criterion. Every consolidated job quote is
materialized from the source catalog and independently checked against the original
document. Source planning is still an untrusted semantic interpretation: ID coverage
does not prove correct grouping or exhaustive decomposition. No lexical skill
merging, automatic paid retry, tool access or agent loop is introduced.

Planning adds at most one paid call, included in latency/token totals and resumable
checkpoints (maximum 18 calls: relevance, planning, 16 comparisons). Old prompt
checkpoints are incompatible; completed saved results remain unchanged. Optional
jobQuotes and metadata.offerWarnings preserve old snapshots while exposing grouped
sources and ambiguity in the UI and exports. The backend duration policy now applies
only to backend requirements; it must not overwrite a fullstack comparison.

GPT-5.4 becomes the default following six targeted real executions passing versus
two of six for GPT-4.1-mini on identical final prompts and fixtures. Mini remains
selectable to preserve existing dossier choices; no analysis silently switches
providers/models. These small calibration results justify a local default, not a
universal accuracy claim. Pricing and account access depend on the provider; the
model remains configurable in .env. See RELIABILITY.md for failed and successful
runs. Official capability reference: https://developers.openai.com/api/docs/models/gpt-5.4
(Responses and structured output supported; default reasoning effort unchanged).

A real follow-up exposed a JSON-LD salary minimum misclassified as a ceiling and an
employer HR label counted as a candidate requirement. Extend the conservative salary
field guard to baseSalary; unsupported gross/fixed units cannot establish a match
or gap even when the JSON supplies numeric bounds. Job-only relevance distinguishes
employer branding/training opportunities/HR certifications from requested employee
duties. This remains semantic model classification, not a company-name denylist.

## Amendment — Qualified conclusions and declared education

Keep the four broad result groups while adding domain-owned assessment labels for
possible salary compatibility, a gap in the qualification presented, and a negotiable
preference. Partial model evidence remains unknown but is visibly labelled as an
indication needing clarification. Show the retained explanation prominently instead
of repeating the job quotation; keep original quotes and rejected reasoning separate.

The model can interpret the highest relevant completed qualification explicitly
presented, with candidate/required post-baccalaureate levels and an explicit,
recognized-qualification or uncertain basis. A recognized qualification is a model
interpretation, not an official equivalence decision. Only source-resolved education
quotes with provided candidate information and a lower interpreted level support a
narrowly labelled declared-qualification gap. Missing or uncertain qualifications
remain unknown. An unfinished course cannot establish an invented intermediate
degree. No conclusion asserts that the candidate has no other qualification or that
experience will be accepted/rejected by a recruiter. The quotation-kind guard is
conservative and not a universal international credential recognizer.

A verified open annual EUR salary minimum has no established upper bound. It stays
unknown with possible-compatibility wording, never an inferred promise of the desired
budget. Unrecognised units/currencies, malformed JSON or contradictory bounds do not
receive this label. Fixed annual gross salary rules are unchanged.

Optional salaryPriority/workModePriority values distinguish required from preferred.
Absent fields retain legacy required semantics and are not materialized into old
snapshots. A preferred condition is not a hard gap; preserve the observed difference
and explain negotiation remains open. No clarification text silently overwrites
structured preference choices. Priorities are part of saved inputs, request identity
and model context. Original saved results remain immutable.
