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

## 0.4.0 — Campaigns, human tracking and resumable execution

- One profile across 2–10 offers, or one offer across 2–10 independent profiles.
- Side-by-side criterion evidence; no ranking or assumed cross-offer equivalence.
- Human application status, notes, interview preparation and accounts outside model inputs.
- Durable per-dossier jobs, actual stage/batch progress, cancellation and explicit checkpoint resume.
- Member analyses are started individually; no automatic background batch queue.

Acceptance: both audiences can create a campaign, preserve independent dossier notes, interrupt an analysis, reopen it and explicitly resume without replaying validated completed calls. The original analysis snapshot remains unchanged.

## Later — Broader operations

- Optional explicit campaign-wide execution queue with its own pause/budget controls.
- Per-analysis cost estimates and user-defined spending budgets.
- Broader platform/accessibility evaluation and repeated, independent provider benchmarks.
  Targeted Anthropic and EU LangSmith verification is documented in docs/LIVE_VERIFICATION.md.

LangGraph requires a real branching/resumable orchestration need. Deep Agents and
RAG remain deferred. Framework adoption is an architectural decision, not a
product milestone. Every release needs passing checks and disclosed live-evaluation
limits; a finite calibration suite cannot establish universal accuracy.
