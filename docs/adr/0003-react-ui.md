# ADR 0003 — Feature-oriented React and owned UI primitives

Status: Accepted · 2026-09-10

## Decision

Use React + Vite, TanStack Query, shadcn-based components and Tailwind tokens. Keep ivory/forest-green identity. Use `client/app` for providers, `features` for behavior, `shared/ui` for visual primitives and `shared/i18n` for French copy. Atomic Design informs composition but does not impose atoms/molecules/organisms directories.

Bootstrap is a query. Analysis, resume import and context preview are explicitly triggered mutations. No automatic retry, focus/reconnect refetch or browser persistence of CVs. Mutation cache entries are removed when unused; drafts and visible results remain in page memory. Input changes invalidate displayed results and their logical request key. Hooks describe responsibilities, not generic lifecycle wrappers. Derived values remain computed during render.

Prefer composition and typed variants. Complex interactions should use maintained accessible primitives; simple controls may retain native browser semantics. Do not add a UI library for every widget. Component adoption is selective, not a promise of a complete standalone design-system package. Preserve third-party licenses.

## Alternatives and consequences

Mantine is a valid productivity alternative, Ant Design fits dense administrative interfaces; shadcn was selected for ownership and visual adaptation. We maintain copied code and updates. Tailwind is a styling mechanism, not the architecture. Storybook is deferred until shared component variants justify it. Microfrontends require independently owned/deployed products, which this project does not have.

TypeScript was aligned to 6.0 for compatibility with the available typescript-eslint parser; do not force unsupported peer dependencies to keep a larger version number.

## Verification and sources

ESLint Hooks/accessibility rules, React interaction tests and production build. These do not replace real keyboard/mobile/screen-reader review.

- [Vercel React skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md): applicable client-rendering, state and async patterns; Next.js/RSC rules are out of scope.
- [Vercel composition skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns)
- [TanStack mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [shadcn Vite](https://ui.shadcn.com/docs/installation/vite)

Toolchain constraint: the installed jsx-a11y plugin declares ESLint support through version 9, so ESLint 9 remains temporarily pinned despite its deprecation notice. Track the compatible upgrade; do not use forced peer resolution. React interactions use Vitest with Vite's JSX transform, while backend tests retain the Node runner.

## Styling ownership

Shared primitives own visual variants, control geometry, focus and disabled/invalid states. Feature components compose them and use Tailwind utilities for layout. Global CSS is restricted to base document styles; it must not restyle controls or feature components. Semantic tokens in shared/styles/tokens.css are the single color/radius authority. Do not reintroduce legacy primary/secondary/error CSS classes or color literals in feature markup.

Native select and disclosure elements retain browser keyboard semantics. Status indicators combine readable labels and symbols with semantic colors. Interactive controls target a minimum 44px height; motion is opt-in under motion-safe or disabled with motion-reduce. Browser checks cover narrow and wide layouts, keyboard focus, native selection and horizontal overflow with fictional API responses.
