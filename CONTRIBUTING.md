# Contributing

Rolevidence is a local application for job seekers and recruiters that compares declared experience with job requirements. It does not verify competence or make hiring decisions. Start with the accepted decisions in [docs/adr](docs/adr) and the current status in [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## Development

Use Node 24.15 or newer within the 24.x release line, run `npm ci`, then `npm run dev`. Copy `.env.example` to `.env` locally if a real analysis is needed. Never paste a key into a commit, issue or model prompt. The web interface previews the request without calling the model. The frontend and backend must be upgraded together for the v1 contract.

Run `npm run quality` before submitting a change. Tests use fictional inputs and fake provider transports. `npm run eval:semantics` is separate, real and potentially billable; never run it automatically in CI.

## Code standards

- Strict TypeScript, checked indexed access, exact optional properties and erasable syntax compatible with Node's native TypeScript execution. Validate unknown external inputs before use. Avoid `any`, unchecked casts and non-null assertions.
- One responsibility per function/module. Pure domain transformations; effects at boundaries. Prefer early returns, composition and small injected functions over inheritance and service locators.
- Cyclomatic complexity is limited to 10; nesting to 3. Split meaningful responsibilities, not arbitrary line counts. Review large JSX trees and functions even if complexity is low.
- Centralize domain limits and semantic UI tokens. Do not replace every literal zero or standard HTTP code with a meaningless constant. Model settings and transport headers must have one authoritative definition.
- Apply SOLID through cohesive modules, small consumer-owned ports and substitutable adapters. Strategy, Adapter, Mapper and composition are useful here. Introduce Repository only with actual persistence, and avoid abstract factories without variation.
- English source identifiers, API keys/enums and engineering documentation. French product copy is localized; generated explanations and fictional input documents can be French.
- Hooks encapsulate meaningful interactions. User-triggered work belongs in handlers/mutations; computed state belongs in render. Effects synchronize external systems only. Do not blanket-memoize components or introduce global state without a need.
- Own shadcn adaptations, preserve license notices, use typed variants and keep business components within features. Test focus, keyboard interaction, labels, status/error announcements and mobile/long-content layout.

## Definition of done

A change must have a concrete behavior and acceptance criteria, appropriate tests, passing quality checks, safe error behavior, bounded resource use and an updated contract/document when affected. A reviewer must be able to reproduce the result with fictional data. Distinguish offline tests, live provider evaluations and manual inspection.

For an AI change, review missing/contradictory information, quote validity, prompt injection, model refusal, invalid/incomplete output, cost/latency and the held-out evaluation plan. Schema validation does not establish semantic accuracy.

For an API change, review method semantics, validation, statuses, problem details, request IDs, idempotency scope, concurrent requests, timeouts, cancellation and privacy. Apply pagination/filtering only when collection endpoints exist; define stable ordering and limits then.

## Review and governance

Use a short ADR for architectural changes: context, decision, alternatives, consequences, verification and limitations. The PR template records behavior and evidence. CI enforces executable checks; written rules still require human review. Branch protection and mandatory review must be enabled by the repository owner when GitHub is created; a workflow file alone cannot enforce them.

Public hosting, authentication/authorization, durable jobs, retention policy, release rollback, accessibility audit and project licensing require explicit decisions before claiming production readiness.

## Formatting and editor setup

`.prettierrc.json` is authoritative: two spaces, no tabs, double quotes, semicolons, trailing commas, LF and a target print width of 80. Print width is a formatting target, not a hard limit on unavoidable strings. `.editorconfig` shares indentation/newline settings across editors. `.vscode/settings.json` enables format-on-save and explicit ESLint fixes when the recommended extensions are installed.

Run `npm run lint:fix` for safe lint fixes and `npm run format` for formatting. CI runs checks only; it never silently edits a pull request. Generated OpenAPI and raw document fixtures are intentionally excluded from Prettier; OpenAPI has its own drift check.

ESLint owns correctness rules rather than indentation: strict equality, explicit braces, type-only imports, no unused values/explicit any/non-null assertions, no nested ternaries, typed promise handling, Hooks and accessibility rules. Production functions have an initial 100-line ceiling excluding blank lines/comments, complexity 10 and nesting 3. Test scenarios and build/evaluation scripts are exempt from the three size/complexity thresholds, but retain correctness and formatting checks. Review responsibility boundaries even when metrics pass.

Blank-line separation is enforced by `@stylistic/padding-line-between-statements`: after the import group and declarations, around functions/types/classes/exports and block-like statements, and before returns. Imports remain grouped. `npm run lint:fix` inserts these separators; Prettier then formats and preserves them. There is no Prettier option that infers these structural separators on its own.

## Real API reliability observations

Start the paired local API, then run `npm run eval:api` explicitly for paid model calls. It runs 18 fictional scenarios twice by default. `EVAL_REPETITIONS=3` repeats each three times; `EVAL_FILTER` selects IDs and `EVAL_SUITE=adversarial` selects the separate adversarial set. Run `npm run eval:api-contract` separately while the API is idle: one real analysis is followed by replay/conflict/input/guard checks. Do not run paid evaluations in parallel against the single-flight local server.

Results are checkpointed under timestamped `artifacts/evaluations/api-*/observations.json`. Preserve failing runs; do not tune expectations merely to match output. Read docs/RELIABILITY.md to distinguish calibrated cases, new cases, deterministic checks and manual observations.

## Git workflow

Start from a passing main branch. Use a short-lived branch for one coherent change and a pull request describing its user-visible behavior and verification. Prefer focused commits such as `feat(profile): save candidate preferences` or `fix(analysis): preserve unknown requirements`. Review staged files for secrets and personal data before committing. Keep the lockfile and fictional fixtures in Git; runtime files stay ignored.

The initial commit records the existing audited baseline honestly. Do not invent historical commits or rewrite published history to simulate incremental development. Tag releases, update CHANGELOG.md and distinguish implemented features from plans. CI must pass before merging; configure repository rules separately from the workflow file.
