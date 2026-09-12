# Changelog

## 0.4.0 — Unreleased

- Local campaigns with 2–10 independent offer/profile dossiers and side-by-side saved evidence.
- Recruiter member CV import, source isolation, transactional creation and replay-safe campaign IDs.
- Human status, notes and interview preparation/accounts stored separately from model inputs.
- Durable dossier analysis jobs with actual batch progress, explicit cancellation/resume and checkpoint reuse.
- Restart recovery without automatic paid calls; immutable snapshots and persistent result deduplication after storage failure.
- SQLite migrations, generated workflow API contracts and browser/API recovery tests.
- Individual analysis launches; no automatic campaign queue, ranking or billing-cancellation guarantee.

## 0.3.0 — 2026-09-12

- Required per-passage structured comparison in bounded batches, with auditable offer context and manual reinclusion.
- Attributed clarifications stored separately from the CV and included in immutable reassessment snapshots.
- Printable, escaped HTML reports and portable dossier backups/restoration as isolated copies.
- Midnight/violet evidence workspace, filters, save-and-analyze, visible progress and preserved drafts on failure.
- Fix irrelevant duration metadata downgrading technology evidence and JSON property order marking saved drafts as dirty.
- No general semantic accuracy or multi-user deployment claim. Real provider verification limits are documented.

## 0.2.0 — 2026-09-11

- Save and reopen local job-search or recruitment dossiers with SQLite migrations,
  optimistic revisions and isolated cascading deletion.
- Preserve immutable analysis snapshots, evidence, timestamps and model versions.
- Import public job URLs with bounded retrieval, public-address validation,
  structured source-backed fields and explicit review before adoption.
- Select configured OpenAI or Anthropic models through LangChain adapters.
- Add optional content-free LangSmith telemetry with failure isolation.
- Test persistence, HTTP contracts, model serialization, privacy and browser flows.

Live OpenAI smoke checks passed after fixing a nested strict-schema incompatibility.
Anthropic and hosted LangSmith remain live-unverified without configured keys.

## 0.1.0 — Initial release

- Shared UI primitives, semantic tokens and Tailwind layouts.
- Native select, badge, card, alert, code block and status indicators.
- Browser checks for mobile/desktop layout, keyboard focus, loading and evidence disclosures.
- Local React/Express application for evidence-based profile–job comparison.
- PDF, DOCX and TXT extraction, editable documents and separate candidate preferences.
- Structured OpenAI analysis, source quotation checks, conservative unknowns and review states.
- Preview before submission, bounded requests and process-local idempotency.
- Strict TypeScript, architecture checks, ESLint, Prettier, API contract checks and offline tests.

Known limits: no durable workspace, batch comparison, clarification workflow or report export yet. Text-only PDF extraction; no OCR. Model conclusions require human review. See docs/RELIABILITY.md for evaluation provenance and limitations.
