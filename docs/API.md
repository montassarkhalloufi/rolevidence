# Local API contract

See [OpenAPI](openapi.json) and [ADR 0002](adr/0002-api-idempotency.md). Runtime Zod schemas generate the schema sections; route behavior is integration-tested. Update this document and tests when changing semantics.

| Endpoint                        | Purpose                                           | Success |
| ------------------------------- | ------------------------------------------------- | ------- |
| GET /api/v1/bootstrap           | Load fictional examples and provider availability | 200     |
| POST /api/v1/resume-extractions | Extract one multipart `cv` file locally           | 200     |
| POST /api/v1/analysis-context   | Preview the provider request without a model call | 200     |
| POST /api/v1/analyses           | Run or replay a synchronous analysis              | 200     |

POST requests require `X-Rolevidence: 1` and JSON content type, except multipart resume extraction. This is a local browser guard, not authentication. The server binds to loopback and does not enable CORS. Every API response uses `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and a generated `X-Request-Id`.

## Idempotency

Send `Idempotency-Key` on analyses. Use a random UUID for a new logical attempt and reuse it after a lost response. Never derive it from a CV or email. The client keeps it only in memory for the current draft. Repeated submission of that draft replays the result within the server retention window; editing the input starts a new request.

Same key and canonical validated input shares the running promise or replays the result. `Idempotency-Replayed` indicates this. Different input with the same key returns 409. Other analyses while one runs return 429. Invalid inputs/headers are rejected before reservation. Store capacity returns 503 without executing the provider. Failed provider outcomes are retained, because the remote execution may already have happened.

Entries expire five minutes after completion and the store is bounded to 100. Results and citations temporarily exist in server memory. Process restart, expiry and multiple processes are outside the guarantee. An HTTP disconnect does not cancel a shared provider request; each provider call has a 120-second timeout. Product analysis performs job relevance followed by sequential batches of eight retained passages, at most 16 comparison calls, without automatic retry. There is no exactly-once or provider-side deduplication claim.

The browser does not retry automatically. A deliberately new request may incur another charge. Resume extraction and context preview do not call a model and do not use the analysis idempotency store.

## Errors

Errors use `application/problem+json`: `type`, `title`, `status`, safe French `detail`, stable `code`, `requestId`. No raw SDK/parser errors or request payloads. 400 invalid input/body/key, 403 local request guard, 404 unknown route, 409 key conflict, 413 oversized body/file, 415 unsupported extension, 422 unreadable document/model refusal, 429 busy, 502 invalid/provider result, 503 unconfigured/capacity, 504 timeout. Busy/capacity responses include Retry-After; this is advisory and must not trigger automatic paid retries.

## Evolution

The API uses v1 routes and English JSON keys. Upgrade the local frontend and backend together and reload the page. Contract changes require updating schemas, generated OpenAPI and tests.

Collections and durable job polling are defined below. ETags and authentication remain outside the local scope. A new breaking public contract needs a new version or an explicit migration plan.

Application errors can be displayed with an explicit “prepare a new request” action. This resets the draft's logical key without immediately calling the provider; submitting again is a deliberately new, potentially billable attempt. Safe server completion logs contain only request ID, method, matched route, status and duration.

The current provider request preview contains `{id,text}` source passages. The provider returns selected IDs and a supporting profile quote, independently checked against profile passages; the API response materializes original `profileQuote`, `preferencesQuote` and `jobQuote` text. `verification.code` also supports `INCOMPARABLE_EXPERIENCE` and `MISSING_REQUIREMENT_ANALYSIS`. Unanalysed offer passages appear in `needsReview`, not as fabricated unknown findings. Response metadata identifies `analysis-v1.1`; reload the paired frontend after upgrading.

## v0.2 local resources

- `GET /api/v1/dossiers?q=&offset=0&limit=20`: title substring search, stable
  `updatedAt DESC, id DESC` ordering; offset 0–100000, limit 1–50.
- `GET /api/v1/dossiers/:id`: current saved draft.
- `PUT /api/v1/dossiers/:id`: `{draft,revision}` with a client UUID. Revision 0
  creates (201 + Location); subsequent saves require the current revision (200).
  Stale saves return 409 and never overwrite another tab's work.
- `DELETE /api/v1/dossiers/:id`: `{revision}`; atomically removes the dossier and
  its analyses. Returns `{deleted:true}`; a missing dossier returns 404.
- `GET /api/v1/dossiers/:id/analyses`: offset/limit as above, stable
  `createdAt DESC, id DESC` ordering, immutable input snapshots and results.
- `POST /api/v1/offer-imports`: `{url,selection:{provider,model}}` and an
  Idempotency-Key. Fetches a public page then performs a paid structured extraction.
  Response contains source URL, retrieval date, original extracted text, verified
  fields, rejected-field count and model metadata. Nothing is saved until adoption
  and an explicit dossier save. Failures suggest pasting the original offer.

The local header and JSON content-type guard apply to PUT and DELETE as well as
POST. Analysis/import bodies remain bounded to 160 KiB; dossier snapshots with
source provenance allow up to 2 MiB. Collections never return raw file data.

Analysis/context input additionally accepts `selection:{provider,model}`.
Dossier analysis includes `dossierId` and `dossierRevision`; inputs and selection
must match the saved dossier. The actual trimmed provider texts are snapshotted.
Provider selection and dossier revision participate in the request fingerprint.
Preview is available without a provider key and never invokes the model.

Successful dossier analyses are stored before HTTP success. A database failure
returns 507. Within the idempotency window, retrying the SAME key and input retries
only persistence, not the paid call; opening a new request may incur another charge.
Completed request snapshots still occupy bounded process memory until expiry even
if the dossier is deleted. Deletion prevents subsequent reattachment to that dossier.

Offer imports have a separate bounded single-flight, five-minute/100-entry outcome
cache with the same replay/conflict/failure semantics as analysis. Neither cache
survives process restart. No background job or interrupted request is automatically
resumed. SQLite persistence does not imply durable provider request idempotency.

Analysis metadata optionally includes `preparationVersion` and `contextPassages` (original quote and classification reason). These record job-only semantic preparation; original dossier snapshots remain unchanged. Duration and token totals include both calls. Context preview shows the complete source catalog and explains preparation; it cannot predict the selected catalog without a paid call. Offer URL import uses a model to structure the retrieved page.

## 0.3 clarification and portability

Documents optionally include `clarifications` (16,000 characters) and `reviewedJobQuotes` (up to 128 original passages). Both participate in snapshots and idempotency fingerprints. Findings optionally include `clarificationQuote`; it is never labelled as CV evidence. Exact original job text is required for a manual reinclusion to have any effect.

`GET /api/v1/dossiers/:id/backup` exports format `rolevidence-backup-v1`, dossier and up to 100 analyses within 8 MiB. `POST /api/v1/dossiers/restore` accepts that format (8 MiB body), validates source/dossier linkage, and returns 201 + Location for an isolated copy. Restoration is transactional; existing dossiers are unchanged. Each explicit successful POST creates a new copy; no automatic client retry. Normal dossier bodies retain the 2 MiB limit. Restored results are user-imported historical data, not reverified model executions.

## v0.4 campaigns and durable analyses

- `GET /api/v1/campaigns?offset=0`: stable creation/ID ordering, 20 summaries per page, offset up to 100,000.
- `PUT /api/v1/campaigns/{uuid}`: validated title, baseId/baseRevision and 2–10 named document texts. Copies the shared side according to the source dossier's purpose. Identical UUID/input replays (201); changed input returns 409. All members are created transactionally.
- `GET /api/v1/campaigns/{uuid}`: members with latest immutable analyses. A changed dossier does not rewrite that result.
- `DELETE /api/v1/campaigns/{uuid}`: removes grouping, retains dossiers/history. Deleting a dossier independently removes its memberships.
- `PUT /api/v1/analysis-jobs/{uuid}`: `{ dossierId, revision }`, requires complete saved inputs. Returns 202 and Location while accepted/stopped; completed replay returns 200. Same UUID/input never starts another call; changed identity returns 409. One active job, no implicit queue.
- `GET /api/v1/analysis-jobs/{uuid}` and `GET /api/v1/dossiers/{uuid}/latest-job`: actual stage, completed/total batches, attempt, status and optional saved result. Latest may be null. Raw checkpoint responses are never part of the public job DTO.
- `POST /api/v1/analysis-jobs/{uuid}/cancel` and `/resume`: `{ attempt }`, compared with the observed attempt. Cancel requests transport abort and returns current state (200); poll until cancellation settles. Resume returns 202, increments attempt and retains original sources. Stale attempts conflict. These commands are never automatically retried by the client.

All mutations require the local request guard. Campaign input has a 2 MiB body limit. Job identity replaces a transient idempotency header for these new resources; the legacy synchronous analysis route keeps its previous contract. Closing the browser does not cancel a job. Restart never resumes paid calls automatically. Completed checkpointed responses are schema-validated again on explicit resume; an interrupted uncheckpointed call may be charged twice. A storage failure never authorizes an automatic model retry.

Optional dossier `tracking` contains status, notes, preparation and interview fields (8,000 characters each). It is included in local backups/snapshots but excluded from provider inputs. Workflow startup resolves the exact saved selection. Use a single server process per SQLite database.

## Canonical criterion preparation

The current workflow performs relevance selection, an additional job-only canonical
criterion planning call when multiple passages remain, then batches of eight
canonical criteria. Maximum: 128 criteria and 18 provider calls. All retained source
IDs must be represented; failure is explicit without an automatic paid retry.
Planning responses are checkpointed and included in token/duration totals. Existing
idempotency and immutable input snapshot semantics remain unchanged.

Findings optionally include `jobQuotes`, all verified original passages supporting
a grouped criterion; `jobQuote` remains its primary source for compatibility.
Metadata optionally includes `offerWarnings: [{ explanation, quotes }]` for ambiguous
or differing offer conditions. These warnings are separate from candidate findings.
Older saved payloads without either field remain valid. Generated OpenAPI includes
both additions; upgrade local frontend and backend together.

## Qualified assessments and preference priorities

Preferences accept optional `salaryPriority` and `workModePriority` (`required` or
`preferred`); omission preserves the earlier required semantics. Work-mode priority
also applies to the requested remote-day minimum. Explicit changes belong to the
saved document revision and analysis fingerprint, never an update to old results.

Findings optionally carry domain-owned `assessment` values (`possible_compatibility`,
`declared_education_gap`, `negotiable_preference`) and a nullable `educationComparison`
with interpreted candidate/required levels and basis. These refine presentation,
not the four top-level groups. Provider education proposals are independently checked
for quote provenance and invalid/incomplete qualification evidence before a declared
education gap is retained. Old responses without these optional fields remain valid.
Generated OpenAPI describes the updated contracts. No endpoint/idempotency/retry
semantics change. Comparison prompt version is evidence-v6.1-qualified-conclusions.

## Host validation and execution recovery (2026-09-13)

All routes, including static assets and read-only endpoints, require a Host of
`localhost`, `127.0.0.1` or `[::1]`, optionally with a port. Foreign/malformed hosts
return 403 problem details before resource access. This blocks untrusted hostname
routing without adding authentication or changing the loopback deployment scope.

Synchronous replay shares an execution-specific internal persistence UUID. After
cache expiry or process restart, a new execution with the same external key can
call the provider again, as documented, and must retain its own new history entry.
Persistence retries within the existing outcome still avoid another provider call.

Latest-job selection prioritizes the active execution, then updatedAt, createdAt and ID
in descending order. Resuming an older job therefore makes its progress visible.
A stored running record with no active execution is reported as interrupted, even
if a failure prevented the terminal state from being written. Resume remains
explicit, checks attempt identity, and persists its new attempt before model work.
No new endpoint, DTO key or SQLite migration is introduced. Legacy dossier URLs,
backup fields and OpenAPI component names remain compatible with renamed CaseFile
source symbols.
