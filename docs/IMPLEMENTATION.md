# Implementation status

## Available

- One-profile/one-offer analysis for job seekers and recruiters through a shared React interface.
- Local PDF/DOCX/TXT extraction, editable texts and optional candidate preferences.
- Structured model interpretation, original source quotations, conservative unknowns and explicit review states.
- Request preview, safe error responses and bounded in-memory idempotency.
- Domain, application, adapters and infrastructure with checked inward dependencies.
- Versioned HTTP routes, generated OpenAPI, request IDs and completion logs without document bodies.
- Strict TypeScript, lint/formatting, architecture checks, backend tests, React interaction tests and production build.
- Shared token-based UI primitives and browser regression checks at 375px and 1280px for focus, native controls, loading, evidence disclosures and overflow.

## Boundaries

- Local single-user deployment; no authentication for shared or public access.
- No durable workspace, campaigns, batch processing, interactive clarification or report export.
- Parsing has resource limits but is not an OS security sandbox. Scanned PDFs without text are not supported.
- Results are retained temporarily in RAM for idempotency. Restart, expiry or another process can cause a new provider call.
- Tests with fake transports validate software behavior, not model accuracy. See RELIABILITY.md for live evaluation provenance and limitations.
- Accessibility lint and DOM interaction tests do not establish a complete screen-reader/mobile audit.
- ESLint 9 is retained for compatibility with the installed accessibility plugin; upgrade the related toolchain together rather than forcing peer dependencies.

## Maintenance

Keep this page focused on current behavior. Update ROADMAP.md for planned capabilities, CHANGELOG.md for releases and the relevant ADR for architectural decisions. User documentation and contributor instructions remain available in the public repository.
