# Product scope

## Users and purpose

Job seekers compare their profile and preferences against an offer. Recruiters compare a candidate's declared experience against a role's explicit requirements. The engine must return consistent evidence conclusions for identical inputs regardless of the user's perspective.

The product supports human understanding and decisions. It does not verify competence, infer protected personal characteristics, rank employability or automatically reject candidates. Missing evidence remains unknown. Only job-relevant criteria belong in the analysis.

## Deployment and privacy

Single-user local installation, user-owned provider key, loopback-only server. No accounts or cloud database are required. Local execution does not imply offline AI: analysis transmits the document texts and candidate preferences to the selected provider. The key stays on the server. Preview is available before submission.

Explicitly saved dossiers and immutable analysis snapshots are stored in local SQLite. Unsaved edits remain in browser memory; paid-request idempotency is temporary and process-local. Do not expose the unauthenticated service to a network or use real personal documents as repository fixtures.

## Shared concepts

- Profile: declared facts, supporting documents and provenance.
- Job: explicit requirements and offered conditions.
- Candidate preferences: desired conditions, distinct from CV evidence.
- Analysis: findings, quotations, unknowns and model/prompt/schema versions.
- Clarification: an answer attributed to its author, distinct from original documents.
- Application/campaign (planned): a profile–job relationship with human notes and progress.

Human notes and decisions must remain separate from model conclusions. Role-specific presentation must not change the evidentiary standard.
