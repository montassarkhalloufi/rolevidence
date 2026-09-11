# ADR 0005 — Local dossiers, provider selection and public job imports

Status: Accepted · 2026-09-11

## Decision

Release 0.2 adds local dossiers for both job seekers and recruiters. SQLite is
owned by an infrastructure repository behind an application port. Use Node 24's
built-in SQLite driver, versioned migrations, foreign keys and transactions.
Store extracted texts, preferences and offer provenance, never original CV files.
Explicit saves use optimistic revisions. Each persisted analysis is an immutable
snapshot of its input and output. Deleting a dossier cascades to its analyses.
Database files are private local state, excluded from Git; no browser persistence.

LangChain model integrations serve OpenAI (Responses, store:false) and Anthropic
behind the existing model gateway. This supersedes the single-provider choice in
ADR 0004; its evidence policies remain unchanged. Only configured, allowlisted
models are selectable. No agent loop, tool execution, fallback or paid retries.
Provider and model selection participate in the idempotency fingerprint.

LangSmith is optional technical telemetry, disabled by default. Build an explicit
allowlisted event without documents, output content, identifiers or raw errors.
Do not enable automatic LangChain payload tracing. Telemetry failures are isolated.

Public offer import pins validated public DNS addresses, checks every redirect,
and bounds response bytes, duration and redirects. No credentials, private IPs,
custom ports, cookies, browser automation or login bypass. Parse JobPosting and
readable HTML locally; model extraction returns fields and exact source quotes.
Users review and explicitly adopt the result. Missing or unverified information
is never silently invented. The supplied page is untrusted data, not instructions.

## Verification and limitations

Test persistence across reopening, revision conflicts, snapshot immutability,
cascading deletion, safe failures, SSRF/redirects and provider contracts. Browser
coverage includes real local persistence and fictional provider responses. Paid
provider evaluations are reported separately. No general accuracy guarantee.

SQLite is unencrypted and backups/OS snapshots remain the user's responsibility.
Deletion is logical removal, not guaranteed forensic erasure. Analysis request
idempotency remains bounded and process-local; saved results survive restart,
but an interrupted paid request is not automatically resumed or retried.
