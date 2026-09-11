# ADR 0001 — Modular monolith and inward dependencies

Status: Accepted · 2026-09-10

## Context

Provider formatting must remain separate from the analysis use case. The project must remain understandable and extensible without multiplying deployable services.

## Decision

Use four backend layers:

- `server/domain`: plain TypeScript models, semantic classification, conservative quote resolution and preference representation. No frameworks or I/O.
- `server/application`: analysis use case, provider port, idempotent execution policy and application errors. No provider/HTTP/schema library.
- `server/adapters`: HTTP controller and OpenAI request/result translation, prompt and model extraction schema.
- `server/infrastructure`: Express composition, official OpenAI transport, document workers, configuration and temporary in-memory storage.

Dependencies point inward. The entry point wires functions explicitly. External schemas in `shared` validate client/server contracts; domain models remain library-free and structural compatibility is checked by TypeScript. The provider extraction schema is separate from the public analysis response.

Use a feature-oriented React client. It shares public contracts, never server internals. Keep native Node execution and Express. No microservices, microfrontends, DI container, speculative repository or framework migration.

## Consequences and verification

Small plain domain types and runtime DTO schemas have deliberate overlap; compilation and contract tests expose divergence. `npm run architecture` checks static imports, re-exports and literal dynamic imports. ESLint limits complexity and depth. This is a boundary guard, not a proof of SOLID or freedom from runtime side effects; review still checks function purity.

Alternatives: keep technical folders with cross-layer imports (rejected for coupling), NestJS or a large clean-architecture framework (unnecessary for this scope). Persistence and distributed execution require a new ADR.
