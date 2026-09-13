# ADR 0002 — Versioned API and bounded local idempotency

Status: Accepted · 2026-09-10

## Context

Analysis is a paid POST operation. Double submission or a lost response can otherwise trigger repeated provider calls. HTTP POST does not become inherently idempotent because a header is present.

## Decision

Use `/api/v1` with plural resource names for analyses and resume extractions. Use 200 for completed synchronous processing; do not return 201 without a stored resource/location, or 202 without a job/polling contract. Validate bounded bodies and use RFC 9457 problem details with safe codes and server-generated request IDs.

Require an opaque `Idempotency-Key` on analysis requests (16–128 ASCII letters, digits, `_` or `-`). Hash the validated, normalized documents and preferences. Within the current process, same key + same input shares the in-flight promise or replays its outcome. Same key + different input returns 409. A different request while one analysis runs returns 429. Keys are scoped to this single-user local process, not to an account.

Keep both success and failure outcomes for five minutes after completion. Uncertain provider failures must not automatically trigger another paid call. Retain at most 100 entries; reject new entries at capacity rather than evicting an unexpired guarantee. No request body is stored in the index; result citations may still contain personal data in RAM. Expire them with timers. Nothing is persisted to disk.

A disconnected HTTP client does not cancel shared analysis; other duplicate clients may still need its result. The provider timeout bounds execution. Browser/SDK retries are disabled. A new key is a deliberately new attempt and may incur cost.

## Limitations and verification

This is not exactly-once execution or provider-side deduplication. Restart, TTL expiry or another process loses the guarantee. Before multi-user/public deployment, add identity-scoped durable storage, atomic reservation, recovery and retention decisions. `store:false` at OpenAI does not mean zero provider retention.

Tests cover simultaneous replay, conflict, failures, expiry, capacity and rejection before invocation. See [API contract](../API.md).

Sources: [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html). The key header is our explicitly documented application contract, not a claim that POST is safe or standardized exactly-once.

## Amendment — Local host validation and persistence identity (2026-09-13)

Validate the HTTP Host against exact loopback names before all API and static
routes. A mutation header and absent CORS alone do not protect against untrusted
hostnames resolving to loopback. Foreign hosts receive safe 403 problem details.

The temporary analysis cache owns an internal execution-specific persistence UUID.
SQLite deduplicates persistence retries by that UUID, not the expiring external
request key. After cache expiry/restart, a newly executed result gets its own
history entry. Durable jobs retain their existing stable job-derived keys.
Verify foreign-host rejection, replay, fresh-cache reuse and storage-retry tests
with fictional transports; no live model calls are required for these semantics.
