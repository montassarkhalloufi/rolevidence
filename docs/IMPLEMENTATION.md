# Implementation status — 0.2.0

## Available

- Local dossiers for job seekers and recruiters: create, search, rename, explicitly
  save and delete; SQLite migration 1 and optimistic revisions.
- Immutable analysis history with exact submitted texts/preferences, source
  provenance, timestamps and model/prompt/schema metadata.
- OpenAI Responses and Anthropic structured output through LangChain model
  adapters. No agent loop or model tools. Model selection is restricted to the
  server-configured options. Keys never reach the browser.
- Public offer URL retrieval with public-address pinning, redirect validation,
  time/size bounds, JobPosting/HTML parsing, quoted field proposals and editable
  review before adoption. Text pasting remains available for inaccessible pages.
- Optional content-free LangSmith technical events. Automatic SDK tracing is
  disabled; unavailable telemetry never blocks analysis.
- Existing local CV extraction, preferences, evidence checks, context preview,
  error handling and bounded process-local paid-request idempotency.
- Four backend layers, feature-oriented React, TanStack Query, shadcn-based
  primitives, Tailwind semantic tokens, generated OpenAPI and executable checks.

## Boundaries

SQLite files are unencrypted local data; original CV binaries are not archived.
Deletion cascades through stored analyses but cannot erase user backups or OS
snapshots. Idempotency caches remain process-local and may retain deleted dossier
snapshots temporarily. Stop the server before copying the SQLite file for backup;
restore with a compatible release. Unknown newer schema versions fail closed.

Only HTTP(S) pages on default ports are imported. Login walls, browser-rendered
content, compressed responses, oversized pages and multiple JobPostings can require
manual text pasting. No bypass, cookies or remote browsing agent is provided.
Quoted fields can still be semantically wrong; review remains necessary.

Anthropic contract tests use simulated HTTP responses. Without an Anthropic key,
no live Anthropic accuracy or account compatibility claim is made. LangSmith's
actual hosted delivery is likewise unevaluated without a key. OpenAI's v0.2 smoke
results and the previous larger calibration suite are documented in RELIABILITY.md.

No batch comparisons, interactive clarification, report export, RAG, LangGraph,
Deep Agents or multi-user/public hosting. Accessibility tests do not replace a
complete assistive-technology audit. The parser worker is not an OS sandbox.
