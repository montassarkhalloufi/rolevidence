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

Entries expire five minutes after completion and the store is bounded to 100. Results and citations temporarily exist in server memory. Process restart, expiry and multiple processes are outside the guarantee. An HTTP disconnect does not cancel a shared provider request; the provider timeout remains 60 seconds. There is no exactly-once or provider-side deduplication claim.

The browser does not retry automatically. A deliberately new request may incur another charge. The import and context operations do not call a model and do not use the analysis idempotency store.

## Errors

Errors use `application/problem+json`: `type`, `title`, `status`, safe French `detail`, stable `code`, `requestId`. No raw SDK/parser errors or request payloads. 400 invalid input/body/key, 403 local request guard, 404 unknown route, 409 key conflict, 413 oversized body/file, 415 unsupported extension, 422 unreadable document/model refusal, 429 busy, 502 invalid/provider result, 503 unconfigured/capacity, 504 timeout. Busy/capacity responses include Retry-After; this is advisory and must not trigger automatic paid retries.

## Evolution

The API uses v1 routes and English JSON keys. Upgrade the local frontend and backend together and reload the page. Contract changes require updating schemas, generated OpenAPI and tests.

Collections, pagination, ETags, authentication and asynchronous jobs are not needed by the present endpoints. Define stable ordering/bounds for future collections and a durable polling/cancellation contract before returning 202. A new breaking public contract needs a new version or an explicit migration plan.

Application errors can be displayed with an explicit “prepare a new request” action. This resets the draft's logical key without immediately calling the provider; submitting again is a deliberately new, potentially billable attempt. Safe server completion logs contain only request ID, method, matched route, status and duration.

The current provider request preview contains `{id,text}` source passages. The provider returns selected IDs and a supporting profile quote, independently checked against profile passages; the API response materializes original `profileQuote`, `preferencesQuote` and `jobQuote` text. `verification.code` also supports `INCOMPARABLE_EXPERIENCE` and `MISSING_REQUIREMENT_ANALYSIS`. Unanalysed offer passages appear in `needsReview`, not as fabricated unknown findings. Response metadata identifies `analysis-v1.1`; reload the paired frontend after upgrading.
