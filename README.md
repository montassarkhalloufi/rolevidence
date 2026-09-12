# Rolevidence

Evidence-based profile–job comparison for job seekers and recruiters. Run the application locally with your own OpenAI or Anthropic API key, inspect supporting quotations and identify what still needs clarification.

**Version 0.3:** saved dossiers, public offer import, criterion-by-criterion evidence, attributed clarifications, printable reports and portable backups. Multiple comparisons remain outside this release. This tool supports human review; it does not verify competence or make hiring decisions.

## Quick start

Requires Node.js 24.15 or newer within the 24.x release line, and npm. Clone this repository, open its directory, then:

```sh
git clone https://github.com/montassarkhalloufi/rolevidence.git
cd rolevidence
npm ci
cp .env.example .env
# Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY in .env using your editor.
npm run build
npm start
```

Open http://127.0.0.1:3001. The production build is served by the local Express server. Without a key, local dossiers, document import and request preview remain available; analysis requires a configured key and incurs provider usage charges. Restart after changing `.env`.

For development, run `npm run dev` and open http://127.0.0.1:5173. Vite proxies the API to the local server. Both bind to loopback by default. Do not expose this unauthenticated application publicly.

## Use the application

1. Create a named dossier for a job search or recruitment review.
2. Import a CV and paste an offer, or import its public URL with a configured provider.
3. Review the source and editable extracted fields. Adopt the offer text explicitly.
4. Enter candidate preferences, select the provider/model, then use Save and analyze.
5. Preview the provider context, analyze, then inspect findings and source quotations.
6. Add a dated candidate statement or recruiter account from a criterion, save and reanalyze. The original CV and older analyses stay unchanged.
7. Open an analysis in history to download an HTML report; open the file in a browser and print/save as PDF.
8. Export the saved dossier as JSON, then restore it from the home page to create an isolated copy with its history. Exports include private source texts.
9. Reopen the dossier after restart. Older analyses retain their original sources.

Save edits explicitly before leaving. Deleting a dossier also deletes its analyses;
other dossiers remain intact. The evidence standard is identical for both audiences.

PDF, DOCX and UTF-8 TXT are supported within configured limits: 5 MiB upload, 20 PDF pages, 16,000 text characters and a 15-second parsing deadline. Scanned PDFs without text are rejected. Missing evidence is not a contradiction, and a cited passage does not necessarily prove mastery.

## Privacy and costs

- CV parsing and preview are local. Analysis sends texts and preferences to the selected provider. URL import contacts the public site and sends extracted offer text to that provider.
- The API key stays server-side. Remove unnecessary contact details before submission.
- Explicitly saved dossiers live in `storage/rolevidence.sqlite` (configurable via DATABASE_PATH). Browser drafts are not persisted. Stop the server before copying this unencrypted database for backup. Runtime data is ignored by Git.
- Optional LangSmith technical telemetry is disabled by default (`ROLEVIDENCE_TELEMETRY=false`). No document content is included; automatic LangChain tracing is disabled.
- Analysis first classifies the offer, then compares up to eight passages per call (maximum 16 comparison calls). Long offers cost more and take longer; mandatory passage coverage does not prove semantic correctness.
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

See [local operations](docs/OPERATIONS.md) for installation, recovery, exports and release validation limits.
