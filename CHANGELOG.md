# Changelog

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
