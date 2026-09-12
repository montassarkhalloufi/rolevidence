# Repository instructions

Read CONTRIBUTING.md and the relevant accepted ADR in docs/adr before changing code. These files are the shared engineering policy, not optional suggestions. User instructions take precedence. Follow the local single-user product scope in docs/PRODUCT.md and ROADMAP.md. Implement only the requested milestone.

- Work without delegated agents unless the user explicitly requests delegation.
- Keep the backend a modular monolith with inward dependencies: domain, application, adapters, infrastructure. Never import HTTP, React, Zod or a provider SDK into the domain/application layers.
- Use English identifiers, DTO keys, enum values and new engineering documentation. French product copy belongs in a locale catalogue; French fictional documents are intentional data.
- Preserve uncertainty: missing evidence is not a contradiction. Model interpretations are untrusted; validate structure and quotes independently. Never silently replace a failed real analysis with fabricated output.
- Keep the model behind the application port. The product analysis has no tool access. LangChain model adapters and optional content-free LangSmith telemetry are approved in ADR 0005. Do not introduce agent loops, RAG, tools or automatic paid retries.
- Use feature-oriented React, responsibility-focused hooks, TanStack Query for server operations, shadcn-based shared UI and semantic tokens. No network calls in visual components, derived-state effects or speculative microfrontends.
- Follow docs/API.md for API changes. Preserve idempotency conflict, replay, concurrency, retention and failure semantics. Update generated OpenAPI and its tests with contract changes.
- Never print/read secrets unnecessarily, commit private CVs, log request bodies or persist browser drafts. Use fictional fixtures. Real model evaluations are separate paid operations and must be reported as real or not run.
- Run npm run quality before completion. Do not weaken rules or tests just to make them pass; document a concrete, narrowly justified exception if needed.
- Update the relevant ADR when changing a decision, not for every implementation detail. Update docs/HOW_IT_WORKS.md when implementation or limitations change.
- Do not publish, deploy publicly or select a project license without the owner's instruction. The local custom header is not authentication.

A skill is an optional reusable procedure. It does not replace this policy, ADRs, review or CI. Consult the official Vercel React guidance linked in ADR 0003 for applicable React patterns; Next.js/RSC rules do not apply to this Vite client.
