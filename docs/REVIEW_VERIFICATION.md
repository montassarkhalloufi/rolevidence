# Review verification — 2026-09-13

All ten requested review points are addressed in the local working tree.

| Point                              | Resolution                                                                                                                                                                                         | Verification                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Untrusted HTTP hosts            | Validate exact loopback names before API reads, mutations and static files.                                                                                                                        | Raw HTTP regression requests reject foreign/suffix/malformed hosts with 403 and accept the configured loopback names.                                                |
| 2. Missing analysis history        | A fresh execution owns a fresh persistence UUID; replay retains that UUID.                                                                                                                         | Two fresh caches with one external key produce two stored simulated results; replay adds neither a call nor a snapshot. Existing storage-retry coverage also passes. |
| 3. Hidden resumed jobs             | The runner prioritizes its active execution, then reads by update time, creation time and ID.                                                                                                      | An older resumed job remains visible while running and after completion.                                                                                             |
| 4. Permanent running status        | A stored running record with no active execution is exposed as interrupted; resume persists a new attempt before model work.                                                                       | Simulated progress/terminal-write failures recover in the same process. An orphaned running record does not hide newer completed work.                               |
| 5. Misleading exported conclusions | Reports and the evidence reader share retained summaries; original reasoning is labelled inside diagnostics.                                                                                       | Export regression verifies the corrected summary precedes diagnostics and the rejected explanation is explicitly labelled.                                           |
| 6. English source conventions      | CaseFile names replace Dossier source types/components/paths/local bindings. French messages and descriptions move into locale catalogues; engineering comments and test descriptions are English. | Source inspection, compilation, complete integration/browser tests and the OpenAPI compatibility check pass.                                                         |
| 7. Magic business values           | Shared constants govern document/title/model limits, reviewed quotes, pagination, field limits, URLs, request keys and extraction bounds. Local resource controls are named.                       | Source search confirms removed duplicate policy literals; validation and API tests preserve their original bounds.                                                   |
| 8. Oversized workspace             | Separate loading, editing, navigation, settings, preparation, form, tracking, footer and results components.                                                                                       | The workspace entry is 45 lines; the editor is 154. ESLint enforces 300 nonblank/noncomment lines per production module. All browser journeys pass.                  |
| 9. Blank lines                     | Route modules and the main HTTP composition apply the same structural separation rules.                                                                                                            | ESLint and Prettier pass, including the main HTTP composition.                                                                                                       |
| 10. Declarative modern code        | Preference text uses declarative arrays and spreads. ESM, const, object shorthand/spread and modern async syntax are enforced where applicable.                                                    | Preference regressions and lint pass. Paid stages, checkpoints and transactions retain explicit sequential execution.                                                |

## Executed checks

- `npm run quality`: passed TypeScript, ESLint, architecture boundaries, OpenAPI drift, formatting, 108 backend tests, 13 UI tests and production build.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 9 passed. Installed Chrome was used because bundled Playwright Chromium is unavailable locally.
- `git diff --check`: passed.
- All local OpenAPI component references resolve. Existing component names and DTO shapes remain compatible.

The five functional regression scenarios are in
[review-regressions.test.ts](../tests/review-regressions.test.ts).
The existing [case-file API tests](../tests/case-file-api.test.ts) also verify
storage retry without another model invocation.

## Scope and compatibility

Legacy `/api/v1/dossiers` URLs, `dossierId`/`dossierRevision` DTO fields, backup
`dossier` fields, OpenAPI component names and SQLite identifiers are preserved.
Source variables map these fields explicitly to case-file terminology. No data
migration or public deployment is part of this change.

French product text remains localized. Model prompts, fictional documents and
French document-parsing vocabulary are intentional language data; prompts and
schema descriptions retain their contents to avoid changing model behavior.
Ordinary counters, HTTP status codes, grammar bounds and UI geometry do not require
artificial constants. Sequential provider calls are preserved rather than made
parallel as a stylistic rewrite.

All provider calls used fictional transports. No paid model evaluation or live
browser DNS-rebinding exploit was run; hostname rejection was verified directly
using raw HTTP requests.
