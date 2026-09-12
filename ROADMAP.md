# Product roadmap

Rolevidence is a local individual application for job seekers and recruiters.
Both use the same evidence-based comparison engine and retain human responsibility
for interpreting declared experience. Local execution still sends selected text to
the chosen AI provider.

## 0.2.0 — Local dossiers and offer import

- Saved dossiers and immutable analysis history, SQLite migrations and deletion.
- Public offer URL import with source review and manual-paste fallback.
- OpenAI/Anthropic selection through LangChain adapters.
- Optional private-content-free LangSmith technical telemetry.
- Reopening, conflict, storage failure, provider and browser verification.

## 0.3.0 — Clarification and reviewable exports

- Questions for unknown criteria; attributed answers stored separately from CVs.
- Reassessment preserves earlier snapshots and identifies newly supplied facts.
- Export source references, conclusions, limitations and model/prompt versions.
- Local backup/export UX and installation verification with disclosed platform coverage.

Acceptance: a user can clarify a missing fact and share a sourced report without
silently changing the original CV or erasing prior conclusions.

## Later — Multiple comparisons

- One profile against several offers, or one offer against several profiles.
- Criterion-by-criterion evidence access, bounded jobs and progress.
- Explicit cancellation/retry, per-analysis cost visibility and failure handling.
- No automatic rejection or opaque employability score.

LangGraph requires a real branching/resumable orchestration need. Deep Agents and
RAG remain deferred. Framework adoption is an architectural decision, not a
product milestone. Every release needs passing checks and disclosed live-evaluation
limits; a finite calibration suite cannot establish universal accuracy.
