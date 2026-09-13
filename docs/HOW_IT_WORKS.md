# How Rolevidence works

Rolevidence compares **declared evidence**, not a person's measured competence.
The same analysis pipeline serves job seekers and recruiters. It neither ranks
candidates nor makes hiring decisions.

## From documents to findings

1. **Prepare locally.** A bounded worker extracts PDF, DOCX or TXT text. Original
   CV files are not archived. Public offer import validates addresses and redirects,
   retrieves accessible HTML/JobPosting data, and uses the selected model to
   structure source-backed fields. The user reviews and adopts the text.
2. **Save an explicit input.** SQLite stores the dossier revision, extracted texts,
   candidate preferences and attributed clarifications. Tracking notes are separate.
   Analysis uses an immutable copy of the saved inputs and provider selection.
3. **Prepare job criteria with the model.** The pipeline distinguishes candidate
   requirements from offer context, and prepares canonical criteria from relevant
   passages. It tracks coverage and conflicting offer information separately.
4. **Compare in bounded calls.** LangChain adapters call OpenAI or Anthropic behind
   an application port. The model interprets practice, experience scope, education
   and evidence relationships. It selects source passages and supplies supporting
   quotations. There are no tools, autonomous agent loops, RAG or automatic retries.
5. **Validate independently.** Runtime schemas validate responses. Source resolution
   checks quotation provenance using conservative normalization. Pure domain code
   preserves missing information, validates numeric comparison constraints and
   distinguishes required from negotiable preferences. Failed quotation checks
   cannot become silently accepted matches.
6. **Preserve and explain.** Results include source quotes, model/prompt metadata
   and qualified explanations. Each analysis snapshot remains unchanged when a
   dossier is edited. Users can filter findings, clarify facts and export a report.

The model performs semantic interpretation; rules do not recognize skills through
substring matching. In particular, JavaScript does not establish Java knowledge.
Conversely, a valid quote does not prove that the model's interpretation is correct.
A stated qualification level is not an official credential equivalence decision.

## Product capabilities

| Capability              | Available behavior                                                   | Boundary                                                                                  |
| ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Local dossiers          | Create, search, rename, edit, reopen and delete                      | Explicit saves; no cloud sync or accounts                                                 |
| Document input          | PDF/DOCX/TXT and editable text                                       | No OCR for textless scanned PDFs                                                          |
| Public offer URLs       | Bounded retrieval, structured fields, source review                  | No login bypass; manual paste fallback                                                    |
| Candidate preferences   | Salary, work mode, remote days, required/preferred                   | Separate from CV; absent conditions stay uncertain                                        |
| Evidence analysis       | Matches, gaps, unknowns, review, filtering and quotes                | No score, competency verification or hiring verdict                                       |
| Clarifications          | Attributed statements and reassessment                               | Original CV and historical snapshots preserved                                            |
| Campaigns               | One profile to multiple offers, or one offer to multiple profiles    | 2–10 independent dossiers; start analyses individually                                    |
| Human tracking          | Status, notes, interview preparation and account                     | Excluded from model inputs                                                                |
| Long analyses           | Stage progress, cancellation, durable checkpoints, explicit resume   | An unfinished provider call may already be billed                                         |
| Reports and backups     | Escaped printable HTML and validated JSON restore                    | Exports contain private data; dossier JSON excludes campaign grouping and unfinished jobs |
| Providers and telemetry | OpenAI/Anthropic model adapters; optional technical LangSmith events | LangGraph and Deep Agents are not integrated                                              |

## Architecture

The backend is a modular monolith with four inward-dependent layers:

| Layer          | Responsibility                                                                     |
| -------------- | ---------------------------------------------------------------------------------- |
| Domain         | Plain TypeScript evidence policies, quote checks and classifications               |
| Application    | Use cases and consumer-owned ports for models, dossiers and jobs                   |
| Adapters       | HTTP mapping and provider request/response translation                             |
| Infrastructure | Express composition, provider transports, SQLite, workers and public URL retrieval |

Provider-neutral prompts, source catalogs, extraction schemas and mappings live in
`server/adapters/models`. The active LangChain SDK configurations are explicit in
`server/infrastructure/models/openai.ts` and `anthropic.ts`; `model-client.ts`
shares concurrency, cancellation and response validation. The remaining
`server/adapters/openai` modules and `infrastructure/openai-client.ts` support the
historical direct-SDK semantic evaluation script, not the application's provider
selection. Both active providers use the same evidence pipeline.

HTTP case-file operations live in `server/adapters/http/case-file-routes.ts`.
Source modules, types and components consistently use `CaseFile`/`case-files`.
Historical `/api/v1/dossiers` URLs, OpenAPI component names and persisted DTO keys
remain stable for client and backup compatibility. French product messages live
in locale catalogues; model prompts and French document grammars are intentional
language data, preserved without changing the evidence pipeline. Shared HTTP input
validation lives in `server/adapters/http/input.ts`.

The Vite/React client is organized by feature. Responsibility-focused hooks and
TanStack Query own server interactions; visual components compose shadcn-based
primitives and semantic Tailwind tokens. There are no microfrontends. Shared schemas
validate API boundaries without importing UI or provider SDKs into the domain.

See [ADRs](adr), [API semantics](API.md), [engineering policy](../CONTRIBUTING.md)
and [product scope](PRODUCT.md) for the authoritative decisions.

## Reliability and privacy

Structural checks, quotation checks, semantic evaluations and browser tests cover
different failure modes. Passing tests is not a universal accuracy guarantee.
[RELIABILITY.md](RELIABILITY.md) preserves both failed and successful real evaluations
and their limitations. Offline tests and the public walkthrough use fictional data;
the walkthrough uses a scripted provider and is not a model benchmark.

Saved state is local and unencrypted. AI requests still transmit selected texts to
the configured provider. API keys remain server-side. Optional LangSmith events
exclude document content and automatic payload tracing stays disabled. Cancellation
is best effort; checkpoint recovery cannot undo provider billing. See
[SECURITY.md](../SECURITY.md) and [OPERATIONS.md](OPERATIONS.md).

## Operational boundaries

Current storage uses SQLite schema 3 and optimistic dossier revisions. Original
CV binaries are not archived. Model preparation and comparison are bounded; each
comparison call handles up to eight passages, with at most 16 comparison calls.
Completed snapshots are immutable and require an explicit new analysis to benefit
from later model or prompt changes. Canonical criteria retain their source quotes;
conflicting offer statements receive separate warnings rather than invented facts.

Public imports support default HTTP(S) ports with bounded redirects and retrieval.
Login walls, browser-rendered pages and ambiguous multiple JobPostings can require
manual pasting. Worker isolation is not an OS security sandbox. Unknown newer
SQLite schemas fail closed. Deletion cannot remove exported copies or OS backups;
legacy synchronous idempotency entries can remain in process memory until expiry.

OpenAI observations are documented in [RELIABILITY.md](RELIABILITY.md). Live Anthropic
accuracy, hosted LangSmith delivery, Windows compatibility and a complete assistive
technology audit remain outside the verified coverage. Follow [OPERATIONS.md](OPERATIONS.md)
for upgrades, backup limits, cancellation and checkpoint compatibility.

## Review corrections (2026-09-13)

The HTTP server validates loopback Host names before API or static handling.
It accepts localhost, 127.0.0.1 and [::1], optionally followed by a port; foreign
hosts return safe 403 responses. The custom mutation header remains a browser
guard, not authentication.

A synchronous execution reserves a fresh internal persistence UUID inside its
idempotency outcome. Replays and storage retries reuse that UUID; a genuinely new
execution after cache expiry/restart receives another one and retains its own
snapshot. Durable jobs continue to use their stable job IDs for checkpoint recovery.

Latest-job reads prioritize the active execution and then most recently updated jobs.
When a persisted running job has no active execution in this process, the runner
exposes it as interrupted. This lets polling settle even if the failure-state write
failed. Explicit resume retries storage before contacting a provider; a continuing
storage failure cannot authorize model work. Restart recovery remains unchanged.

HTML reports and the evidence reader share retained-summary logic. Rejected model
explanations appear only as explicitly labelled diagnostic reasoning in reports.
Case-file workspace components have separate preparation, settings, tracking,
navigation, form and result responsibilities. ESLint limits production modules to
300 nonblank/noncomment lines, and HTTP composition follows the route spacing rule.
