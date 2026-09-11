# Product roadmap

A local, individual application for job seekers and recruiters. Both use the same evidence-based profile–job comparison engine. The application runs on the user's machine; analysis sends selected content to the configured AI provider. It is not an offline model or a hosted multi-user service.

## Initial release — current scope

- One profile and one job description per analysis.
- Local PDF/DOCX/TXT text extraction and editable inputs.
- Candidate salary/work preferences kept separate from CV evidence.
- Supported matches, contradictions, unknowns and conclusions requiring review, with source quotations.
- Request preview, error handling and bounded in-memory idempotency.
- Offline quality checks and documented live evaluation observations.

The UI serves the same comparison for both audiences. Dedicated role-specific workspaces, saved profiles, exports and interactive clarification are not implemented yet.

## Next: complete the individual workflow

- Role-appropriate onboarding and copy without changing evidence semantics.
- Clarification questions, answers with explicit provenance, and reassessment.
- Export a reviewable analysis with source references and model/prompt versions.
- Real-browser end-to-end and accessibility checks.
- Validate installation from a clean checkout on supported operating systems.

Acceptance: an external user completes import → analysis → clarification → export without developer assistance.

## Then: local persistence

- SQLite with versioned migrations, stored profiles/offers and analysis history.
- Explicit save, backup, export and deletion controls.
- Personal application tracking and recruiter campaign tracking.
- Keep user records outside versioned fixtures and evaluation data.

Acceptance: users resume work after restart and can delete their stored information.

## Then: multiple comparisons

- One profile against several offers, or one offer against several profiles.
- Criterion-by-criterion comparison with direct evidence access.
- Bounded jobs, progress, cancellation, explicit retry and usage limits.
- No automatic rejection or opaque aggregate employability score.

Acceptance: failures and costs remain understandable per analysis; missing evidence is never silently treated as a negative fact.

## Release gates

Each release needs passing offline CI, appropriate independent AI evaluations, a changelog, reviewed migrations when applicable and explicit known limitations. Measure false matches, false gaps, omitted requirements, evidence relevance, latency and token usage separately. Calibration results do not establish general accuracy.

Agent frameworks, RAG, additional providers and shared hosting require concrete product needs and an ADR. They are not roadmap milestones by themselves.
