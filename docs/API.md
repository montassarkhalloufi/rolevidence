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

Collections, pagination, ETags, authentication and asynchronous jobs are not needed by the present endpoints. Define stable ordering/bounds for future collections and a durable polling/cancellation contract before returning 202. A new breaking public contract needs a new version or an explicit migration plan.

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
