# Rolevidence

Evidence-based profile–job comparison for job seekers and recruiters. Run the application locally with your own OpenAI API key, inspect supporting quotations and identify what still needs clarification.

**Initial release:** one profile and one offer per analysis. Saved workspaces, multiple comparisons and interactive clarification are planned. This tool supports human review; it does not verify competence or make hiring decisions.

## Quick start

Requires Node.js 24.15 or newer within the 24.x release line, and npm. Clone this repository, open its directory, then:

```sh
git clone https://github.com/montassarkhalloufi/rolevidence.git
cd rolevidence
npm ci
cp .env.example .env
# Set OPENAI_API_KEY in .env using your editor.
npm run build
npm start
```

Open http://127.0.0.1:3001. The production build is served by the local Express server. Without a key, fictional inputs, document import and request preview remain available; analysis requires a configured key and incurs provider usage charges. Restart after changing `.env`.

For development, run `npm run dev` and open http://127.0.0.1:5173. Vite proxies the API to the local server. Both bind to loopback by default. Do not expose this unauthenticated application publicly.

## Use the application

1. Import a CV or edit the fictional profile.
2. Paste an offer and optionally supply the candidate's salary/work preferences.
3. Review extracted text and preview the exact provider context.
4. Submit and inspect matches, contradictions, unknowns and conclusions requiring review.
5. Open the supporting quotations and compare them with the original documents.

Job seekers use their own profile; recruiters use a candidate's profile. The evidence standard is identical. Dedicated role-specific workspaces are planned; the current interface provides the shared comparison workflow.

PDF, DOCX and UTF-8 TXT are supported within configured limits: 5 MiB upload, 20 PDF pages, 16,000 text characters and a 15-second parsing deadline. Scanned PDFs without text are rejected. Missing evidence is not a contradiction, and a cited passage does not necessarily prove mastery.

## Privacy and costs

- Parsing and preview are local. Analysis sends both texts and the candidate preferences to OpenAI.
- The API key stays server-side. Remove unnecessary contact details before submission.
- Browser drafts are not persisted. A bounded in-memory cache temporarily retains responses for idempotency; it is not a durable workspace.
- Failed requests never become fabricated results. Automatic paid retries are disabled. A deliberate new attempt can incur another charge.
- Runtime files, traces and secrets are ignored by Git. Use fictional fixtures when reporting issues.

See [SECURITY.md](SECURITY.md) and the precise [API idempotency guarantees](docs/API.md).

## Development and verification

```sh
npm run quality       # types, lint, architecture, API drift, formatting, tests, build
npm run lint:fix      # safe lint fixes and structural blank lines
npm run format        # canonical formatting
```

Offline tests use fake provider transports. Explicit real evaluations are separate paid operations; see [RELIABILITY.md](docs/RELIABILITY.md) for results, reproducibility and limitations. Passing a finite evaluation suite does not establish general model accuracy.

## Architecture and contribution

React features and TanStack Query call an Express API. Backend dependencies point inward through domain, application, adapters and infrastructure; provider and filesystem effects remain behind ports. Shared runtime schemas validate API boundaries. Architecture checks, lint and tests run in CI.

Start with [CONTRIBUTING.md](CONTRIBUTING.md), [product scope](docs/PRODUCT.md), [implementation status](docs/IMPLEMENTATION.md), [ADRs](docs/adr) and [ROADMAP.md](ROADMAP.md). Release notes are in [CHANGELOG.md](CHANGELOG.md). Third-party attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

[MIT](LICENSE). Copyright (c) 2026 montassarkhalloufi. See THIRD_PARTY_NOTICES.md for bundled component attribution.
