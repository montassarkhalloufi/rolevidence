# Functionality and limits — 0.3.0

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
actual hosted delivery is likewise unevaluated without a key. OpenAI's v0.3 observations, v0.2 smoke
results and the previous larger calibration suite are documented in RELIABILITY.md.

No multi-dossier batch comparisons, RAG, LangGraph,
Deep Agents or multi-user/public hosting. Accessibility tests do not replace a
complete assistive-technology audit. The parser worker is not an OS sandbox.

## Job relevance and analysis UX

The product gateway now classifies job passages semantically before comparing them to the candidate, with no CV sent to the preparation call. Context is auditable; unclassified passages are retained. The result UI separates partial coverage from unverified evidence, filters conclusions, and supports explicit save-and-analyze with visible progress/errors. Current responses require every retained passage; earlier saved analyses can still carry partial coverage. This does not prove complete atomic decomposition. Historical saved results must be reanalyzed to benefit from new preparation.

The redesigned client uses compact midnight navigation, violet actions and an evidence reader. Successful analysis collapses dossier preparation; selecting a criterion shows its original quotations side by side on desktop and stacked on mobile. Filters retain all four categories. The visual mockup's synthetic document links and highlight offsets are not presented as working features without source location data.

Coverage omissions appear as “Points non évalués”, without a misleading criterion count, with candidate/interviewer preparation guidance. Original excerpts remain unmodified: the UI does not claim semantic decomposition of unassessed text. Excluded context and technical metadata are nested under “Détails de l’analyse”. This presentation does not trigger another model call.

Analysis submission collapses dossier inputs immediately and focuses/scrolls to a prominent progress panel, with an elapsed timer cleaned up on unmount. Save and provider processing have separate messages; offer reading and comparison are grouped because the HTTP response does not stream internal stage events. No invented percentage is shown. Provider errors replace the loader; save failures reopen preparation with the existing error and preserve documents.

## 0.3 completion

Product comparison now requires a nonempty list of atomic findings for each retained job passage. Calls process eight passages per batch, with at most 16 comparison calls after preparation. Missing response keys fail explicitly without paid repair. This supersedes the fixed two-call description above. Semantic completeness within a passage and relevance remain evaluation concerns.

Clarifications are attributed, dated text separate from the CV, sent as C sources, independently quoted and saved in snapshots. The original CV is not edited. A user can explicitly reinclude a contextual passage from analysis details; only exact original passages can be included. Reports escape all source content and carry CSP; backups validate sources and restore transactionally under new dossier/analysis IDs. Export is bounded to 100 analyses and 8 MiB; larger stores use stopped-server SQLite backup.
